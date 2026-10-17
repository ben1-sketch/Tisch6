import "server-only";
import { FOUNDER, PRICES, TABLE, TIMING, euro } from "./config";
import {
  type Application,
  type Db,
  type Dinner,
  type Discount,
  type Package,
  type Payment,
  type Restaurant,
  type Seat,
  OPEN_SEAT,
  must,
} from "./db";
import { type Gender, type Person, kitchenNotes, tableSummary, toPerson, validGroup } from "./matching-core";
import {
  type DinnerInfo,
  adminMail,
  cancelledMail,
  confirmedMail,
  expiredMail,
  invitationMail,
  postponedMail,
  refundText,
  replacementSms,
  reservationMail,
} from "./messages";
import { notifyAdmin, sendEmail, sendSms } from "./notify";
import { loadPool } from "./pool";
import { refund } from "./stripe";
import { HOUR, hoursUntil, viennaDate, weekdayOf } from "./time";

// ---------------------------------------------------------------------------
// Laden
// ---------------------------------------------------------------------------

export async function loadApplication(db: Db, id: string) {
  return must(await db.from("applications").select("*").eq("id", id).single(), "Bewerbung laden") as Application;
}

export async function loadDinner(db: Db, id: string) {
  const dinner = must(await db.from("dinners").select("*").eq("id", id).single(), "Dinner laden") as Dinner;
  const restaurant = must(
    await db.from("restaurants").select("*").eq("id", dinner.restaurant_id).single(),
    "Lokal laden",
  ) as Restaurant;
  return { dinner, restaurant };
}

export function dinnerInfo(dinner: Dinner, restaurant: Restaurant): DinnerInfo {
  return { startsAt: new Date(dinner.starts_at), restaurant: restaurant.name, district: restaurant.district, address: restaurant.address };
}

async function seatsOf(db: Db, dinnerId: string) {
  return must(await db.from("seats").select("*").eq("dinner_id", dinnerId), "Plätze laden") as Seat[];
}

async function applicationsByIds(db: Db, ids: string[]) {
  if (!ids.length) return [];
  return must(await db.from("applications").select("*").in("id", ids), "Gäste laden") as Application[];
}

/** Personen an den noch zählenden Plätzen (eingeladen, angeboten, fix) */
async function tablePeople(db: Db, seats: Seat[]) {
  const open = seats.filter((s) => OPEN_SEAT.includes(s.status));
  const apps = await applicationsByIds(db, open.map((s) => s.application_id));
  return apps.map((a) => toPerson(a)).filter((p): p is Person => p !== null);
}

// ---------------------------------------------------------------------------
// Preis & Angebot
// ---------------------------------------------------------------------------

export type Offer = {
  package: Package | null;
  discount: Discount | null;
  priceCents: number;
  founderAvailable: boolean;
};

/** Was kostet die nächste Tischteilnahme für diese Person – und gibt es noch das Gründungspaket? */
export async function offerFor(db: Db, app: Pick<Application, "id" | "city">): Promise<Offer> {
  const now = new Date().toISOString();
  const pkg = (
    await db
      .from("packages")
      .select("*")
      .eq("application_id", app.id)
      .gt("remaining", 0)
      .gt("expires_at", now)
      .order("expires_at", { ascending: true })
      .limit(1)
      .maybeSingle()
  ).data as Package | null;
  const discount = (
    await db
      .from("discounts")
      .select("*")
      .eq("application_id", app.id)
      .is("used_at", null)
      .order("price_cents", { ascending: true })
      .limit(1)
      .maybeSingle()
  ).data as Discount | null;

  let founderAvailable = false;
  if (!pkg && app.city === FOUNDER.city) {
    const { data: owned } = await db.from("packages").select("id").eq("application_id", app.id).limit(1);
    if (!owned?.length) {
      const { count } = await db.from("packages").select("id", { count: "exact", head: true }).eq("kind", "founder");
      founderAvailable = (count ?? 0) < FOUNDER.limit;
    }
  }
  return { package: pkg, discount, priceCents: discount?.price_cents ?? PRICES.seat, founderAvailable };
}

