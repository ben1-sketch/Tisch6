import type { MetadataRoute } from "next";
import { canonicalOrigin } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/admin", "/de/konto", "/de/einladung/", "/de/wiedersehen/", "/de/weiter/", "/de/aufrufe/"] },
    sitemap: `${canonicalOrigin}/sitemap.xml`,
  };
}
