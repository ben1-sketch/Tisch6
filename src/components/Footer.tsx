import Link from "next/link";
import type { Dictionary } from "@/i18n/get-dictionary";
import { instagramUrl } from "@/lib/site";
import { Logo } from "./Logo";

/** Minimalistische Fußzeile: Instagram (sobald eingetragen), Impressum, Datenschutz, AGB, Konto. */
export function Footer({ lang, dict }: { lang: string; dict: Dictionary }) {
  const linkClass = "transition hover:text-cloud";
  return (
    <footer className="relative z-10 border-t border-white/5 bg-night-950">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-4 py-10 text-center sm:px-6 md:flex-row md:items-center md:justify-between md:text-left">
        <div>
          <Logo />
          <p className="mt-2 text-sm text-mist">{dict.footer.tagline}</p>
        </div>
        <nav className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-mist" aria-label="Fußzeile">
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
      <p className="pb-8 text-center text-xs text-mist/60">© {new Date().getFullYear()} Tisch6</p>
    </footer>
  );
}
