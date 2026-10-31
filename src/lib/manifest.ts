import type { MetadataRoute } from "next";

/**
 * Web-App-Manifest von Tisch6: allgemein (startet auf der Startseite) oder persönlich –
 * dann startet die App direkt auf der App-Seite des Gastes.
 */
export function appManifest(startUrl: string, id: string): MetadataRoute.Manifest {
  return {
    id,
    name: "Tisch6 – Dinner-Dating in Wien",
    short_name: "Tisch6",
    description: "KI-kuratierte Dating-Dinner in Wien: sechs Singles, ein Tisch, ein Abend.",
    start_url: startUrl,
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b1120",
    theme_color: "#0b1120",
    lang: "de",
    icons: [
      { src: "/app-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/app-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/app-icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
