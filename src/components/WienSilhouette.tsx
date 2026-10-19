import { useId } from "react";

/**
 * Wien als feine Goldlinie: Riesenrad, Stephansdom, Karlskirche und Dächer dazwischen.
 * Rein dekorativ. Mit draw zeichnet sich die Linie, sobald der umgebende [data-reveal]-Block sichtbar wird.
 */
const HUB = { x: 150, y: 90 };
const RIM = 62;

const spokes = Array.from({ length: 15 }, (_, i) => {
  const a = (i / 15) * Math.PI * 2;
  return { x: HUB.x + (RIM - 6) * Math.cos(a), y: HUB.y + (RIM - 6) * Math.sin(a), gx: HUB.x + (RIM + 5) * Math.cos(a), gy: HUB.y + (RIM + 5) * Math.sin(a) };
});

// Zickzack-Muster auf dem Dach des Stephansdoms
const chevrons = Array.from({ length: 9 }, (_, i) => `${524 + i * 11.5},${i % 2 ? 98 : 112}`).join(" ");

const columns = [946, 958, 970, 982, 994];

// Dächer zwischen den Wahrzeichen – eine durchgehende Linie je Abschnitt
const ROOFS = [
  "M222 170 V146 H240 L248 138 H270 V146 H284 V132 L292 124 L300 132 V146 H318 V140 H350 L356 134 H386 L392 140 V146 H410 V128 H416 V120 H422 V128 H428 V146 H452 V170",
  "M660 170 V150 H676 L686 141 H718 L728 150 H746 V136 L758 127 L770 136 V150 H798 V143 H830 L836 137 H850 V150 H868",
  "M1072 150 H1092 V142 H1112 V138 C1112 122 1122 113 1130 113 C1138 113 1148 122 1148 138 V142 H1170 L1178 134 H1200",
];

export function WienSilhouette({ className = "", draw = false }: { className?: string; draw?: boolean }) {
  const line = { pathLength: 1, vectorEffect: "non-scaling-stroke" as const };
  // eindeutige ID, weil die Silhouette mehrmals auf einer Seite stehen kann
  const boden = `wien-boden-${useId().replace(/[^\w-]/g, "")}`;
  return (
    <svg
      viewBox="0 0 1200 180"
      className={`skyline ${draw ? "skyline-draw" : ""} ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      preserveAspectRatio="xMidYMax meet"
    >
      <defs>
        <linearGradient id={boden} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="currentColor" stopOpacity="0" />
          <stop offset="0.15" stopColor="currentColor" />
          <stop offset="0.85" stopColor="currentColor" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Riesenrad */}
      <circle cx={HUB.x} cy={HUB.y} r={RIM} {...line} />
      <circle cx={HUB.x} cy={HUB.y} r={RIM - 6} strokeOpacity="0.6" {...line} />
      <circle cx={HUB.x} cy={HUB.y} r="4" {...line} />
      {spokes.map((s, i) => (
        <line key={`s${i}`} x1={HUB.x} y1={HUB.y} x2={s.x.toFixed(1)} y2={s.y.toFixed(1)} strokeOpacity="0.45" {...line} />
      ))}
      {spokes.map((s, i) => (
        <rect key={`g${i}`} x={(s.gx - 3.5).toFixed(1)} y={(s.gy - 3).toFixed(1)} width="7" height="6" rx="1" {...line} />
      ))}
      <path d={`M${HUB.x} ${HUB.y} L118 170 M${HUB.x} ${HUB.y} L182 170 M128 146 H172`} {...line} />

      {/* Stephansdom: Südturm, steiles Dach mit Zickzackmuster, Nordturm mit Kuppel */}
      <path d="M470 170 V96 L478 88 L488 6 L498 88 L506 96 V170 M470 120 H506 M470 142 H506 M478 88 H498" {...line} />
      <path d="M506 170 V125 L522 80 H614 L630 125 V170 M506 125 H630" {...line} />
      <polyline points={chevrons} strokeOpacity="0.7" {...line} />
      <path d="M630 170 V106 H658 V170 M632 106 C632 96 638 92 644 92 C650 92 656 96 656 106 M644 92 V82" {...line} />
      <path d="M528 170 V146 Q534 138 540 146 V170 M562 170 V146 Q568 138 574 146 V170 M596 170 V146 Q602 138 608 146 V170" strokeOpacity="0.6" {...line} />

      {/* Karlskirche: Kuppel mit Laterne, Säulenportal, zwei Triumphsäulen, Glockentürme */}
      <path d="M930 116 C930 84 950 64 970 64 C990 64 1010 84 1010 116 M930 116 H1010 M936 116 V140 M1004 116 V140" {...line} />
      <path d="M964 64 V52 H976 V64 M970 52 V40" {...line} />
      <path d="M932 140 L970 120 L1008 140 Z M932 146 H1008" {...line} />
      {columns.map((x) => (
        <line key={x} x1={x} y1="146" x2={x} y2="170" strokeOpacity="0.8" {...line} />
      ))}
      <path d="M904 170 V92 H918 V170 M902 92 H920 M911 92 V80 M1022 170 V92 H1036 V170 M1020 92 H1038 M1029 92 V80" {...line} />
      <path d="M868 170 V128 L881 118 L894 128 V170 M1046 170 V128 L1059 118 L1072 128 V170 M894 150 H904 M1036 150 H1046" {...line} />

      {/* Dächer dazwischen */}
      {ROOFS.map((d) => (
        <path key={d} d={d} strokeOpacity="0.55" {...line} />
      ))}

      {/* Boden */}
      <line x1="0" y1="170" x2="1200" y2="170" stroke={`url(#${boden})`} {...line} />
    </svg>
  );
}
