import "server-only";
import { db } from "./db";
import { isSupabaseConfigured } from "./supabase/env";
import type { WeekdayCode } from "./time";

/** Montag zuerst – so liest man Wochentage */
const ORDER: WeekdayCode[] = ["mo", "di", "mi", "do", "fr", "sa", "so"];
const ADVERB: Record<WeekdayCode, string> = {
  mo: "montags",
  di: "dienstags",
  mi: "mittwochs",
  do: "donnerstags",
  fr: "freitags",
  sa: "samstags",
  so: "sonntags",
};

/**
 * Wochentage, an denen mindestens ein aktives Partnerlokal einen Tisch für Tisch6 hat.
 * Ohne Datenbank-Zugang (z. B. lokal ohne .env) oder bei einem Fehler: null.
 */
export async function dinnerWeekdays(): Promise<WeekdayCode[] | null> {
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!isSupabaseConfigured || !secret) return null;
  try {
    const { data, error } = await db().from("restaurants").select("weekdays").eq("active", true);
    if (error || !data) return null;
    const days = new Set(data.flatMap((r) => (r.weekdays ?? []) as string[]));
    return ORDER.filter((d) => days.has(d));
  } catch {
    return null;
  }
}

/** „mittwochs, donnerstags und sonntags“ */
export function weekdaysText(days: WeekdayCode[]) {
  const words = ORDER.filter((d) => days.includes(d)).map((d) => ADVERB[d]);
  return words.length > 1 ? `${words.slice(0, -1).join(", ")} und ${words.at(-1)}` : (words[0] ?? "");
}

/** Für Texte auf der Seite: „derzeit mittwochs, donnerstags und sonntags“ bzw. „an jedem Tag der Woche“ */
export function dinnerDaysPhrase(days: WeekdayCode[] | null) {
  if (!days?.length) return "an ausgewählten Abenden";
  if (days.length === ORDER.length) return "an jedem Tag der Woche";
  return `derzeit ${weekdaysText(days)}`;
}
