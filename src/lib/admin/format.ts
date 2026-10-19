import { TIMEZONE } from "../config";
import type { ApplicationStatus, DinnerStatus, SeatStatus } from "../db";

export type Tone = "green" | "amber" | "blue" | "red" | "gold" | "mist";

export const APP_STATUS: Record<ApplicationStatus, { label: string; tone: Tone }> = {
  onboarding: { label: "Im Gespräch", tone: "mist" },
  submitted: { label: "Eingereicht", tone: "blue" },
  accepted: { label: "Angenommen", tone: "green" },
  waitlist: { label: "Warteliste", tone: "amber" },
  rejected: { label: "Abgelehnt", tone: "red" },
  blocked: { label: "Gesperrt", tone: "red" },
};

export const DINNER_STATUS: Record<DinnerStatus, { label: string; tone: Tone }> = {
  inviting: { label: "Einladungen laufen", tone: "blue" },
  confirmed: { label: "Findet statt", tone: "green" },
  completed: { label: "Vorbei", tone: "mist" },
  postponed: { label: "Verschoben", tone: "amber" },
  cancelled: { label: "Abgesagt", tone: "red" },
};

export const SEAT_STATUS: Record<SeatStatus, { label: string; tone: Tone }> = {
  invited: { label: "Eingeladen", tone: "blue" },
  offered: { label: "Nachrücker-Angebot", tone: "blue" },
  confirmed: { label: "Fix", tone: "green" },
  declined: { label: "Abgelehnt", tone: "mist" },
  expired: { label: "Abgelaufen", tone: "mist" },
  cancelled: { label: "Abgesagt (kostenlos)", tone: "amber" },
  cancelled_late: { label: "Abgesagt (zu spät)", tone: "amber" },
  attended: { label: "War da", tone: "green" },
  no_show: { label: "Nicht erschienen", tone: "red" },
  postponed: { label: "Verschoben", tone: "amber" },
  withdrawn: { label: "Zurückgezogen", tone: "mist" },
  removed: { label: "Vom Team storniert", tone: "red" },
};

export const GENDER: Record<string, string> = { frau: "Frau", mann: "Mann", divers: "divers" };

const short = new Intl.DateTimeFormat("de-AT", {
  timeZone: TIMEZONE,
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
const dayOnly = new Intl.DateTimeFormat("de-AT", { timeZone: TIMEZONE, day: "2-digit", month: "2-digit", year: "numeric" });

/** „Do., 23.10.26, 19:00“ */
export function when(iso: string | null | undefined) {
  return iso ? short.format(new Date(iso)) : "–";
}

/** „23.10.2026“ */
export function day(iso: string | null | undefined) {
  return iso ? dayOnly.format(new Date(iso)) : "–";
}

/** „vor 3 Tagen“, „in 5 Stunden“ */
export function relative(iso: string | null | undefined, now = Date.now()) {
  if (!iso) return "–";
  const diff = new Date(iso).getTime() - now;
  const abs = Math.abs(diff);
  let text: string;
  if (abs < 3600_000) {
    const n = Math.max(1, Math.round(abs / 60_000));
    text = `${n} ${n === 1 ? "Minute" : "Minuten"}`;
  } else if (abs < 48 * 3600_000) {
    const n = Math.round(abs / 3600_000);
    text = `${n} ${n === 1 ? "Stunde" : "Stunden"}`;
  } else {
    text = `${Math.round(abs / 86_400_000)} Tagen`;
  }
  return diff < 0 ? `vor ${text}` : `in ${text}`;
}

const STEP_LABELS: Record<string, string> = {
  abgelaufen: "Abgelaufene Einladungen",
  entscheidung: "Entscheidung 24 h vorher",
  erinnerungen: "Erinnerungen",
  nachDemDinner: "Nach dem Abend",
  amTag: "Am Tag des Tisches",
  gespraechskarten: "Gesprächskarten",
  aufraeumen: "Aufräumen",
  bewerbungen: "Bewerbungen",
  matching: "Tischplanung",
  lebenszeichen: "Lebenszeichen",
  folgeeinladungen: "Folgeeinladungen",
  lernen: "Lernnotizen",
};

const VALUE_LABELS: Record<string, string> = {
  confirmed: "fix",
  cancelled: "abgesagt",
  feedbackRequests: "Feedback-Anfragen",
  wrappedUp: "abgeschlossen",
  profiles: "Profile nachgeholt",
  evaluated: "beantwortet",
  promoted: "nachgerückt",
  created: "neue Tische",
  pool: "im Pool",
  fehler: "Fehler",
};

function value(v: unknown): string {
  if (typeof v === "boolean") return v ? "ja" : "nein";
  if (v && typeof v === "object") {
    return Object.entries(v)
      .map(([k, x]) => `${VALUE_LABELS[k] ?? k} ${String(x)}`)
      .join(", ");
  }
  return String(v);
}

/** Bericht des Durchlaufs in einer Zeile pro Schritt */
export function describeTick(report: Record<string, unknown>) {
  const lines = Object.entries(report).map(([k, v]) => `${STEP_LABELS[k] ?? k}: ${value(v)}`);
  return ["Durchlauf fertig.", ...lines].join("\n");
}
