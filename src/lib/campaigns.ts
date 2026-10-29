import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { CAMPAIGNS, TIMING } from "./config";
import { type Application, type Db, OPEN_SEAT, must } from "./db";
import { campaignMail } from "./messages";
import { sendEmail } from "./notify";
import { DAY, viennaHour } from "./time";

/** Vermerk im Eingriffs-Protokoll: Diese Person bekommt keine Aufrufe mehr (z. B. Antwort „Stopp“) */
export const NO_CAMPAIGNS = "Keine Aufrufe mehr";

/** Schlüssel der Abbestell-Links – hängt am CRON_SECRET; ein neues Secret macht alte Links ungültig */
function optOutKey() {
  const secret = process.env.CRON_SECRET;
  if (!secret) throw new Error("CRON_SECRET fehlt");
  return createHash("sha256").update(`tisch6-aufrufe:${secret}`).digest();
}

/** Abbestell-Link je Person: „<Bewerbungs-ID>.<Signatur>“ – erlaubt nichts außer Aufrufe abzubestellen */
export function optOutToken(applicationId: string) {
  return `${applicationId}.${createHmac("sha256", optOutKey()).update(applicationId).digest("base64url").slice(0, 22)}`;
}

export const OPT_OUT_TOKEN = /^[0-9a-f-]{36}\.[A-Za-z0-9_-]{22}$/;

/** Prüft einen Abbestell-Link; gibt die Bewerbungs-ID zurück oder null */
export function verifyOptOutToken(token: string) {
  if (!OPT_OUT_TOKEN.test(token)) return null;
  const id = token.split(".")[0];
  const digest = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(digest(token), digest(optOutToken(id))) ? id : null;
}

/** Keine Aufrufe mehr für diese Person (Link in der Mail oder Adminbereich); false, wenn schon ausgetragen */
export async function stopCampaignsFor(db: Db, applicationId: string, detail: string) {
  const { data } = await db.from("admin_log").select("id").eq("application_id", applicationId).eq("action", NO_CAMPAIGNS).limit(1);
  if (data?.length) return false;
  const { error } = await db.from("admin_log").insert({ action: NO_CAMPAIGNS, application_id: applicationId, detail });
  if (error) throw new Error(`Abbestellen: ${error.message}`);
  return true;
}

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
        content: campaignMail({ name: app.first_name, campaign, inviteCode: app.invite_code, optOutToken: optOutToken(app.id) }),
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
