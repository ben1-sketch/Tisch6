import "server-only";
import { randomUUID } from "node:crypto";
import type Stripe from "stripe";
import { z } from "zod";
import { FOUNDER, NO_SHOW_LIMIT, PRICES, TIMING, euro } from "../config";
import { type Application, type Db, type Dinner, type Payment, type Report, type Restaurant, type Seat, OPEN_SEAT, must } from "../db";
import { setAvailability } from "../dinners";
import { eraseApplicant } from "../erase";
import { APP_STATUS } from "./format";
import {
  acceptedMail,
  adminMail,
  blockedMail,
  creditMail,
  dinnerMovedMail,
  dinnerMovedSms,
  discountMail,
  noShowMail,
  refundMail,
  rejectedMail,
  reservationCancelledMail,
  seatRemovedMail,
  waitlistMail,
} from "../messages";
import { type SendResult, notifyAdmin, sendEmail, sendSms } from "../notify";
import { normalizePhone } from "../phone";
import { checkoutExpiry } from "../payments";
import {
  afterSeatChange,
  closeDinner,
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
import { siteUrl } from "../site";
import { refund, stripe } from "../stripe";
import { HOUR, WEEKDAY_CODES, formatDateTime, viennaToUtc } from "../time";

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
  if (app.status !== "submitted" && app.status !== "waitlist" && app.status !== "rejected") {
    throw new AdminError("Annehmen geht nur bei eingereichten, wartenden oder abgelehnten Bewerbungen.");
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
      rejected_at: null,
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

/** Ablehnen – freundliche E-Mail, die Daten werden nach 30 Tagen automatisch gelöscht */
export async function rejectApplicant(db: Db, app: Application) {
  if (!["submitted", "accepted", "waitlist"].includes(app.status)) {
    throw new AdminError("Ablehnen geht bei eingereichten, wartenden oder angenommenen Bewerbungen.");
  }
  if (app.status === "accepted" && (await openSeats(db, app.id)).length) {
    throw new AdminError("Die Person hat offene Plätze – bitte zuerst im Tisch stornieren oder das Profil sperren.");
  }
  const ts = now();
  const { data } = await db
    .from("applications")
    .update({ status: "rejected", rejected_at: ts, available_since: null, under_review: false, waitlist_reason: null, evaluated_at: app.evaluated_at ?? ts })
    .eq("id", app.id)
    .eq("status", app.status)
    .select("id")
    .maybeSingle();
  if (!data) throw stale();
  await sendEmail(db, { to: app.email, content: rejectedMail(app.first_name), kind: "rejected", dedupeKey: `rejected:${app.id}`, applicationId: app.id });
  await logAdmin(db, "Abgelehnt", { applicationId: app.id });
  return `Abgelehnt – die Person wurde freundlich per E-Mail informiert. Die Daten werden nach ${TIMING.rejectedRetentionDays} Tagen gelöscht.`;
}

export async function waitlistApplicant(db: Db, app: Application, reason: keyof typeof WAITLIST_REASONS) {
  if (!["submitted", "accepted", "waitlist"].includes(app.status)) {
    throw new AdminError("Die Warteliste geht nur bei eingereichten, angenommenen oder wartenden Bewerbungen.");
  }
  if (app.status === "waitlist" && app.waitlist_reason === reason) throw new AdminError("Steht schon mit diesem Grund auf der Warteliste.");
  if (app.status === "accepted" && (await openSeats(db, app.id)).length) {
    throw new AdminError("Die Person hat offene Plätze – bitte zuerst beim Tisch stornieren oder zurückziehen.");
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

/** Tisch absagen: alle sechs bekommen sofort E-Mail und SMS; Bezahltes bleibt als Guthaben (oder wird erstattet). */
export async function cancelDinner(db: Db, dinnerId: string, money: "credit" | "refund") {
  const { dinner, restaurant } = await loadDinner(db, dinnerId);
  if (dinner.status !== "inviting" && dinner.status !== "confirmed") throw new AdminError("Nur geplante Tische können abgesagt werden.");
  const { data } = await db
    .from("dinners")
    .update({ status: "cancelled", decided_at: dinner.decided_at ?? now() })
    .eq("id", dinner.id)
    .eq("status", dinner.status)
    .select("id")
    .maybeSingle();
  if (!data) throw stale();
  const guests = await closeDinner(db, dinner, restaurant, { reason: "team", money });
  await logAdmin(db, "Tisch abgesagt", { dinnerId: dinner.id, detail: `${guests} informiert, ${money === "credit" ? "Guthaben bleibt" : "erstattet"}` });
  return `Tisch abgesagt. ${guests} ${guests === 1 ? "Person wurde" : "Personen wurden"} per E-Mail und SMS informiert${
    dinner.reserved_count !== null ? ", das Lokal bekommt eine Stornierung" : ""
  }.`;
}

/**
 * Tisch verschieben (neuer Termin, auf Wunsch anderes Lokal): alle sechs bekommen sofort E-Mail und SMS,
 * wer nicht kann, sagt kostenlos ab. Die 24-Stunden-Entscheidung gilt für den neuen Termin.
 */
export async function moveDinner(db: Db, dinnerId: string, local: string, restaurantId: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!m) throw new AdminError("Bitte Datum und Uhrzeit für den neuen Termin angeben.");
  const startsAt = viennaToUtc({ year: +m[1], month: +m[2], day: +m[3] }, `${m[4]}:${m[5]}`);
  const { dinner, restaurant } = await loadDinner(db, dinnerId);
  if (dinner.status !== "inviting" && dinner.status !== "confirmed") throw new AdminError("Nur geplante Tische können verschoben werden.");
  if (startsAt.getTime() < Date.now() + (TIMING.decisionHoursBefore + 2) * HOUR) {
    throw new AdminError(`Der neue Termin muss mindestens ${TIMING.decisionHoursBefore + 2} Stunden in der Zukunft liegen.`);
  }
  const target = (await db.from("restaurants").select("*").eq("id", restaurantId).maybeSingle()).data as Restaurant | null;
  if (!target) throw new AdminError("Lokal nicht gefunden.");
  if (startsAt.getTime() === new Date(dinner.starts_at).getTime() && target.id === restaurant.id) throw new AdminError("Termin und Lokal sind unverändert.");

  const movedAt = now();
  const { data } = await db
    .from("dinners")
    .update({ starts_at: startsAt.toISOString(), restaurant_id: target.id, moved_at: movedAt, decided_at: null, reserved_count: null })
    .eq("id", dinner.id)
    .eq("starts_at", dinner.starts_at)
    .select("*")
    .maybeSingle();
  if (!data) throw stale();
  const moved = data as Dinner;
  const before = dinnerInfo(dinner, restaurant);
  const after = dinnerInfo(moved, target);
  const stamp = new Date(movedAt).getTime();

  // alte Reservierung stornieren – die neue geht raus, sobald genug zugesagt haben
  if (dinner.reserved_count !== null) {
    const content = reservationCancelledMail({ dinner: before });
    const key = `reservation_moved:${dinner.id}:${stamp}`;
    if (restaurant.email) await sendEmail(db, { to: restaurant.email, content, kind: "reservation_cancelled", dedupeKey: key });
    else await notifyAdmin(db, { ...content, subject: `[Bitte dem Lokal absagen – keine E-Mail hinterlegt] ${content.subject}` }, "reservation_cancelled", key);
  }

  // offene Einladungen enden spätestens vor der neuen Entscheidung
  const latest = startsAt.getTime() - (TIMING.decisionHoursBefore + 1) * HOUR;
  let people = 0;
  for (const seat of await seatsOf(db, dinner.id)) {
    if (!OPEN_SEAT.includes(seat.status)) continue;
    if (seat.status !== "confirmed" && seat.expires_at && new Date(seat.expires_at).getTime() > latest) {
      await db.from("seats").update({ expires_at: new Date(latest).toISOString() }).eq("id", seat.id).in("status", ["invited", "offered"]);
    }
    const app = await loadApplication(db, seat.application_id);
    await sendEmail(db, {
      to: app.email,
      content: dinnerMovedMail({ name: app.first_name, before, after, token: seat.token, wasConfirmed: seat.status === "confirmed" }),
      kind: "dinner_moved",
      dedupeKey: `moved:${seat.id}:${stamp}`,
      applicationId: app.id,
    });
    await sendSms(db, { to: app.phone, body: dinnerMovedSms({ before, after }), kind: "dinner_moved", dedupeKey: `moved_sms:${seat.id}:${stamp}`, applicationId: app.id });
    people++;
  }
  await afterSeatChange(db, moved, target);
  await logAdmin(db, "Tisch verschoben", { dinnerId: dinner.id, detail: `neu: ${formatDateTime(startsAt)}, ${target.name}` });
  return `Verschoben auf ${formatDateTime(startsAt)} (${target.name}). ${people} ${people === 1 ? "Person wurde" : "Personen wurden"} per E-Mail und SMS informiert.`;
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
  if (expires <= Date.now()) throw new AdminError("Der Tisch ist zu nah – keine Verlängerung mehr möglich.");
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
  if (new Date(dinner.starts_at).getTime() > Date.now()) throw new AdminError("Der Tisch hat noch nicht stattgefunden.");
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
  if (dinner.status !== "confirmed") throw new AdminError("Eine Reservierung gibt es erst, wenn der Tisch fix ist.");
  await sendReservation(db, dinner, restaurant, undefined, true);
  await logAdmin(db, "Reservierung erneut gesendet", { dinnerId: dinner.id });
  return restaurant.email ? `Reservierung an ${restaurant.email} gesendet.` : "Beim Lokal ist keine E-Mail hinterlegt – die Reservierung ging an ADMIN_EMAIL.";
}

export async function inviteToDinner(db: Db, dinnerId: string, applicationId: string) {
  const found = await replacementCandidates(db, dinnerId, 100);
  if (!found) throw new AdminError("Dieser Tisch nimmt keine Nachrücker mehr (abgesagt, vorbei oder zu knapp vor Beginn).");
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
    if (seat?.status === "confirmed") throw new AdminError("Der Platz ist noch gebucht – bitte beim Tisch stornieren, dort mit Erstattung.");
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
// Partnerlokale
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
  if (count) throw new AdminError("Dieses Lokal hatte schon Tische und bleibt deshalb gespeichert – bitte stattdessen deaktivieren.");
  const { data } = await db.from("restaurants").delete().eq("id", id).select("name").maybeSingle();
  if (!data) throw new AdminError("Lokal nicht gefunden.");
  await logAdmin(db, "Lokal gelöscht", { detail: (data as { name: string }).name });
  return "Lokal gelöscht.";
}

/** Häufige Antworten von Twilio (Fehlercode) und Resend (Text) – mit dem, was zu tun ist */
const TEST_HINTS: [number | RegExp, string][] = [
  // Twilio meldet auch die fehlende Identitätsprüfung mit Code 20003 – deshalb zuerst auf den Text prüfen
  [/compliance profile|trust hub|kyc/i, "Twilio verlangt zuerst die Identitätsprüfung: bei Twilio unter Trust Hub → Profiles das Primary profile ausfüllen und auf „Twilio Approved“ warten."],
  [20003, "TWILIO_ACCOUNT_SID oder TWILIO_AUTH_TOKEN in Vercel stimmt nicht."],
  [21408, "Twilio darf in dieses Land noch keine SMS schicken: bei Twilio unter Messaging → Settings → Geo permissions das Land (z. B. Austria) anhaken."],
  [21608, "Das Twilio-Konto ist noch im Testmodus und schickt nur an bestätigte Nummern – Konto bei Twilio upgraden."],
  [21211, "Die Handynummer ist ungültig."],
  [/messaging service/i, "TWILIO_MESSAGING_SERVICE_SID (MG…) prüfen – und ob im Messaging Service der Absender Tisch6 hinterlegt ist."],
  [/api key/i, "RESEND_API_KEY in Vercel stimmt nicht."],
  [/domain is not verified|verify a domain/i, "Die Domain aus EMAIL_FROM ist bei Resend noch nicht bestätigt."],
  [/`from`/i, "EMAIL_FROM hat das falsche Format – richtig ist z. B. Tisch6 <info@tisch6.at>."],
];

/** Was Resend bzw. Twilio beim Testversand zurückgemeldet hat (steht im Versandprotokoll) */
async function testFailure(db: Db, dedupeKey: string) {
  const row = (await db.from("notifications").select("error").eq("dedupe_key", dedupeKey).maybeSingle()).data as { error: string | null } | null;
  const raw = row?.error ?? "";
  let body: { code?: number; message?: string } = {};
  try {
    body = JSON.parse(raw);
  } catch {
    // Kein JSON (z. B. abgeschnitten) – dann den Text so anzeigen
  }
  const message = body.message ?? raw;
  const hint = TEST_HINTS.find(([match]) => (typeof match === "number" ? body.code === match : match.test(message)))?.[1];
  return [hint, message && `(${message})`].filter(Boolean).join(" ") || "ohne Begründung.";
}

async function testLine(db: Db, label: string, result: SendResult, dedupeKey: string, texts: { sent: string; logged: string }) {
  if (result === "sent") return { ok: true, line: `${label}: ${texts.sent}` };
  if (result === "logged") return { ok: false, line: `${label}: ${texts.logged}` };
  if (result === "failed") return { ok: false, line: `${label}: fehlgeschlagen – ${await testFailure(db, dedupeKey)}` };
  return { ok: false, line: `${label}: gerade nicht erreichbar – bitte gleich nochmal versuchen.` };
}

/** Testversand über Resend und Twilio: E-Mail an ADMIN_EMAIL, SMS an die eingetragene Nummer */
export async function sendTestMessages(db: Db, rawPhone: string) {
  const phone = rawPhone.trim() ? normalizePhone(rawPhone) : null;
  if (rawPhone.trim() && !phone) throw new AdminError("Die Handynummer stimmt nicht – z. B. 0660 1234567 oder +43 660 1234567.");

  const results: { ok: boolean; line: string }[] = [];
  const admin = process.env.ADMIN_EMAIL;
  if (!admin) {
    results.push({ ok: false, line: "E-Mail: ADMIN_EMAIL fehlt in Vercel – an diese Adresse geht die Test-E-Mail." });
  } else {
    const key = `test:email:${randomUUID()}`;
    const content = adminMail("Test-E-Mail", ["Wenn du das liest, funktioniert der E-Mail-Versand von Tisch6. Du musst nichts weiter tun."]);
    const result = await sendEmail(db, { to: admin, content, kind: "test", dedupeKey: key });
    results.push(
      await testLine(db, "E-Mail", result, key, {
        sent: `ist an ${admin} raus ✓ – schau in dein Postfach, notfalls im Spam-Ordner.`,
        logged: "RESEND_API_KEY fehlt in Vercel – die E-Mail wurde nur protokolliert.",
      }),
    );
  }

  if (!phone) {
    results.push({ ok: true, line: "SMS: keine Handynummer eingetragen – nicht getestet." });
  } else {
    const key = `test:sms:${randomUUID()}`;
    const body = "Tisch6: Test-SMS. Wenn du das liest, funktioniert der SMS-Versand.";
    const result = await sendSms(db, { to: phone, body, kind: "test", dedupeKey: key });
    results.push(
      await testLine(db, "SMS", result, key, {
        sent: `Twilio hat sie angenommen ✓ – sie sollte in einer Minute an ${phone} ankommen.`,
        logged: "Twilio ist in Vercel nicht vollständig eingetragen (was fehlt, steht unter Einrichtung) – die SMS wurde nur protokolliert.",
      }),
    );
  }

  await logAdmin(db, "Versand getestet");
  const message = results.map((r) => r.line).join("\n");
  if (results.some((r) => !r.ok)) throw new AdminError(message);
  return message;
}

/** Testzahlung aus dem Adminbereich – an diesen Protokolleinträgen erkennt die Übersicht den Stand */
export const PAYMENT_TEST = {
  started: "Testzahlung gestartet",
  arrived: "Testzahlung angekommen",
  refundFailed: "Testzahlung angekommen, Erstattung fehlgeschlagen",
} as const;
const PAYMENT_TEST_CENTS = 100;

/** Öffnet die echte Stripe-Bezahlseite über 1 € – ohne Platz und ohne Verbuchung */
export async function startTestPayment(db: Db) {
  const s = stripe();
  if (!s) throw new AdminError("STRIPE_SECRET_KEY fehlt in Vercel.");
  const metadata = { kind: "test" };
  const name = "Tisch6 · Testzahlung (wird sofort erstattet)";
  let session: Stripe.Checkout.Session;
  try {
    session = await s.checkout.sessions.create({
      mode: "payment",
      locale: "de",
      line_items: [{ quantity: 1, price_data: { currency: "eur", unit_amount: PAYMENT_TEST_CENTS, product_data: { name } } }],
      metadata,
      payment_intent_data: { metadata, description: name },
      success_url: `${siteUrl()}/admin`,
      cancel_url: `${siteUrl()}/admin`,
      expires_at: checkoutExpiry(),
    });
  } catch (e) {
    throw new AdminError(`Stripe lehnt ab – STRIPE_SECRET_KEY in Vercel prüfen. (${e instanceof Error ? e.message : String(e)})`);
  }
  if (!session.url) throw new AdminError("Stripe hat keine Bezahlseite geliefert – bitte nochmal versuchen.");
  await logAdmin(db, PAYMENT_TEST.started, { detail: euro(PAYMENT_TEST_CENTS) });
  return session.url;
}

/** Stripe meldet die Testzahlung: nichts verbuchen, sofort erstatten, Ergebnis ins Protokoll */
export async function confirmTestPayment(db: Db, session: Stripe.Checkout.Session) {
  const paymentIntent = typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? null);
  const amount = euro(session.amount_total ?? 0);
  try {
    if (!paymentIntent) throw new Error("Stripe hat keine Zahlungsnummer mitgeschickt");
    await refund(paymentIntent);
  } catch (e) {
    // Stripe wiederholt Meldungen manchmal – dann ist schon erstattet
    if ((e as { code?: string }).code === "charge_already_refunded") return "Testzahlung schon erstattet";
    await logAdmin(db, PAYMENT_TEST.refundFailed, { detail: `${amount} bitte in Stripe von Hand erstatten (${e instanceof Error ? e.message : String(e)})` });
    return "Testzahlung, Erstattung fehlgeschlagen";
  }
  await logAdmin(db, PAYMENT_TEST.arrived, { detail: `${amount} sofort erstattet` });
  return "Testzahlung erstattet";
}
