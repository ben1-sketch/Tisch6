import Image from "next/image";

/**
 * Foto, gedämpft und warm getönt, damit es leise im Hintergrund bleibt und Text darüber lesbar ist.
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
  zoom = false,
}: {
  src: string;
  /** Beschreibung fürs Vorlesen; "" für rein dekorative Hintergrundbilder */
  alt: string;
  /** Wie breit das Bild im Layout ist (für die passende Bildgröße), z. B. "(min-width: 768px) 28rem, 100vw" */
  sizes: string;
  className?: string;
  /** true für ein Bild ganz oben auf der Seite */
  preload?: boolean;
  /** dunkler Verlauf am unteren Rand (für Bildunterschriften) */
  verlauf?: boolean;
  /**
   * soft: leichter Schleier (Fotos, die man anschauen soll)
   * strong: dunkler, mit weichen Rändern oben und unten (Hintergrund hinter Text)
   * hero: dunkel mit Vignette – für den Seitenanfang mit Text in der Mitte
   */
  tint?: "soft" | "strong" | "hero";
  /** langsamer Zoom beim Laden */
  zoom?: boolean;
}) {
  return (
    <div className={`overflow-hidden bg-night-800 ${className}`}>
      <Image src={src} alt={alt} fill sizes={sizes} preload={preload} className={`img-dezent object-cover ${zoom ? "kenburns" : ""}`} />
      {/* warmer Kerzenlicht-Ton, darüber ein Mitternachtsschleier */}
      <div className="absolute inset-0 bg-gradient-to-br from-gold-600/15 via-transparent to-night-950/30 mix-blend-multiply" aria-hidden="true" />
      <div
        className={`absolute inset-0 ${tint === "strong" ? "bg-night-950/65" : tint === "hero" ? "bg-night-950/55" : "bg-night-950/20"}`}
        aria-hidden="true"
      />
      {tint !== "soft" && <div className="absolute inset-0 bg-gradient-to-b from-night-950/80 via-transparent to-night-900" aria-hidden="true" />}
      {tint === "hero" && <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgb(6_9_19/0.75)_100%)]" aria-hidden="true" />}
      {verlauf && <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-night-950/80 via-night-950/25 to-transparent" aria-hidden="true" />}
    </div>
  );
}