export function priceText(offer: Offer) {
  if (offer.package) {
    const n = offer.package.remaining;
    return `mit deinem Gründungspaket (noch ${n} ${n === 1 ? "Tischteilnahme" : "Tischteilnahmen"})`;
  }
  if (offer.discount) return `${euro(offer.priceCents)} statt ${euro(PRICES.seat)}`;
  return `${euro(PRICES.seat)} pro Tischteilnahme`;
}

// ---------------------------------------------------------------------------
// Einladen
// ---------------------------------------------------------------------------

export async function sendInvitation(
  db: Db,
  o: { seat: Seat; app: Application; dinner: Dinner; restaurant: Restaurant; table: { gender: Gender; age: number }[] },
) {
  const offer = await offerFor(db, o.app);
  const info = dinnerInfo(o.dinner, o.restaurant);
  await sendEmail(db, {
    to: o.app.email,
    content: invitationMail({
      name: o.app.first_name,
      dinner: info,
      table: tableSummary(o.table),
      priceText: priceText(offer),
      deadline: new Date(o.seat.expires_at!),
      token: o.seat.token,
      replacement: o.seat.replacement,
    }),
    kind: o.seat.replacement ? "replacement_offer" : "invitation",
    dedupeKey: `invite:${o.seat.id}`,
    applicationId: o.app.id,
  });
  if (o.seat.replacement) {
    await sendSms(db, {
      to: o.app.phone,
      body: replacementSms({ dinner: info, token: o.seat.token }),
      kind: "replacement_offer",
      dedupeKey: `invite_sms:${o.seat.id}`,
      applicationId: o.app.id,
    });
  }
}

/**
 * Nachrücker suchen: gleiches Geschlecht wie der frei gewordene Platz, passt in die Runde
 * (Alter, Wunsch-Altersspannen, Wochentag, keine Begleitung am Tisch), wer am längsten wartet zuerst.
 */
export async function findReplacement(db: Db, dinnerId: string, gender: Gender | null) {
  const { dinner, restaurant } = await loadDinner(db, dinnerId);
  if (dinner.status !== "inviting" && dinner.status !== "confirmed") return null;
  if (hoursUntil(dinner.starts_at) < TIMING.lastReplacementHoursBefore) return null;

  const seats = await seatsOf(db, dinner.id);
  const members = await tablePeople(db, seats);
  const missing = (g: Gender) => TABLE.perGender - members.filter((m) => m.gender === g).length;
  const g: Gender | null = gender && missing(gender) > 0 ? gender : missing("frau") > 0 ? "frau" : missing("mann") > 0 ? "mann" : null;
  if (!g) return null;

  const tried = new Set(seats.map((s) => s.application_id));
  const weekday = weekdayOf(viennaDate(new Date(dinner.starts_at)));
  const candidate = (await loadPool(db))
    .filter((p) => p.gender === g && !tried.has(p.id) && (!p.days || p.days.includes(weekday)) && validGroup([...members, p]))
    .sort((a, b) => a.waitingSince - b.waitingSince)[0];
  if (!candidate) return null;

  const expires = new Date(
    Math.min(Date.now() + TIMING.replacementHours * HOUR, new Date(dinner.starts_at).getTime() - 2 * HOUR),
  );
  const { data: seat, error } = await db
    .from("seats")
    .insert({ dinner_id: dinner.id, application_id: candidate.id, status: "offered", replacement: true, expires_at: expires.toISOString() })
    .select("*")
    .single();
  if (error) {
    // z. B. gleichzeitig angelegt – der nächste Durchlauf versucht es erneut
    console.error("Nachrücker anlegen", error.message);
    return null;
  }
  await db.from("applications").update({ last_invited_at: new Date().toISOString() }).eq("id", candidate.id);
  const app = await loadApplication(db, candidate.id);
  await sendInvitation(db, { seat: seat as Seat, app, dinner, restaurant, table: [...members, candidate] });
  return seat as Seat;
}

// ---------------------------------------------------------------------------
// Zusagen, Absagen, Ablauf
// ---------------------------------------------------------------------------

