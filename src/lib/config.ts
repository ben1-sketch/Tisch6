/**
 * Die Spielregeln von Tisch6 an einer Stelle. Preise in Cent, Zeiten in Stunden bzw. Tagen.
 * Änderungen hier wirken auf Einladungen, Texte und Abläufe gleichermaßen.
 */
export const PRICES = {
  /** Eine Tischteilnahme */
  seat: 3500,
  /** Nächste Tischteilnahme, wenn eine eingeladene Person an einem Tisch saß */
  referral: 2000,
  /** Nächste Tischteilnahme, wenn ein Dinner zu fünft stattfinden musste */
  fivePerson: 2500,
  /** Gründungspaket: drei Tischteilnahmen */
  founderPackage: 7900,
};

export const FOUNDER = {
  /** Nur für die ersten so vielen Pakete in Wien */
  limit: 300,
  seats: 3,
  validMonths: 12,
  city: "wien",
};

export const TABLE = {
  size: 6,
  perGender: 3,
  maxAgeSpan: 10,
  /** Kulanz bei der gewünschten Altersspanne (Jahre) */
  ageTolerance: 2,
  /** Höchstens so viele Tische pro Abend und Lokal, falls beim Lokal nichts anderes steht */
  defaultTablesPerEvening: 1,
  /** Dauer eines Abends für Kalendereinträge (Stunden) */
  durationHours: 3,
};

export const TIMING = {
  /** Bewerbungen nicht in derselben Minute beantworten (Minuten) */
  evaluationDelayMinutes: 30,
  /** Fehlt das Profil so lange nach dem Gespräch, wird die Auswertung wiederholt (Minuten) */
  profileRetryMinutes: 10,
  /** Zeit zum Zusagen und Bezahlen einer Einladung (Stunden) */
  inviteHours: 48,
  /** Zeit für Nachrücker (Stunden) */
  replacementHours: 12,
  /** Frühester und spätester Termin nach Tischbildung (Tage) */
  leadDaysMin: 6,
  leadDaysMax: 21,
  /** So lange vorher fällt die Entscheidung: Dinner findet statt oder wird verschoben (Stunden) */
  decisionHoursBefore: 72,
  /** Danach werden keine Nachrücker mehr gesucht (Stunden vor Beginn) */
  lastReplacementHoursBefore: 14,
  /** Bis so lange vorher ist eine Absage kostenlos (Stunden) */
  freeCancelHoursBefore: 48,
  /** Wiedersehen-Abfrage „am Tag danach“ (Stunden nach Beginn) */
  feedbackHoursAfter: 14,
  /** Abschluss eines Abends: Folgeeinladung, Rabatte, Nichterscheinen (Tage nach Beginn) */
  wrapUpDaysAfter: 3,
  /** Lebenszeichen, wenn so lange noch kein Tisch gefunden ist (Tage) */
  lebenszeichenDays: 7,
  /** Erinnerung an eine unbeantwortete Folgeeinladung (Tage) */
  nudgeDays: 7,
  /** Nach zwei nicht gebuchten Einladungen nur noch so oft (Tage) */
  monthlyDays: 30,
  /** Meldeknopf: ab so vielen Stunden vor bis so vielen Tagen nach dem Dinner */
  reportFromHoursBefore: 1,
  reportUntilDaysAfter: 7,
};

/** So viele Personen darf ein Geschlecht im aktiven Pool vorne liegen, bevor es auf die Warteliste geht */
export const BALANCE_MARGIN = 4;

/** Ab so vielen Nichterscheinen ohne Absage wird ein Profil gesperrt */
export const NO_SHOW_LIMIT = 2;

/** Ab so vielen „War nicht da“-Angaben gilt eine Person als nicht erschienen */
export const NO_SHOW_VOTES = 2;

export const TIMEZONE = "Europe/Vienna";

export function euro(cents: number) {
  return `${(cents / 100).toLocaleString("de-AT", { minimumFractionDigits: cents % 100 ? 2 : 0 })} €`;
}
