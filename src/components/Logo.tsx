/** Wortmarke: ein Tisch, sechs Plätze – drei in Gold, drei in Elfenbein. */
export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  const seats = Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    return { x: 32 + 21 * Math.cos(angle), y: 32 + 21 * Math.sin(angle), gold: i % 2 === 1 };
  });
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <circle cx="32" cy="32" r="11.5" fill="none" stroke="var(--color-gold-400)" strokeWidth="1.6" />
      <circle cx="32" cy="32" r="7.5" fill="none" stroke="var(--color-gold-400)" strokeOpacity="0.45" strokeWidth="0.8" />
      {seats.map((s, i) => (
        <circle key={i} cx={s.x.toFixed(2)} cy={s.y.toFixed(2)} r="3.6" fill={s.gold ? "var(--color-gold-400)" : "var(--color-cloud)"} />
      ))}
    </svg>
  );
}

export function Logo() {
  return (
    <span className="inline-flex items-center gap-2.5 font-display text-[1.7rem] leading-none tracking-wide">
      <LogoMark />
      <span>
        Tisch<span className="italic text-gold-400">6</span>
      </span>
    </span>
  );
}
