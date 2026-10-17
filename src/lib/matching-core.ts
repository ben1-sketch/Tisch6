/**
 * Reine Matching-Logik ohne Datenbank: harte Regeln, Bewertung von Runden, Terminwahl.
 * Die KI wählt später nur unter Runden, die alle harten Regeln erfüllen.
 */
import { TABLE, TIMING } from "./config";
import type { Restaurant } from "./db";
import type { Profile } from "./onboarding";
import { DAY, WEEKDAY_CODES, addDays, dateKey, viennaDate, viennaToUtc, weekdayOf, type WeekdayCode } from "./time";

export type Gender = "frau" | "mann";

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
  smoker: string | null;
  childWish: string | null;
  diet: string | null;
  intolerances: string[];
  waitingSince: number;
  buddyId: string | null;
  notes: string[];
};

export const AXES = ["ruhig–extrovertiert", "spontan–strukturiert", "humorvoll–ernst", "bodenständig–abenteuerlustig"] as const;

export const otherGender = (g: Gender): Gender => (g === "frau" ? "mann" : "frau");

const clampAxis = (v: number) => Math.min(5, Math.max(1, Math.round(v || 3)));

/** Bewerbung → Person für das Matching (null, wenn Angaben fürs Matching fehlen) */
export function toPerson(
  app: { id: string; first_name: string; profile: Profile | null; available_since: string | null; buddy_id: string | null },
  notes: string[] = [],
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
    smoker: p.rauchen,
    childWish: p.kinderwunsch,
    diet: p.ernaehrung,
    intolerances: p.unvertraeglichkeiten ?? [],
    waitingSince: app.available_since ? new Date(app.available_since).getTime() : Date.now(),
    buddyId: app.buddy_id,
    notes,
  };
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

  // Wer sich zu zweit beworben hat, sitzt nie am selben Tisch
  if (people.some((p) => p.buddyId && ids.has(p.buddyId))) return false;

  return commonDays(people).length > 0;
}

/** Je höher, desto besser: Persönlichkeiten gemischt, Wartezeit fair, Altersspannen eingehalten. */
export function scoreGroup(people: Person[], now: number) {
  let score = 0;
  for (let i = 0; i < 4; i++) {
    const values = people.map((p) => p.axes[i]);
    score += (Math.max(...values) - Math.min(...values)) * 3;
  }
  // mindestens eine eher gesellige Person hält das Gespräch am Laufen
  if (people.some((p) => p.axes[0] >= 4)) score += 3;
  // nicht mehr als zwei vom gleichen Typ
  const types = new Map<string, number>();
  for (const p of people) types.set(p.typ, (types.get(p.typ) ?? 0) + 1);
  for (const n of types.values()) if (n > 2) score -= (n - 2) * 4;
  // Längerwartende bevorzugen
  score += people.reduce((sum, p) => sum + Math.min(30, (now - p.waitingSince) / DAY), 0) * 0.5;

  const women = people.filter((p) => p.gender === "frau");
  const men = people.filter((p) => p.gender === "mann");
  for (const w of women) {
    for (const m of men) {
      score -= (ageMiss(w, m) + ageMiss(m, w)) * 2;
      if ((w.childWish === "ja" && m.childWish === "nein") || (w.childWish === "nein" && m.childWish === "ja")) score -= 1.5;
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
  const near = (p: Person) => Math.abs(p.age - anchor.age) <= TABLE.maxAgeSpan;
  const sharesDay = (p: Person) => commonDays([anchor, p]).length > 0;

  const same = pool
    .filter((p) => p.id !== anchor.id && p.gender === g && p.seeks.includes(o) && near(p) && sharesDay(p) && p.id !== anchor.buddyId)
    .sort(byWaiting)
    .slice(0, 10);
  const opposite = pool
    .filter((p) => p.gender === o && p.seeks.includes(g) && near(p) && sharesDay(p) && mutualAgeOk(anchor, p) && p.id !== anchor.buddyId)
    .sort(byWaiting)
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
 * Frühester passender Termin: gemeinsamer Wunschtag, Lokal hat an dem Wochentag geöffnet
 * und noch einen freien Tisch. busy zählt bestehende Tische je "lokalId|YYYY-MM-DD".
 */
export function pickSlot(
  people: Person[],
  restaurants: Restaurant[],
  busy: Map<string, number>,
  now: Date,
  options: { onlyDate?: string; preferRestaurantId?: string } = {},
): Slot | null {
  const days = commonDays(people);
  const today = viennaDate(now);
  const ordered = [...restaurants].sort(
    (a, b) => Number(b.id === options.preferRestaurantId) - Number(a.id === options.preferRestaurantId),
  );
  for (let offset = TIMING.leadDaysMin; offset <= TIMING.leadDaysMax; offset++) {
    const day = addDays(today, offset);
    const key = dateKey(day);
    if (options.onlyDate && key !== options.onlyDate) continue;
    const weekday = weekdayOf(day);
    if (!days.includes(weekday)) continue;
    for (const restaurant of ordered) {
      if (!restaurant.active || !restaurant.weekdays.includes(weekday)) continue;
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
