/**
 * Supabase-Zugangsdaten für Browser und Server. Akzeptiert die aktuellen Namen
 * (Publishable Key – so setzt sie auch die Supabase-Vercel-Integration) und den älteren anon-Key.
 */
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
export const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);
