import "server-only";
import type { Db } from "./db";
import { adminMail } from "./messages";
import { notifyAdmin } from "./notify";
import { DAY } from "./time";

const STATUS_TEXT: Record<string, string> = {
  draft: "noch nicht abgeschickt",
  "pending-review": "eingereicht, wartet auf Prüfung",
  "in-review": "wird gerade geprüft",
  "provisionally-approved": "vorläufig freigegeben",
  "twilio-approved": "freigegeben",
  "twilio-rejected": "abgelehnt",
};

type Bundle = { sid: string; friendly_name: string; status: string; date_updated: string };

/**
 * Registrierungen bei Twilio (Unterlagen für Telefonnummern, z. B. die österreichische SMS-Nummer): den Stand abfragen
 * und den Inhaber per E-Mail informieren, sobald eine freigegeben oder abgelehnt ist – mit dem, was als Nächstes zu tun ist.
 * Gibt den Stand der Registrierungen der letzten 30 Tage zurück (steht im Bericht des Durchlaufs).
 */
export async function checkTwilioRegistrations(db: Db, now = new Date()) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return {};
  const res = await fetch("https://numbers.twilio.com/v2/RegulatoryCompliance/Bundles?PageSize=50", {
    headers: { Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}` },
  });
  if (!res.ok) throw new Error(`Twilio antwortet mit ${res.status}`);
  const bundles = (((await res.json()) as { results?: Bundle[] }).results ?? []).filter(
    (b) => now.getTime() - new Date(b.date_updated).getTime() < 30 * DAY,
  );

  for (const b of bundles) {
    if (b.status !== "twilio-approved" && b.status !== "twilio-rejected") continue;
    const approved = b.status === "twilio-approved";
    const result = await notifyAdmin(
      db,
      approved
        ? adminMail(`Twilio hat „${b.friendly_name}“ freigegeben`, [
            "Jetzt fehlen noch drei kurze Schritte, dann kommen die SMS von Tisch6 wieder an:",
            "1. Bei Twilio unter Phone Numbers die österreichische Nummer fertig einrichten und kaufen. Die Adresse genau so eintragen wie im Firmenbuchauszug.",
            "2. Unter Messaging → Services → Tisch6 → Sender Pool → Add Senders die neue Nummer hinzufügen.",
            "3. Im Adminbereich auf der Startseite bei „E-Mail und SMS testen“ deine Handynummer eintragen und testen.",
          ])
        : adminMail(`Twilio hat „${b.friendly_name}“ abgelehnt`, [
            "Den Grund siehst du bei Twilio unter Phone Numbers → Regulatory Compliance → Bundles. Dort kannst du die Angaben korrigieren und neu einreichen.",
          ]),
      "twilio_registration",
      `twilio_registration:${b.sid}:${b.status}`,
    );
    if (result !== "duplicate" && result !== "retry") {
      await db.from("admin_log").insert({ action: "Twilio-Registrierung", detail: `${b.friendly_name}: ${STATUS_TEXT[b.status]}` });
    }
  }
  return Object.fromEntries(bundles.map((b) => [b.friendly_name, STATUS_TEXT[b.status] ?? b.status]));
}
