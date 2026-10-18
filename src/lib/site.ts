/** „tisch6.at“, „https://tisch6.at/“ oder „ https://www.tisch6.at “ → saubere Adresse mit https://; Unbrauchbares → null */
function origin(value: string | undefined) {
  const v = value?.trim();
  if (!v) return null;
  try {
    return new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`).origin;
  } catch {
    return null;
  }
}

/** Die in Vercel eingetragene Adresse (NEXT_PUBLIC_SITE_URL) – verträgt auch Tippvarianten ohne https:// */
export function configuredSiteUrl() {
  return origin(process.env.NEXT_PUBLIC_SITE_URL);
}

/** Öffentliche Adresse für Links in E-Mails und SMS. */
export function siteUrl() {
  return configuredSiteUrl() ?? origin(process.env.VERCEL_PROJECT_PRODUCTION_URL) ?? "http://localhost:3000";
}
