import "server-only";
import type { Locale } from "./config";
import type de from "./dictionaries/de";

export type Dictionary = typeof de;

const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  de: () => import("./dictionaries/de").then((m) => m.default),
};

export const getDictionary = (locale: Locale) => dictionaries[locale]();
