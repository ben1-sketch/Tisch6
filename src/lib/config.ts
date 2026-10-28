/**
 * Die Spielregeln von Tisch6 an einer Stelle. Preise in Cent, Zeiten in Stunden bzw. Tagen.
 * Änderungen hier wirken auf Einladungen, Texte und Abläufe gleichermaßen.
 */
export const PRICES = {
  /** Eine Tischteilnahme */
  seat: 3800,
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
  /** Kulanz bei der gewünschten Altersspanne (Jahre) – in der Startphase großzügiger, damit die ersten Tische zustande kommen */
  ageTolerance: 3,
  /** Höchstens so viele Tische pro Abend und Lokal, falls beim Lokal nichts anderes steht */
  defaultTablesPerEvening: 1,
  /** Dauer eines Abends für Kalendereinträge (Stunden) */
  durationHours: 3,
  /** Ab so vielen bestätigten Gästen findet ein Tisch statt */
  minGuests: 5,
  /** Temperament (ruhig–extrovertiert) am Tisch ähnlich: größter Abstand auf der Skala 1–5 – in der Startphase großzügiger */
  maxEnergySpread: 3,
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
  /** So lange vorher fällt die Entscheidung: ab fünf Zusagen findet der Tisch statt, sonst Absage (Stunden) */
  decisionHoursBefore: 24,
  /** Danach werden keine Nachrücker mehr gesucht (Stunden vor Beginn) */
  lastReplacementHoursBefore: 14,
  /** Tischplanung nachts, in diesem Zeitfenster (Stunde in Wien, von–bis) */
  matchingFromHour: 1,
  matchingToHour: 6,
  /** Am Tag des Tisches: Gesprächskarte per E-Mail und Notfallnummer per SMS ab dieser Uhrzeit (Wien) */
  dayOfHour: 9,
  /** Abgelehnte Bewerbungen werden so lange aufbewahrt und dann gelöscht (Tage) */
  rejectedRetentionDays: 30,
  /** Angefangene Bewerbung: erste Erinnerung nach so vielen Stunden ohne Antwort (Stunden) */
  unfinishedReminderHours: 20,
  /** … die zweite und letzte so lange nach der ersten (Tage) */
  unfinishedLastReminderDays: 4,
  /** Erinnerungen, die nicht eilen, nur tagsüber (Stunde in Wien, von–bis) */
  daytimeFromHour: 9,
  daytimeToHour: 20,
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

/**
 * Ausnahmen des Inhabers für einzelne Tische (Dinner-ID): Beim Nachrücken darf der Altersabstand bis maxAgeSpan gehen,
 * Wunschalter und Temperament zählen dort nicht, die Person mit dem kleinsten Altersabstand kommt zuerst.
 * Überall sonst gilt TABLE.maxAgeSpan (höchstens 10 Jahre).
 */
export const TABLE_EXCEPTIONS: Record<string, { maxAgeSpan: number; reason: string }> = {
  // Erster Tisch, 5.11.2026: nach einer Absage passte keine wartende Frau – Wunsch des Inhabers vom 28.10.2026
  "3d6abb86-9555-48ee-a1da-e4306de3a588": { maxAgeSpan: 12, reason: "Erster Tisch: nächstpassende Frau nachrücken" },
};

export type Campaign = {
  id: string;
  /** geht an Wartende dieses Geschlechts */
  to: "frau" | "mann";
  /** Zeitfenster (UTC) – außerhalb geht nichts raus */
  from: string;
  until: string;
  /** „Damit dein Tisch zustande kommt, fehlen uns noch …“ */
  missing: string;
  /** Bitte, den eigenen Einladungslink weiterzuschicken */
  ask: string;
  /** Text vor dem Link in der WhatsApp-Nachricht */
  share: string;
};

/**
 * Aufrufe an Wartende per E-Mail, wenn für Tische bestimmte Menschen fehlen (marketing/WACHSTUM.md):
 * nur im Zeitfenster und tagsüber, an jede Person höchstens einer im Monat. Wer „Stopp“ antwortet,
 * bekommt im Adminbereich „Keine Aufrufe mehr“.
 */
export const CAMPAIGNS: Campaign[] = [
  {
    // Wunsch des Inhabers vom 28.10.2026: für den zweiten Tisch fehlt ein Mann zwischen 35 und 47
    id: "maenner-35-47",
    to: "frau",
    from: "2026-10-29T08:00:00Z",
    until: "2026-10-30T19:00:00Z",
    missing: "Männer zwischen 35 und 47 Jahren",
    ask: "Kennst du einen Single-Mann in diesem Alter, zum Beispiel einen Kollegen, Bruder oder Freund? Dann schick ihm deinen persönlichen Einladungslink:",
    share: "Schau mal: Tisch6 – Dating-Dinner in Wien, drei Frauen und drei Männer an einem Tisch. Gerade werden Männer zwischen 35 und 47 gesucht:",
  },
];

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
