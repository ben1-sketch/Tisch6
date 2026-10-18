import "server-only";
import { cache } from "react";
import { createAdminClient } from "../supabase/admin";
import { supabasePublishableKey, supabaseUrl } from "../supabase/env";

export type DbProblem = "env" | "tables" | "key" | "connection";

export type DbHealth = {
  ok: boolean;
  problem: DbProblem | null;
  /** Adresse des verbundenen Supabase-Projekts, z. B. „abcd1234.supabase.co“ – nicht geheim, steht auch im Browser */
  host: string | null;
  /** Welche Einstellungen in Vercel vorhanden sind (nur ja/nein, nie die Werte) */
  env: { url: boolean; publishableKey: boolean; secretKey: boolean };
  detail: string | null;
};

function supabaseHost() {
  try {
    return supabaseUrl ? new URL(supabaseUrl).host : null;
  } catch {
    return null;
  }
}

/**
 * Ist die Datenbank so verbunden, dass der Adminbereich arbeiten kann?
 * Prüft die Zugangsdaten und die neueste Tabelle (aus 0006) – ohne etwas zu verändern.
 */
export const checkDatabase = cache(async (): Promise<DbHealth> => {
  const env = {
    url: Boolean(supabaseUrl),
    publishableKey: Boolean(supabasePublishableKey),
    secretKey: Boolean(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY),
  };
  const base = { host: supabaseHost(), env };
  if (!env.url || !env.secretKey || !base.host) return { ...base, ok: false, problem: "env", detail: null };

  try {
    const { error } = await createAdminClient().from("affinities").select("id", { count: "exact", head: true });
    if (!error) return { ...base, ok: true, problem: null, detail: null };
    const text = `${error.code ?? ""} ${error.message ?? ""}`;
    const problem: DbProblem = /42P01|PGRST205|does not exist|schema cache/i.test(text)
      ? "tables"
      : /42501|permission denied|Invalid API key|JWT|401/i.test(text)
        ? "key"
        : "connection";
    return { ...base, ok: false, problem, detail: error.message || error.code || null };
  } catch (e) {
    return { ...base, ok: false, problem: "connection", detail: e instanceof Error ? e.message : String(e) };
  }
});
