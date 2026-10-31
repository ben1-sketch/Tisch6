import "server-only";
import { createHash } from "node:crypto";
import { FOUNDER, PRICES, TABLE, TABLE_EXCEPTIONS, TIMING, euro } from "./config";
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
import {
  type Gender,
  type Person,
  ageMiss,
  commonDays,
  kitchenNotes,
  knowEachOther,
  otherGender,
  tableSummary,
  toPerson,
  validGroup,
} from "./matching-core";
import {
  type DinnerInfo,
  adminMail,
  cancelledMail,
  confirmedMail,
  creditKeptText,
  dinnerCancelledMail,
  dinnerCancelledSms,
  expiredMail,
  invitationMail,
  inviteReminderMail,
  inviteReminderSms,
  lastCallSms,
  refundText,
  replacementSms,
  reservationCancelledMail,
  reservationMail,
  seatUrl,
  tableCompleteMail,
} from "./messages";
import { notifyAdmin, sendEmail, sendPushOrSms } from "./notify";
import { loadPool } from "./pool";
import { refund } from "./stripe";
import { HOUR, WEEKDAY_NAMES, addDays, hoursUntil, viennaDate, viennaHour, viennaToUtc, weekdayOf } from "./time";

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

export async function seatsOf(db: Db, dinnerId: string) {
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
    const { data: owned } = await db.from("packages").select("id").eq("application_id", app.id).eq("kind", "founder").limit(1);
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
    const what = offer.package.kind === "founder" ? "deinem Gründungspaket" : "deinem Guthaben";
    return `mit ${what} (noch ${n} ${n === 1 ? "Tischteilnahme" : "Tischteilnahmen"})`;
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
    await sendPushOrSms(db, {
      to: o.app.phone,
      body: replacementSms({ dinner: info, token: o.seat.token }),
      url: seatUrl(o.seat.token),
      kind: "replacement_offer",
      dedupeKey: `invite_sms:${o.seat.id}`,
      applicationId: o.app.id,
    });
  }
}

/**
 * Offene Einladung: zur Halbzeit der Zusagefrist eine Erinnerung per E-Mail und SMS – nur tagsüber,
 * nicht während jemand gerade bezahlt, und nur, wenn noch mindestens zwei Stunden bleiben.
 */
export async function remindOpenInvitations(db: Db, now = new Date()) {
  const hour = viennaHour(now);
  if (hour < TIMING.daytimeFromHour || hour >= TIMING.daytimeToHour) return 0;
  const open = must(
    await db
      .from("seats")
      .select("*")
      .in("status", ["invited", "offered"])
      .gt("expires_at", new Date(now.getTime() + 2 * HOUR).toISOString()),
    "Offene Einladungen laden",
  ) as Seat[];
  const due = open.filter((s) => {
    const total = new Date(s.expires_at!).getTime() - new Date(s.created_at).getTime();
    const paying = s.checkout_started_at && now.getTime() - new Date(s.checkout_started_at).getTime() < 35 * 60_000;
    return new Date(s.expires_at!).getTime() - now.getTime() <= total / 2 && !paying;
  });
  if (!due.length) return 0;
  const done = new Set(
    (
      must(
        await db
          .from("notifications")
          .select("dedupe_key")
          .eq("kind", "invite_reminder")
          .in("dedupe_key", due.map((s) => `invite_reminder:${s.id}`)),
        "Erinnerungen laden",
      ) as { dedupe_key: string }[]
    ).map((n) => n.dedupe_key),
  );

  let sent = 0;
  for (const seat of due) {
    if (done.has(`invite_reminder:${seat.id}`)) continue;
    const { dinner, restaurant } = await loadDinner(db, seat.dinner_id);
    if (dinner.status !== "inviting" && dinner.status !== "confirmed") continue;
    const app = await loadApplication(db, seat.application_id);
    const info = dinnerInfo(dinner, restaurant);
    const deadline = new Date(seat.expires_at!);
    const confirmed = (await seatsOf(db, dinner.id)).filter((s) => s.status === "confirmed").length;
    const result = await sendEmail(db, {
      to: app.email,
      content: inviteReminderMail({ name: app.first_name, dinner: info, priceText: priceText(await offerFor(db, app)), deadline, token: seat.token, confirmed }),
      kind: "invite_reminder",
      dedupeKey: `invite_reminder:${seat.id}`,
      applicationId: app.id,
    });
    if (result === "duplicate" || result === "retry") continue;
    await sendPushOrSms(db, {
      to: app.phone,
      body: inviteReminderSms({ dinner: info, deadline, token: seat.token }),
      url: seatUrl(seat.token),
      kind: "invite_reminder",
      dedupeKey: `invite_reminder_sms:${seat.id}`,
      applicationId: app.id,
    });
    sent++;
  }
  return sent;
}

