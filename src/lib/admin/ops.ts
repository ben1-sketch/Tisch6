import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { FOUNDER, NO_SHOW_LIMIT, PRICES, euro } from "../config";
import { type Application, type Db, type Payment, type Report, type Seat, OPEN_SEAT, must } from "../db";
import { setAvailability } from "../dinners";
import { eraseApplicant } from "../erase";
import { APP_STATUS } from "./format";
import {
  acceptedMail,
  blockedMail,
  creditMail,
  dinnerCancelledMail,
  discountMail,
  noShowMail,
  refundMail,
  reservationCancelledMail,
  seatRemovedMail,
  waitlistMail,
} from "../messages";
import { notifyAdmin, sendEmail } from "../notify";
import {
  afterSeatChange,
  confirmSeat,
  dinnerInfo,
  findReplacement,
  genderOf,
  giveBack,
  loadApplication,
  loadDinner,
  offerSeat,
  replacementCandidates,
  seatsOf,
  sendReservation,
} from "../seats";
import { refund } from "../stripe";
import { HOUR, WEEKDAY_CODES, formatDateTime } from "../time";

/** Fehler, deren Text so im Adminbereich angezeigt wird */
export class AdminError extends Error {}

const stale = () => new AdminError("Der Stand hat sich gerade geändert – bitte die Seite neu laden.");
const now = () => new Date().toISOString();

export const WAITLIST_REASONS = {
  balance: "Geschlechterverhältnis",
  format: "passt an keinen 3+3-Tisch",
  review: "zur Prüfung",
} as const;

/** Protokoll der Eingriffe – bewusst ohne Namen und Kontaktdaten */
export async function logAdmin(
  db: Db,
  action: string,
  o: { applicationId?: string | null; dinnerId?: string | null; detail?: string | null } = {},
) {
  const { error } = await db
    .from("admin_log")
    .insert({ action, application_id: o.applicationId ?? null, dinner_id: o.dinnerId ?? null, detail: o.detail ?? null });
  if (error) console.error("Admin-Protokoll", error.message);
}

export async function loadSeat(db: Db, id: string) {
  const seat = (await db.from("seats").select("*").eq("id", id).maybeSingle()).data as Seat | null;
  if (!seat) throw new AdminError("Platz nicht gefunden.");
  return seat;
}

async function openSeats(db: Db, applicationId: string) {
  return must(await db.from("seats").select("*").eq("application_id", applicationId).in("status", OPEN_SEAT), "Plätze laden") as Seat[];
}

/** Nimmt eine Person von allen offenen Plätzen: Einladungen zurückziehen, fixe Plätze erstatten, Nachrücker suchen. */
async function removeFromTables(db: Db, applicationId: string) {
  const seats = await openSeats(db, applicationId);
  const gender = await genderOf(db, applicationId);
  const refunds: string[] = [];
  let count = 0;
  for (const seat of seats) {
    const { data } = await db
      .from("seats")
      .update({ status: "removed", ended_at: now(), expires_at: null })
      .eq("id", seat.id)
      .eq("status", seat.status)
      .select("id")
      .maybeSingle();
    if (!data) continue;
    count++;
    if (seat.status === "confirmed") {
      const text = await giveBack(db, seat);
      if (text) refunds.push(text);
    }
    await findReplacement(db, seat.dinner_id, gender);
    const { dinner, restaurant } = await loadDinner(db, seat.dinner_id);
    await afterSeatChange(db, dinner, restaurant);
  }
  return { count, refund: refunds.join(" ") || null };
}

// ---------------------------------------------------------------------------
// Personen
// ---------------------------------------------------------------------------

