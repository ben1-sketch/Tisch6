import "server-only";
import { sendCampaigns } from "./campaigns";
import type { Db } from "./db";
import { TIMING } from "./config";
import { afterDinners, prepareCards, sendDayOf, sendLebenszeichen, sendNudges, sendReminders, updateLearnings } from "./dinners";
import { eraseAbandoned, eraseRejected, evaluateApplications, remindUnfinished } from "./evaluation";
import { matchTables } from "./matching";
import { decideDinners, expireSeats, fillGaps, remindOpenInvitations } from "./seats";
import { checkEmailDelivery } from "./email-delivery";
import { checkSmsDelivery } from "./sms-delivery";
import { checkTwilioRegistrations } from "./twilio-registration";
import { viennaHour } from "./time";

export type TickReport = { skipped?: string } & Record<string, unknown>;

/** Tische werden nachts geplant – die Einladungen liegen morgens im Postfach. */
export function isMatchingTime(now = new Date()) {
  const hour = viennaHour(now);
  return hour >= TIMING.matchingFromHour && hour < TIMING.matchingToHour;
}

/**
 * Der automatische Durchlauf – alle 10 Minuten von Supabase (pg_cron), nachts von Vercel,
 * und auf Knopfdruck im Adminbereich. Jeder Schritt ist wiederholbar; die Sperre verhindert Überschneidungen.
 * matching: "auto" = nur nachts, "force" = jetzt (Knopf „Tische jetzt planen“).
 */
export async function runTick(client: Db, options: { matching?: "auto" | "force" } = {}): Promise<TickReport> {
  const { data: lock } = await client
    .from("job_locks")
    .update({ locked_until: new Date(Date.now() + 2 * 60_000).toISOString() })
    .eq("name", "tick")
    .lt("locked_until", new Date().toISOString())
    .select("name")
    .maybeSingle();
  if (!lock) return { skipped: "Ein Durchlauf läuft bereits." };

  const deadline = Date.now() + 45_000;
  const report: TickReport = {};
  const step = async (name: string, run: () => Promise<unknown>) => {
    try {
      report[name] = await run();
    } catch (e) {
      console.error(`Durchlauf, Schritt ${name}:`, e);
      report[name] = { fehler: e instanceof Error ? e.message : String(e) };
    }
  };

  try {
    // zuerst das Zeitkritische …
    await step("abgelaufen", () => expireSeats(client));
    await step("entscheidung", () => decideDinners(client));
    await step("erinnerungen", () => sendReminders(client, deadline));
    await step("zusagen", () => remindOpenInvitations(client));
    await step("amTag", () => sendDayOf(client, deadline));
    await step("nachDemDinner", () => afterDinners(client, deadline));
    // … dann alles, was die KI braucht
    await step("bewerbungen", () => evaluateApplications(client, deadline));
    await step("angefangen", () => remindUnfinished(client));
    await step("nachruecken", () => fillGaps(client));
    if (options.matching === "force" || isMatchingTime()) await step("matching", () => matchTables(client, deadline));
    await step("gespraechskarten", () => prepareCards(client, deadline));
    await step("lebenszeichen", () => sendLebenszeichen(client));
    await step("folgeeinladungen", () => sendNudges(client));
    await step("aufrufe", () => sendCampaigns(client, deadline));
    await step("smsZustellung", () => checkSmsDelivery(client, deadline));
    await step("emailZustellung", () => checkEmailDelivery(client, deadline));
    // Twilio-Registrierungen ändern sich selten – einmal pro Stunde nachfragen genügt
    if (new Date().getUTCMinutes() < 10) await step("twilioRegistrierung", () => checkTwilioRegistrations(client));
    await step("aufraeumen", () => eraseRejected(client));
    await step("abgebrochen", () => eraseAbandoned(client));
    if (Date.now() < deadline - 20_000) await step("lernen", () => updateLearnings(client));
  } finally {
    await client.from("job_locks").update({ locked_until: new Date().toISOString() }).eq("name", "tick");
  }
  return report;
}
