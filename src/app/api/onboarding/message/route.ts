import { NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  MAX_MESSAGE_LENGTH,
  MAX_USER_TURNS,
  extractProfile,
  nextTurn,
  type ChatMessage,
} from "@/lib/onboarding";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BodySchema = z.object({ text: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH) });

/** Nimmt eine Antwort entgegen und liefert die nächste Frage der Gastgeberin. */
export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "nicht angemeldet" }, { status: 401 });

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Nachricht ungültig" }, { status: 400 });

  const admin = createAdminClient();
  const { data: app, error } = await admin
    .from("applications")
    .select("status, first_name, transcript, user_turns")
    .eq("id", user.id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!app) return NextResponse.json({ error: "keine Bewerbung gefunden" }, { status: 404 });
  if (app.status !== "onboarding") {
    return NextResponse.json({ error: "Das Gespräch ist bereits abgeschlossen." }, { status: 409 });
  }

  const userTurns = app.user_turns + 1;
  const history: ChatMessage[] = [...(app.transcript as ChatMessage[]), { role: "user", content: parsed.data.text }];

  let reply: string;
  let complete: boolean;
  try {
    const turn = await nextTurn(app.first_name, history);
    reply = turn.reply;
    complete = turn.complete || userTurns >= MAX_USER_TURNS;
    if (complete && !turn.complete) {
      reply = "Danke dir, das war's schon – ich habe genug erfahren! Deine Bewerbung wird jetzt geprüft, innerhalb von 24 Stunden bekommst du eine Antwort per E-Mail.";
    }
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Die Gastgeberin ist kurz abgelenkt – bitte gleich nochmal senden." }, { status: 502 });
  }

  const transcript: ChatMessage[] = [...history, { role: "assistant", content: reply }];
  const update: Record<string, unknown> = { transcript, user_turns: userTurns };

  if (complete) {
    try {
      const profile = await extractProfile(transcript);
      update.profile = profile;
      update.personality_type = profile.persoenlichkeit.typ;
      update.status = profile.unter_18 ? "rejected" : "submitted";
      update.submitted_at = new Date().toISOString();
    } catch (e) {
      // Interview ist trotzdem gespeichert; die Auswertung kann später nachgeholt werden.
      console.error(e);
      update.status = "submitted";
      update.submitted_at = new Date().toISOString();
    }
  }

  // Optimistische Sperre: nur speichern, wenn niemand parallel geantwortet hat
  const { data: saved, error: saveError } = await admin
    .from("applications")
    .update(update)
    .eq("id", user.id)
    .eq("user_turns", app.user_turns)
    .select("status")
    .maybeSingle();
  if (saveError) return NextResponse.json({ error: saveError.message }, { status: 500 });
  if (!saved) return NextResponse.json({ error: "Bitte Seite neu laden." }, { status: 409 });

  return NextResponse.json({ reply, complete, status: saved.status });
}
