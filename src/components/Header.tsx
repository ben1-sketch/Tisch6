import Link from "next/link";
import type { Dictionary } from "@/i18n/get-dictionary";
import { Logo } from "./Logo";

export function Header({ lang, dict }: { lang: string; dict: Dictionary }) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-night-900/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href={`/${lang}`} aria-label="Tisch6 Startseite">
          <Logo />
        </Link>
        <nav className="flex items-center gap-1 text-sm sm:gap-2">
          <Link href={`/${lang}#so-gehts`} className="hidden rounded-full px-3 py-2 text-mist hover:text-cloud md:inline">
            {dict.nav.how}
          </Link>
          <Link href={`/${lang}#sicher-fuer-frauen`} className="hidden rounded-full px-3 py-2 text-mist hover:text-cloud lg:inline">
            {dict.nav.women}
          </Link>
          <Link href={`/${lang}#fuer-maenner`} className="hidden rounded-full px-3 py-2 text-mist hover:text-cloud xl:inline">
            {dict.nav.men}
          </Link>
          <Link href={`/${lang}#preise`} className="hidden rounded-full px-3 py-2 text-mist hover:text-cloud md:inline">
            {dict.nav.prices}
          </Link>
          <Link href={`/${lang}#faq`} className="hidden rounded-full px-3 py-2 text-mist hover:text-cloud md:inline">
            {dict.nav.faq}
          </Link>
          <Link href={`/${lang}/konto`} className="rounded-full px-3 py-2 text-mist hover:text-cloud">
            {dict.nav.account}
          </Link>
          <Link
            href={`/${lang}/bewerben`}
            className="rounded-full bg-rose-400 px-4 py-2 font-medium text-night-950 transition hover:bg-rose-300"
          >
            {dict.nav.apply}
          </Link>
        </nav>
      </div>
    </header>
  );
}
