/**
 * Fotos der Website – Wiener Salon bei Abendlicht, Runde bei Kerzenlicht, Gedeck mit Champagner.
 *
 * Die Dateien liegen in /public/bilder/ und werden über next/image geladen und optimiert.
 * Neues Foto: als JPG nach /public/bilder/ legen und hier eintragen.
 */
export type Bild = { src: string };

export const bilder = {
  /** Seitenanfang: Salon mit rundem Tisch für sechs, durch die Fenster Wiener Fassaden und eine Kuppel (Querformat) */
  salon: { src: "/bilder/salon-wien.jpg" },
  /** Ambiente, großes Bild: sechs Gäste lachen am runden Tisch bei Kerzenlicht (Querformat) */
  tischrunde: { src: "/bilder/tischrunde.jpg" },
  /** Abschluss „Dein Platz am Tisch wartet“: Gedeck mit Goldbesteck, Champagner und Kerze (Querformat) */
  gedeck: { src: "/bilder/gedeck.jpg" },
} satisfies Record<string, Bild>;

/** Bild für Link-Vorschauen (WhatsApp, Instagram, iMessage): der Salon, 1200 × 630 */
export const ogBild = "/bilder/vorschau.jpg";
