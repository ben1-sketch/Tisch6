"use client";

import Link from "next/link";
import { useSyncExternalStore, type ReactNode } from "react";

const noSubscribe = () => () => {};

/**
 * Link zur Bewerbung, der die utm-Parameter der aktuellen Seite mitnimmt – so zählt eine Bewerbung
 * über einen Werbe- oder Profil-Link auch dann, wenn die Person erst auf der Startseite landet. Ohne Cookies.
 */
export function ApplyLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  const search = useSyncExternalStore(noSubscribe, () => window.location.search, () => "");
  const utm = new URLSearchParams([...new URLSearchParams(search)].filter(([key]) => key.startsWith("utm_"))).toString();
  const target = utm ? `${href}${href.includes("?") ? "&" : "?"}${utm}` : href;
  return (
    <Link href={target} className={className}>
      {children}
    </Link>
  );
}
