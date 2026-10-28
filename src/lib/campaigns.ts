import "server-only";
import { CAMPAIGNS, TIMING } from "./config";
import { type Application, type Db, OPEN_SEAT, must } from "./db";
import { campaignMail } from "./messages";
import { sendEmail } from "./notify";
import { DAY, viennaHour } from "./time";

/** Vermerk im Eingriffs-Protokoll: Diese Person bekommt keine Aufrufe mehr (z. B. Antwort „Stopp“) */
export const NO_CAMPAIGNS = "Keine Aufrufe mehr";

/** Kurze Pause zwischen zwei Aufrufen – der E-Mail-Dienst nimmt nur wenige Mails pro Sekunde an */
const PAUSE_MS = 600;

/**
 * Aufrufe an Wartende (CAMPAIGNS): nur im Zeitfenster und tagsüber, an angenommene Personen ohne offenen Platz,
 * höchstens einer pro Person im Monat und nie an jemanden mit „Keine Aufrufe mehr“. Was nicht mehr in den
 * Durchlauf passt, geht beim nächsten raus.
 */
export async function sendCampaigns(db: Db, deadline = Infinity, now = new Date()) {
  const hour = viennaHour(now);
  if (hour < TIMING.daytimeFromHour || hour >= TIMING.daytimeToHour) return 0;
  const active = CAMPAIGNS.filter((c) => new Date(c.from) <= now && now < new Date(c.until));
  if (!active.length) return 0;

  const waiting = must(
    await db
      .from("applications")
      .select("*")
      .eq("status", "accepted")
      .eq("under_review", false)
      .not("available_since", "is", null)
      .not("profile", "is", null),
    "Wartende laden",
  ) as Application[];
  const ids = (rows: unknown) => new Set((rows as { application_id: string | null }[]).map((r) => r.application_id));
  const seated = ids(must(await db.from("seats").select("application_id").in("status", OPEN_SEAT), "Plätze laden"));
  const stopped = ids(must(await db.from("admin_log").select("application_id").eq("action", NO_CAMPAIGNS), "Abbestellungen laden"));
  const recent = ids(
    must(
      await db
        .from("notifications")
        .select("application_id")
        .eq("kind", "campaign")
        .gt("created_at", new Date(now.getTime() - TIMING.monthlyDays * DAY).toISOString()),
      "Letzte Aufrufe laden",
    ),
  );

  let sent = 0;
  for (const campaign of active) {
    for (const app of waiting) {
      if (app.profile?.geschlecht !== campaign.to || seated.has(app.id) || stopped.has(app.id) || recent.has(app.id)) continue;
      if (Date.now() > deadline) return sent;
      const result = await sendEmail(db, {
        to: app.email,
        content: campaignMail({ name: app.first_name, campaign, inviteCode: app.invite_code }),
        kind: "campaign",
        dedupeKey: `campaign:${campaign.id}:${app.id}`,
        applicationId: app.id,
      });
      if (result === "retry") continue;
      recent.add(app.id);
      if (result === "duplicate") continue;
      sent++;
      await new Promise((resolve) => setTimeout(resolve, PAUSE_MS));
    }
  }
  return sent;
}