/**
 * Letzte Erinnerung fällig? Nur tagsüber, und sobald die Zusagefrist in höchstens lastCallHours endet. Endet sie vor
 * 11 Uhr am nächsten Morgen (nachts oder ganz früh), schon am Abend davor ab lastCallEveningHour – sonst käme die
 * Nachricht mitten in der Nacht oder zu knapp. Mindestens eine Stunde zum Bezahlen muss noch bleiben.
 */
export function lastCallDue(expiresAt: Date, now: Date) {
  const hour = viennaHour(now);
  if (hour < TIMING.daytimeFromHour || hour >= TIMING.daytimeToHour) return false;
  const left = expiresAt.getTime() - now.getTime();
  if (left < HOUR) return false;
  if (left <= TIMING.lastCallHours * HOUR) return true;
  const nextMorning = viennaToUtc(addDays(viennaDate(now), 1), `${TIMING.daytimeFromHour}:00`);
  return hour >= TIMING.lastCallEveningHour && expiresAt.getTime() < nextMorning.getTime() + 2 * HOUR;
}

/**
 * Letzte Erinnerung kurz vor Ablauf der Zusagefrist (Wunsch des Inhabers): eine SMS – oder Push an die Tisch6-App –
 * an alle, die noch nicht bezahlt haben, einmal je Platz (siehe lastCallDue). Nicht bei kurzen Fristen wie bei
 * Nachrückern (dort reicht die Erinnerung zur Halbzeit) und nicht, während jemand gerade bezahlt.
 * send: zum Testen austauschbar.
 */
export async function sendLastCalls(db: Db, now = new Date(), send = sendPushOrSms) {
  const open = must(
    await db.from("seats").select("*").in("status", ["invited", "offered"]).gt("expires_at", now.toISOString()),
    "Offene Einladungen laden",
  ) as Seat[];
  const due = open.filter((s) => {
    const expires = new Date(s.expires_at!);
    const total = expires.getTime() - new Date(s.created_at).getTime();
    const paying = s.checkout_started_at && now.getTime() - new Date(s.checkout_started_at).getTime() < 35 * 60_000;
    return total >= 24 * HOUR && !paying && lastCallDue(expires, now);
  });
  if (!due.length) return 0;
  const keys = due.flatMap((s) => [`last_call:${s.id}`, `last_call:${s.id}:push`]);
  const done = new Set(
    (must(await db.from("notifications").select("dedupe_key").in("dedupe_key", keys), "Letzte Erinnerungen laden") as { dedupe_key: string }[]).map(
      (n) => n.dedupe_key.replace(/:push$/, ""),
    ),
  );

  let sent = 0;
  for (const seat of due) {
    if (done.has(`last_call:${seat.id}`)) continue;
    const { dinner, restaurant } = await loadDinner(db, seat.dinner_id);
    if (dinner.status !== "inviting" && dinner.status !== "confirmed") continue;
    const app = await loadApplication(db, seat.application_id);
    const result = await send(db, {
      to: app.phone,
      body: lastCallSms({ dinner: dinnerInfo(dinner, restaurant), deadline: new Date(seat.expires_at!), token: seat.token }),
      url: seatUrl(seat.token),
      kind: "invite_last_call",
      dedupeKey: `last_call:${seat.id}`,
      applicationId: app.id,
    });
    if (result === "sent") sent++;
  }
  return sent;
}

