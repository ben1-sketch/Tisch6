import "server-only";
import { db } from "./db";
import { FOUNDER } from "./config";
import { isSupabaseConfigured } from "./supabase/env";

/**
 * Noch freie Gründungspakete: 300 minus bereits gekaufte.
 * Ohne Datenbank-Zugang (z. B. lokal ohne .env) oder bei einem Fehler: null – die Startseite zeigt dann das volle Kontingent.
 */
export async function founderRemaining(): Promise<number | null> {
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!isSupabaseConfigured || !secret) return null;
  try {
    const { count, error } = await db().from("packages").select("id", { count: "exact", head: true }).eq("kind", "founder");
    if (error) return null;
    return Math.max(0, FOUNDER.limit - (count ?? 0));
  } catch {
    return null;
  }
}
