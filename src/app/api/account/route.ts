import { NextResponse } from "next/server";
import { z } from "zod";
import { TIMING } from "@/lib/config";
import { type Application, OPEN_SEAT, db } from "@/lib/db";
import { setAvailability } from "@/lib/dinners";
import { eraseApplicant } from "@/lib/erase";
import { offerFor, withdrawApplicant } from "@/lib/seats";
import { getUser } from "@/lib/supabase/server";
import { DAY, HOUR } from "@/lib/time";

export const dynamic = "force-dynamic";

/** Überblick fürs Konto: Status, Gründungspaket, Rabatt, nächster Tisch, Verfügbarkeit */
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "nicht angemeldet" }, { status: 401 });
  const client = db();
  const app = (await client.from("applications").select("*").eq("id", user.id).maybeSingle()).data as Application | null;
  if (!app) return NextResponse.json({ application: null });

  const offer = await offerFor(client, app);
  const { data: seats } = await client
    .from("seats")
    .select("token, status, dinners!inner(starts_at)")
    .eq("application_id", app.id)
    .in("status", OPEN_SEAT)
    .order("created_at", { ascending: false })
    .limit(1);
  const next = (seats?.[0] as unknown as { token: string; status: string; dinners: { starts_at: string } } | undefined) ?? null;

  // Diskreter Meldeknopf im Profil: für den letzten Abend, ab kurz vorher bis eine Woche danach
  const { data: recent } = await client
    .from("seats")
    .select("token, dinners!inner(starts_at)")
    .eq("application_id", app.id)
    .in("status", ["confirmed", "attended", "no_show"])
    .gte("dinners.starts_at", new Date(Date.now() - TIMING.reportUntilDaysAfter * DAY).toISOString())
    .lte("dinners.starts_at", new Date(Date.now() + TIMING.reportFromHoursBefore * HOUR).toISOString())
    .limit(1);
  const report = (recent?.[0] as { token: string } | undefined)?.token ?? null;

  return NextResponse.json({
    application: {
      status: app.status,
      firstName: app.first_name,
      founder: app.founder,
      available: Boolean(app.available_since),
      inviteCode: app.invite_code,
      buddyLinked: Boolean(app.buddy_id),
      packageRemaining: offer.package?.remaining ?? null,
      packageExpires: offer.package?.expires_at ?? null,
      packageIsFounder: offer.package?.kind === "founder",
      discountCents: offer.discount?.price_cents ?? null,
      next: next ? { token: next.token, status: next.status, startsAt: next.dinners.starts_at } : null,
      reportToken: report,
    },
  });
}

const AvailabilitySchema = z.object({ available: z.boolean() });

/** Schalter „Ich möchte an einen Tisch eingeladen werden“ */
export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "nicht angemeldet" }, { status: 401 });
  const parsed = AvailabilitySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "ungültig" }, { status: 400 });
  const client = db();
  const app = (await client.from("applications").select("*").eq("id", user.id).maybeSingle()).data as Application | null;
  if (!app || !(await setAvailability(client, app, parsed.data.available))) {
    return NextResponse.json({ error: "Dein Profil ist gerade nicht aktiv." }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}

/** DSGVO-Löschung: offene Plätze nach den Absageregeln freigeben, dann Foto, Bewerbung und Login endgültig löschen. */
export async function DELETE() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "nicht angemeldet" }, { status: 401 });
  const client = db();
  try {
    await withdrawApplicant(client, user.id);
    await eraseApplicant(client, user.id);
  } catch (e) {
    console.error("Profil löschen", e);
    return NextResponse.json({ error: "Löschen fehlgeschlagen – bitte versuch es gleich nochmal." }, { status: 500 });
  }
  return NextResponse.json({ deleted: true });
}