/** Nach jeder Änderung: volle Runde → Dinner fix; bei fixen Dinnern die Reservierung beim Lokal aktuell halten. */
export async function afterSeatChange(db: Db, dinner: Dinner, restaurant: Restaurant) {
  const seats = await seatsOf(db, dinner.id);
  const confirmed = seats.filter((s) => s.status === "confirmed").length;
  if (dinner.status === "inviting" && confirmed >= TABLE.size) {
    const { data } = await db.from("dinners").update({ status: "confirmed" }).eq("id", dinner.id).eq("status", "inviting").select("*").maybeSingle();
    if (data) dinner = data as Dinner;
  }
  if (dinner.status === "confirmed") await sendReservation(db, dinner, restaurant, seats);
}

/** Meldet dem Lokal Personenzahl und Küchenhinweise (ohne Namen); bei Änderungen erneut. */
export async function sendReservation(db: Db, dinner: Dinner, restaurant: Restaurant, seats?: Seat[]) {
  seats ??= await seatsOf(db, dinner.id);
  const confirmed = seats.filter((s) => s.status === "confirmed");
  if (!confirmed.length || confirmed.length === dinner.reserved_count) return;
  const apps = await applicationsByIds(db, confirmed.map((s) => s.application_id));
  const content = reservationMail({
    dinner: dinnerInfo(dinner, restaurant),
    count: confirmed.length,
    kitchen: kitchenNotes(apps.map((a) => ({ diet: a.profile?.ernaehrung ?? null, intolerances: a.profile?.unvertraeglichkeiten ?? [] }))),
    update: dinner.reserved_count !== null,
  });
  const dedupeKey = `reservation:${dinner.id}:${confirmed.length}`;
  const result = restaurant.email
    ? await sendEmail(db, { to: restaurant.email, content, kind: "reservation", dedupeKey })
    : await notifyAdmin(db, { ...content, subject: `[Bitte ans Lokal weitergeben – keine E-Mail hinterlegt] ${content.subject}` }, "reservation", dedupeKey);
  if (result !== "retry") await db.from("dinners").update({ reserved_count: confirmed.length }).eq("id", dinner.id);
}

export async function confirmSeat(
  db: Db,
  seatId: string,
  p: { paidWith: "stripe" | "package"; priceCents: number; paymentId?: string | null; packageId?: string | null; discountId?: string | null },
) {
  const now = new Date().toISOString();
  const { data } = await db
    .from("seats")
    .update({
      status: "confirmed",
      confirmed_at: now,
      expires_at: null,
      paid_with: p.paidWith,
      price_cents: p.priceCents,
      payment_id: p.paymentId ?? null,
      package_id: p.packageId ?? null,
      discount_id: p.discountId ?? null,
    })
    .eq("id", seatId)
    .in("status", ["invited", "offered"])
    .select("*")
    .maybeSingle();
  const seat = data as Seat | null;
  if (!seat) return null;

  if (p.discountId) await db.from("discounts").update({ used_at: now, used_seat_id: seat.id }).eq("id", p.discountId).is("used_at", null);
  // Gebucht: aus dem Pool nehmen, Zähler für nicht gebuchte Einladungen zurücksetzen
  await db.from("applications").update({ available_since: null, missed_bookings: 0, last_nudge_at: null }).eq("id", seat.application_id);

  const app = await loadApplication(db, seat.application_id);
  const { dinner, restaurant } = await loadDinner(db, seat.dinner_id);
  await sendEmail(db, {
    to: app.email,
    content: confirmedMail({ name: app.first_name, dinner: dinnerInfo(dinner, restaurant), token: seat.token }),
    kind: "seat_confirmed",
    dedupeKey: `confirmed:${seat.id}`,
    applicationId: app.id,
  });
  await afterSeatChange(db, dinner, restaurant);
  return seat;
}

async function bumpMissed(db: Db, applicationId: string) {
  const app = await loadApplication(db, applicationId);
  await db.from("applications").update({ missed_bookings: app.missed_bookings + 1 }).eq("id", applicationId);
}

async function genderOf(db: Db, applicationId: string): Promise<Gender | null> {
  const { data } = await db.from("applications").select("gender:profile->>geschlecht").eq("id", applicationId).maybeSingle();
  const g = (data as { gender: string | null } | null)?.gender;
  return g === "frau" || g === "mann" ? g : null;
}

