"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Zahl, die sichtbar herunterzählt, sobald sie ins Bild kommt.
 * Beispiel: „noch 287 von 300“ tickt von 300 auf 287; sind alle Plätze frei, zählt sie von 0 auf 300 hoch.
 * Bei „weniger Bewegung“ (Systemeinstellung) steht sofort der Endwert da.
 */
export function Ticker({ value, total, duration = 2400 }: { value: number; total: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const start = value === total ? 0 : total;
  const [shown, setShown] = useState(start);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let frame = 0;
    const run = () => {
      const began = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - began) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        setShown(Math.round(start + (value - start) * eased));
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };
    if (!("IntersectionObserver" in window)) {
      run();
      return () => cancelAnimationFrame(frame);
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        observer.disconnect();
        run();
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value, start, duration]);

  return (
    <span ref={ref} className="tabular-nums">
      <span className="motion-reduce:hidden" aria-hidden="true">
        {shown}
      </span>
      <span className="hidden motion-reduce:inline" aria-hidden="true">
        {value}
      </span>
      <span className="sr-only">{value}</span>
    </span>
  );
}
