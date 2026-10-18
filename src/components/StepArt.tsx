/**
 * Kleine Animationen zu den drei Schritten. Sie laufen los, sobald der Schritt beim Scrollen
 * eingeblendet wurde (data-visible="true" am Elternelement, siehe ScrollReveal + globals.css).
 */
export function StepArt({ kind }: { kind: "bewerben" | "einladung" | "tisch" }) {
  const common = { viewBox: "0 0 160 120", className: "step-art h-auto w-full max-w-[220px]", "aria-hidden": true as const };

  if (kind === "bewerben") {
    return (
      <svg {...common}>
        <rect x="24" y="14" width="112" height="92" rx="14" fill="rgb(17 26 58 / 0.9)" stroke="rgb(167 174 208 / 0.3)" />
        <circle cx="46" cy="36" r="8" fill="rgb(167 174 208 / 0.35)" />
        <rect x="60" y="30" width="44" height="5" rx="2.5" fill="rgb(167 174 208 / 0.5)" />
        <rect x="60" y="39" width="28" height="4" rx="2" fill="rgb(167 174 208 / 0.3)" />
        <rect x="40" y="58" width="80" height="6" rx="3" fill="rgb(167 174 208 / 0.3)" />
        <rect className="anim-line" x="40" y="72" width="56" height="6" rx="3" fill="var(--color-rose-400)" />
        <g className="anim-check">
          <circle cx="118" cy="88" r="12" fill="var(--color-rose-400)" />
          <path d="M112 88l4 4 8-8" fill="none" stroke="var(--color-night-950)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </svg>
    );
  }

  if (kind === "einladung") {
    return (
      <svg {...common}>
        <path d="M28 50h104v50a8 8 0 0 1-8 8H36a8 8 0 0 1-8-8z" fill="rgb(17 26 58 / 0.95)" stroke="rgb(167 174 208 / 0.3)" />
        <g className="anim-card">
          <rect x="44" y="38" width="72" height="58" rx="6" fill="rgb(238 240 250 / 0.96)" />
          <rect x="54" y="50" width="40" height="5" rx="2.5" fill="rgb(26 37 80 / 0.6)" />
          <rect x="54" y="60" width="52" height="4" rx="2" fill="rgb(26 37 80 / 0.3)" />
          <rect x="54" y="68" width="30" height="4" rx="2" fill="rgb(26 37 80 / 0.3)" />
          <circle cx="104" cy="50" r="6" fill="var(--color-rose-500)" />
        </g>
        <path d="M28 58l52 30 52-30v42a8 8 0 0 1-8 8H36a8 8 0 0 1-8-8z" fill="rgb(26 37 80 / 0.98)" stroke="rgb(167 174 208 / 0.3)" />
        <circle className="anim-dot" cx="128" cy="40" r="5" fill="var(--color-rose-400)" />
      </svg>
    );
  }

  const seats = [-90, -150, 150, 90, 30].map((deg) => {
    const rad = (deg * Math.PI) / 180;
    return { x: 80 + 40 * Math.cos(rad), y: 60 + 40 * Math.sin(rad), rose: deg === -150 || deg === 90 };
  });

  return (
    <svg {...common}>
      <circle className="anim-ring" cx="80" cy="60" r="52" fill="none" stroke="var(--color-rose-400)" strokeOpacity="0.6" strokeDasharray="2 6" />
      <circle cx="80" cy="60" r="24" fill="rgb(26 37 80 / 0.95)" stroke="var(--color-rose-400)" strokeOpacity="0.6" strokeWidth="1.5" />
      <circle cx="80" cy="60" r="6" fill="var(--color-rose-400)" fillOpacity="0.8" />
      {seats.map((s) => (
        <circle key={`${s.x}-${s.y}`} cx={s.x.toFixed(1)} cy={s.y.toFixed(1)} r="7" fill={s.rose ? "var(--color-rose-500)" : "var(--color-cloud)"} />
      ))}
      <circle className="anim-chair" cx="120" cy="60" r="7" fill="var(--color-rose-500)" />
    </svg>
  );
}
