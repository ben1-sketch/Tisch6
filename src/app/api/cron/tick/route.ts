import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { runTick } from "@/lib/tick";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Automatischer Durchlauf – aufgerufen von Supabase (pg_cron) alle 10 Minuten und täglich von Vercel. */
async function tick(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "nicht berechtigt" }, { status: 401 });
  }
  return NextResponse.json(await runTick(db()));
}

export const GET = tick;
export const POST = tick;