/** Ein Tisch, der noch Nachrücker nimmt: wer dabei ist, was fehlt, wer schon gefragt wurde. Null, wenn er keine mehr nimmt. */
async function openTable(db: Db, dinnerId: string) {
  const { dinner, restaurant } = await loadDinner(db, dinnerId);
  if (dinner.status !== "inviting" && dinner.status !== "confirmed") return null;
  const hours = hoursUntil(dinner.starts_at);
  if (hours < TIMING.lastReplacementHoursBefore) return null;
  // Vor der Entscheidung (24 Stunden vorher) muss noch Zeit zum Zusagen bleiben
  if (!dinner.decided_at && hours < TIMING.decisionHoursBefore + 2) return null;

  const seats = await seatsOf(db, dinner.id);
  const members = await tablePeople(db, seats);
  const missing = {
    frau: TABLE.perGender - members.filter((m) => m.gender === "frau").length,
    mann: TABLE.perGender - members.filter((m) => m.gender === "mann").length,
  };
  const tried = new Set(seats.map((s) => s.application_id));
  return { dinner, restaurant, members, missing, tried, weekday: weekdayOf(viennaDate(new Date(dinner.starts_at))) };
}

type OpenTable = NonNullable<Awaited<ReturnType<typeof openTable>>>;

/** Passt die Person auf einen freien Platz? Alter, Wunsch-Altersspannen, Wochentag, keine Begleitung am Tisch, noch nicht gefragt. */
function fitsTable(table: OpenTable, p: Person) {
  if (table.missing[p.gender] <= 0 || table.tried.has(p.id) || (p.days && !p.days.includes(table.weekday))) return false;
  const exception = TABLE_EXCEPTIONS[table.dinner.id];
  if (!exception || (exception.only && !exception.only.includes(p.id))) return validGroup([...table.members, p]);
  // Ausnahme des Inhabers: nur Altersabstand (erweitert), gesuchtes Geschlecht und keine Begleitung am Tisch
  const ages = [...table.members, p].map((m) => m.age);
  return (
    Math.max(...ages) - Math.min(...ages) <= exception.maxAgeSpan &&
    p.seeks.includes(otherGender(p.gender)) &&
    !table.members.some((m) => knowEachOther(m, p))
  );
}

/** Wie viele Jahre liegt die Person außerhalb der Altersspanne am Tisch? */
function ageGap(table: OpenTable, p: Person) {
  const ages = table.members.map((m) => m.age);
  return ages.length ? Math.max(0, Math.min(...ages) - p.age, p.age - Math.max(...ages)) : 0;
}

const ageRange = (p: Person) =>
  p.minAge !== null && p.maxAge !== null ? `von ${p.minAge} bis ${p.maxAge}` : p.minAge !== null ? `ab ${p.minAge}` : `bis ${p.maxAge}`;
const plural = (g: Gender) => (g === "frau" ? "Frauen" : "Männer");

/**
 * Warum passt die Person nach den Regeln nicht an den Tisch – in einfachen Worten für den Adminbereich.
 * Null, wenn sie gar nicht infrage kommt: kein Platz für ihr Geschlecht, schon gefragt, sucht das andere Geschlecht
 * nicht oder kennt jemanden am Tisch (Begleitung, Einladungslink).
 */
