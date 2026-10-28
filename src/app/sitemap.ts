import type { MetadataRoute } from "next";
import { locales } from "@/i18n/config";
import { canonicalOrigin } from "@/lib/site";
import { THEMEN } from "@/lib/themen";

type Entry = MetadataRoute.Sitemap[number];

/** Seiten für Google – nur Öffentliches, keine Konto-, Einladungs- oder Adminseiten */
export default function sitemap(): MetadataRoute.Sitemap {
  return locales.flatMap((lang): Entry[] => [
    { url: `${canonicalOrigin}/${lang}`, changeFrequency: "weekly", priority: 1 },
    ...THEMEN.map((t): Entry => ({ url: `${canonicalOrigin}/${lang}/${t.slug}`, changeFrequency: "monthly", priority: 0.8 })),
    { url: `${canonicalOrigin}/${lang}/bewerben`, changeFrequency: "monthly", priority: 0.6 },
    ...["impressum", "datenschutz", "agb"].map((page): Entry => ({ url: `${canonicalOrigin}/${lang}/${page}`, changeFrequency: "yearly", priority: 0.2 })),
  ]);
}
