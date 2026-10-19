"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/admin", label: "Übersicht" },
  { href: "/admin/bewerbungen", label: "Bewerbungen" },
  { href: "/admin/tische", label: "Tische" },
  { href: "/admin/wiedersehen", label: "Wiedersehen & Feedback" },
  { href: "/admin/meldungen", label: "Meldungen" },
  { href: "/admin/zahlungen", label: "Zahlungen" },
  { href: "/admin/lokale", label: "Lokale" },
  { href: "/admin/versand", label: "Versand" },
  { href: "/admin/protokoll", label: "Protokoll" },
];

/** Hauptnavigation – auf dem Handy seitlich wischbar; Zahlen = was auf eine Entscheidung wartet */
export function AdminNav({ badges }: { badges: Record<string, number> }) {
  const pathname = usePathname();
  return (
    <nav className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0" aria-label="Adminbereich">
      {ITEMS.map((item) => {
        const active = item.href === "/admin" ? pathname === "/admin" : pathname === item.href || pathname.startsWith(`${item.href}/`);
        const badge = badges[item.href];
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex flex-none items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition ${
              active ? "bg-white/10 font-medium text-cloud" : "text-mist hover:text-cloud"
            }`}
          >
            {item.label}
            {badge ? <span className="rounded-full bg-gold-400 px-1.5 text-xs font-semibold text-night-950">{badge}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
