import Link from "next/link";
import type { Dictionary } from "@/i18n/get-dictionary";
import { instagramUrl } from "@/lib/site";
import { THEMEN } from "@/lib/themen";
import { Logo } from "./Logo";
import { WienSilhouette } from "./WienSilhouette";

/** Fußzeile mit Wien-Silhouette: Instagram (sobald eingetragen), Impressum, Datenschutz, AGB, Konto. */
export function Footer({ lang, dict }: { lang: string; dict: Dictionary }) {
  const linkClass = "transition hover:text-gold-300";
  return (
    <footer className="relative z-10 border-t border-gold-400/10 bg-night-950">
      <div className="mx-auto max-w-6xl px-4 pt-16 sm:px-6">
        <WienSilhouette className="mx-auto h-auto w-full max-w-3xl text-gold-400/35" />
      </div>
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-7 px-4 py-12 text-center sm:px-6 md:flex-row md:justify-between md:text-left">
        <div>
          <Logo />
          <p className="mt-3 text-sm text-mist">{dict.footer.tagline}</p>
        </div>
        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-3 text-[0.68rem] font-medium tracking-[0.18em] text-mist uppercase" aria-label="Fußzeile">
          {instagramUrl && (
            <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className={`${linkClass} inline-flex items-center gap-1.5`}>
              <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="1.8" />
                <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.8" />
                <circle cx="17.3" cy="6.7" r="1.1" fill="currentColor" />
              </svg>
              {dict.footer.instagram}
            </a>
          )}
          <Link href={`/${lang}/impressum`} className={linkClass}>
            {dict.footer.imprint}
          </Link>
          <Link href={`/${lang}/datenschutz`} className={linkClass}>
            {dict.footer.privacy}
          </Link>
          <Link href={`/${lang}/agb`} className={linkClass}>
            {dict.footer.terms}
          </Link>
          <Link href={`/${lang}/konto`} className={linkClass}>
            {dict.footer.account}
          </Link>
        </nav>
      </div>
      <nav className="mx-auto flex max-w-6xl flex-wrap justify-center gap-x-5 gap-y-2 px-4 pb-8 text-xs text-mist/70 sm:px-6" aria-label="Themen">
        <Link href={`/${lang}/ratgeber`} className={linkClass}>
          Ratgeber
        </Link>
        {THEMEN.map((t) => (
          <Link key={t.slug} href={`/${lang}/${t.slug}`} className={linkClass}>
            {t.short}
          </Link>
        ))}
      </nav>
      <p className="pb-10 text-center text-[0.65rem] tracking-[0.3em] text-mist/50 uppercase">© {new Date().getFullYear()} Tisch6 · Wien</p>
    </footer>
  );
}