export function fitProblems(table: OpenTable, p: Person): string[] | null {
  if (table.missing[p.gender] <= 0 || table.tried.has(p.id) || !p.seeks.includes(otherGender(p.gender))) return null;
  if (table.members.some((m) => knowEachOther(m, p))) return null;
  const problems: string[] = [];
  if (p.days && !p.days.includes(table.weekday)) problems.push(`hat laut Bewerbung ${WEEKDAY_NAMES[table.weekday].toLowerCase()}s keine Zeit`);
  const ages = [...table.members, p].map((m) => m.age);
  const span = Math.max(...ages) - Math.min(...ages);
  if (span > TABLE.maxAgeSpan) problems.push(`${span} Jahre Altersabstand am Tisch (sonst höchstens ${TABLE.maxAgeSpan})`);
  const others = table.members.filter((m) => m.gender !== p.gender);
  const tooFar = others.filter((m) => ageMiss(p, m) > TABLE.ageTolerance);
  if (tooFar.length) {
    problems.push(`wünscht sich ${plural(otherGender(p.gender))} ${ageRange(p)} – ${tooFar.map((m) => `${m.firstName} ist ${m.age}`).join(", ")}`);
  }
  for (const m of others) if (ageMiss(m, p) > TABLE.ageTolerance) problems.push(`${m.firstName} (${m.age}) wünscht sich ${plural(p.gender)} ${ageRange(m)}`);
  const own = p.axes[0];
  const group = table.members.map((m) => m.axes[0]);
  if (group.length && Math.max(own, ...group) - Math.min(own, ...group) > TABLE.maxEnergySpread) {
    problems.push(
      own < Math.min(...group) ? "deutlich ruhiger als die anderen am Tisch" : own > Math.max(...group) ? "deutlich lebhafter als die anderen am Tisch" : "Temperament passt nicht ganz zur Runde",
    );
  }
  if (!problems.length && !commonDays([...table.members, p]).length) problems.push("die Wunschtage passen nicht zur Runde");
  return problems;
}

/** Ein Tisch, der Nachrücker nimmt, mit dem Pool – geladen nur, wenn gerade ein Platz frei ist */
async function openTableWithPool(db: Db, dinnerId: string) {
  const table = await openTable(db, dinnerId);
  if (!table) return null;
  const pool = table.missing.frau > 0 || table.missing.mann > 0 ? await loadPool(db) : [];
  return { table, pool };
}

/**
 * Wer nach den Regeln passt, wer am längsten wartet zuerst – bei einer Ausnahme des Inhabers zuerst die dort genannten
 * Personen in ihrer Reihenfolge, dann wer altersmäßig am nächsten dran ist.
 */
function fittingCandidates(table: OpenTable, pool: Person[], g: Gender, limit: number) {
  const exception = TABLE_EXCEPTIONS[table.dinner.id];
  const only = exception?.only ?? [];
  const rank = (p: Person) => (only.includes(p.id) ? only.indexOf(p.id) : only.length);
  return pool
    .filter((p) => p.gender === g && fitsTable(table, p))
    .sort((a, b) => rank(a) - rank(b) || (exception ? ageGap(table, a) - ageGap(table, b) : 0) || a.waitingSince - b.waitingSince)
    .slice(0, limit);
}

/** Mögliche Nachrücker je Geschlecht (siehe fittingCandidates). Null, wenn das Dinner keine Nachrücker mehr nimmt. */
export async function replacementCandidates(db: Db, dinnerId: string, limit = 1) {
  const found = await openTableWithPool(db, dinnerId);
  if (!found) return null;
  const { table, pool } = found;
  return { ...table, candidates: { frau: fittingCandidates(table, pool, "frau", limit), mann: fittingCandidates(table, pool, "mann", limit) } };
}

/** „Knapp daneben“ heißt: höchstens so viele Gründe, warum die Person nicht passt */
const NEAR_MISS_MAX_PROBLEMS = 2;

/**
 * Für den Adminbereich: passende Nachrücker und wer knapp danebenliegt – mit dem Grund, wer die wenigsten Gründe hat
 * zuerst. Wer knapp danebenliegt, kann der Inhaber trotzdem einladen (inviteAnyway).
 */
export async function replacementOptions(db: Db, dinnerId: string, limit = 5) {
  const found = await openTableWithPool(db, dinnerId);
  if (!found) return null;
  const { table, pool } = found;
  const nearMisses = (g: Gender) =>
    pool
      .filter((p) => p.gender === g && !fitsTable(table, p))
      .flatMap((p) => {
        const problems = fitProblems(table, p);
        return problems?.length && problems.length <= NEAR_MISS_MAX_PROBLEMS ? [{ person: p, problems }] : [];
      })
      .sort((a, b) => a.problems.length - b.problems.length || a.person.waitingSince - b.person.waitingSince)
      .slice(0, limit);
  return {
    ...table,
    candidates: { frau: fittingCandidates(table, pool, "frau", limit), mann: fittingCandidates(table, pool, "mann", limit) },
    nearMisses: { frau: nearMisses("frau"), mann: nearMisses("mann") },
  };
}

