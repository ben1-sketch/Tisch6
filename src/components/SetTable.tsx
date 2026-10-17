/**
 * Illustration: ein gedeckter runder Tisch für sechs, von oben gesehen.
 * Teller, Besteck und Gläser – keine Menschen. Feine Lichtlinien deuten die KI-Kuratierung an.
 * Später durch echte Fotos ersetzbar (z. B. /public/bilder/tisch.jpg mit next/image).
 */
export function SetTable({ label, className = "" }: { label: string; className?: string }) {
  const seats = Array.from({ length: 6 }, (_, i) => {
    const deg = 60 * i - 90;
    const rad = (deg * Math.PI) / 180;
    return { deg, x: 200 + 112 * Math.cos(rad), y: 200 + 112 * Math.sin(rad), rose: i % 2 === 1 };
  });

  return (
    <div className={`relative mx-auto aspect-square w-full max-w-md ${className}`}>
      <div className="absolute inset-10 rounded-full bg-rose-500/20 blur-3xl" />
      <svg viewBox="0 0 400 400" className="relative h-full w-full" role="img" aria-label={label}>
        <defs>
          <radialGradient id="tabletop" cx="50%" cy="45%" r="60%">
            <stop offset="0%" stopColor="#1f2c5e" />
            <stop offset="100%" stopColor="#111a3a" />
          </radialGradient>
          <radialGradient id="plate" cx="45%" cy="40%" r="65%">
            <stop offset="0%" stopColor="#f7f8fd" />
            <stop offset="100%" stopColor="#d9ddef" />
          </radialGradient>
        </defs>

        {/* Lichtlinien zwischen den Plätzen */}
        <g className="animate-orbit" style={{ transformOrigin: "200px 200px" }}>
          <circle cx="200" cy="200" r="190" fill="none" stroke="rgb(167 174 208 / 0.18)" strokeDasharray="2 9" />
        </g>

        {/* Tischplatte mit Tischtuch-Kante */}
        <circle cx="200" cy="200" r="168" fill="url(#tabletop)" stroke="rgb(244 182 194 / 0.35)" strokeWidth="1.5" />
        <circle cx="200" cy="200" r="158" fill="none" stroke="rgb(238 240 250 / 0.06)" strokeWidth="1" />

        {seats.map((a, i) =>
          seats.slice(i + 1).map((b, j) => (
            <line key={`${i}-${j}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="rgb(244 182 194 / 0.10)" />
          )),
        )}

        {/* Gedecke */}
        {seats.map((s) => (
          <g key={s.deg} transform={`translate(${s.x} ${s.y}) rotate(${s.deg + 90})`}>
            {/* Teller */}
            <circle r="27" fill="url(#plate)" />
            <circle r="27" fill="none" stroke={s.rose ? "var(--color-rose-500)" : "var(--color-rose-300)"} strokeWidth="2.5" />
            <circle r="17" fill="none" stroke="rgb(10 17 40 / 0.12)" />
            {/* Serviette */}
            <path d="M-8 -6 L8 -6 L4 8 L-4 8 Z" fill={s.rose ? "var(--color-rose-400)" : "var(--color-rose-300)"} opacity="0.9" />
            {/* Aus Sicht des Gastes (sitzt außen, blickt zur Mitte): Gabel links, Messer rechts */}
            <rect x="35" y="-18" width="3" height="36" rx="1.5" fill="#c9cde0" />
            <rect x="33" y="10" width="7" height="8" rx="2" fill="#c9cde0" />
            <rect x="-38" y="-18" width="3" height="36" rx="1.5" fill="#c9cde0" />
            {/* Weinglas & Wasserglas rechts oberhalb des Tellers */}
            <circle cx="-30" cy="36" r="7" fill="rgb(244 182 194 / 0.25)" stroke="rgb(238 240 250 / 0.7)" strokeWidth="1.2" />
            <circle cx="-15" cy="42" r="5.5" fill="rgb(238 240 250 / 0.08)" stroke="rgb(238 240 250 / 0.55)" strokeWidth="1.2" />
          </g>
        ))}

        {/* Tischmitte: kleine Vase mit Blüten */}
        <circle cx="200" cy="200" r="22" fill="rgb(10 17 40 / 0.6)" stroke="rgb(244 182 194 / 0.5)" />
        {[0, 72, 144, 216, 288].map((d) => (
          <circle
            key={d}
            cx={200 + 9 * Math.cos((d * Math.PI) / 180)}
            cy={200 + 9 * Math.sin((d * Math.PI) / 180)}
            r="6"
            fill="var(--color-rose-400)"
            opacity="0.85"
          />
        ))}
        <circle cx="200" cy="200" r="4" fill="var(--color-cloud)" />
      </svg>
    </div>
  );
}
