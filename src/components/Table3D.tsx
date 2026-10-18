import type { CSSProperties } from "react";

/**
 * Ein runder Tisch mit sechs Stühlen – drei in Rosé, drei in Weiß – der sich langsam dreht.
 * Reines CSS-3D (keine Skripte, keine Bibliothek), Maße in em: die Größe steuert `font-size` von .scene3d in globals.css.
 */
export function Table3D({ label }: { label: string }) {
  const chairs = Array.from({ length: 6 }, (_, i) => ({ deg: i * 60 - 90, rose: i % 2 === 1 }));

  return (
    <div className="scene3d" role="img" aria-label={label}>
      <div className="stage3d">
        <div className="spin3d">
          <div className="floor-glow" />
          <div className="floor-ring" />
          <div className="table-base" />
          <div className="table-col table-col-a" />
          <div className="table-col table-col-b" />
          <div className="table-edge" />
          <div className="table-top" />
          {chairs.map((c) => (
            <div key={c.deg} className={`chair ${c.rose ? "chair-rose" : "chair-cloud"}`} style={{ "--a": `${c.deg}deg` } as CSSProperties}>
              <i className="chair-leg chair-leg-1" />
              <i className="chair-leg chair-leg-2" />
              <i className="chair-leg chair-leg-3" />
              <i className="chair-leg chair-leg-4" />
              <i className="chair-seat" />
              <i className="chair-back" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
