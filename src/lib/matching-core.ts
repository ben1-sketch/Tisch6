/**
 * Reine Matching-Logik ohne Datenbank: harte Regeln, Bewertung von Runden, Terminwahl.
 * Die KI wählt später nur unter Runden, die alle harten Regeln erfüllen.
 */
import { TABLE, TIMING } from "./config";
import type { Restaurant } from "./db";
import type { Profile } from "./onboarding";
import { DAY, WEEKDAY_CODES, addDays, dateKey, viennaDate, viennaToUtc, weekdayOf, type WeekdayCode } from "./time";

export type Gender = "frau" | "mann";

/** Momentaufnahme eines Persönlichkeitstyps aus der Wiedersehen-Historie */
export type TypeSnapshot = { typ: string | null; axes: number[] | null };
/** Wen eine Person bisher wiedersehen wollte – und wer sie wiedersehen wollte (nur Typen, keine Namen) */
export type History = { liked: TypeSnapshot[]; likedBy: TypeSnapshot[] };

export type Person = {
  id: string;
  firstName: string;
  gender: Gender;
  seeks: string[];
  age: number;
  minAge: number | null;
  maxAge: number | null;
  /** null = an allen Tagen möglich */
  days: WeekdayCode[] | null;
  /** ruhig–extrovertiert, spontan–strukturiert, humorvoll–ernst, bodenständig–abenteuerlustig (je 1–5) */
  axes: [number, number, number, number];
  typ: string;
  summary: string;
  topics: string[];
  /** Humorstil und wie die Person am Tisch redet */
  humor: string | null;
  talkStyle: string | null;
  /** Wofür die Person brennt, was sie an anderen mag, was beim Kennenlernen gar nicht geht */
  passions: string[];
  likesInOthers: string[];
  noGos: string[];
  smoker: string | null;
  childWish: string | null;
  diet: string | null;
  intolerances: string[];
  waitingSince: number;
  buddyId: string | null;
  /** Wer die Person über den persönlichen Einladungslink eingeladen hat */
  referredBy: string | null;
  notes: string[];
  /** ernsthafte Beziehung oder erstmal schauen – nur fürs Matching, wird nie angezeigt */
  goal: "ernsthaft" | "offen" | null;
  /** Wie wichtig Familie ist (1–3) und was der Person im Leben wichtig ist – nur fürs Matching, wird nie angezeigt */
  values: { familie: number | null; wichtig: string[] };
  history: History;
  /** Lokal des letzten Abends – niemand sitzt zweimal hintereinander im selben Lokal */
  lastRestaurantId: string | null;
};

export const AXES = ["ruhig–extrovertiert", "spontan–strukturiert", "humorvoll–ernst", "bodenständig–abenteuerlustig"] as const;

export const otherGender = (g: Gender): Gender => (g === "frau" ? "mann" : "frau");

/** Kennen sich zwei schon – zu zweit beworben oder über den Einladungslink? Dann sitzen sie nie am selben Tisch. */
export const knowEachOther = (a: Person, b: Person) =>
  a.buddyId === b.id || b.buddyId === a.id || a.referredBy === b.id || b.referredBy === a.id;

const clampAxis = (v: number) => Math.min(5, Math.max(1, Math.round(v || 3)));

