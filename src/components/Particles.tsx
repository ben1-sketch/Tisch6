/**
 * Feine Partikel, die langsam durch den Hintergrund schweben – rein CSS, keine Skripte.
 * Positionen sind pseudozufällig, aber fest (gleich auf Server und Browser).
 */
function random(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function Particles({ count = 26 }: { count?: number }) {
  const next = random(6);
  const items = Array.from({ length: count }, (_, i) => {
    const size = 2 + next() * 3;
    return {
      key: i,
      left: `${(next() * 100).toFixed(2)}%`,
      top: `${(10 + next() * 95).toFixed(2)}%`,
      size: `${size.toFixed(1)}px`,
      duration: `${(16 + next() * 18).toFixed(1)}s`,
      delay: `-${(next() * 30).toFixed(1)}s`,
      drift: `${((next() - 0.5) * 120).toFixed(0)}px`,
      opacity: (0.25 + next() * 0.45).toFixed(2),
      rose: i % 3 !== 0,
    };
  });

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      {items.map((p) => (
        <span
          key={p.key}
          className={`particle ${p.rose ? "particle-rose" : "particle-cloud"}`}
          style={
            {
              left: p.left,
              top: p.top,
              width: p.size,
              height: p.size,
              "--duration": p.duration,
              "--delay": p.delay,
              "--drift": p.drift,
              "--opacity": p.opacity,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
