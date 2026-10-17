import "server-only";
import { z } from "zod";
import { askStructured } from "./claude";
import { BALANCE_MARGIN, TIMING } from "./config";
import { type Application, type Db, must } from "./db";
import { eraseApplicant } from "./erase";
import { acceptedMail, adminMail, minorMail, rejectedMail, waitlistMail } from "./messages";
import { notifyAdmin, sendEmail } from "./notify";
import { extractProfile, type Profile } from "./onboarding";
import { DAY } from "./time";

type Gender = "frau" | "mann";
type Counts = Record<Gender, number>;

const AssessmentSchema = z.object({
  serioes: z.boolean().describe("true, wenn die Bewerbung ernst gemeint und respektvoll ist"),
  eindeutig: z
    .boolean()
    .describe("Nur bei serioes = false: true, wenn die Warnsignale klar und eindeutig sind; im Zweifel false (dann prüft ein Mensch)"),
  warnsignale: z
    .array(z.string())
    .describe("Konkrete Warnsignale, z. B. beleidigend, sexuell aufdringlich, offensichtlich erfunden, Werbung, vergeben"),
  begruendung: z.string().describe("Ein bis zwei Sätze, nur intern"),
});

const ASSESS_SYSTEM = `Du prüfst Bewerbungen für Tisch6, KI-kuratierte Dating-Dinner für Singles in Wien (sechs Personen pro Tisch, öffentliches Restaurant).
Entscheide nur, ob die Bewerbung ernst gemeint und respektvoll ist. Sei wohlwollend: Schüchternheit, kurze Antworten, Humor, Tippfehler oder ungewöhnliche Hobbys sind KEIN Grund für ein Nein.
Nur klare Warnsignale zählen: beleidigende oder abwertende Aussagen, sexuell aufdringliche Inhalte, offensichtlich erfundene oder widersprüchliche Angaben, Werbung oder Spam, oder die Person sucht ausdrücklich keine Partnerschaft bzw. ist offensichtlich vergeben.
Ist die Bewerbung nicht ernst gemeint, entscheide zusätzlich, ob das eindeutig ist (dann wird automatisch abgesagt) oder ob ein Mensch noch einmal draufschauen soll. Im Zweifel: nicht eindeutig.
Antworte im vorgegebenen JSON-Format.`;

const otherGender = (g: Gender): Gender => (g === "frau" ? "mann" : "frau");

/** Passt die Person an einen Tisch mit drei Frauen und drei Männern? */
function seatable(profile: Profile): profile is Profile & { geschlecht: Gender } {
  const g = profile.geschlecht;
  return (g === "frau" || g === "mann") && profile.sucht.includes(otherGender(g));
}

/** Aktiver Pool nach Geschlecht – Grundlage für das Verhältnis Frauen/Männer */
async function poolCounts(db: Db): Promise<Counts> {
  const rows = must(
    await db.from("applications").select("gender:profile->>geschlecht").eq("status", "accepted"),
    "Pool zählen",
  ) as { gender: string | null }[];
  const counts: Counts = { frau: 0, mann: 0 };
  for (const r of rows) if (r.gender === "frau" || r.gender === "mann") counts[r.gender]++;
  return counts;
}

async function accept(db: Db, app: Application, fromWaitlist: boolean, extra: Record<string, unknown> = {}) {
  const now = new Date().toISOString();
  const { data } = await db
    .from("applications")
    .update({ status: "accepted", accepted_at: now, available_since: now, waitlist_reason: null, evaluated_at: now, ...extra })
    .eq("id", app.id)
    .eq("status", fromWaitlist ? "waitlist" : "submitted")
    .select("id")
    .maybeSingle();
  if (data) {
    await sendEmail(db, {
      to: app.email,
      content: acceptedMail(app.first_name, fromWaitlist),
      kind: "accepted",
      dedupeKey: `accepted:${app.id}`,
      applicationId: app.id,
    });
  }
  return Boolean(data);
}

async function waitlist(db: Db, app: Application, reason: "balance" | "format" | "review", extra: Record<string, unknown> = {}) {
  const { data } = await db
    .from("applications")
    .update({ status: "waitlist", waitlist_reason: reason, evaluated_at: new Date().toISOString(), ...extra })
    .eq("id", app.id)
    .eq("status", "submitted")
    .select("id")
    .maybeSingle();
  if (data) {
    await sendEmail(db, {
      to: app.email,
      content: waitlistMail(app.first_name, reason),
      kind: "waitlist",
      dedupeKey: `waitlist:${app.id}`,
      applicationId: app.id,
    });
  }
}

async function reject(db: Db, app: Application, extra: Record<string, unknown> = {}) {
  const now = new Date().toISOString();
  const { data } = await db
    .from("applications")
    .update({ status: "rejected", rejected_at: now, evaluated_at: now, available_since: null, ...extra })
    .eq("id", app.id)
    .eq("status", "submitted")
    .select("id")
    .maybeSingle();
  if (data) {
    await sendEmail(db, { to: app.email, content: rejectedMail(app.first_name), kind: "rejected", dedupeKey: `rejected:${app.id}`, applicationId: app.id });
  }
}

