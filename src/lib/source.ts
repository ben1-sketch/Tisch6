/** Woher eine Bewerbung kommt – Antwort im Bewerbungsformular; Einladungslinks zählen als Empfehlung. */
export const SOURCES = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  google: "Google",
  empfehlung: "Freunde oder Bekannte",
  presse: "Artikel, Radio oder Zeitung",
  sonstiges: "Anders",
} as const;

export type Source = keyof typeof SOURCES;

export const SOURCE_KEYS = Object.keys(SOURCES) as [Source, ...Source[]];

/** Werbe- und Profil-Links tragen utm-Parameter – als kurze Notiz, z. B. „instagram / bio“ */
export function campaignOf(params: Record<string, string | string[] | undefined>) {
  const pick = (key: string) => {
    const value = params[key];
    return typeof value === "string" ? value.replace(/[^\w.-]/g, "").slice(0, 40) : "";
  };
  const parts = ["utm_source", "utm_medium", "utm_campaign"].map(pick).filter(Boolean);
  return parts.length ? parts.join(" / ") : undefined;
}
