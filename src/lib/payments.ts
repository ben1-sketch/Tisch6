import "server-only";
import type Stripe from "stripe";
import { FOUNDER, PRICES, euro } from "./config";
import { type Application, type Db, type Package, type Seat, must } from "./db";
import { adminMail, refundText, seatGoneMail } from "./messages";
import { notifyAdmin, sendEmail } from "./notify";
import { confirmSeat, loadApplication, loadDinner, offerFor } from "./seats";
import { siteUrl } from "./site";
import { refund, stripe } from "./stripe";
import { formatDate } from "./time";

export class PaymentError extends Error {}

/** Ablauf der Bezahlseite: Stripe verlangt mindestens 30 Minuten – eine Minute Puffer für Uhr und Übertragung */
export const checkoutExpiry = () => Math.floor(Date.now() / 1000) + 31 * 60;

/** Startet die Stripe-Bezahlseite für eine Tischteilnahme oder das Gründungspaket. */
export async function createCheckout(db: Db, seat: Seat, app: Application, wantsPackage: boolean) {
  const s = stripe();
  if (!s) throw new PaymentError("Die Bezahlung ist noch nicht freigeschaltet.");
  const offer = await offerFor(db, app);
  const { dinner } = await loadDinner(db, seat.dinner_id);

  let kind: "seat" | "package" = "seat";
  let amount = offer.priceCents;
  let name = `Tisch6 · Tischteilnahme am ${formatDate(new Date(dinner.starts_at))}`;
  if (wantsPackage) {
    if (!offer.founderAvailable) throw new PaymentError("Das Gründungspaket ist leider nicht mehr verfügbar.");
    kind = "package";
    amount = PRICES.founderPackage;
    name = `Tisch6 · Gründungspaket (${FOUNDER.seats} Tischteilnahmen, ${FOUNDER.validMonths} Monate gültig)`;
  } else if (offer.package) {
    throw new PaymentError("Du hast noch Guthaben für eine Tischteilnahme – nutze das.");
  }

  const metadata = {
    seat_id: seat.id,
    application_id: app.id,
    kind,
    discount_id: kind === "seat" ? (offer.discount?.id ?? "") : "",
  };
  const session = await s.checkout.sessions.create({
    mode: "payment",
    locale: "de",
    customer_email: app.email,
    line_items: [{ quantity: 1, price_data: { currency: "eur", unit_amount: amount, product_data: { name } } }],
    metadata,
    payment_intent_data: { metadata, description: name },
    success_url: `${siteUrl()}/de/einladung/${seat.token}?bezahlt=1`,
    cancel_url: `${siteUrl()}/de/einladung/${seat.token}`,
    expires_at: checkoutExpiry(),
  });
  await db.from("seats").update({ checkout_started_at: new Date().toISOString() }).eq("id", seat.id);
  if (!session.url) throw new PaymentError("Die Bezahlseite konnte nicht geöffnet werden.");
  return session.url;
}

/** Ein-Klick-Zusage mit Guthaben (Gründungspaket oder Gutschrift vom Team) */
export async function redeemCredit(db: Db, seat: Seat, app: Application) {
  const offer = await offerFor(db, app);
  const pkg = offer.package;
  if (!pkg) throw new PaymentError("In deinem Paket ist kein Guthaben mehr.");
  const { data: taken } = await db
    .from("packages")
    .update({ remaining: pkg.remaining - 1 })
    .eq("id", pkg.id)
    .eq("remaining", pkg.remaining)
    .select("id")
    .maybeSingle();
  if (!taken) throw new PaymentError("Bitte versuch es gleich nochmal.");
  const confirmed = await confirmSeat(db, seat.id, {
    paidWith: "package",
    priceCents: Math.round(PRICES.founderPackage / FOUNDER.seats),
    packageId: pkg.id,
  });
  if (!confirmed) {
    await db.from("packages").update({ remaining: pkg.remaining }).eq("id", pkg.id);
    throw new PaymentError("Dieser Platz ist leider nicht mehr frei.");
  }
  return confirmed;
}

/** Stripe meldet eine erfolgreiche Zahlung – genau einmal verbuchen, Platz bestätigen. */
export async function handlePaidSession(db: Db, session: Stripe.Checkout.Session) {
  const meta = session.metadata ?? {};
  const seatId = meta.seat_id || null;
  const applicationId = meta.application_id || null;
  const kind = meta.kind === "package" ? "package" : "seat";
  const paymentIntent = typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? null);
  const amount = session.amount_total ?? 0;

  const { data: payment, error } = await db
    .from("payments")
    .insert({
      application_id: applicationId,
      seat_id: seatId,
      kind,
      amount_cents: amount,
      stripe_session_id: session.id,
      stripe_payment_intent: paymentIntent,
    })
    .select("*")
    .single();
  if (error) {
    if (error.code === "23505") return "bereits verbucht";
    throw new Error(`Zahlung verbuchen: ${error.message}`);
  }
  if (!applicationId) return "ohne Bewerbung";
  const app = await loadApplication(db, applicationId);

  if (kind === "package") {
    const expires = new Date();
    expires.setMonth(expires.getMonth() + FOUNDER.validMonths);
    const pkg = must(
      await db
        .from("packages")
        .insert({ application_id: app.id, payment_id: payment.id, kind: "founder", total: FOUNDER.seats, remaining: FOUNDER.seats, expires_at: expires.toISOString() })
        .select("*")
        .single(),
      "Gründungspaket anlegen",
    ) as Package;
    await db.from("applications").update({ founder: true }).eq("id", app.id);
    const seat = seatId
      ? await confirmSeat(db, seatId, { paidWith: "package", priceCents: Math.round(PRICES.founderPackage / FOUNDER.seats), packageId: pkg.id, paymentId: payment.id })
      : null;
    if (seat) {
      await db.from("packages").update({ remaining: FOUNDER.seats - 1 }).eq("id", pkg.id);
    } else {
      await sendEmail(db, {
        to: app.email,
        content: seatGoneMail({ name: app.first_name, refunded: null, packageKept: true }),
        kind: "seat_gone",
        dedupeKey: `seatgone:${payment.id}`,
        applicationId: app.id,
      });
    }
    return seat ? "Paket gekauft, Platz bestätigt" : "Paket gekauft, Platz war vergeben";
  }

  const seat = seatId
    ? await confirmSeat(db, seatId, { paidWith: "stripe", priceCents: amount, paymentId: payment.id, discountId: meta.discount_id || null })
    : null;
  if (seat) return "Platz bestätigt";

  // Platz war inzwischen vergeben → Geld automatisch zurück
  let text: string | null = null;
  if (paymentIntent) {
    try {
      await refund(paymentIntent);
      await db.from("payments").update({ status: "refunded", refunded_at: new Date().toISOString() }).eq("id", payment.id);
      text = refundText({ cents: amount, package: false });
    } catch (e) {
      console.error("Erstattung fehlgeschlagen", payment.id, e);
      await notifyAdmin(
        db,
        adminMail("Erstattung fehlgeschlagen", [`Zahlung ${payment.id} (${euro(amount)}) bitte in Stripe von Hand erstatten.`, String(e)]),
        "admin_refund",
        `admin_refund:${payment.id}`,
      );
      text = `Deine Zahlung von ${euro(amount)} erstatten wir dir in den nächsten Tagen.`;
    }
  }
  await sendEmail(db, {
    to: app.email,
    content: seatGoneMail({ name: app.first_name, refunded: text, packageKept: false }),
    kind: "seat_gone",
    dedupeKey: `seatgone:${payment.id}`,
    applicationId: app.id,
  });
  return "Platz war vergeben, erstattet";
}
