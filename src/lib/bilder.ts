/**
 * Fotos der Website – edles Restaurant-Ambiente, dunkel gehalten, passend zu Mitternachtsblau und Champagner-Gold.
 *
 * Alle Fotos stammen von Unsplash (Unsplash-Lizenz: kostenlos, auch kommerziell nutzbar, keine Namensnennung nötig).
 * Sie werden über next/image geladen und optimiert – erlaubt ist nur der Host images.unsplash.com (siehe next.config.ts).
 *
 * Eigene Fotos (z. B. aus den Partnerlokalen): Datei nach /public/bilder/ legen und hier die URL
 * durch einen lokalen Pfad ersetzen, z. B. src: "/bilder/lokal.jpg". Der Rest bleibt gleich.
 */
const unsplash = (id: string, breite: number) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${breite}&q=80`;

export type Bild = { src: string; credit: string };

export const bilder = {
  /** Hintergrund ganz oben, hinter dem 3D-Tisch: Hotelbar mit rosa Pendelleuchten, dunkelblau (Querformat) */
  heroHintergrund: { src: unsplash("photo-1450818107077-deb91237c392", 2400), credit: "Jez Timms / Unsplash" },
  /** Ambiente, großes Bild: moderne Bar mit goldenen Akzenten (Querformat) */
  ambienteBar: { src: unsplash("photo-1531973968078-9bb02785f13d", 1800), credit: "LYCS Architecture / Unsplash" },
  /** Ambiente: elegante Lounge mit Kronleuchtern und blauem Licht (Hochformat) */
  ambienteLounge: { src: unsplash("photo-1777063660081-8a56e10a8705", 1200), credit: "Franco Debartolo / Unsplash" },
  /** Ambiente: Tische mit Samtstühlen, blauer Teppich (Hochformat) */
  ambienteSamt: { src: unsplash("photo-1790009678738-934d8922b6f7", 1200), credit: "Stefan Vibes / Unsplash" },
  /** Ambiente: gedeckter Tisch mit vielen Weingläsern (Hochformat) */
  ambienteGlaeser: { src: unsplash("photo-1701088086325-74f4164674da", 1200), credit: "Miguel Lindo / Unsplash" },
  /** Hintergrund „Sicher für Frauen / Fair für Männer“: gedeckter Tisch, schwarze Teller, Gläser (Querformat) */
  gedeckt: { src: unsplash("photo-1649747823135-3450d7b8fa41", 2400), credit: "Ardalan Ameli / Unsplash" },
  /** Hintergrund Abschluss: drei Champagnergläser vor Schwarz */
  abschluss: { src: unsplash("photo-1634485167774-2abb73ad2427", 1600), credit: "Donatas Jusa / Unsplash" },
} satisfies Record<string, Bild>;

/** Bild für Link-Vorschauen (WhatsApp, Instagram, iMessage): gedeckter Tisch bei Lampenlicht, 1200 × 630, als JPG */
export const ogBild = "https://images.unsplash.com/photo-1762806883627-4bcbfad98a2c?fm=jpg&fit=crop&crop=entropy&w=1200&h=630&q=80";