/** Kommende Tische, an denen gerade ein Platz frei ist und die noch Nachrücker nehmen */
async function tablesWithGaps(db: Db) {
  const upcoming = must(
    await db
      .from("dinners")
      .select("id")
      .in("status", ["inviting", "confirmed"])
      .gt("starts_at", new Date(Date.now() + TIMING.lastReplacementHoursBefore * HOUR).toISOString()),
    "Kommende Tische laden",
  ) as { id: string }[];
  const tables: OpenTable[] = [];
  for (const { id } of upcoming) {
    const table = await openTable(db, id);
    if (table && (table.missing.frau > 0 || table.missing.mann > 0)) tables.push(table);
  }
  return tables;
}

/** Hätte die Person sofort einen Platz? Dann kommt sie trotz Geschlechterverhältnis nicht auf die Warteliste. */
export async function fitsOpenSeat(db: Db, person: Person) {
  return (await tablesWithGaps(db)).some((table) => fitsTable(table, person));
}

/**
 * Freie Plätze laufend nachbesetzen: Fehlt an einem kommenden Tisch jemand, bekommt die passende Person das Angebot,
 * sobald es sie gibt – nicht nur im Moment einer Absage. Nur tagsüber, weil das Angebot auch per SMS kommt.
 */
export async function fillGaps(db: Db, now = new Date()) {
  const hour = viennaHour(now);
  if (hour < TIMING.daytimeFromHour || hour >= TIMING.daytimeToHour) return 0;
  let offered = 0;
  for (const table of await tablesWithGaps(db)) {
    // Ein offenes Angebot zählt schon als Platz – so geht pro Lücke nur ein Angebot gleichzeitig raus
    if (await findReplacement(db, table.dinner.id, null)) offered++;
  }
  return offered;
}

/** Bietet einer Person einen frei gewordenen Platz an: 12 Stunden Zeit, E-Mail + SMS. */
export async function offerSeat(
  db: Db,
  o: { dinner: Dinner; restaurant: Restaurant; members: Person[] },
  candidate: Person,
) {
  const start = new Date(o.dinner.starts_at).getTime();
  const latest = o.dinner.decided_at ? start - 2 * HOUR : start - TIMING.decisionHoursBefore * HOUR;
  const expires = new Date(Math.min(Date.now() + TIMING.replacementHours * HOUR, latest));
  const { data: seat, error } = await db
    .from("seats")
    .insert({ dinner_id: o.dinner.id, application_id: candidate.id, status: "offered", replacement: true, expires_at: expires.toISOString() })
    .select("*")
    .single();
  if (error) {
    // z. B. gleichzeitig angelegt – der nächste Durchlauf versucht es erneut
    console.error("Nachrücker anlegen", error.message);
    return null;
  }
  await db.from("applications").update({ last_invited_at: new Date().toISOString() }).eq("id", candidate.id);
  const app = await loadApplication(db, candidate.id);
  await sendInvitation(db, { seat: seat as Seat, app, dinner: o.dinner, restaurant: o.restaurant, table: [...o.members, candidate] });
  return seat as Seat;
}

/** Nachrücker suchen: zuerst das Geschlecht des frei gewordenen Platzes, sonst was am Tisch fehlt. */
export async function findReplacement(db: Db, dinnerId: string, gender: Gender | null) {
  const found = await replacementCandidates(db, dinnerId, 1);
  if (!found) return null;
  const order: Gender[] = gender ? [gender, otherGender(gender)] : ["frau", "mann"];
  const g = order.find((x) => found.candidates[x].length > 0);
  return g ? offerSeat(db, found, found.candidates[g][0]) : null;
}

// ---------------------------------------------------------------------------
// Zusagen, Absagen, Ablauf
// ---------------------------------------------------------------------------

