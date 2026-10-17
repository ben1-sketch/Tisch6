import Link from "next/link";
import type { Dictionary } from "@/i18n/get-dictionary";
import { Logo } from "./Logo";

export function Footer({ lang, dict }: { lang: string; dict: Dictionary }) {
  return (
    <footer className="border-t border-white/5 bg-night-950">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div>
          <Logo />
          <p className="mt-2 text-sm text-mist">{dict.footer.tagline}</p>
        </div>
        <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-mist">
          <Link href={`/${lang}/impressum`} className="hover:text-cloud">{dict.footer.imprint}</Link>
          <Link href={`/${lang}/datenschutz`} className="hover:text-cloud">{dict.footer.privacy}</Link>
          <Link href={`/${lang}/agb`} className="hover:text-cloud">{dict.footer.terms}</Link>
          <Link href={`/${lang}/konto`} className="hover:text-cloud">{dict.footer.account}</Link>
        </nav>
      </div>
      <p className="pb-8 text-center text-xs text-mist/60">© {new Date().getFullYear()} Tisch6</p>
    </footer>
  );
}