/** „Leider keine Zeit“ vor dem Bezahlen */
export async function declineSeat(db: Db, seat: Seat) {
  const { data } = await db
    .from("seats")
    .update({ status: "declined", ended_at: new Date().toISOString(), expires_at: null })
    .eq("id", seat.id)
    .in("status", ["invited", "offered"])
    .select("id")
    .maybeSingle();
  if (!data) return false;
  await bumpMissed(db, seat.application_id);
  await findReplacement(db, seat.dinner_id, await genderOf(db, seat.application_id));
  return true;
}

/** Gibt Geld, Paket-Guthaben oder Rabatt zurück; liefert den passenden Satz für die E-Mail. */
export async function giveBack(db: Db, seat: Seat): Promise<string | null> {
  let text: string | null = null;
  if (seat.paid_with === "package" && seat.package_id) {
    const pkg = (await db.from("packages").select("*").eq("id", seat.package_id).single()).data as Package | null;
    if (pkg) {
      await db.from("packages").update({ remaining: pkg.remaining + 1 }).eq("id", pkg.id);
      text = refundText({ cents: null, package: true });
    }
  } else if (seat.paid_with === "stripe" && seat.payment_id) {
    const pay = (await db.from("payments").select("*").eq("id", seat.payment_id).single()).data as Payment | null;
    if (pay?.status === "paid" && pay.stripe_payment_intent) {
      try {
        await refund(pay.stripe_payment_intent);
        await db.from("payments").update({ status: "refunded", refunded_at: new Date().toISOString() }).eq("id", pay.id);
        text = refundText({ cents: pay.amount_cents, package: false });
      } catch (e) {
        console.error("Erstattung fehlgeschlagen", pay.id, e);
        await notifyAdmin(
          db,
          adminMail("Erstattung fehlgeschlagen", [`Zahlung ${pay.id} (${euro(pay.amount_cents)}) bitte in Stripe von Hand erstatten.`, String(e)]),
          "admin_refund",
          `admin_refund:${pay.id}`,
        );
        text = `Deine Zahlung von ${euro(pay.amount_cents)} erstatten wir dir in den nächsten Tagen.`;
      }
    }
  }
  if (seat.discount_id) await db.from("discounts").update({ used_at: null, used_seat_id: null }).eq("id", seat.discount_id);
  return text;
}

/** Absage nach der Zusage: bis 48 Stunden vorher kostenlos, danach verfällt die Gebühr. */
export async function cancelSeat(db: Db, seat: Seat) {
  const { dinner, restaurant } = await loadDinner(db, seat.dinner_id);
  const late = hoursUntil(dinner.starts_at) < TIMING.freeCancelHoursBefore;
  const { data } = await db
    .from("seats")
    .update({ status: late ? "cancelled_late" : "cancelled", ended_at: new Date().toISOString() })
    .eq("id", seat.id)
    .eq("status", "confirmed")
    .select("id")
    .maybeSingle();
  if (!data) return null;

  const text = late ? null : await giveBack(db, seat);
  const app = await loadApplication(db, seat.application_id);
  await sendEmail(db, {
    to: app.email,
    content: cancelledMail({ name: app.first_name, dinner: dinnerInfo(dinner, restaurant), refund: text }),
    kind: "seat_cancelled",
    dedupeKey: `cancelled:${seat.id}`,
    applicationId: app.id,
  });
  await findReplacement(db, dinner.id, await genderOf(db, seat.application_id));
  await afterSeatChange(db, dinner, restaurant);
  return { late };
}

/** Nicht rechtzeitig zugesagt → Platz geht an Nachrücker. Offene Bezahlvorgänge bekommen 35 Minuten Schonfrist. */
export async function expireSeats(db: Db) {
  const now = Date.now();
  const due = must(
    await db.from("seats").select("*").in("status", ["invited", "offered"]).lt("expires_at", new Date(now).toISOString()),
    "Abgelaufene Plätze laden",
  ) as Seat[];
  let expired = 0;
  for (const seat of due) {
    if (seat.checkout_started_at && now - new Date(seat.checkout_started_at).getTime() < 35 * 60_000) continue;
    const { data } = await db
      .from("seats")
      .update({ status: "expired", ended_at: new Date().toISOString() })
      .eq("id", seat.id)
      .in("status", ["invited", "offered"])
      .select("id")
      .maybeSingle();
    if (!data) continue;
    expired++;
    await bumpMissed(db, seat.application_id);
    const app = await loadApplication(db, seat.application_id);
    await sendEmail(db, { to: app.email, content: expiredMail(app.first_name), kind: "seat_expired", dedupeKey: `expired:${seat.id}`, applicationId: app.id });
    await findReplacement(db, seat.dinner_id, await genderOf(db, seat.application_id));
  }
  return expired;
}

