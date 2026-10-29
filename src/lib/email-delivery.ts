import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { type Db, type Notification, must } from "./db";
import { adminMail } from "./messages";
import { notifyAdmin } from "./notify";
import { DAY, HOUR, dateKey, viennaDate } from "./time";

/** Was die Meldungen von Resend bedeuten – und was zu tun ist */
const PROBLEMS: Record<string, string> = {
  "email.bounced": "Die E-Mail ist abgeprallt – meistens ein Tippfehler in der Adresse oder das Postfach gibt es nicht. Adresse im Profil prüfen.",
  "email.suppressed":
    "Resend hat die E-Mail gar nicht verschickt, weil an diese Adresse schon früher eine E-Mail abgeprallt ist. Adresse im Profil prüfen.",
  "email.complained": "Die Person hat die E-Mail als Spam markiert.",
  "email.failed": "Resend konnte die E-Mail nicht verschicken.",
  "email.delivery_delayed": "Die E-Mail kommt seit Stunden nicht an – meistens ein Tippfehler in der Adresse. Adresse im Profil prüfen.",
};
/** Vermerk bei einer verzögerten Zustellung – ob daraus ein Problem wird, entscheidet der Durchlauf */
const DELAYED = "Zustellung verzögert";
/** So lange darf eine Zustellung dauern, bevor sie als Problem gilt */
const WAIT_HOURS = 12;
/** So weit zurück schaut der Durchlauf */
const CHECK_DAYS = 3;
/** Ältere Meldungen werden abgelehnt, damit niemand eine mitgeschnittene Meldung später noch einmal schicken kann */
const MAX_AGE_SECONDS = 5 * 60;

export type ResendEvent = { type?: string; data?: { email_id?: string } };

const note = (type: string) => `Resend (${type.replace(/^email\./, "")}): ${PROBLEMS[type]}`;

/**
 * Prüft, ob eine Meldung wirklich von Resend kommt. Resend verschickt seine Meldungen über Svix: Die Signatur ist ein
 * HMAC-SHA256 über „id.zeitstempel.inhalt“ mit dem Schlüssel aus RESEND_WEBHOOK_SECRET („whsec_…“).
 */
export function verifyResendSignature(secret: string, headers: Headers, body: string, now = Date.now()) {
  const id = headers.get("svix-id");
  const stamp = headers.get("svix-timestamp");
  const signatures = headers.get("svix-signature");
  if (!id || !stamp || !signatures) return false;
  const seconds = Number(stamp);
  if (!Number.isFinite(seconds) || Math.abs(now / 1000 - seconds) > MAX_AGE_SECONDS) return false;
  const expected = createHmac("sha256", Buffer.from(secret.replace(/^whsec_/, ""), "base64"))
    .update(`${id}.${stamp}.${body}`)
    .digest();
  return signatures.split(" ").some((entry) => {
    const [version, signature] = entry.split(",");
    const given = Buffer.from(signature ?? "", "base64");
    return version === "v1" && given.length === expected.length && timingSafeEqual(given, expected);
  });
}

async function findEmail(db: Db, emailId: string) {
  const rows = must(
    await db.from("notifications").select("*").eq("channel", "email").eq("provider_id", emailId).limit(1),
    "E-Mail im Protokoll suchen",
  ) as Notification[];
  return rows[0] ?? null;
}

async function markFailed(db: Db, n: Notification, type: string) {
  await db.from("notifications").update({ status: "failed", error: note(type).slice(0, 500) }).eq("id", n.id);
}

/** E-Mail an den Inhaber mit den Vornamen der Betroffenen – Probleme mit Hinweisen an ihn selbst nicht */
async function reportFailures(db: Db, failed: { n: Notification; type: string }[]) {
  const admin = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const report = failed.filter((f) => f.n.recipient.toLowerCase() !== admin);
  if (!report.length) return;
  const ids = report.map((f) => f.n.application_id).filter((id): id is string => !!id);
  const names = new Map(
    ids.length
      ? (must(await db.from("applications").select("id, first_name").in("id", ids), "Namen laden") as { id: string; first_name: string }[]).map(
          (a) => [a.id, a.first_name],
        )
      : [],
  );
  const one = report.length === 1;
  const spam = report.every((f) => f.type === "email.complained");
  await notifyAdmin(
    db,
    adminMail(
      spam
        ? `${one ? "Eine E-Mail wurde" : `${report.length} E-Mails wurden`} als Spam markiert`
        : `${one ? "Eine E-Mail ist" : `${report.length} E-Mails sind`} nicht angekommen`,
      [
        one ? "Resend meldet ein Problem mit dieser E-Mail:" : "Resend meldet ein Problem mit diesen E-Mails:",
        ...report.map((f) => `${(f.n.application_id && names.get(f.n.application_id)) || f.n.recipient} – „${f.n.subject ?? f.n.kind}“: ${PROBLEMS[f.type]}`),
        "Die Liste steht im Adminbereich unter Versand → Fehlgeschlagen. Ist eine Adresse falsch, im Profil der Person ausbessern.",
      ],
    ),
    "email_failed",
    `email_failed:${report[0].n.id}`,
  );
}

