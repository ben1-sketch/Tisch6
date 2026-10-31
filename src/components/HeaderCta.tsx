"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { type VisitorStatus, parseVisitor, subscribeVisitor, visitorSnapshot } from "@/lib/visitor";
import { ApplyLink } from "./ApplyLink";

/** Persönliche Seiten aus E-Mail-Links – wer dort ist, hat sich schon beworben */
const PERSONAL = /^\/[a-z]{2}\/(app|einladung|wiedersehen|weiter|aufrufe)\//;

type Labels = { apply: string; applied: string; invited: string; team: string };

/**
 * Rechts oben im Kopf: „Jetzt bewerben“ – oder, wer schon dabei ist, der eigene Stand („✓ Eingeladen“, „✓ Beworben“).
 * Ein Tipp darauf öffnet die eigene Tisch6-App (sonst das Konto).
 */
export function HeaderCta({ lang, labels }: { lang: string; labels: Labels }) {
  const pathname = usePathname();
  const visitor = parseVisitor(useSyncExternalStore(subscribeVisitor, visitorSnapshot, () => null));
  // auf persönlichen Seiten nie „Jetzt bewerben“ – auch schon bevor der Browser die Person kennt
  const fallback: VisitorStatus | null = PERSONAL.test(pathname) ? (pathname.includes("/einladung/") ? "eingeladen" : "beworben") : null;
  const status = visitor?.status ?? fallback;

  if (!status) {
    return (
      <ApplyLink href={`/${lang}/bewerben`} className="btn btn-primary btn-sm ml-1 whitespace-nowrap sm:ml-2">
        {labels.apply}
      </ApplyLink>
    );
  }
  const label = { beworben: labels.applied, eingeladen: labels.invited, team: labels.team }[status];
  return (
    <Link
      href={visitor?.app ? `/${lang}/app/${visitor.app}` : `/${lang}/konto`}
      className="ml-1 inline-flex items-center gap-1.5 rounded-full border border-gold-400/50 px-4 py-2 text-[0.68rem] font-semibold tracking-[0.18em] whitespace-nowrap text-gold-300 uppercase transition hover:border-gold-300 hover:text-gold-200 sm:ml-2"
    >
      <span aria-hidden="true">✓</span>
      {label}
    </Link>
  );
}
