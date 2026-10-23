import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { Foto } from "@/components/Foto";
import { Logo } from "@/components/Logo";
import { ScrollReveal } from "@/components/ScrollReveal";
import { WienSilhouette } from "@/components/WienSilhouette";
import { bilder } from "@/lib/bilder";
import { dinnerDaysPhrase, dinnerWeekdays } from "@/lib/dinner-days";
import { fill } from "@/lib/text";

/** Die Dinner-Tage werden alle fünf Minuten neu geladen – sonst bleibt die Seite statisch und schnell. */
export const revalidate = 300;

const ROMAN = ["I", "II", "III"];

/** Kleines Trennzeichen: Haarlinien mit Raute */
function Ornament({ className = "" }: { className?: string }) {
  return (
    <div className={`ornament ${className}`} aria-hidden="true">
      <span />
    </div>
  );
}

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const [t, days] = await Promise.all([getDictionary(lang), dinnerWeekdays()]);
  const tage = dinnerDaysPhrase(days);
  const apply = `/${lang}/bewerben`;
  const feature = { ...bilder.tischrunde, ...t.ambiente.photo };

  return (
    <>
      <ScrollReveal />

      {/* 1 · Seitenanfang: Vollbild-Foto, Überschrift in der Mitte */}
      <section className="relative isolate flex min-h-[calc(100svh-4.5rem)] items-center overflow-hidden">
        <Foto src={bilder.salon.src} alt="" sizes="100vw" className="absolute inset-0 -z-10" tint="hero" verlauf={false} preload zoom fokus="object-[62%_50%]" />
        <div className="mx-auto w-full max-w-4xl px-4 py-24 text-center sm:px-6">
          <p className="enter eyebrow">{t.hero.eyebrow}</p>
          <Ornament className="enter mt-6" />
          <h1 className="enter mt-8 font-display text-[2.75rem] leading-[1.04] sm:text-6xl lg:text-7xl" style={{ animationDelay: "0.15s" }}>
            {t.hero.title1}
            <br />
            {t.hero.title2}
            <br />
            <em className="text-gradient pr-2 italic">{t.hero.title3}</em>
          </h1>
          <p className="enter mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-cloud/80" style={{ animationDelay: "0.3s" }}>
            {t.hero.lead}
          </p>
          <div className="enter mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row" style={{ animationDelay: "0.45s" }}>
            <Link href={apply} className="btn btn-primary">
              {t.hero.cta}
            </Link>
            <a href="#so-gehts" className="btn btn-ghost">
              {t.hero.secondary}
            </a>
          </div>
          <p className="enter mt-7 text-sm text-mist/80" style={{ animationDelay: "0.6s" }}>
            {t.hero.note}
          </p>
        </div>
      </section>

      {/* 2 · Wien bei Kerzenlicht: die Silhouette zeichnet sich beim Hinscrollen */}
      <section className="px-4 pt-24 pb-16 text-center sm:px-6 sm:pt-32 sm:pb-20">
        <div data-reveal className="mx-auto max-w-3xl">
          <p className="eyebrow">{t.wien.eyebrow}</p>
          <h2 className="mt-5 font-display text-4xl leading-tight sm:text-5xl lg:text-6xl">{t.wien.title}</h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-mist">{t.wien.text}</p>
        </div>
        <div data-reveal className="mx-auto mt-14 max-w-5xl">
          <WienSilhouette draw className="h-auto w-full text-gold-400/70" />
        </div>
      </section>

      {/* 3 · So funktioniert's: drei Schritte mit römischen Ziffern */}
      <section id="so-gehts" className="scroll-mt-24 border-y border-gold-400/10 bg-night-950/50">
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32">
          <div data-reveal className="text-center">
            <h2 className="font-display text-4xl sm:text-5xl">{t.steps.title}</h2>
            <p className="mt-4 text-mist">{t.steps.lead}</p>
          </div>
          <ol className="mt-16 grid gap-14 md:grid-cols-3 md:gap-0 md:divide-x md:divide-gold-400/15">
            {t.steps.items.map((s, i) => (
              <li key={s.title} data-reveal style={{ transitionDelay: `${i * 180}ms` }} className="text-center md:px-10">
                <span className="font-display text-6xl text-gold-400 italic">{ROMAN[i]}</span>
                <h3 className="mt-4 font-display text-3xl">{s.title}</h3>
                <div className="mx-auto mt-5 h-px w-10 bg-gold-400/50" aria-hidden="true" />
                <p className="mt-5 leading-relaxed text-mist">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 4 · Das Ambiente: großes Bild mit versetztem Goldrahmen, daneben der Text */}
      <section id="ambiente" className="scroll-mt-24 mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32">
        <div className="grid items-center gap-14 lg:grid-cols-[1.15fr_1fr] lg:gap-20">
          <figure data-reveal className="frame-offset zoom-hover relative mr-4 aspect-[4/3] sm:mr-0">
            <Foto src={feature.src} alt={feature.alt} sizes="(min-width: 1024px) 36rem, 100vw" className="absolute inset-0" />
            <figcaption className="eyebrow absolute bottom-5 left-5 text-cloud">{feature.label}</figcaption>
          </figure>
          <div data-reveal style={{ transitionDelay: "150ms" }}>
            <p className="eyebrow">{t.ambiente.eyebrow}</p>
            <h2 className="mt-5 font-display text-4xl leading-tight sm:text-5xl">{t.ambiente.title}</h2>
            <p className="mt-6 text-lg leading-relaxed text-mist">{t.ambiente.lead}</p>
            <h3 className="eyebrow mt-10 border-t border-gold-400/15 pt-8">{t.ambiente.factsTitle}</h3>
            <ul className="mt-5 space-y-3">
              {t.ambiente.facts.map((f) => (
                <li key={f} className="flex items-center gap-4 text-cloud/90">
                  <span className="h-px w-6 flex-none bg-gold-400" aria-hidden="true" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* 5 · Was uns auszeichnet: neun Felder mit Haarlinien */}
      <section id="auszeichnet" className="scroll-mt-24 border-y border-gold-400/10 bg-night-950/50">
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32">
          <div data-reveal className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-4xl sm:text-5xl">{t.distinct.title}</h2>
            <p className="mt-4 text-mist">{t.distinct.lead}</p>
          </div>
          <ol className="mt-16 grid border-t border-l border-gold-400/15 sm:grid-cols-2 lg:grid-cols-3">
            {t.distinct.items.map((item, i) => (
              <li
                key={item.title}
                data-reveal
                style={{ transitionDelay: `${(i % 3) * 120}ms` }}
                className="border-r border-b border-gold-400/15 p-8 transition-colors duration-700 hover:bg-gold-400/[0.04] sm:p-9"
              >
                <span className="font-display text-xl text-gold-400 italic tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-3 font-display text-2xl leading-snug">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-mist">{item.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 6 · Sicher für Frauen / Fair für Männer – Hintergrund: die Fenster des Salons mit Blick auf Wien */}
      <section id="sicher" className="scroll-mt-24 relative isolate overflow-hidden">
        <Foto src={bilder.salon.src} alt="" sizes="100vw" className="absolute inset-0 -z-10" tint="strong" verlauf={false} fokus="object-right" />
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-24 sm:px-6 sm:py-32 md:grid-cols-2">
          {[t.safe.women, t.safe.men].map((col, i) => (
            <div key={col.eyebrow} data-reveal style={{ transitionDelay: `${i * 180}ms` }} className="glass-strong p-8 sm:p-11">
              <p className="eyebrow">{col.eyebrow}</p>
              <h2 className="mt-4 font-display text-3xl leading-tight sm:text-4xl">{col.title}</h2>
              <p className="mt-4 leading-relaxed text-mist">{col.lead}</p>
              <ul className="mt-8 space-y-6 border-t border-gold-400/15 pt-8">
                {col.items.map((item) => (
                  <li key={item.title} className="flex gap-4">
                    <span className="mt-2.5 h-1.5 w-1.5 flex-none rotate-45 border border-gold-400" aria-hidden="true" />
                    <div>
                      <h3 className="font-display text-xl">{item.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-mist">{item.text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* 7 · Gründungspaket: eine Karte wie eine gedruckte Einladung, dahinter das Gedeck-Foto unscharf */}
      <section id="gruendungspaket" className="relative isolate scroll-mt-24 overflow-hidden">
        <div className="absolute inset-0 -z-10 scale-110 blur-md" aria-hidden="true">
          <Foto src={bilder.gedeck.src} alt="" sizes="100vw" className="absolute inset-0" tint="strong" verlauf={false} />
        </div>
        <div className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6 sm:py-32">
          <div data-reveal className="flex justify-center">
            <Logo />
          </div>
          <article data-reveal style={{ transitionDelay: "150ms" }} className="mt-10 bg-cloud p-2 text-night-900 shadow-2xl shadow-black/60">
            <div className="border border-gold-600/50 p-1.5">
              <div className="border border-gold-600/25 px-5 py-12 sm:px-10 sm:py-14">
                <p className="eyebrow leading-loose text-gold-600 sm:leading-normal">
                  {t.founder.eyebrow}
                  <span className="hidden sm:inline"> · </span>
                  <br className="sm:hidden" />
                  {t.founder.eyebrowWho}
                </p>
                <h2 className="mt-6 font-display text-5xl leading-[1.05] sm:text-6xl">
                  {t.founder.title1}
                  <br />
                  {t.founder.title2} <em className="pr-1 text-gold-600 italic">{t.founder.title3}</em>
                </h2>
                <Ornament className="mt-8 text-gold-600" />
                <p className="eyebrow mt-8 text-sm text-night-700">{t.founder.badge}</p>
                <p className="mt-4 font-display text-[2.75rem] leading-none sm:text-7xl">{t.founder.headline}</p>
                <p className="mt-5 font-display text-4xl lining-nums sm:text-5xl">
                  {t.founder.price}{" "}
                  <s className="text-2xl text-night-600 decoration-gold-600 decoration-2 sm:text-3xl">{t.founder.was}</s>
                </p>
                <p className="mt-3 text-balance text-night-700 lining-nums">{t.founder.perEvening}</p>
                <ul className="mt-8 space-y-2.5 text-balance text-night-700">
                  {t.founder.points.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
                <Link href={apply} className="btn mt-10 bg-night-900 text-gold-200 hover:bg-night-700">
                  {t.founder.cta}
                </Link>
              </div>
            </div>
          </article>
          <p data-reveal className="mx-auto mt-10 max-w-md text-sm leading-relaxed text-balance text-cloud/75">
            {t.founder.note}
          </p>
        </div>
      </section>

      {/* 8 · Häufige Fragen */}
      <section id="faq" className="scroll-mt-24 border-t border-gold-400/10 bg-night-950/50">
        <div data-reveal className="mx-auto max-w-3xl px-4 py-24 sm:px-6 sm:py-32">
          <h2 className="text-center font-display text-4xl sm:text-5xl">{t.faq.title}</h2>
          <Ornament className="mt-6" />
          <div className="mt-12 divide-y divide-gold-400/15 border-y border-gold-400/15">
            {t.faq.items.map((f) => (
              <details key={f.q} className="group py-6">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 font-display text-xl sm:text-2xl">
                  {f.q}
                  <span className="text-3xl leading-none font-light text-gold-400 transition duration-300 group-open:rotate-45" aria-hidden="true">
                    +
                  </span>
                </summary>
                <p className="mt-4 leading-relaxed text-mist">{fill(f.a, { tage })}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* 9 · Abschluss: ein gedeckter Platz wartet */}
      <section className="relative isolate overflow-hidden">
        <Foto src={bilder.gedeck.src} alt="" sizes="100vw" className="absolute inset-0 -z-10" tint="strong" verlauf={false} />
        <div data-reveal className="mx-auto max-w-3xl px-4 py-28 text-center sm:px-6 sm:py-40">
          <Ornament />
          <h2 className="mt-8 font-display text-4xl leading-tight sm:text-6xl">{t.closing.title}</h2>
          <p className="mt-5 text-lg text-cloud/80">{t.closing.text}</p>
          <Link href={apply} className="btn btn-primary mt-10">
            {t.closing.cta}
          </Link>
        </div>
      </section>
    </>
  );
}
