import { NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { openingMessage, type ChatMessage } from "@/lib/onboarding";
import { CONSENT_VERSION } from "@/lib/consent";
import { SOURCE_KEYS } from "@/lib/source";

export const dynamic = "force-dynamic";

// magic_token: Schlüssel der eigenen Tisch6-App (Knopf nach dem Abschicken)
const STATE_COLUMNS = "status, first_name, transcript, user_turns, submitted_at, invite_code, buddy_id, photo_path, magic_token";

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
  // Einladungscode einer Freundin/eines Freundes ("Bring eine Freundin mit")
  inviteCode: z.string().regex(/^[a-z0-9]{8}$/).optional(),
  // true = "Bring eine Freundin mit" (Duo, verschiedene Tische); sonst nur Empfehlung
  together: z.boolean().default(false),
  // Freiwillig: wie die Person von Tisch6 erfahren hat, und der Werbelink (utm), über den sie kam
  source: z.enum(SOURCE_KEYS).optional(),
  campaign: z.string().max(130).optional(),
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
  const { firstName, email, locale, inviteCode, together, source, campaign } = parsed.data;
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
      source: inviteCode ? "empfehlung" : (source ?? null),
      source_detail: campaign ?? (inviteCode ? "Einladungslink" : null),
    })
    .select(STATE_COLUMNS)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (inviteCode) await linkInviter(admin, user.id, inviteCode, together);
  return NextResponse.json({ application: data });
}

/**
 * Einladungslink: merkt sich immer, wer eingeladen hat (Empfehlungsrabatt).
 * Mit together zusätzlich Duo-Verknüpfung – nur wenn die Einladende noch kein Duo hat.
 */
async function linkInviter(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  inviteCode: string,
  together: boolean,
) {
  const { data: host } = await admin
    .from("applications")
    .select("id, buddy_id")
    .eq("invite_code", inviteCode)
    .neq("id", userId)
    .maybeSingle();
  if (!host) return;
  await admin.from("applications").update({ referred_by: host.id }).eq("id", userId);
  if (!together || host.buddy_id) return;
  const { data: claimed } = await admin
    .from("applications")
    .update({ buddy_id: userId })
    .eq("id", host.id)
    .is("buddy_id", null)
    .select("id")
    .maybeSingle();
  if (claimed) await admin.from("applications").update({ buddy_id: host.id }).eq("id", userId);
}