/** Kennt jeden Versand pro Termin: nach einer Verschiebung gehen Erinnerungen und Reservierung neu raus. */
export function movedSuffix(dinner: Pick<Dinner, "moved_at">) {
  return dinner.moved_at ? `:${new Date(dinner.moved_at).getTime()}` : "";
}

/**
 * Nach jeder Änderung: Ab fünf Zusagen findet der Tisch statt (Reservierung ans Lokal, bei Änderungen erneut);
 * fällt er vor der Entscheidung wieder unter fünf, laufen die Einladungen weiter. Alle sechs bezahlt → „Tisch komplett“.
 */
export async function afterSeatChange(db: Db, dinner: Dinner, restaurant: Restaurant) {
  const seats = await seatsOf(db, dinner.id);
  const confirmed = seats.filter((s) => s.status === "confirmed");
  if (dinner.status === "inviting" && confirmed.length >= TABLE.minGuests) {
    const { data } = await db.from("dinners").update({ status: "confirmed" }).eq("id", dinner.id).eq("status", "inviting").select("*").maybeSingle();
    if (data) dinner = data as Dinner;
  } else if (dinner.status === "confirmed" && !dinner.decided_at && confirmed.length < TABLE.minGuests) {
    const { data } = await db
      .from("dinners")
      .update({ status: "inviting" })
      .eq("id", dinner.id)
      .eq("status", "confirmed")
      .is("decided_at", null)
      .select("*")
      .maybeSingle();
    if (data) dinner = data as Dinner;
  }
  if (dinner.status === "confirmed") await sendReservation(db, dinner, restaurant, seats);
  if (confirmed.length >= TABLE.size) {
    const info = dinnerInfo(dinner, restaurant);
    for (const seat of confirmed) {
      const app = await loadApplication(db, seat.application_id);
      await sendEmail(db, {
        to: app.email,
        content: tableCompleteMail({ name: app.first_name, dinner: info, token: seat.token }),
        kind: "table_complete",
        dedupeKey: `complete:${seat.id}`,
        applicationId: app.id,
      });
    }
  }
}

/** Meldet dem Lokal Personenzahl und Küchenhinweise (ohne Namen); bei Änderungen erneut. */
export async function sendReservation(db: Db, dinner: Dinner, restaurant: Restaurant, seats?: Seat[], force = false) {
  seats ??= await seatsOf(db, dinner.id);
  const confirmed = seats.filter((s) => s.status === "confirmed");
  if (!confirmed.length || (confirmed.length === dinner.reserved_count && !force)) return;
  const apps = await applicationsByIds(db, confirmed.map((s) => s.application_id));
  const content = reservationMail({
    dinner: dinnerInfo(dinner, restaurant),
    count: confirmed.length,
    kitchen: kitchenNotes(apps.map((a) => ({ diet: a.profile?.ernaehrung ?? null, intolerances: a.profile?.unvertraeglichkeiten ?? [] }))),
    update: dinner.reserved_count !== null,
  });
  // je Änderung eindeutig (vorher → nachher, wer fix ist) – so geht auch „6 → 5 → 6“ jedes Mal ans Lokal, aber nichts doppelt
  const who = createHash("sha256").update(confirmed.map((s) => s.id).sort().join(",")).digest("hex").slice(0, 12);
  const dedupeKey = `reservation:${dinner.id}:${dinner.reserved_count ?? 0}-${confirmed.length}:${who}${movedSuffix(dinner)}${force ? `:${Date.now()}` : ""}`;
  const result = restaurant.email
    ? await sendEmail(db, { to: restaurant.email, content, kind: "reservation", dedupeKey })
    : await notifyAdmin(db, { ...content, subject: `[Bitte ans Lokal weitergeben – keine E-Mail hinterlegt] ${content.subject}` }, "reservation", dedupeKey);
  if (result !== "retry") await db.from("dinners").update({ reserved_count: confirmed.length }).eq("id", dinner.id);
}