/** Bewerbung → Person für das Matching (null, wenn Angaben fürs Matching fehlen) */
export function toPerson(
  app: {
    id: string;
    first_name: string;
    profile: Profile | null;
    available_since: string | null;
    buddy_id: string | null;
    referred_by?: string | null;
  },
  extra: { notes?: string[]; history?: History; lastRestaurantId?: string | null } = {},
): Person | null {
  const p = app.profile;
  if (!p || (p.geschlecht !== "frau" && p.geschlecht !== "mann") || !p.alter) return null;
  const days = (p.wunschtage ?? []).filter((d): d is WeekdayCode => (WEEKDAY_CODES as readonly string[]).includes(d));
  const a = p.persoenlichkeit;
  return {
    id: app.id,
    firstName: app.first_name,
    gender: p.geschlecht,
    seeks: p.sucht,
    age: p.alter,
    minAge: p.alter_min,
    maxAge: p.alter_max,
    days: days.length ? days : null,
    axes: [
      clampAxis(a.ruhig_extrovertiert),
      clampAxis(a.spontan_strukturiert),
      clampAxis(a.humorvoll_ernst),
      clampAxis(a.bodenstaendig_abenteuerlustig),
    ],
    typ: a.typ,
    summary: a.zusammenfassung,
    topics: p.gespraechsthemen ?? [],
    // ältere Profile kennen Humor, Gesprächsstil, Begeisterung und No-Gos noch nicht
    humor: p.humor ?? null,
    talkStyle: p.gespraechsstil ?? null,
    passions: p.begeistert_von ?? [],
    likesInOthers: p.mag_an_anderen ?? [],
    noGos: p.no_gos ?? [],
    smoker: p.rauchen,
    childWish: p.kinderwunsch,
    diet: p.ernaehrung,
    intolerances: p.unvertraeglichkeiten ?? [],
    waitingSince: app.available_since ? new Date(app.available_since).getTime() : Date.now(),
    buddyId: app.buddy_id,
    referredBy: app.referred_by ?? null,
    notes: extra.notes ?? [],
    // ältere Profile kennen Beziehungsziel und Werte noch nicht
    goal: p.beziehungsziel ?? null,
    // Glaube und Politik älterer Profile bleiben bewusst außen vor – danach fragt Tisch6 nicht mehr
    values: { familie: p.werte?.familie ?? null, wichtig: p.wichtig_im_leben ?? [] },
    history: extra.history ?? { liked: [], likedBy: [] },
    lastRestaurantId: extra.lastRestaurantId ?? null,
  };
}

/** Wie ähnlich sind zwei Typen? 1 = gleich, 0 = deutlich verschieden (Summe der Achsenabstände ≥ 4) */
export function typeSimilarity(a: number[], b: number[] | null) {
  if (!b || b.length !== 4) return 0;
  const distance = a.reduce((sum, v, i) => sum + Math.abs(v - b[i]), 0);
  return Math.max(0, 1 - distance / 4);
}

/**
 * Lernendes Matching: Wie gut passt jemand am Tisch zu dem, was bei dieser Person bisher funktioniert hat?
 * Je Person zählt das beste Gegenüber – ähnlich zu Typen, die sie wiedersehen wollte bzw. die sie wiedersehen wollten.
 */
export function historyAffinity(people: Person[]) {
  let total = 0;
  for (const p of people) {
    if (!p.history.liked.length && !p.history.likedBy.length) continue;
    let best = 0;
    for (const q of people) {
      if (q.gender === p.gender) continue;
      const liked = Math.max(0, ...p.history.liked.map((h) => typeSimilarity(q.axes, h.axes)));
      const likedBy = Math.max(0, ...p.history.likedBy.map((h) => typeSimilarity(q.axes, h.axes)));
      best = Math.max(best, liked + likedBy);
    }
    total += best;
  }
  return total;
}

/** Wie viele Jahre liegt q außerhalb der Wunsch-Altersspanne von p? (0 = passt) */
export function ageMiss(p: Person, q: Person) {
  if (p.minAge !== null && q.age < p.minAge) return p.minAge - q.age;
  if (p.maxAge !== null && q.age > p.maxAge) return q.age - p.maxAge;
  return 0;
}

/** Passen zwei Personen gegenseitig in die gewünschten Altersspannen (mit kleiner Kulanz)? */
export function mutualAgeOk(a: Person, b: Person) {
  return ageMiss(a, b) <= TABLE.ageTolerance && ageMiss(b, a) <= TABLE.ageTolerance;
}

export function commonDays(people: Person[]): WeekdayCode[] {
  let days: WeekdayCode[] = [...WEEKDAY_CODES];
  for (const p of people) if (p.days) days = days.filter((d) => p.days!.includes(d));
  return days;
}

/**
 * Harte Regeln für eine (Teil-)Runde. complete = genau drei Frauen und drei Männer.
 * Gilt auch beim Nachrücken: bestehende Runde + Kandidat.
 */