/** Bewertet eine Bewerbung: unter 18 → löschen, KI-Prüfung (angenommen oder abgelehnt), 3+3-Format, Geschlechterverhältnis. */
async function evaluate(db: Db, app: Application, counts: Counts) {
  const profile = app.profile!;

  if (profile.unter_18 || (profile.alter !== null && profile.alter < 18)) {
    await sendEmail(db, { to: app.email, content: minorMail(app.first_name), kind: "minor", applicationId: app.id });
    await eraseApplicant(db, app.id);
    return;
  }

  // Ohne Namen an die KI – der Vorname steht nur in der Begrüßung
  const answers = app.transcript
    .map((m) => `${m.role === "user" ? "Person" : "Gastgeberin"}: ${m.content.split(app.first_name).join("[Name]")}`)
    .join("\n");
  const assessment = await askStructured({
    schema: AssessmentSchema,
    system: ASSESS_SYSTEM,
    user: `<gespraech>\n${answers}\n</gespraech>`,
    effort: "low",
    maxTokens: 2000,
  });

  if (!assessment.serioes && assessment.eindeutig) {
    await reject(db, app, { evaluation: assessment });
    return;
  }
  if (!assessment.serioes) {
    await waitlist(db, app, "review", { under_review: true, evaluation: assessment });
    await notifyAdmin(
      db,
      adminMail("Bewerbung zur Prüfung", [
        `${app.first_name} (${app.email}) wurde zur Prüfung zurückgehalten.`,
        `Warnsignale: ${assessment.warnsignale.join(", ") || "–"}`,
        `Begründung: ${assessment.begruendung}`,
      ]),
      "admin_review",
      `admin_review:${app.id}`,
    );
    return;
  }

  if (!seatable(profile)) {
    await waitlist(db, app, "format", { evaluation: assessment });
    return;
  }
  if (profile.alter === null) {
    await waitlist(db, app, "review", { under_review: true, evaluation: assessment });
    return;
  }

  const g = profile.geschlecht;
  if (counts[g] - counts[otherGender(g)] >= BALANCE_MARGIN) {
    await waitlist(db, app, "balance", { evaluation: assessment });
    return;
  }
  if (await accept(db, app, false, { evaluation: assessment })) counts[g]++;
}

/** Rückt Personen von der Warteliste nach, sobald das Verhältnis es zulässt (älteste Bewerbung zuerst). */
async function promoteWaitlist(db: Db, counts: Counts) {
  const waiting = must(
    await db
      .from("applications")
      .select("*")
      .eq("status", "waitlist")
      .eq("waitlist_reason", "balance")
      .eq("under_review", false)
      .order("submitted_at", { ascending: true })
      .limit(50),
    "Warteliste laden",
  ) as Application[];
  for (const app of waiting) {
    const g = app.profile?.geschlecht;
    if (g !== "frau" && g !== "mann") continue;
    if (counts[g] - counts[otherGender(g)] >= BALANCE_MARGIN) continue;
    if (await accept(db, app, true)) counts[g]++;
  }
}

/**
 * Automatische Antwort auf Bewerbungen (angenommen, Warteliste oder abgelehnt).
 * Läuft bei jedem Durchlauf; deadline begrenzt die Zeit für KI-Aufrufe.
 */
export async function evaluateApplications(db: Db, deadline: number) {
  const now = Date.now();
  const result = { profiles: 0, evaluated: 0, promoted: 0 };

  // 1) Profile nachholen, falls die Auswertung nach dem Gespräch fehlgeschlagen ist
  const missing = must(
    await db
      .from("applications")
      .select("id, transcript")
      .eq("status", "submitted")
      .is("profile", null)
      .lt("submitted_at", new Date(now - TIMING.profileRetryMinutes * 60_000).toISOString())
      .limit(3),
    "Fehlende Profile laden",
  ) as Pick<Application, "id" | "transcript">[];
  for (const app of missing) {
    if (Date.now() > deadline) return result;
    try {
      const profile = await extractProfile(app.transcript);
      await db.from("applications").update({ profile, personality_type: profile.persoenlichkeit.typ }).eq("id", app.id);
      result.profiles++;
    } catch (e) {
      console.error("Profil nachholen fehlgeschlagen", app.id, e);
    }
  }

  // 2) Zuerst die Warteliste nachrücken lassen – wer länger wartet, kommt vor neuen Bewerbungen dran
  const counts = await poolCounts(db);
  const before = counts.frau + counts.mann;
  await promoteWaitlist(db, counts);
  result.promoted = counts.frau + counts.mann - before;

  // 3) Neue Bewerbungen bewerten
  const due = must(
    await db
      .from("applications")
      .select("*")
      .eq("status", "submitted")
      .not("profile", "is", null)
      .lt("submitted_at", new Date(now - TIMING.evaluationDelayMinutes * 60_000).toISOString())
      .order("submitted_at", { ascending: true })
      .limit(10),
    "Bewerbungen laden",
  ) as Application[];
  for (const app of due) {
    if (Date.now() > deadline) break;
    try {
      await evaluate(db, app, counts);
      result.evaluated++;
    } catch (e) {
      console.error("Bewertung fehlgeschlagen", app.id, e);
    }
  }
  return result;
}

/**
 * Datensparsamkeit: Minderjährige werden sofort gelöscht (mit kurzer E-Mail),
 * abgelehnte Bewerbungen nach TIMING.rejectedRetentionDays Tagen.
 */
export async function eraseRejected(db: Db) {
  const rows = must(
    await db.from("applications").select("id, first_name, email, rejected_at, evaluation").eq("status", "rejected").limit(50),
    "Abgelehnte Bewerbungen laden",
  ) as Pick<Application, "id" | "first_name" | "email" | "rejected_at" | "evaluation">[];
  const limit = Date.now() - TIMING.rejectedRetentionDays * DAY;
  let erased = 0;
  for (const app of rows) {
    const minor = (app.evaluation as { minderjaehrig?: boolean } | null)?.minderjaehrig === true;
    if (!minor && (!app.rejected_at || new Date(app.rejected_at).getTime() > limit)) continue;
    if (minor) await sendEmail(db, { to: app.email, content: minorMail(app.first_name), kind: "minor", dedupeKey: `minor:${app.id}`, applicationId: app.id });
    await eraseApplicant(db, app.id);
    erased++;
  }
  return erased;
}
