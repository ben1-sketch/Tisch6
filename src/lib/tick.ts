import "server-only";
import type { Db } from "./db";
import { afterDinners, sendLebenszeichen, sendNudges, sendReminders, updateLearnings } from "./dinners";
import { evaluateApplications } from "./evaluation";
import { matchTables } from "./matching";
import { decideDinners, expireSeats } from "./seats";

export type TickReport = { skipped?: string } & Record<string, unknown>;

/**
 * Der automatische Durchlauf – alle 10 Minuten von Supabase (pg_cron), einmal täglich von Vercel,
 * und auf Knopfdruck im Adminbereich. Jeder Schritt ist wiederholbar; die Sperre verhindert Überschneidungen.
 */
export async function runTick(client: Db): Promise<TickReport> {
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
    await step("nachDemDinner", () => afterDinners(client, deadline));
    // … dann alles, was die KI braucht
    await step("bewerbungen", () => evaluateApplications(client, deadline));
    await step("matching", () => matchTables(client, deadline));
    await step("lebenszeichen", () => sendLebenszeichen(client));
    await step("folgeeinladungen", () => sendNudges(client));
    if (Date.now() < deadline - 20_000) await step("lernen", () => updateLearnings(client));
  } finally {
    await client.from("job_locks").update({ locked_until: new Date().toISOString() }).eq("name", "tick");
  }
  return report;
}
