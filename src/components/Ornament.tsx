/** Kleines Trennzeichen: Haarlinien mit Raute */
export function Ornament({ className = "" }: { className?: string }) {
  return (
    <div className={`ornament ${className}`} aria-hidden="true">
      <span />
    </div>
  );
}
