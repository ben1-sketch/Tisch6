import Link from "next/link";
import type { Dictionary } from "@/i18n/get-dictionary";
import { HeaderCta } from "./HeaderCta";
import { Logo } from "./Logo";

export function Header({ lang, dict }: { lang: string; dict: Dictionary }) {
  const items = [
    { href: `/${lang}#so-gehts`, label: dict.nav.how, show: "lg:inline" },
    { href: `/${lang}#ambiente`, label: dict.nav.ambiente, show: "lg:inline" },
    { href: `/${lang}#sicher`, label: dict.nav.safe, show: "xl:inline" },
    { href: `/${lang}#gruendungspaket`, label: dict.nav.founder, show: "xl:inline" },
    { href: `/${lang}#faq`, label: dict.nav.faq, show: "lg:inline" },
  ];
  const linkClass = "px-2.5 py-2 text-[0.68rem] font-medium tracking-[0.18em] whitespace-nowrap text-mist uppercase transition hover:text-gold-300";
  return (
    <header className="sticky top-0 z-40 border-b border-gold-400/10 bg-night-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-[4.5rem] max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href={`/${lang}`} aria-label="Tisch6 Startseite" className="shrink-0">
          <Logo />
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          {items.map((item) => (
            <Link key={item.href} href={item.href} className={`hidden ${linkClass} ${item.show}`}>
              {item.label}
            </Link>
          ))}
          <Link href={`/${lang}/konto`} className={`hidden min-[440px]:inline ${linkClass}`}>
            {dict.nav.account}
          </Link>
          <HeaderCta
            lang={lang}
            labels={{ apply: dict.nav.apply, applied: dict.nav.applied, invited: dict.nav.invited, team: dict.nav.team }}
          />
        </nav>
      </div>
    </header>
  );
}