export function validGroup(people: Person[], complete = false): boolean {
  const women = people.filter((p) => p.gender === "frau");
  const men = people.filter((p) => p.gender === "mann");
  if (women.length > TABLE.perGender || men.length > TABLE.perGender) return false;
  if (complete && (women.length !== TABLE.perGender || men.length !== TABLE.perGender)) return false;

  const ids = new Set(people.map((p) => p.id));
  if (ids.size !== people.length) return false;

  const ages = people.map((p) => p.age);
  if (Math.max(...ages) - Math.min(...ages) > TABLE.maxAgeSpan) return false;

  if (women.some((w) => !w.seeks.includes("mann")) || men.some((m) => !m.seeks.includes("frau"))) return false;
  for (const w of women) for (const m of men) if (!mutualAgeOk(w, m)) return false;

  // Wer sich schon kennt (zu zweit beworben oder über den Einladungslink), sitzt nie am selben Tisch
  if (people.some((p) => (p.buddyId && ids.has(p.buddyId)) || (p.referredBy && ids.has(p.referredBy)))) return false;

  // Temperament (ruhig–extrovertiert) ähnlich halten – alle sechs im ähnlichen Bereich
  const energy = people.map((p) => p.axes[0]);
  if (Math.max(...energy) - Math.min(...energy) > TABLE.maxEnergySpread) return false;

  return commonDays(people).length > 0;
}

/**
 * Je höher, desto besser: Temperament nah beieinander, Beziehungsziel gleich, Werte nicht weit auseinander,
 * Konstellationen, die bei den Personen schon funktioniert haben, faire Wartezeit, Altersspannen eingehalten.
 */
export function scoreGroup(people: Person[], now: number) {
  let score = 0;
  // Temperament: je näher, desto besser (die harte Grenze prüft validGroup)
  const energy = people.map((p) => p.axes[0]);
  score -= (Math.max(...energy) - Math.min(...energy)) * 4;
  // Die anderen drei Achsen dürfen gemischt sein – etwas Abwechslung belebt das Gespräch
  for (let i = 1; i < 4; i++) {
    const values = people.map((p) => p.axes[i]);
    score += Math.max(...values) - Math.min(...values);
  }
  // nicht mehr als zwei vom gleichen Typ
  const types = new Map<string, number>();
  for (const p of people) types.set(p.typ, (types.get(p.typ) ?? 0) + 1);
  for (const n of types.values()) if (n > 2) score -= (n - 2) * 2;

  // Beziehungsziel möglichst übereinstimmend
  const serious = people.filter((p) => p.goal === "ernsthaft").length;
  const open = people.filter((p) => p.goal === "offen").length;
  if (Math.min(serious, open) === 0 && serious + open === people.length) score += 6;
  score -= Math.min(serious, open) * 5;

  // Lernendes Matching aus der Wiedersehen-Historie
  score += historyAffinity(people) * 3;

  // Längerwartende bevorzugen
  score += people.reduce((sum, p) => sum + Math.min(30, (now - p.waitingSince) / DAY), 0) * 0.5;

  const women = people.filter((p) => p.gender === "frau");
  const men = people.filter((p) => p.gender === "mann");
  for (const w of women) {
    for (const m of men) {
      score -= (ageMiss(w, m) + ageMiss(m, w)) * 2;
      if ((w.childWish === "ja" && m.childWish === "nein") || (w.childWish === "nein" && m.childWish === "ja")) score -= 1.5;
      // Werte: wem Familie sehr wichtig ist, sitzt nicht neben jemandem, dem sie völlig egal ist
      const a = w.values.familie;
      const b = m.values.familie;
      if (a !== null && b !== null && Math.abs(a - b) >= 2) score -= 1;
    }
  }
  return score;
}

const byWaiting = (a: Person, b: Person) => a.waitingSince - b.waitingSince;

function combinations<T>(items: T[], k: number): T[][] {
  if (k === 0) return [[]];
  const out: T[][] = [];
  items.forEach((item, i) => {
    for (const rest of combinations(items.slice(i + 1), k - 1)) out.push([item, ...rest]);
  });
  return out;
}

