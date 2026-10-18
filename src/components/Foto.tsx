import Image from "next/image";

/**
 * Foto mit Mitternachtsblau-Schleier, damit es zum dunklen Design passt und Text darüber lesbar bleibt.
 * Der Wrapper braucht Position und Größe (z. B. "relative aspect-[4/5]" oder "absolute inset-0") – das Bild füllt ihn aus.
 */
export function Foto({
  src,
  alt,
  sizes,
  className = "relative",
  preload = false,
  verlauf = true,
  tint = "soft",
}: {
  src: string;
  alt: string;
  /** Wie breit das Bild im Layout ist (für die passende Bildgröße), z. B. "(min-width: 768px) 28rem, 100vw" */
  sizes: string;
  className?: string;
  /** true für ein Bild ganz oben auf der Seite */
  preload?: boolean;
  /** dunkler Verlauf am unteren Rand (für Bildunterschriften) */
  verlauf?: boolean;
  /** "strong" für Hintergrundbilder hinter Text: dunkler, mit weichen Rändern oben und unten */
  tint?: "soft" | "strong";
}) {
  return (
    <div className={`overflow-hidden bg-night-800 ${className}`}>
      <Image src={src} alt={alt} fill sizes={sizes} preload={preload} className="object-cover" />
      {/* Blauschleier: nimmt dem Foto die Fremdfarben */}
      <div className={`absolute inset-0 ${tint === "strong" ? "bg-night-900/70" : "bg-night-900/25"}`} aria-hidden="true" />
      {tint === "strong" && (
        <div className="absolute inset-0 bg-gradient-to-b from-night-900 via-transparent to-night-900" aria-hidden="true" />
      )}
      {verlauf && <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-night-950/85 via-night-950/30 to-transparent" aria-hidden="true" />}
    </div>
  );
}
