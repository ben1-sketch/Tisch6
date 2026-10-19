"use client";

export function PrintButton() {
  return (
    <button onClick={() => window.print()} className="rounded-full bg-gold-400 px-5 py-2.5 text-sm font-semibold text-night-950 hover:bg-gold-300 print:hidden">
      Drucken
    </button>
  );
}
