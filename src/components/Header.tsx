import Link from "next/link";
import type { Dictionary } from "@/i18n/get-dictionary";
import { Logo } from "./Logo";

export function Header({ lang, dict }: { lang: string; dict: Dictionary }) {
  const items = [
    { href: `/${lang}#so-gehts`, label: dict.nav.how, show: "md:inline" },
    { href: `/${lang}#auszeichnet`, label: dict.nav.distinct, show: "xl:inline" },
    { href: `/${lang}#ambiente`, label: dict.nav.ambiente, show: "xl:inline" },
    { href: `/${lang}#sicher`, label: dict.nav.safe, show: "lg:inline" },
    { href: `/${lang}#gruendungspaket`, label: dict.nav.founder, show: "md:inline" },
    { href: `/${lang}#faq`, label: dict.nav.faq, show: "md:inline" },
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-night-900/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href={`/${lang}`} aria-label="Tisch6 Startseite">
          <Logo />
        </Link>
        <nav className="flex items-center gap-1 text-sm sm:gap-2">
          {items.map((item) => (
            <Link key={item.href} href={item.href} className={`hidden rounded-full px-3 py-2 text-mist transition hover:text-cloud ${item.show}`}>
              {item.label}
            </Link>
          ))}
          <Link href={`/${lang}/konto`} className="rounded-full px-3 py-2 text-mist transition hover:text-cloud">
            {dict.nav.account}
          </Link>
          <Link href={`/${lang}/bewerben`} className="btn btn-primary btn-sm">
            {dict.nav.apply}
          </Link>
        </nav>
      </div>
    </header>
  );
}