export async function confirmSeat(
  db: Db,
  seatId: string,
  p: { paidWith: "stripe" | "package" | "manual"; priceCents: number; paymentId?: string | null; packageId?: string | null; discountId?: string | null },
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
    content: confirmedMail({ name: app.first_name, dinner: dinnerInfo(dinner, restaurant), token: seat.token, appToken: app.magic_token }),
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

export async function genderOf(db: Db, applicationId: string): Promise<Gender | null> {
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
  } else if (seat.paid_with === "manual" && (seat.price_cents ?? 0) > 0) {
    // von Hand bestätigt (z. B. bar bezahlt) – Erstattung kann nur das Team erledigen
    await notifyAdmin(
      db,
      adminMail("Erstattung von Hand", [`Platz ${seat.id} war von Hand bestätigt (${euro(seat.price_cents!)}). Bitte den Betrag selbst erstatten.`]),
      "admin_refund",
      `admin_refund_manual:${seat.id}`,
    );
    text = `Deine Zahlung von ${euro(seat.price_cents!)} erstatten wir dir in den nächsten Tagen.`;
  }
  if (seat.discount_id) await db.from("discounts").update({ used_at: null, used_seat_id: null }).eq("id", seat.discount_id);
  return text;
}

/** Absage nach der Zusage: bis 48 Stunden vorher kostenlos (nach einer Verschiebung durch Tisch6 immer), danach verfällt die Gebühr. */
export async function cancelSeat(db: Db, seat: Seat) {
  const { dinner, restaurant } = await loadDinner(db, seat.dinner_id);
  const movedSinceBooking = Boolean(dinner.moved_at && (!seat.confirmed_at || seat.confirmed_at < dinner.moved_at));
  const late = !movedSinceBooking && hoursUntil(dinner.starts_at) < TIMING.freeCancelHoursBefore;
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

/** Absage durch Tisch6: Bezahltes bleibt als Guthaben erhalten (Paket-Teilnahme zurück ins Paket, sonst eine Gutschrift). */
export async function keepAsCredit(db: Db, seat: Seat): Promise<string | null> {
  if (seat.paid_with === "package" && seat.package_id) {
    const pkg = (await db.from("packages").select("*").eq("id", seat.package_id).single()).data as Package | null;
    if (pkg) {
      await db.from("packages").update({ remaining: pkg.remaining + 1 }).eq("id", pkg.id);
      return refundText({ cents: null, package: true });
    }
    return null;
  }
  if ((seat.paid_with === "stripe" || seat.paid_with === "manual") && (seat.price_cents ?? 0) > 0) {
    const expires = new Date();
    expires.setMonth(expires.getMonth() + FOUNDER.validMonths);
    const { error } = await db
      .from("packages")
      .insert({ application_id: seat.application_id, payment_id: seat.payment_id, kind: "gutschrift", total: 1, remaining: 1, expires_at: expires.toISOString() });
    if (error) {
      await notifyAdmin(db, adminMail("Guthaben anlegen fehlgeschlagen", [`Platz ${seat.id}: ${error.message}`]), "admin_credit", `admin_credit:${seat.id}`);
    }
    return creditKeptText();
  }
  return null;
}

/**
 * Tisch fällt aus: alle offenen Plätze schließen, Bezahltes als Guthaben behalten (oder erstatten),
 * alle per E-Mail und SMS informieren, Reservierung beim Lokal stornieren.
 */
export async function closeDinner(
  db: Db,
  dinner: Dinner,
  restaurant: Restaurant,
  o: { reason: "team" | "zu_wenige"; money: "credit" | "refund" },
) {
  const info = dinnerInfo(dinner, restaurant);
  let guests = 0;
  for (const seat of await seatsOf(db, dinner.id)) {
    if (!OPEN_SEAT.includes(seat.status)) continue;
    const { data } = await db
      .from("seats")
      .update({ status: "removed", ended_at: new Date().toISOString(), expires_at: null })
      .eq("id", seat.id)
      .eq("status", seat.status)
      .select("id")
      .maybeSingle();
    if (!data) continue;
    guests++;
    const wasConfirmed = seat.status === "confirmed";
    const text = wasConfirmed ? (o.money === "credit" ? await keepAsCredit(db, seat) : await giveBack(db, seat)) : null;
    // zurück in den Pool – mit der Wartezeit seit Tischbildung, damit es beim nächsten Mal schneller geht
    if (wasConfirmed) await db.from("applications").update({ available_since: dinner.created_at }).eq("id", seat.application_id).eq("status", "accepted");
    const app = await loadApplication(db, seat.application_id);
    await sendEmail(db, {
      to: app.email,
      content: dinnerCancelledMail({ name: app.first_name, dinner: info, refund: text, wasConfirmed, reason: o.reason }),
      kind: "dinner_cancelled",
      dedupeKey: `dinner_cancelled:${seat.id}`,
      applicationId: app.id,
    });
    // SMS an alle, die sonst kommen würden – beim Absagen durch das Team an alle sechs
    if (wasConfirmed || o.reason === "team") {
      await sendPushOrSms(db, {
        to: app.phone,
        body: dinnerCancelledSms({ dinner: info, wasConfirmed }),
        url: seatUrl(seat.token),
        kind: "dinner_cancelled",
        dedupeKey: `dinner_cancelled_sms:${seat.id}`,
        applicationId: app.id,
      });
    }
  }

  if (dinner.reserved_count !== null) {
    const content = reservationCancelledMail({ dinner: info });
    const key = `reservation_cancelled:${dinner.id}${movedSuffix(dinner)}`;
    if (restaurant.email) await sendEmail(db, { to: restaurant.email, content, kind: "reservation_cancelled", dedupeKey: key });
    else await notifyAdmin(db, { ...content, subject: `[Bitte dem Lokal absagen – keine E-Mail hinterlegt] ${content.subject}` }, "reservation_cancelled", key);
  }
  return guests;
}

/**
 * Entscheidung 24 Stunden vorher: ab fünf Zusagen findet der Tisch statt (Nachrücker laufen weiter),
 * sonst wird er abgesagt – Bezahltes bleibt als Guthaben erhalten.
 */
export async function decideDinners(db: Db) {
  const limit = new Date(Date.now() + TIMING.decisionHoursBefore * HOUR).toISOString();
  const due = must(
    await db.from("dinners").select("*").in("status", ["inviting", "confirmed"]).is("decided_at", null).lte("starts_at", limit),
    "Fällige Tische laden",
  ) as Dinner[];
  const result = { confirmed: 0, cancelled: 0 };
  for (const dinner of due) {
    const restaurant = must(await db.from("restaurants").select("*").eq("id", dinner.restaurant_id).single(), "Lokal laden") as Restaurant;
    const seats = await seatsOf(db, dinner.id);
    const confirmed = seats.filter((s) => s.status === "confirmed");
    const now = new Date().toISOString();

    if (confirmed.length >= TABLE.minGuests) {
      const { data } = await db
        .from("dinners")
        .update({ status: "confirmed", decided_at: now })
        .eq("id", dinner.id)
        .is("decided_at", null)
        .select("*")
        .maybeSingle();
      if (data) {
        result.confirmed++;
        await sendReservation(db, data as Dinner, restaurant, seats);
      }
      continue;
    }

    const { data } = await db
      .from("dinners")
      .update({ status: "cancelled", decided_at: now })
      .eq("id", dinner.id)
      .is("decided_at", null)
      .select("id")
      .maybeSingle();
    if (!data) continue;
    result.cancelled++;
    await closeDinner(db, dinner, restaurant, { reason: "zu_wenige", money: "credit" });
    await notifyAdmin(
      db,
      adminMail("Tisch abgesagt", [
        `${restaurant.name}, ${new Date(dinner.starts_at).toLocaleString("de-AT", { timeZone: "Europe/Vienna" })}: nur ${confirmed.length} Zusagen 24 Stunden vorher.`,
        "Alle wurden per E-Mail und SMS informiert, Bezahltes bleibt als Guthaben erhalten.",
      ]),
      "admin_cancelled",
      `admin_cancelled:${dinner.id}`,
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
