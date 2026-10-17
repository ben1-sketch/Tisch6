import { NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { openingMessage, type ChatMessage } from "@/lib/onboarding";
import { CONSENT_VERSION } from "@/lib/consent";

export const dynamic = "force-dynamic";

const STATE_COLUMNS = "status, first_name, transcript, user_turns, submitted_at";

/** Aktueller Stand der eigenen Bewerbung (oder null). */
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "nicht angemeldet" }, { status: 401 });

  const { data, error } = await createAdminClient()
    .from("applications")
    .select(STATE_COLUMNS)
    .eq("id", user.id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ application: data });
}

const StartSchema = z.object({
  firstName: z.string().trim().min(1).max(40),
  email: z.email().max(200),
  locale: z.string().max(5).default("de"),
  consent: z.object({
    adult: z.literal(true),
    privacy: z.literal(true),
    terms: z.literal(true),
    sensitive: z.literal(true),
  }),
});

/** Legt die Bewerbung an und startet das Interview. */
export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "nicht angemeldet" }, { status: 401 });

  const parsed = StartSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Bitte alle Felder ausfüllen und zustimmen." }, { status: 400 });
  }
  const { firstName, email, locale } = parsed.data;
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("applications")
    .select(STATE_COLUMNS)
    .eq("id", user.id)
    .maybeSingle();
  if (existing) return NextResponse.json({ application: existing });

  const transcript: ChatMessage[] = [{ role: "assistant", content: openingMessage(firstName) }];
  const { data, error } = await admin
    .from("applications")
    .insert({
      id: user.id,
      first_name: firstName,
      email,
      phone: user.phone ?? null,
      locale,
      consent_version: CONSENT_VERSION,
      consent_at: new Date().toISOString(),
      transcript,
    })
    .select(STATE_COLUMNS)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ application: data });
}
