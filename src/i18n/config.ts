// Aktive Sprachen. Englisch: "en" hier ergänzen und src/i18n/dictionaries/en.ts anlegen.
export const locales = ["de"] as const;
export const defaultLocale = "de";
export type Locale = (typeof locales)[number];

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}