/** Alle gültigen Runden rund um eine Person (die am längsten wartet), beste zuerst. */
export function candidateTables(anchor: Person, pool: Person[], now: number, limit = 8): Person[][] {
  const g = anchor.gender;
  const o = otherGender(g);
  const near = (p: Person) =>
    Math.abs(p.age - anchor.age) <= TABLE.maxAgeSpan && Math.abs(p.axes[0] - anchor.axes[0]) <= TABLE.maxEnergySpread;
  const sharesDay = (p: Person) => commonDays([anchor, p]).length > 0;
  // gleiches Beziehungsziel zuerst, dann wer länger wartet
  const sameGoal = (p: Person) => anchor.goal === null || p.goal === null || p.goal === anchor.goal;
  const fit = (a: Person, b: Person) => Number(sameGoal(b)) - Number(sameGoal(a)) || byWaiting(a, b);

  const same = pool
    .filter((p) => p.id !== anchor.id && p.gender === g && p.seeks.includes(o) && near(p) && sharesDay(p) && !knowEachOther(anchor, p))
    .sort(fit)
    .slice(0, 10);
  const opposite = pool
    .filter((p) => p.gender === o && p.seeks.includes(g) && near(p) && sharesDay(p) && mutualAgeOk(anchor, p) && !knowEachOther(anchor, p))
    .sort(fit)
    .slice(0, 12);

  const found: { people: Person[]; score: number }[] = [];
  for (const pair of combinations(same, TABLE.perGender - 1)) {
    for (const trio of combinations(opposite, TABLE.perGender)) {
      const people = [anchor, ...pair, ...trio];
      if (validGroup(people, true)) found.push({ people, score: scoreGroup(people, now) });
    }
  }
  return found.sort((a, b) => b.score - a.score).slice(0, limit).map((f) => f.people);
}

export type Slot = { restaurant: Restaurant; startsAt: Date; dateKey: string };

/**
 * Frühester passender Termin: gemeinsamer Wunschtag, Lokal hat an dem Wochentag geöffnet und noch einen freien Tisch.
 * Rotation: niemand sitzt zweimal hintereinander im selben Lokal (außer es gibt keine Alternative),
 * sonst das Lokal, das am längsten nicht dran war. busy zählt bestehende Tische je "lokalId|YYYY-MM-DD".
 */
export function pickSlot(
  people: Person[],
  restaurants: Restaurant[],
  busy: Map<string, number>,
  now: Date,
  options: { onlyDate?: string; preferRestaurantId?: string; lastUsed?: Map<string, number> } = {},
): Slot | null {
  const days = commonDays(people);
  const today = viennaDate(now);
  const active = restaurants.filter((r) => r.active);
  const recent = new Set(people.map((p) => p.lastRestaurantId).filter(Boolean));
  const fresh = active.filter((r) => !recent.has(r.id));
  const lastUsed = options.lastUsed ?? new Map<string, number>();
  const ordered = (fresh.length ? fresh : active).sort(
    (a, b) =>
      Number(b.id === options.preferRestaurantId) - Number(a.id === options.preferRestaurantId) ||
      (lastUsed.get(a.id) ?? 0) - (lastUsed.get(b.id) ?? 0),
  );
  for (let offset = TIMING.leadDaysMin; offset <= TIMING.leadDaysMax; offset++) {
    const day = addDays(today, offset);
    const key = dateKey(day);
    if (options.onlyDate && key !== options.onlyDate) continue;
    const weekday = weekdayOf(day);
    if (!days.includes(weekday)) continue;
    for (const restaurant of ordered) {
      if (!restaurant.weekdays.includes(weekday)) continue;
      if ((busy.get(`${restaurant.id}|${key}`) ?? 0) >= restaurant.tables_per_evening) continue;
      return { restaurant, startsAt: viennaToUtc(day, restaurant.start_time), dateKey: key };
    }
  }
  return null;
}

/** „3 Frauen · 3 Männer · 31–39 Jahre“ */
export function tableSummary(people: { gender: Gender; age: number }[]) {
  const women = people.filter((p) => p.gender === "frau").length;
  const men = people.length - women;
  const ages = people.map((p) => p.age);
  return `${women} ${women === 1 ? "Frau" : "Frauen"} · ${men} ${men === 1 ? "Mann" : "Männer"} · ${Math.min(...ages)}–${Math.max(...ages)} Jahre`;
}

/** Hinweise für die Küche, ohne Namen: „1× vegetarisch, 1× Laktoseintoleranz“ */
export function kitchenNotes(people: { diet: string | null; intolerances: string[] }[]) {
  const counts = new Map<string, number>();
  const add = (key: string) => counts.set(key, (counts.get(key) ?? 0) + 1);
  for (const p of people) {
    if (p.diet && p.diet !== "alles") add(p.diet);
    for (const i of p.intolerances) add(i.trim().toLowerCase());
  }
  return [...counts].map(([k, n]) => `${n}× ${k}`);
}
