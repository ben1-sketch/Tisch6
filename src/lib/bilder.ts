/**
 * Fotos der Website.
 *
 * Alle Fotos stammen von Unsplash (Unsplash-Lizenz: kostenlos, auch kommerziell nutzbar, keine Namensnennung nötig).
 * Sie werden über next/image geladen und optimiert – erlaubt ist nur der Host images.unsplash.com (siehe next.config.ts).
 *
 * Eigene Fotos (z. B. aus den Partnerlokalen): Datei nach /public/bilder/ legen und hier die URL
 * durch einen lokalen Pfad ersetzen, z. B. src: "/bilder/lokal.jpg".
 */
const unsplash = (id: string, breite: number) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${breite}&q=80`;

export type Bild = { src: string; credit: string };

export const bilder = {
  /** Startseite oben: gedeckter Tisch bei gedämpftem Licht (Hochformat) */
  hero: { src: unsplash("photo-1762806883627-4bcbfad98a2c", 1400), credit: "Roman / Unsplash" },
  /** Der Abend: gedämpft beleuchtetes Lokal in Blau- und Orangetönen (Hochformat) */
  lokal: { src: unsplash("photo-1740247374238-af6f14719373", 1400), credit: "wei / Unsplash" },
  /** Der Abend: gedeckter Tisch mit Weingläsern (Querformat) */
  gedeckt: { src: unsplash("photo-1675965218658-bd6f516742ac", 1600), credit: "CJ Toscano / Unsplash" },
  /** Der Abend: drei Weingläser stoßen an (Querformat) */
  anstossen: { src: unsplash("photo-1498429152472-9a433d9ddf3b", 1600), credit: "Matthieu Joannon / Unsplash" },
  /** Wo gegessen wird: ruhiges, dunkles Restaurant-Interieur (Hochformat) */
  interieur: { src: unsplash("photo-1758405155772-ef0f0077375c", 1400), credit: "Aconitum / Unsplash" },
} satisfies Record<string, Bild>;

/** Bild für Link-Vorschauen (WhatsApp, Instagram, iMessage): das Hero-Foto, zugeschnitten auf 1200 × 630, als JPG */
export const ogBild = "https://images.unsplash.com/photo-1762806883627-4bcbfad98a2c?fm=jpg&fit=crop&crop=entropy&w=1200&h=630&q=80";
