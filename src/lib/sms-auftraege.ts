import "server-only";
import { type Db, type Seat, OPEN_SEAT, must } from "./db";
import { appUrl, inviteReminderSms, seatUrl } from "./messages";
import { type SendResult, sendPushOrSms } from "./notify";
import { dinnerInfo, loadApplication, loadDinner } from "./seats";

/** Ein Auftrag aus der Tabelle sms_auftraege (siehe supabase/migrations/0013_sms_auftraege.sql) */
type Auftrag = { id: string; application_id: string; seat_id: string | null; body: string | null };

/** Höchstens so viele Aufträge je Durchlauf – der Rest geht beim nächsten raus */
const PRO_DURCHLAUF = 20;

/**
 * SMS-Aufträge: einzelne Kurznachrichten an ausgewählte Gäste, die das Team einträgt – z. B. eine Zahl-Erinnerung
 * auf Wunsch des Inhabers. Als Push, wenn der Gast die Tisch6-App eingeschaltet hat, sonst als SMS; jeder Auftrag
 * höchstens einmal. Kein Zeitfenster: Wann die Nachricht frühestens rausgeht, steht im Auftrag (not_before).
 * send: zum Testen austauschbar.
 */
export async function sendSmsAuftraege(db: Db, now = new Date(), send = sendPushOrSms) {
  const due = must(
    await db
      .from("sms_auftraege")
      .select("id, application_id, seat_id, body")
      .is("done_at", null)
      .lte("not_before", now.toISOString())
      .order("created_at")
      .limit(PRO_DURCHLAUF),
    "SMS-Aufträge laden",
  ) as Auftrag[];

  let sent = 0;
  for (const auftrag of due) {
    let result: string;
    try {
      result = await runAuftrag(db, auftrag, now, send);
    } catch (e) {
      console.error("SMS-Auftrag", auftrag.id, e);
      result = `fehler: ${e instanceof Error ? e.message : String(e)}`.slice(0, 300);
    }
    if (result === "retry") continue; // vorübergehender Fehler – der nächste Durchlauf versucht es nochmal
    await db.from("sms_auftraege").update({ done_at: new Date().toISOString(), result }).eq("id", auftrag.id);
    if (result === "sent") sent++;
  }
  return sent;
}

/**
 * Ohne eigenen Text: die übliche Zahl-Erinnerung zum Platz – nur, solange er noch offen ist (eingeladen oder angeboten,
 * Frist nicht abgelaufen). Mit eigenem Text und Platz: nur, solange der Platz noch zählt (nicht abgesagt oder storniert).
 */
async function runAuftrag(db: Db, auftrag: Auftrag, now: Date, send: typeof sendPushOrSms): Promise<SendResult | "übersprungen"> {
  const app = await loadApplication(db, auftrag.application_id);
  const seat = auftrag.seat_id ? (must(await db.from("seats").select("*").eq("id", auftrag.seat_id).single(), "Platz laden") as Seat) : null;
  let body = auftrag.body;
  if (seat) {
    const waiting = (seat.status === "invited" || seat.status === "offered") && seat.expires_at !== null && new Date(seat.expires_at) > now;
    if (body ? !OPEN_SEAT.includes(seat.status) : !waiting) return "übersprungen";
    if (!body) {
      const { dinner, restaurant } = await loadDinner(db, seat.dinner_id);
      body = inviteReminderSms({ dinner: dinnerInfo(dinner, restaurant), deadline: new Date(seat.expires_at!), token: seat.token });
    }
  }
  if (!body) return "übersprungen";
  return send(db, {
    to: app.phone,
    body,
    url: seat ? seatUrl(seat.token) : appUrl(app.magic_token),
    kind: "sms_auftrag",
    dedupeKey: `auftrag:${auftrag.id}`,
    applicationId: app.id,
  });
}