/**
 * Resend meldet jede Zustellung an /api/resend/webhook. Angekommene E-Mails werden als „delivered“ eingetragen;
 * abgeprallte, nicht verschickte oder als Spam markierte als fehlgeschlagen – dazu bekommt der Inhaber eine E-Mail.
 * Eine Verzögerung wird nur vermerkt: Kommt die E-Mail 12 Stunden lang nicht an, meldet es der Durchlauf.
 * Doppelte Meldungen ändern nichts.
 */
export async function recordEmailEvent(db: Db, event: ResendEvent, retryAfterMs = 3_000) {
  const emailId = event.data?.email_id;
  const type = event.type ?? "";
  if (!emailId || (type !== "email.delivered" && !Object.hasOwn(PROBLEMS, type))) return "ignoriert";
  let n = await findEmail(db, emailId);
  if (!n && retryAfterMs) {
    // Die Meldung kann knapp vor dem Eintrag der Resend-ID im Protokoll ankommen – kurz warten, dann noch einmal suchen
    await new Promise((resolve) => setTimeout(resolve, retryAfterMs));
    n = await findEmail(db, emailId);
  }
  // Nicht von Tisch6 verschickt (z. B. direkt bei Resend) – nichts einzutragen
  if (!n) return "unbekannt";

  if (type === "email.delivered") {
    // Auch nachträglich: War sie nach 12 Stunden Verzögerung schon als nicht angekommen eingetragen, stimmt das jetzt nicht mehr
    if (n.status === "sent" || (n.status === "failed" && n.error?.startsWith(note("email.delivery_delayed")))) {
      await db.from("notifications").update({ status: "delivered", error: null }).eq("id", n.id);
    }
    return "zugestellt";
  }
  if (type === "email.delivery_delayed") {
    if (n.status === "sent") await db.from("notifications").update({ error: `${DELAYED} – Resend versucht es weiter.` }).eq("id", n.id);
    return "verzögert";
  }
  if (n.status === "failed") return "schon eingetragen";
  await markFailed(db, n, type);
  await reportFailures(db, [{ n, type }]);
  return "fehlgeschlagen";
}

/**
 * Wächter im Durchlauf: Kommt eine verzögerte E-Mail 12 Stunden lang nicht an, gilt sie als nicht angekommen – meist
 * ein Tippfehler in der Adresse. Meldet Resend zu einer E-Mail gar nichts, ist eher die Verbindung von Resend zu
 * Tisch6 gestört – das bekommt der Inhaber höchstens einmal am Tag gemeldet.
 */
export async function checkEmailDelivery(db: Db, now = new Date()) {
  if (!process.env.RESEND_API_KEY) return 0;
  if (!process.env.RESEND_WEBHOOK_SECRET) throw new Error("RESEND_WEBHOOK_SECRET fehlt – Resend kann nicht melden, ob E-Mails ankommen.");
  const waiting = must(
    await db
      .from("notifications")
      .select("*")
      .eq("channel", "email")
      .eq("status", "sent")
      .not("provider_id", "is", null)
      .gt("created_at", new Date(now.getTime() - CHECK_DAYS * DAY).toISOString())
      .lt("created_at", new Date(now.getTime() - WAIT_HOURS * HOUR).toISOString())
      .order("created_at", { ascending: false })
      .limit(100),
    "Verschickte E-Mails laden",
  ) as Notification[];

  const delayed = waiting.filter((n) => n.error?.startsWith(DELAYED));
  for (const n of delayed) await markFailed(db, n, "email.delivery_delayed");
  await reportFailures(db, delayed.map((n) => ({ n, type: "email.delivery_delayed" })));

  const silent = waiting.length - delayed.length;
  if (silent) {
    await notifyAdmin(
      db,
      adminMail("Resend meldet nicht mehr, ob E-Mails ankommen", [
        `Zu ${silent === 1 ? "einer E-Mail" : `${silent} E-Mails`} hat Resend seit über ${WAIT_HOURS} Stunden nicht gemeldet, ob sie angekommen ${silent === 1 ? "ist" : "sind"}.`,
        "Verschickt werden die E-Mails trotzdem. Wahrscheinlich ist die Verbindung von Resend zu Tisch6 gestört (bei Resend unter Webhooks) – ein technisches Problem, kein Fehler in den Adressen.",
      ]),
      "email_silent",
      `email_silent:${dateKey(viennaDate(now))}`,
    );
  }
  return delayed.length;
}
