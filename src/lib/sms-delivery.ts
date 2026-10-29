import "server-only";
import { type Db, type Notification, must } from "./db";
import { adminMail } from "./messages";
import { notifyAdmin } from "./notify";
import { DAY, dateKey, viennaDate } from "./time";

/** Häufige Zustellfehler von Twilio (Fehlercode) – mit dem, was zu tun ist */
const HINTS: Record<number, string> = {
  21703:
    "Im Messaging Service gibt es keinen Absender, der in dieses Land schicken darf. Für Österreich den Absendernamen „Tisch6“ bei Twilio registrieren (RTR) oder eine österreichische Twilio-Nummer in den Messaging Service aufnehmen.",
  21612: "Der Absendername ist in Österreich nicht registriert (RTR) – bei Twilio registrieren oder eine österreichische Twilio-Nummer verwenden.",
  21610: "Die Person hat SMS von uns abbestellt (STOP).",
  21408: "Twilio darf in dieses Land keine SMS schicken: bei Twilio unter Messaging → Settings → Geo permissions das Land anhaken.",
  21211: "Die Handynummer ist ungültig.",
  21614: "Das ist eine Festnetznummer.",
  30003: "Das Handy war nicht erreichbar (ausgeschaltet oder kein Empfang).",
  30005: "Diese Handynummer gibt es nicht (mehr).",
  30006: "Festnetznummer oder Netz nicht erreichbar.",
  30007: "Der Mobilfunkanbieter hat die SMS gefiltert.",
  30008: "Unbekannter Fehler beim Mobilfunkanbieter.",
};

/** So lange fragt der Durchlauf bei Twilio nach, solange eine SMS noch keinen endgültigen Stand hat */
const CHECK_DAYS = 3;

/**
 * Twilio nimmt eine SMS an und meldet erst danach, ob sie angekommen ist. Der Durchlauf fragt deshalb nach:
 * zugestellte SMS werden als „delivered“ eingetragen, nicht zugestellte als fehlgeschlagen – mit Fehlercode und dem,
 * was zu tun ist. Für neue Fehler bekommt der Inhaber eine E-Mail (je Fehlerart höchstens eine am Tag).
 */
export async function checkSmsDelivery(db: Db, deadline = Infinity, now = new Date()) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return 0;
  const open = must(
    await db
      .from("notifications")
      .select("*")
      .eq("channel", "sms")
      .eq("status", "sent")
      .not("provider_id", "is", null)
      .gt("created_at", new Date(now.getTime() - CHECK_DAYS * DAY).toISOString())
      .order("created_at", { ascending: false })
      .limit(50),
    "Verschickte SMS laden",
  ) as Notification[];

  const failed: { code: number | null; kind: string }[] = [];
  for (const n of open) {
    if (Date.now() > deadline - 5_000) break;
    let message: { status?: string; error_code?: number | null };
    try {
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages/${n.provider_id}.json`, {
        headers: { Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}` },
      });
      if (!res.ok) continue;
      message = await res.json();
    } catch {
      continue;
    }
    if (message.status === "delivered") {
      await db.from("notifications").update({ status: "delivered" }).eq("id", n.id);
    } else if (message.status === "failed" || message.status === "undelivered") {
      const code = message.error_code ?? null;
      const error = `Nicht zugestellt (Twilio-Fehler ${code ?? message.status})${code && HINTS[code] ? `: ${HINTS[code]}` : ""}`;
      await db.from("notifications").update({ status: "failed", error: error.slice(0, 500) }).eq("id", n.id);
      failed.push({ code, kind: n.kind });
    }
  }

  if (failed.length) {
    const codes = [...new Set(failed.map((f) => f.code))].sort();
    const lines = codes.map((code) => {
      const count = failed.filter((f) => f.code === code).length;
      return `Fehler ${code ?? "ohne Code"} (${count}×): ${(code && HINTS[code]) || "Details stehen bei Twilio unter Monitor → Logs → Messaging."}`;
    });
    await notifyAdmin(
      db,
      adminMail(`${failed.length === 1 ? "Eine SMS ist" : `${failed.length} SMS sind`} nicht angekommen`, [
        "Twilio hat die SMS angenommen, konnte sie aber nicht zustellen.",
        ...lines,
        "Die Gäste bekommen alle wichtigen Infos auch per E-Mail. Die Liste steht im Adminbereich unter Versand → Fehlgeschlagen.",
      ]),
      "sms_failed",
      `sms_failed:${dateKey(viennaDate(now))}:${codes.join(",")}`,
    );
  }
  return failed.length;
}
