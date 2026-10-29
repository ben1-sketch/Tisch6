import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { type ResendEvent, recordEmailEvent, verifyResendSignature } from "@/lib/email-delivery";

export const dynamic = "force-dynamic";

/** Resend meldet, ob eine E-Mail angekommen ist. Signatur wird geprüft; doppelte Meldungen ändern nichts. */
export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Resend-Webhook ist nicht eingerichtet" }, { status: 503 });

  const body = await request.text();
  if (!verifyResendSignature(secret, request.headers, body)) return NextResponse.json({ error: "Signatur ungültig" }, { status: 400 });
  let event: ResendEvent;
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Inhalt ungültig" }, { status: 400 });
  }

  try {
    return NextResponse.json({ received: true, result: await recordEmailEvent(db(), event) });
  } catch (e) {
    console.error("Resend-Meldung verarbeiten", e);
    // 500 → Resend wiederholt die Meldung automatisch
    return NextResponse.json({ error: "Verarbeitung fehlgeschlagen" }, { status: 500 });
  }
}
