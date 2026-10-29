import "server-only";
import { type Db, type Notification, must } from "./db";
import { adminMail } from "./messages";
import { notifyAdmin } from "./notify";
import { DAY, HOUR } from "./time";

/** Was die letzten Ereignisse bei Resend bedeuten – und was zu tun ist */
const PROBLEMS: Record<string, string> = {
  bounced: "Die E-Mail ist abgeprallt – meistens ein Tippfehler in der Adresse oder das Postfach gibt es nicht. Adresse im Profil prüfen.",
  complained: "Die Person hat die E-Mail als Spam markiert.",
  failed: "Resend konnte die E-Mail nicht verschicken.",
  delivery_delayed: "Die E-Mail kommt seit Stunden nicht an – meistens ein Tippfehler in der Adresse. Adresse im Profil prüfen.",
};
const DELIVERED = new Set(["delivered", "opened", "clicked"]);

/** So lange fragt der Durchlauf bei Resend nach, solange eine E-Mail noch keinen endgültigen Stand hat */
const CHECK_DAYS = 3;
/** Eine verzögerte Zustellung gilt nach so vielen Stunden als Problem */
const DELAY_HOURS = 12;
/** Resend erlaubt nur wenige Abfragen pro Sekunde – deshalb eine Pause und höchstens so viele pro Durchlauf */
const PAUSE_MS = 600;
const PER_RUN = 15;

/**
 * Resend nimmt eine E-Mail an und meldet erst danach, ob sie im Postfach angekommen ist. Der Durchlauf fragt deshalb
 * nach: angekommene E-Mails werden als „delivered“ eingetragen, abgeprallte als fehlgeschlagen – mit dem, was zu tun
 * ist. Für neue Fehler bekommt der Inhaber eine E-Mail mit den Vornamen der Betroffenen.
 */
export async function checkEmailDelivery(db: Db, deadline = Infinity, now = new Date()) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return 0;
  const open = must(
    await db
      .from("notifications")
      .select("*")
      .eq("channel", "email")
      .eq("status", "sent")
      .not("provider_id", "is", null)
      .gt("created_at", new Date(now.getTime() - CHECK_DAYS * DAY).toISOString())
      .lt("created_at", new Date(now.getTime() - 2 * 60_000).toISOString())
      .order("created_at", { ascending: false })
      .limit(PER_RUN),
    "Verschickte E-Mails laden",
  ) as Notification[];

  const failed: { n: Notification; event: string }[] = [];
  for (const [i, n] of open.entries()) {
    if (Date.now() > deadline - 5_000) break;
    if (i > 0) await new Promise((resolve) => setTimeout(resolve, PAUSE_MS));
    let event: string | undefined;
    try {
      const res = await fetch(`https://api.resend.com/emails/${n.provider_id}`, { headers: { Authorization: `Bearer ${key}` } });
      if (!res.ok) continue;
      event = ((await res.json()) as { last_event?: string }).last_event;
    } catch {
      continue;
    }
    if (!event) continue;
    if (DELIVERED.has(event)) {
      await db.from("notifications").update({ status: "delivered" }).eq("id", n.id);
    } else if (event in PROBLEMS && (event !== "delivery_delayed" || now.getTime() - new Date(n.created_at).getTime() > DELAY_HOURS * HOUR)) {
      await db.from("notifications").update({ status: "failed", error: `Nicht zugestellt (${event}): ${PROBLEMS[event]}`.slice(0, 500) }).eq("id", n.id);
      failed.push({ n, event });
    }
  }

  // Abgeprallte Hinweise an den Inhaber selbst nicht noch einmal an ihn melden
  const admin = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const report = failed.filter((f) => f.n.recipient.toLowerCase() !== admin);
  if (report.length) {
    const ids = report.map((f) => f.n.application_id).filter((id): id is string => !!id);
    const names = new Map(
      ids.length
        ? (must(await db.from("applications").select("id, first_name").in("id", ids), "Namen laden") as { id: string; first_name: string }[]).map(
            (a) => [a.id, a.first_name],
          )
        : [],
    );
    await notifyAdmin(
      db,
      adminMail(`${report.length === 1 ? "Eine E-Mail ist" : `${report.length} E-Mails sind`} nicht angekommen`, [
        report.length === 1
          ? "Resend hat diese E-Mail angenommen, sie ist aber nicht im Postfach angekommen:"
          : "Resend hat diese E-Mails angenommen, sie sind aber nicht im Postfach angekommen:",
        ...report.map((f) => `${(f.n.application_id && names.get(f.n.application_id)) || f.n.recipient} – „${f.n.subject ?? f.n.kind}“: ${PROBLEMS[f.event]}`),
        "Die Liste steht im Adminbereich unter Versand → Fehlgeschlagen. Ist eine Adresse falsch, im Profil der Person ausbessern.",
      ]),
      "email_failed",
      `email_failed:${report[0].n.id}`,
    );
  }
  return failed.length;
}