/**
 * Entscheidung 72 Stunden vorher: ab fünf Zusagen findet das Dinner statt (Nachrücker laufen weiter),
 * sonst wird verschoben – Zahlungen gehen automatisch zurück.
 */
export async function decideDinners(db: Db) {
  const limit = new Date(Date.now() + TIMING.decisionHoursBefore * HOUR).toISOString();
  const due = must(
    await db.from("dinners").select("*").eq("status", "inviting").lte("starts_at", limit),
    "Fällige Dinner laden",
  ) as Dinner[];
  const result = { confirmed: 0, postponed: 0 };
  for (const dinner of due) {
    const restaurant = must(await db.from("restaurants").select("*").eq("id", dinner.restaurant_id).single(), "Lokal laden") as Restaurant;
    const seats = await seatsOf(db, dinner.id);
    const confirmed = seats.filter((s) => s.status === "confirmed");

    if (confirmed.length >= TABLE.size - 1) {
      const { data } = await db.from("dinners").update({ status: "confirmed" }).eq("id", dinner.id).eq("status", "inviting").select("*").maybeSingle();
      if (data) {
        result.confirmed++;
        await sendReservation(db, data as Dinner, restaurant, seats);
      }
      continue;
    }

    const { data } = await db.from("dinners").update({ status: "postponed" }).eq("id", dinner.id).eq("status", "inviting").select("id").maybeSingle();
    if (!data) continue;
    result.postponed++;
    const info = dinnerInfo(dinner, restaurant);
    for (const seat of seats) {
      if (seat.status === "confirmed") {
        await db.from("seats").update({ status: "postponed", ended_at: new Date().toISOString() }).eq("id", seat.id);
        const text = await giveBack(db, seat);
        // zurück in den Pool – mit der Wartezeit seit Tischbildung, damit es beim nächsten Mal schneller geht
        await db.from("applications").update({ available_since: dinner.created_at }).eq("id", seat.application_id);
        const app = await loadApplication(db, seat.application_id);
        await sendEmail(db, {
          to: app.email,
          content: postponedMail({ name: app.first_name, dinner: info, refund: text ?? "Für dich fallen dadurch keine Kosten an." }),
          kind: "dinner_postponed",
          dedupeKey: `postponed:${seat.id}`,
          applicationId: app.id,
        });
      } else if (seat.status === "invited" || seat.status === "offered") {
        await db.from("seats").update({ status: "withdrawn", ended_at: new Date().toISOString() }).eq("id", seat.id);
        const app = await loadApplication(db, seat.application_id);
        await sendEmail(db, {
          to: app.email,
          content: postponedMail({ name: app.first_name, dinner: info, refund: null }),
          kind: "dinner_postponed",
          dedupeKey: `postponed:${seat.id}`,
          applicationId: app.id,
        });
      }
    }
    await notifyAdmin(
      db,
      adminMail("Dinner verschoben", [`${info.restaurant}, ${dinner.starts_at}: nur ${confirmed.length} Zusagen 72 Stunden vorher.`]),
      "admin_postponed",
      `admin_postponed:${dinner.id}`,
    );
  }
  return result;
}

/** Vor dem Löschen eines Profils: offene Einladungen zurückziehen, fixe Plätze nach den Absageregeln stornieren. */
export async function withdrawApplicant(db: Db, applicationId: string) {
  const seats = must(
    await db.from("seats").select("*").eq("application_id", applicationId).in("status", OPEN_SEAT),
    "Plätze laden",
  ) as Seat[];
  const gender = await genderOf(db, applicationId);
  for (const seat of seats) {
    if (seat.status === "confirmed") {
      await cancelSeat(db, seat);
    } else {
      await db.from("seats").update({ status: "withdrawn", ended_at: new Date().toISOString() }).eq("id", seat.id).in("status", ["invited", "offered"]);
      await findReplacement(db, seat.dinner_id, gender);
    }
  }
}
