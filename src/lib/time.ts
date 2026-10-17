import { TIMEZONE } from "./config";

/** Wochentage wie im Profil (wunschtage), Index = JavaScript-getDay() */
export const WEEKDAY_CODES = ["so", "mo", "di", "mi", "do", "fr", "sa"] as const;
export type WeekdayCode = (typeof WEEKDAY_CODES)[number];

export const WEEKDAY_NAMES: Record<WeekdayCode, string> = {
  mo: "Montag",
  di: "Dienstag",
  mi: "Mittwoch",
  do: "Donnerstag",
  fr: "Freitag",
  sa: "Samstag",
  so: "Sonntag",
};

/** Ein Kalendertag in Wien */
export type LocalDate = { year: number; month: number; day: number };

export const HOUR = 60 * 60 * 1000;
export const DAY = 24 * HOUR;

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function viennaParts(date: Date) {
  const p = Object.fromEntries(partsFormatter.formatToParts(date).map((x) => [x.type, x.value]));
  return { year: +p.year, month: +p.month, day: +p.day, hour: +p.hour, minute: +p.minute, second: +p.second };
}

/** Abstand Wiener Ortszeit zu UTC in Millisekunden (Sommer-/Winterzeit berücksichtigt) */
function offsetMs(date: Date) {
  const p = viennaParts(date);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** Wiener Datum + Uhrzeit ("19:00" oder "19:00:00") → Zeitpunkt */
export function viennaToUtc(local: LocalDate, time: string): Date {
  const [h, m] = time.split(":").map(Number);
  const guess = Date.UTC(local.year, local.month - 1, local.day, h, m);
  const first = guess - offsetMs(new Date(guess));
  // zweiter Schritt korrigiert Tage mit Zeitumstellung
  return new Date(guess - offsetMs(new Date(first)));
}

export function viennaDate(date: Date): LocalDate {
  const { year, month, day } = viennaParts(date);
  return { year, month, day };
}

export function addDays(local: LocalDate, days: number): LocalDate {
  const d = new Date(Date.UTC(local.year, local.month - 1, local.day + days));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

export function weekdayOf(local: LocalDate): WeekdayCode {
  return WEEKDAY_CODES[new Date(Date.UTC(local.year, local.month - 1, local.day)).getUTCDay()];
}

export function dateKey(local: LocalDate) {
  return `${local.year}-${String(local.month).padStart(2, "0")}-${String(local.day).padStart(2, "0")}`;
}

const longDate = new Intl.DateTimeFormat("de-AT", { timeZone: TIMEZONE, weekday: "long", day: "numeric", month: "long" });
const shortDate = new Intl.DateTimeFormat("de-AT", { timeZone: TIMEZONE, weekday: "short", day: "numeric", month: "short" });
const clock = new Intl.DateTimeFormat("de-AT", { timeZone: TIMEZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

/** „Donnerstag, 23. Oktober, 19:00 Uhr“ */
export function formatDateTime(date: Date) {
  return `${longDate.format(date)}, ${clock.format(date)} Uhr`;
}

/** „Donnerstag, 23. Oktober“ */
export function formatDate(date: Date) {
  return longDate.format(date);
}

/** „Do., 23. Okt.“ – kurz, z. B. für SMS */
export function formatShortDate(date: Date) {
  return shortDate.format(date);
}

/** „19:00“ */
export function formatTime(date: Date) {
  return clock.format(date);
}

export function hoursUntil(date: Date | string, now = new Date()) {
  return (new Date(date).getTime() - now.getTime()) / HOUR;
}
