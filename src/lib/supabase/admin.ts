import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseUrl } from "./env";

/**
 * Service-Role-Client: umgeht Row Level Security.
 * Nur in Route Handlers verwenden, nachdem der User geprüft wurde.
 */
export function createAdminClient() {
  // Secret Key (aktueller Name, auch von der Supabase-Vercel-Integration gesetzt) oder älterer service_role-Key
  const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
