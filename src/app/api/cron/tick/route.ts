import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { afterDinners, sendLebenszeichen, sendNudges, sendReminders, updateLearnings } from "@/lib/dinners";
import { evaluateApplications } from "@/lib/evaluation";
import { matchTables } from "@/lib/matching";
import { decideDinners, expireSeats } from "@/lib/seats";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Der automatische Durchlauf – alle 10 Minuten von Supabase (pg_cron) aufgerufen,
 * zusätzlich einmal täglich von Vercel als Sicherheitsnetz. Jeder Schritt ist wiederholbar.
 */
async function tick(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "nicht berechtigt" }, { status: 401 });
  }

  const client = db();
  const { data: lock } = await client
    .from("job_locks")
    .update({ locked_until: new Date(Date.now() + 2 * 60_000).toISOString() })
    .eq("name", "tick")
    .lt("locked_until", new Date().toISOString())
    .select("name")
    .maybeSingle();
  if (!lock) return NextResponse.json({ skipped: "Ein Durchlauf läuft bereits." });

  const deadline = Date.now() + 45_000;
  const report: Record<string, unknown> = {};
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
  return NextResponse.json(report);
}

export const GET = tick;
export const POST = tick;