export async function acceptApplicant(db: Db, app: Application) {
  if (app.status !== "submitted" && app.status !== "waitlist") {
    throw new AdminError("Annehmen geht nur bei eingereichten Bewerbungen und von der Warteliste.");
  }
  const p = app.profile;
  if (!p) throw new AdminError("Das Profil ist noch nicht ausgewertet. Der nächste Durchlauf holt das nach – bitte kurz warten.");
  if (p.unter_18 || (p.alter !== null && p.alter < 18)) throw new AdminError("Laut Profil unter 18 – kann nicht angenommen werden.");

  const ts = now();
  const { data } = await db
    .from("applications")
    .update({
      status: "accepted",
      accepted_at: app.accepted_at ?? ts,
      available_since: ts,
      waitlist_reason: null,
      under_review: false,
      evaluated_at: app.evaluated_at ?? ts,
    })
    .eq("id", app.id)
    .eq("status", app.status)
    .select("id")
    .maybeSingle();
  if (!data) throw stale();
  await sendEmail(db, {
    to: app.email,
    content: acceptedMail(app.first_name, app.status === "waitlist"),
    kind: "accepted",
    dedupeKey: `accepted:${app.id}`,
    applicationId: app.id,
  });
  await logAdmin(db, "Angenommen", { applicationId: app.id });
  const seatable = (p.geschlecht === "frau" || p.geschlecht === "mann") && p.alter;
  return seatable
    ? "Angenommen – die Person ist jetzt im Pool für die Tischplanung."
    : "Angenommen. Achtung: Ohne Alter und Geschlecht Frau/Mann kann die KI die Person keinem 3+3-Tisch zuordnen.";
}

export async function waitlistApplicant(db: Db, app: Application, reason: keyof typeof WAITLIST_REASONS) {
  if (!["submitted", "accepted", "waitlist"].includes(app.status)) {
    throw new AdminError("Die Warteliste geht nur bei eingereichten, angenommenen oder wartenden Bewerbungen.");
  }
  if (app.status === "waitlist" && app.waitlist_reason === reason) throw new AdminError("Steht schon mit diesem Grund auf der Warteliste.");
  if (app.status === "accepted" && (await openSeats(db, app.id)).length) {
    throw new AdminError("Die Person hat offene Plätze – bitte zuerst im Dinner stornieren oder zurückziehen.");
  }
  const { data } = await db
    .from("applications")
    .update({
      status: "waitlist",
      waitlist_reason: reason,
      available_since: null,
      under_review: reason === "review",
      evaluated_at: app.evaluated_at ?? now(),
    })
    .eq("id", app.id)
    .eq("status", app.status)
    .select("id")
    .maybeSingle();
  if (!data) throw stale();
  await sendEmail(db, {
    to: app.email,
    content: waitlistMail(app.first_name, reason),
    kind: "waitlist",
    dedupeKey: `waitlist:${app.id}:${reason}`,
    applicationId: app.id,
  });
  await logAdmin(db, "Warteliste", { applicationId: app.id, detail: WAITLIST_REASONS[reason] });
  return "Auf die Warteliste gesetzt und per E-Mail informiert.";
}

