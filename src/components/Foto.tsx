import Image from "next/image";

/**
 * Foto mit leichtem Mitternachtsblau-Schleier und dunklem Verlauf nach unten,
 * damit es zum dunklen Design passt und Text darüber lesbar bleibt.
 * Der Wrapper braucht eine Größe (z. B. aspect-[4/5]) – das Bild füllt ihn aus.
 */
export function Foto({
  src,
  alt,
  sizes,
  className = "",
  preload = false,
  verlauf = true,
}: {
  src: string;
  alt: string;
  /** Wie breit das Bild im Layout ist (für die passende Bildgröße), z. B. "(min-width: 768px) 28rem, 100vw" */
  sizes: string;
  className?: string;
  /** true für das Bild ganz oben auf der Seite */
  preload?: boolean;
  /** dunkler Verlauf am unteren Rand (für Bildunterschriften) */
  verlauf?: boolean;
}) {
  return (
    <div className={`relative overflow-hidden bg-night-800 ${className}`}>
      <Image src={src} alt={alt} fill sizes={sizes} preload={preload} className="object-cover" />
      {/* Blauschleier: nimmt dem Foto die Fremdfarben */}
      <div className="absolute inset-0 bg-night-900/25" aria-hidden="true" />
      {verlauf && <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-night-950/85 via-night-950/30 to-transparent" aria-hidden="true" />}
    </div>
  );
}
