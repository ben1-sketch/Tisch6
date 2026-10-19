import "server-only";
import Stripe from "stripe";

let client: Stripe | null = null;

/** Stripe-Client – null, solange STRIPE_SECRET_KEY fehlt (dann ist Bezahlen noch nicht freigeschaltet). */
export function stripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return (client ??= new Stripe(key));
}

/** Testmodus/Sandbox – gilt für normale (sk_) und eingeschränkte Schlüssel (rk_). */
export function stripeTestMode() {
  return /^[rs]k_test_/.test(process.env.STRIPE_SECRET_KEY ?? "");
}

export async function refund(paymentIntent: string) {
  const s = stripe();
  if (!s) throw new Error("Stripe ist nicht eingerichtet");
  await s.refunds.create({ payment_intent: paymentIntent });
}