export async function blockApplicant(db: Db, app: Application, notify: boolean) {
  if (app.status === "blocked") throw new AdminError("Das Profil ist bereits gesperrt.");
  const blockedAt = now();
  const { data } = await db
    .from("applications")
    .update({ status: "blocked", blocked_at: blockedAt, available_since: null, last_nudge_at: null, under_review: false })
    .eq("id", app.id)
    .eq("status", app.status)
    .select("id")
    .maybeSingle();
  if (!data) throw stale();
  const removed = await removeFromTables(db, app.id);
  // offene Meldungen zu dieser Person sind damit entschieden
  await db.from("reports").update({ status: "blocked", resolved_at: blockedAt }).eq("reported_id", app.id).eq("status", "open");
  if (notify) {
    await sendEmail(db, {
      to: app.email,
      content: blockedMail({ name: app.first_name, refund: removed.refund }),
      kind: "blocked",
      dedupeKey: `blocked:${app.id}:${blockedAt}`,
      applicationId: app.id,
    });
  }
  await logAdmin(db, "Gesperrt", { applicationId: app.id, detail: removed.count ? `${removed.count} offene Plätze freigegeben` : null });
  return [
    "Gesperrt.",
    removed.count ? `${removed.count} offene ${removed.count === 1 ? "Platz" : "Plätze"} freigegeben, Nachrücker werden gesucht.` : "",
    notify ? "Die Person wurde per E-Mail informiert." : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export async function unblockApplicant(db: Db, app: Application) {
  if (app.status !== "blocked") throw new AdminError("Das Profil ist nicht gesperrt.");
  const ts = now();
  const status = app.profile ? "accepted" : "onboarding";
  const { data } = await db
    .from("applications")
    .update({
      status,
      blocked_at: null,
      under_review: false,
      ...(status === "accepted" ? { accepted_at: app.accepted_at ?? ts, available_since: ts, waitlist_reason: null } : {}),
    })
    .eq("id", app.id)
    .eq("status", "blocked")
    .select("id")
    .maybeSingle();
  if (!data) throw stale();
  await logAdmin(db, "Entsperrt", { applicationId: app.id });
  return status === "accepted" ? "Entsperrt – die Person ist wieder im Pool." : "Entsperrt – die Person kann ihre Bewerbung fortsetzen.";
}

export async function clearReview(db: Db, app: Application) {
  if (!app.under_review) throw new AdminError("Das Profil steht nicht zur Prüfung.");
  if (app.status === "waitlist" && app.waitlist_reason === "review") {
    throw new AdminError("Diese Bewerbung wartet auf deine Entscheidung – bitte annehmen, sperren oder löschen.");
  }
  await db.from("applications").update({ under_review: false }).eq("id", app.id);
  await db.from("reports").update({ status: "dismissed", resolved_at: now() }).eq("reported_id", app.id).eq("status", "open");
  await logAdmin(db, "Prüfung erledigt", { applicationId: app.id });
  return "Prüfung erledigt – die Person kann wieder eingeladen werden.";
}

export async function setApplicantAvailability(db: Db, app: Application, available: boolean) {
  if (!(await setAvailability(db, app, available))) throw new AdminError("Das geht nur bei angenommenen Personen.");
  await logAdmin(db, available ? "Wieder verfügbar" : "Pausiert", { applicationId: app.id });
  return available ? "Die Person wird wieder für Tische berücksichtigt." : "Pausiert – keine neuen Einladungen, bis wieder eingeschaltet.";
}

export async function saveNote(db: Db, app: Application, note: string) {
  must(await db.from("applications").update({ admin_note: note.trim().slice(0, 2000) || null }).eq("id", app.id), "Notiz speichern");
  return "Notiz gespeichert.";
}

/** Freie Tischteilnahmen schenken (z. B. als Entschuldigung) – laufen wie ein Paket, 12 Monate gültig. */
export async function grantCredit(db: Db, app: Application, seats: number) {
  if (!["submitted", "accepted", "waitlist"].includes(app.status)) throw new AdminError("Gutschriften gibt es nur für aktive Profile.");
  if (!Number.isInteger(seats) || seats < 1 || seats > 3) throw new AdminError("Bitte 1 bis 3 Tischteilnahmen wählen.");
  const expires = new Date();
  expires.setMonth(expires.getMonth() + FOUNDER.validMonths);
  must(
    await db.from("packages").insert({ application_id: app.id, kind: "gutschrift", total: seats, remaining: seats, expires_at: expires.toISOString() }),
    "Gutschrift anlegen",
  );
  await sendEmail(db, { to: app.email, content: creditMail({ name: app.first_name, seats }), kind: "credit", applicationId: app.id });
  await logAdmin(db, "Gutschrift", { applicationId: app.id, detail: `${seats} Tischteilnahme(n)` });
  return `${seats} ${seats === 1 ? "Tischteilnahme" : "Tischteilnahmen"} gutgeschrieben – die Person wurde informiert.`;
}

/** Günstigere nächste Tischteilnahme */
export async function grantDiscount(db: Db, app: Application, cents: number) {
  if (!["submitted", "accepted", "waitlist"].includes(app.status)) throw new AdminError("Rabatte gibt es nur für aktive Profile.");
  if (!Number.isInteger(cents) || cents < 100 || cents >= PRICES.seat) {
    throw new AdminError(`Der Preis muss zwischen 1 € und ${euro(PRICES.seat - 100)} liegen. Für eine freie Tischteilnahme bitte die Gutschrift nutzen.`);
  }
  must(await db.from("discounts").insert({ application_id: app.id, reason: "manual", price_cents: cents, source_id: randomUUID() }), "Rabatt anlegen");
  await sendEmail(db, { to: app.email, content: discountMail({ name: app.first_name, cents }), kind: "discount", applicationId: app.id });
  await logAdmin(db, "Rabatt", { applicationId: app.id, detail: euro(cents) });
  return `Rabatt angelegt: Die nächste Tischteilnahme kostet ${euro(cents)}.`;
}

/** DSGVO-Löschung durch das Team: offene Plätze freigeben (mit Erstattung), dann alles endgültig löschen. */
export async function deleteApplicant(db: Db, app: Application) {
  await removeFromTables(db, app.id);
  await eraseApplicant(db, app.id);
  await logAdmin(db, "Profil gelöscht", { detail: `vorher: ${APP_STATUS[app.status].label}` });
}

// ---------------------------------------------------------------------------
// Dinner und Plätze
// ---------------------------------------------------------------------------

export async function cancelDinner(db: Db, dinnerId: string) {
  const { dinner, restaurant } = await loadDinner(db, dinnerId);
  if (dinner.status !== "inviting" && dinner.status !== "confirmed") throw new AdminError("Nur geplante Dinner können abgesagt werden.");
  const { data } = await db.from("dinners").update({ status: "cancelled" }).eq("id", dinner.id).eq("status", dinner.status).select("id").maybeSingle();
  if (!data) throw stale();

  const info = dinnerInfo(dinner, restaurant);
  let guests = 0;
  for (const seat of await seatsOf(db, dinner.id)) {
    if (!OPEN_SEAT.includes(seat.status)) continue;
    const { data: done } = await db
      .from("seats")
      .update({ status: "removed", ended_at: now(), expires_at: null })
      .eq("id", seat.id)
      .eq("status", seat.status)
      .select("id")
      .maybeSingle();
    if (!done) continue;
    guests++;
    const wasConfirmed = seat.status === "confirmed";
    const text = wasConfirmed ? await giveBack(db, seat) : null;
    // zurück in den Pool – mit der Wartezeit seit Tischbildung, damit es beim nächsten Mal schneller geht
    if (wasConfirmed) await db.from("applications").update({ available_since: dinner.created_at }).eq("id", seat.application_id).eq("status", "accepted");
    const app = await loadApplication(db, seat.application_id);
    await sendEmail(db, {
      to: app.email,
      content: dinnerCancelledMail({ name: app.first_name, dinner: info, refund: text, wasConfirmed }),
      kind: "dinner_cancelled",
      dedupeKey: `dinner_cancelled:${seat.id}`,
      applicationId: app.id,
    });
  }

  if (dinner.reserved_count !== null) {
    const content = reservationCancelledMail({ dinner: info });
    const key = `reservation_cancelled:${dinner.id}`;
    if (restaurant.email) await sendEmail(db, { to: restaurant.email, content, kind: "reservation_cancelled", dedupeKey: key });
    else await notifyAdmin(db, { ...content, subject: `[Bitte dem Lokal absagen – keine E-Mail hinterlegt] ${content.subject}` }, "reservation_cancelled", key);
  }
  await logAdmin(db, "Dinner abgesagt", { dinnerId: dinner.id, detail: `${guests} Gäste informiert` });
  return `Dinner abgesagt. ${guests} ${guests === 1 ? "Person wurde" : "Personen wurden"} informiert${
    dinner.reserved_count !== null ? ", das Lokal bekommt eine Stornierung" : ""
  }.`;
}

/** Platz vom Team storniert (fix) bzw. Einladung zurückgezogen (offen) */
export async function removeSeat(db: Db, seatId: string, o: { refund: boolean; replace: boolean }) {
  const seat = await loadSeat(db, seatId);
  if (!OPEN_SEAT.includes(seat.status)) throw new AdminError("Dieser Platz ist nicht mehr offen.");
  const { dinner, restaurant } = await loadDinner(db, seat.dinner_id);
  const { data } = await db
    .from("seats")
    .update({ status: "removed", ended_at: now(), expires_at: null })
    .eq("id", seat.id)
    .eq("status", seat.status)
    .select("id")
    .maybeSingle();
  if (!data) throw stale();

  const wasConfirmed = seat.status === "confirmed";
  let text: string | null = null;
  if (wasConfirmed) {
    text = o.refund
      ? await giveBack(db, seat)
      : (seat.price_cents ?? 0) > 0
        ? "Die Gebühr für diesen Platz können wir in diesem Fall leider nicht erstatten."
        : null;
    await db.from("applications").update({ available_since: now() }).eq("id", seat.application_id).eq("status", "accepted");
  }
  const app = await loadApplication(db, seat.application_id);
  await sendEmail(db, {
    to: app.email,
    content: seatRemovedMail({ name: app.first_name, dinner: dinnerInfo(dinner, restaurant), refund: text, wasConfirmed }),
    kind: "seat_removed",
    dedupeKey: `seat_removed:${seat.id}`,
    applicationId: app.id,
  });
  const replacement = o.replace ? await findReplacement(db, dinner.id, await genderOf(db, seat.application_id)) : null;
  await afterSeatChange(db, dinner, restaurant);
  await logAdmin(db, wasConfirmed ? "Platz storniert" : "Einladung zurückgezogen", {
    applicationId: seat.application_id,
    dinnerId: dinner.id,
    detail: wasConfirmed ? (o.refund ? "mit Erstattung" : "ohne Erstattung") : null,
  });
  return [
    wasConfirmed ? `Platz storniert${o.refund ? " und erstattet" : ""}.` : "Einladung zurückgezogen.",
    "Die Person wurde per E-Mail informiert.",
    o.replace ? (replacement ? "Ein Nachrücker ist eingeladen." : "Gerade passt niemand als Nachrücker – der Durchlauf versucht es weiter.") : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export async function extendInvite(db: Db, seatId: string, hours: number) {
  const seat = await loadSeat(db, seatId);
  if (seat.status !== "invited" && seat.status !== "offered") throw new AdminError("Nur offene Einladungen können verlängert werden.");
  const { dinner } = await loadDinner(db, seat.dinner_id);
  const base = Math.max(Date.now(), seat.expires_at ? new Date(seat.expires_at).getTime() : 0);
  const expires = Math.min(base + hours * HOUR, new Date(dinner.starts_at).getTime() - 2 * HOUR);
  if (expires <= Date.now()) throw new AdminError("Das Dinner ist zu nah – keine Verlängerung mehr möglich.");
  const { data } = await db
    .from("seats")
    .update({ expires_at: new Date(expires).toISOString() })
    .eq("id", seat.id)
    .in("status", ["invited", "offered"])
    .select("id")
    .maybeSingle();
  if (!data) throw stale();
  await logAdmin(db, "Frist verlängert", { applicationId: seat.application_id, dinnerId: seat.dinner_id });
  return `Frist verlängert bis ${formatDateTime(new Date(expires))}.`;
}

/** Zusage ohne Online-Zahlung, z. B. bar bezahlt oder eingeladen */
export async function confirmManually(db: Db, seatId: string, cents: number) {
  const seat = await loadSeat(db, seatId);
  if (seat.status !== "invited" && seat.status !== "offered") throw new AdminError("Nur offene Einladungen können bestätigt werden.");
  if (!Number.isInteger(cents) || cents < 0 || cents > 100_000) throw new AdminError("Bitte einen gültigen Betrag angeben.");
  const confirmed = await confirmSeat(db, seat.id, { paidWith: "manual", priceCents: cents });
  if (!confirmed) throw stale();
  await logAdmin(db, "Platz von Hand bestätigt", { applicationId: seat.application_id, dinnerId: seat.dinner_id, detail: euro(cents) });
  return "Platz bestätigt – die Person hat die Bestätigung per E-Mail bekommen.";
}

export async function markNoShow(db: Db, seatId: string) {
  const seat = await loadSeat(db, seatId);
  if (seat.status !== "attended" && seat.status !== "confirmed") throw new AdminError("Nur Gäste eines Abends können als nicht erschienen markiert werden.");
  const { dinner, restaurant } = await loadDinner(db, seat.dinner_id);
  if (new Date(dinner.starts_at).getTime() > Date.now()) throw new AdminError("Das Dinner hat noch nicht stattgefunden.");
  const { data } = await db.from("seats").update({ status: "no_show" }).eq("id", seat.id).eq("status", seat.status).select("id").maybeSingle();
  if (!data) throw stale();

  const app = await loadApplication(db, seat.application_id);
  const blocked = app.status !== "blocked" && app.no_shows + 1 >= NO_SHOW_LIMIT;
  await db
    .from("applications")
    .update({
      no_shows: app.no_shows + 1,
      ...(blocked ? { status: "blocked", blocked_at: now(), available_since: null, last_nudge_at: null } : {}),
    })
    .eq("id", app.id);
  if (blocked) await removeFromTables(db, app.id);
  await sendEmail(db, {
    to: app.email,
    content: noShowMail({ name: app.first_name, dinner: dinnerInfo(dinner, restaurant), blocked }),
    kind: blocked ? "blocked" : "no_show",
    dedupeKey: `noshow:${seat.id}`,
    applicationId: app.id,
  });
  await logAdmin(db, "Nicht erschienen", { applicationId: app.id, dinnerId: dinner.id, detail: blocked ? "zweites Mal – gesperrt" : null });
  return blocked
    ? "Als nicht erschienen markiert. Es war das zweite Mal – das Profil ist jetzt gesperrt."
    : "Als nicht erschienen markiert. Die Person wurde per E-Mail daran erinnert, beim nächsten Mal abzusagen.";
}

export async function revertNoShow(db: Db, seatId: string) {
  const seat = await loadSeat(db, seatId);
  if (seat.status !== "no_show") throw new AdminError("Der Platz ist nicht als „nicht erschienen“ markiert.");
  const { data } = await db.from("seats").update({ status: "attended" }).eq("id", seat.id).eq("status", "no_show").select("id").maybeSingle();
  if (!data) throw stale();
  const app = await loadApplication(db, seat.application_id);
  await db.from("applications").update({ no_shows: Math.max(0, app.no_shows - 1) }).eq("id", app.id);
  await logAdmin(db, "Nichterscheinen korrigiert", { applicationId: app.id, dinnerId: seat.dinner_id });
  return app.status === "blocked"
    ? "Korrigiert. Das Profil ist noch gesperrt – bei Bedarf im Profil entsperren."
    : "Korrigiert – die Person gilt wieder als erschienen.";
}

export async function resendReservation(db: Db, dinnerId: string) {
  const { dinner, restaurant } = await loadDinner(db, dinnerId);
  if (dinner.status !== "confirmed") throw new AdminError("Eine Reservierung gibt es erst, wenn das Dinner fix ist.");
  await sendReservation(db, dinner, restaurant, undefined, true);
  await logAdmin(db, "Reservierung erneut gesendet", { dinnerId: dinner.id });
  return restaurant.email ? `Reservierung an ${restaurant.email} gesendet.` : "Beim Lokal ist keine E-Mail hinterlegt – die Reservierung ging an ADMIN_EMAIL.";
}

export async function inviteToDinner(db: Db, dinnerId: string, applicationId: string) {
  const found = await replacementCandidates(db, dinnerId, 100);
  if (!found) throw new AdminError("Dieses Dinner nimmt keine Nachrücker mehr (abgesagt, vorbei oder zu knapp vor Beginn).");
  const candidate = [...found.candidates.frau, ...found.candidates.mann].find((p) => p.id === applicationId);
  if (!candidate) throw new AdminError("Die Person passt nicht (mehr) an diesen Tisch.");
  const seat = await offerSeat(db, found, candidate);
  if (!seat) throw stale();
  await logAdmin(db, "Von Hand eingeladen", { applicationId, dinnerId });
  return `${candidate.firstName} hat die Einladung per E-Mail und SMS bekommen (12 Stunden Zeit).`;
}

export async function replaceNow(db: Db, dinnerId: string) {
  const seat = await findReplacement(db, dinnerId, null);
  if (!seat) throw new AdminError("Gerade passt niemand aus dem Pool – der automatische Durchlauf versucht es weiter.");
  await logAdmin(db, "Nachrücker gesucht", { applicationId: seat.application_id, dinnerId });
  return "Ein Nachrücker ist eingeladen (E-Mail + SMS, 12 Stunden Zeit).";
}

// ---------------------------------------------------------------------------
// Zahlungen
// ---------------------------------------------------------------------------

export async function refundPayment(db: Db, paymentId: string) {
  const pay = (await db.from("payments").select("*").eq("id", paymentId).maybeSingle()).data as Payment | null;
  if (!pay) throw new AdminError("Zahlung nicht gefunden.");
  if (pay.status !== "paid") throw new AdminError("Diese Zahlung ist bereits erstattet.");
  if (!pay.stripe_payment_intent) throw new AdminError("Keine Stripe-Zahlung hinterlegt – bitte direkt in Stripe erstatten.");
  if (pay.kind === "seat" && pay.seat_id) {
    const seat = (await db.from("seats").select("status").eq("id", pay.seat_id).maybeSingle()).data as Pick<Seat, "status"> | null;
    if (seat?.status === "confirmed") throw new AdminError("Der Platz ist noch gebucht – bitte im Dinner stornieren, dort mit Erstattung.");
  }

  // Erst vormerken, dann Stripe – so kann ein Doppelklick nicht zweimal erstatten
  const { data } = await db.from("payments").update({ status: "refunded", refunded_at: now() }).eq("id", pay.id).eq("status", "paid").select("id").maybeSingle();
  if (!data) throw stale();
  let note = "";
  try {
    await refund(pay.stripe_payment_intent);
  } catch (e) {
    if ((e as { code?: string }).code === "charge_already_refunded") {
      note = " (war in Stripe schon erstattet – jetzt auch hier vermerkt)";
    } else {
      await db.from("payments").update({ status: "paid", refunded_at: null }).eq("id", pay.id);
      throw new AdminError(`Stripe hat die Erstattung abgelehnt: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  if (pay.kind === "package") {
    await db.from("packages").update({ remaining: 0 }).eq("payment_id", pay.id);
    if (pay.application_id) await db.from("applications").update({ founder: false }).eq("id", pay.application_id);
  }
  const app = pay.application_id
    ? ((await db.from("applications").select("id, email, first_name").eq("id", pay.application_id).maybeSingle()).data as Pick<
        Application,
        "id" | "email" | "first_name"
      > | null)
    : null;
  if (app && !note) {
    await sendEmail(db, {
      to: app.email,
      content: refundMail({ name: app.first_name, cents: pay.amount_cents }),
      kind: "refund",
      dedupeKey: `refund:${pay.id}`,
      applicationId: app.id,
    });
  }
  await logAdmin(db, "Zahlung erstattet", { applicationId: pay.application_id, detail: euro(pay.amount_cents) });
  return `${euro(pay.amount_cents)} erstattet${note}${pay.kind === "package" ? " – das Paket ist damit aufgebraucht" : ""}.`;
}

// ---------------------------------------------------------------------------
// Meldungen
// ---------------------------------------------------------------------------

export async function resolveReport(db: Db, reportId: string, decision: "dismissed" | "blocked", note: string) {
  const report = (await db.from("reports").select("*").eq("id", reportId).maybeSingle()).data as Report | null;
  if (!report) throw new AdminError("Meldung nicht gefunden.");
  if (report.status !== "open") throw new AdminError("Diese Meldung ist schon erledigt.");
  const { data } = await db
    .from("reports")
    .update({ status: decision, resolved_at: now(), admin_note: note.trim().slice(0, 2000) || null })
    .eq("id", report.id)
    .eq("status", "open")
    .select("id")
    .maybeSingle();
  if (!data) throw stale();

  let message = "Meldung erledigt.";
  if (report.reported_id) {
    const app = (await db.from("applications").select("*").eq("id", report.reported_id).maybeSingle()).data as Application | null;
    if (app && decision === "blocked" && app.status !== "blocked") {
      message = `Meldung erledigt. ${await blockApplicant(db, app, true)}`;
    } else if (app && decision === "dismissed") {
      const { count } = await db.from("reports").select("id", { count: "exact", head: true }).eq("reported_id", app.id).eq("status", "open");
      const waitingForDecision = app.status === "waitlist" && app.waitlist_reason === "review";
      if (!count && app.under_review && !waitingForDecision) {
        await db.from("applications").update({ under_review: false }).eq("id", app.id);
        message = "Meldung erledigt – die Person kann wieder eingeladen werden.";
      }
    }
  }
  await logAdmin(db, decision === "blocked" ? "Meldung: gesperrt" : "Meldung: erledigt", {
    applicationId: report.reported_id,
    dinnerId: report.dinner_id,
  });
  return message;
}

// ---------------------------------------------------------------------------
// Stammlokale
// ---------------------------------------------------------------------------

const text = (max: number) => z.string().trim().max(max);

const RestaurantSchema = z.object({
  name: text(120).min(2, "Bitte einen Namen angeben."),
  address: text(200).min(5, "Bitte die Adresse angeben."),
  district: text(60),
  maps_url: text(500).refine((v) => !v || /^https:\/\//.test(v), "Der Karten-Link muss mit https:// beginnen."),
  email: text(200).refine((v) => !v || z.email().safeParse(v).success, "Die E-Mail-Adresse ist ungültig."),
  phone: text(40),
  weekdays: z.array(z.enum(WEEKDAY_CODES)).min(1, "Bitte mindestens einen Wochentag wählen."),
  start_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Bitte eine Uhrzeit wie 19:00 angeben."),
  tables_per_evening: z.coerce.number().int().min(1, "Mindestens ein Tisch pro Abend.").max(10),
  active: z.boolean(),
  notes: text(1000),
});

export function restaurantFromForm(form: FormData) {
  const parsed = RestaurantSchema.safeParse({
    name: form.get("name") ?? "",
    address: form.get("address") ?? "",
    district: form.get("district") ?? "",
    maps_url: form.get("maps_url") ?? "",
    email: form.get("email") ?? "",
    phone: form.get("phone") ?? "",
    weekdays: form.getAll("weekdays"),
    start_time: form.get("start_time") ?? "",
    tables_per_evening: form.get("tables_per_evening") ?? "1",
    active: form.get("active") === "on",
    notes: form.get("notes") ?? "",
  });
  if (!parsed.success) throw new AdminError(parsed.error.issues[0]?.message ?? "Bitte die Angaben prüfen.");
  const r = parsed.data;
  // Wochentage in fester Reihenfolge Mo–So speichern
  const order = ["mo", "di", "mi", "do", "fr", "sa", "so"];
  return {
    ...r,
    district: r.district || null,
    maps_url: r.maps_url || null,
    email: r.email || null,
    phone: r.phone || null,
    notes: r.notes || null,
    weekdays: [...new Set(r.weekdays)].sort((a, b) => order.indexOf(a) - order.indexOf(b)),
  };
}

export async function saveRestaurant(db: Db, id: string | null, values: ReturnType<typeof restaurantFromForm>) {
  if (id) {
    const { data, error } = await db.from("restaurants").update(values).eq("id", id).select("id").maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new AdminError("Lokal nicht gefunden.");
    await logAdmin(db, "Lokal geändert", { detail: values.name });
    return "Gespeichert.";
  }
  must(await db.from("restaurants").insert(values), "Lokal anlegen");
  await logAdmin(db, "Lokal angelegt", { detail: values.name });
  return `${values.name} ist angelegt.`;
}

export async function deleteRestaurant(db: Db, id: string) {
  const { count } = await db.from("dinners").select("id", { count: "exact", head: true }).eq("restaurant_id", id);
  if (count) throw new AdminError("Dieses Lokal hatte schon Dinner und bleibt deshalb gespeichert – bitte stattdessen deaktivieren.");
  const { data } = await db.from("restaurants").delete().eq("id", id).select("name").maybeSingle();
  if (!data) throw new AdminError("Lokal nicht gefunden.");
  await logAdmin(db, "Lokal gelöscht", { detail: (data as { name: string }).name });
  return "Lokal gelöscht.";
}
