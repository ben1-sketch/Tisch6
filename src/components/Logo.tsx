/** Wortmarke: ein Tisch, sechs Plätze – drei in Rosé, drei in Weiß. */
export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  const seats = Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    return { x: 32 + 21 * Math.cos(angle), y: 32 + 21 * Math.sin(angle), rose: i % 2 === 1 };
  });
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <circle cx="32" cy="32" r="11" fill="none" stroke="var(--color-rose-400)" strokeWidth="3" />
      {seats.map((s, i) => (
        <circle key={i} cx={s.x.toFixed(2)} cy={s.y.toFixed(2)} r="4" fill={s.rose ? "var(--color-rose-500)" : "var(--color-cloud)"} />
      ))}
    </svg>
  );
}

export function Logo() {
  return (
    <span className="inline-flex items-center gap-2 font-display text-xl font-semibold tracking-tight">
      <LogoMark />
      <span>
        Tisch<span className="text-rose-400">6</span>
      </span>
    </span>
  );
}
