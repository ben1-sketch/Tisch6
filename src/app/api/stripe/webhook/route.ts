import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handlePaidSession } from "@/lib/payments";
import { stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

/** Stripe meldet Zahlungen. Signatur wird geprüft; doppelte Meldungen werden nur einmal verbucht. */
export async function POST(request: Request) {
  const s = stripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!s || !secret) return NextResponse.json({ error: "Stripe ist nicht eingerichtet" }, { status: 503 });

  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Signatur fehlt" }, { status: 400 });
  let event;
  try {
    event = s.webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return NextResponse.json({ error: "Signatur ungültig" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object;
    // Bei verzögerten Zahlarten kommt der Erfolg später als eigenes Ereignis
    if (session.payment_status !== "paid") return NextResponse.json({ received: true, pending: true });
    try {
      const result = await handlePaidSession(db(), session);
      return NextResponse.json({ received: true, result });
    } catch (e) {
      console.error("Zahlung verarbeiten", e);
      // 500 → Stripe wiederholt die Meldung automatisch
      return NextResponse.json({ error: "Verarbeitung fehlgeschlagen" }, { status: 500 });
    }
  }
  return NextResponse.json({ received: true });
}
