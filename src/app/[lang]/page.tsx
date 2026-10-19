import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { Foto } from "@/components/Foto";
import { Particles } from "@/components/Particles";
import { ScrollReveal } from "@/components/ScrollReveal";
import { StepArt } from "@/components/StepArt";
import { Table3D } from "@/components/Table3D";
import { Ticker } from "@/components/Ticker";
import { bilder } from "@/lib/bilder";
import { FOUNDER } from "@/lib/config";
import { founderRemaining } from "@/lib/founder-count";

/** Der Zähler „noch X von 300“ wird alle fünf Minuten neu geladen – sonst bleibt die Seite statisch und schnell. */
export const revalidate = 300;

const STEP_ART = ["bewerben", "einladung", "tisch"] as const;

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const [t, remaining] = await Promise.all([getDictionary(lang), founderRemaining()]);
  const free = remaining ?? FOUNDER.limit;
  const apply = `/${lang}/bewerben`;
  // Bildstrecke „Das Ambiente“ – gleiche Reihenfolge wie die Texte in t.ambiente.photos; das erste Bild ist das große
  const ambiente = [bilder.ambienteBar, bilder.ambienteLounge, bilder.ambienteSamt, bilder.ambienteGlaeser];

  return (
    <>
      <Particles />
      <ScrollReveal />
      <div className="relative z-10">
        {/* 1 · Hero: Vollbild, drehender 3D-Tisch */}
        <section className="relative overflow-hidden">
          <Foto src={bilder.heroHintergrund.src} alt="" sizes="100vw" className="absolute inset-0" tint="hero" verlauf={false} preload />
          <div className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" aria-hidden="true" />
          <div className="absolute -top-40 right-0 h-96 w-96 rounded-full bg-rose-500/15 blur-3xl" aria-hidden="true" />
          <div className="relative mx-auto grid min-h-[calc(100svh-4rem)] max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 md:py-20">
            <div>
              <p className="enter inline-flex items-center gap-2 rounded-full border border-rose-400/30 bg-rose-400/10 px-3 py-1 text-xs font-medium tracking-wide text-rose-300">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-400" aria-hidden="true" />
                {t.hero.eyebrow}
              </p>
              <h1 className="enter mt-6 font-display text-4xl leading-tight font-semibold tracking-tight sm:text-5xl lg:text-6xl" style={{ animationDelay: "0.1s" }}>
                {t.hero.title1}
                <br />
                {t.hero.title2}
                <br />
                <span className="text-gradient">{t.hero.title3}</span>
              </h1>
              <p className="enter mt-6 max-w-xl text-lg leading-relaxed text-mist" style={{ animationDelay: "0.2s" }}>
                {t.hero.lead}
              </p>
              <div className="enter mt-8 flex flex-col gap-3 sm:flex-row" style={{ animationDelay: "0.3s" }}>
                <Link href={apply} className="btn btn-primary btn-pulse">
                  {t.hero.cta}
                </Link>
                <a href="#so-gehts" className="btn btn-ghost">
                  {t.hero.secondary}
                </a>
              </div>
              <p className="enter mt-4 text-sm text-mist/80" style={{ animationDelay: "0.4s" }}>
                {t.hero.note}
              </p>
            </div>
            <div className="enter relative order-first -mt-2 md:order-last md:mt-0" style={{ animationDelay: "0.2s" }}>
              <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-rose-500/20 blur-3xl sm:h-80 sm:w-80" aria-hidden="true" />
              <Table3D label={t.hero.sceneLabel} />
            </div>
          </div>
        </section>

        {/* 2 · So funktioniert's: drei Schritte fliegen nacheinander ein */}
        <section id="so-gehts" className="scroll-mt-20 mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <div data-reveal>
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{t.steps.title}</h2>
            <p className="mt-3 text-mist">{t.steps.lead}</p>
          </div>
          <ol className="mt-12 grid gap-5 md:grid-cols-3">
            {t.steps.items.map((s, i) => (
              <li key={s.title} data-reveal style={{ transitionDelay: `${i * 180}ms` }} className="glass rounded-3xl p-6 sm:p-7">
                <StepArt kind={STEP_ART[i]} />
                <span className="mt-6 block font-display text-sm font-semibold text-rose-400">0{i + 1}</span>
                <h3 className="mt-1 font-display text-2xl font-semibold">{s.title}</h3>
                <p className="mt-3 leading-relaxed text-mist">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* 3 · Was uns auszeichnet: neun Karten, kippen beim Darüberfahren */}
        <section id="auszeichnet" className="scroll-mt-20 mx-auto max-w-6xl px-4 pb-20 sm:px-6 sm:pb-28">
          <div data-reveal>
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{t.distinct.title}</h2>
            <p className="mt-3 text-mist">{t.distinct.lead}</p>
          </div>
          <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {t.distinct.items.map((item, i) => (
              <li key={item.title} data-reveal style={{ transitionDelay: `${(i % 3) * 120}ms` }} className="card-tilt glass rounded-2xl p-6">
                <span className="font-display text-sm font-semibold text-rose-400/80 tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-2 font-display text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-mist">{item.text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Das Ambiente – edle Lokale, Bildstrecke */}
        <section id="ambiente" className="scroll-mt-20 mx-auto max-w-6xl px-4 pb-20 sm:px-6 sm:pb-28">
          <div data-reveal className="max-w-3xl">
            <p className="text-sm font-semibold tracking-wide text-rose-400 uppercase">{t.ambiente.eyebrow}</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">{t.ambiente.title}</h2>
            <p className="mt-4 leading-relaxed text-mist">{t.ambiente.lead}</p>
          </div>
          <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
            {ambiente.map((bild, i) => {
              const p = t.ambiente.photos[i];
              const feature = i === 0;
              // Handy: großes Bild und letztes Bild über zwei Spalten, die zwei Hochformate nebeneinander
              const shape =
                i === 0
                  ? "col-span-2 aspect-[16/10] sm:aspect-auto sm:min-h-[26rem]"
                  : i === 3
                    ? "col-span-2 aspect-[16/10] sm:col-span-1 sm:aspect-auto sm:min-h-[22rem]"
                    : "aspect-[4/5] sm:aspect-auto sm:min-h-[22rem]";
              return (
                <figure
                  key={p.label}
                  data-reveal
                  style={{ transitionDelay: `${i * 120}ms` }}
                  className={`relative overflow-hidden rounded-3xl border border-white/10 ${shape}`}
                >
                  <Foto src={bild.src} alt={p.alt} sizes={feature ? "(min-width: 640px) 48rem, 100vw" : "(min-width: 640px) 24rem, 100vw"} className="absolute inset-0" />
                  <figcaption className="absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-night-950/55 px-3 py-1.5 text-xs font-medium tracking-wide backdrop-blur-md sm:bottom-5 sm:left-5">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-400" aria-hidden="true" />
                    {p.label}
                  </figcaption>
                </figure>
              );
            })}
            <div data-reveal style={{ transitionDelay: "360ms" }} className="glass col-span-2 flex flex-col justify-center rounded-3xl p-7 sm:col-span-1 sm:min-h-[22rem]">
              <h3 className="font-display text-xl font-semibold">{t.ambiente.factsTitle}</h3>
              <ul className="mt-5 space-y-3 text-sm leading-relaxed text-mist">
                {t.ambiente.facts.map((f) => (
                  <li key={f} className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-rose-400" aria-hidden="true" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* 4 · Sicher für Frauen / Fair für Männer – nebeneinander, Hintergrund: gedeckter Tisch */}
        <section id="sicher" className="scroll-mt-20 relative overflow-hidden border-y border-white/5">
          <Foto src={bilder.gedeckt.src} alt="" sizes="100vw" className="absolute inset-0" tint="strong" verlauf={false} />
          <div className="relative mx-auto grid max-w-6xl gap-6 px-4 py-20 sm:px-6 sm:py-28 md:grid-cols-2">
            {[t.safe.women, t.safe.men].map((col, i) => (
              <div key={col.eyebrow} data-reveal style={{ transitionDelay: `${i * 180}ms` }} className="glass-strong rounded-3xl p-7 sm:p-9">
                <p className="text-sm font-semibold tracking-wide text-rose-400 uppercase">{col.eyebrow}</p>
                <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight sm:text-3xl">{col.title}</h2>
                <p className="mt-3 leading-relaxed text-mist">{col.lead}</p>
                <ul className="mt-7 space-y-5">
                  {col.items.map((item) => (
                    <li key={item.title} className="flex gap-3">
                      <span className="mt-2 h-2 w-2 flex-none rounded-full bg-rose-400" aria-hidden="true" />
                      <div>
                        <h3 className="font-display font-semibold">{item.title}</h3>
                        <p className="mt-1 text-sm leading-relaxed text-mist">{item.text}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* 5 · Gründungspaket mit tickendem Zähler */}
        <section id="gruendungspaket" className="scroll-mt-20 mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
            <div data-reveal>
              <p className="text-sm font-semibold tracking-wide text-rose-400 uppercase">{t.founder.eyebrow}</p>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">{t.founder.title}</h2>
              <p className="mt-4 max-w-xl leading-relaxed text-mist">{t.founder.lead}</p>
              <p className="mt-8 font-display text-2xl font-semibold sm:text-3xl">
                {t.founder.counterBefore}{" "}
                <span className="text-gradient text-4xl sm:text-5xl">
                  <Ticker value={free} total={FOUNDER.limit} />
                </span>{" "}
                {t.founder.counterAfter}
              </p>
              <p className="mt-6 max-w-xl text-sm leading-relaxed text-mist">{t.founder.single}</p>
            </div>
            <article
              data-reveal
              style={{ transitionDelay: "180ms" }}
              className="relative overflow-hidden rounded-3xl border border-rose-400/50 bg-gradient-to-br from-night-700 to-night-800 p-8 shadow-xl shadow-rose-500/10"
            >
              <div className="absolute -top-20 -right-20 h-48 w-48 rounded-full bg-rose-500/25 blur-3xl" aria-hidden="true" />
              <span className="relative inline-block rounded-full bg-rose-400 px-3 py-1 text-xs font-semibold text-night-950">{t.founder.badge}</span>
              <p className="relative mt-5 flex items-baseline gap-3">
                <span className="font-display text-5xl font-semibold text-gradient">{t.founder.price}</span>
                <span className="text-mist line-through">{t.founder.was}</span>
              </p>
              <p className="relative mt-1 text-sm text-mist">{t.founder.unit}</p>
              <ul className="relative mt-6 space-y-2 text-sm text-mist">
                {t.founder.points.map((p) => (
                  <li key={p} className="flex gap-2">
                    <span className="text-rose-400" aria-hidden="true">
                      ·
                    </span>
                    {p}
                  </li>
                ))}
              </ul>
              <Link href={apply} className="btn btn-primary relative mt-8 w-full sm:w-auto">
                {t.founder.cta}
              </Link>
            </article>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-20 mx-auto max-w-3xl px-4 pb-20 sm:px-6 sm:pb-28" data-reveal>
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{t.faq.title}</h2>
          <div className="mt-8 divide-y divide-white/10 border-y border-white/10">
            {t.faq.items.map((f) => (
              <details key={f.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                  {f.q}
                  <span className="text-rose-400 transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 leading-relaxed text-mist">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* 6 · Abschluss */}
        <section className="px-4 pb-24 sm:px-6">
          <div
            data-reveal
            className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-rose-400/20 bg-gradient-to-br from-night-700 to-night-800 px-6 py-16 text-center"
          >
            <Foto src={bilder.abschluss.src} alt="" sizes="(min-width: 896px) 56rem, 100vw" className="absolute inset-0" tint="strong" verlauf={false} />
            <div className="absolute -bottom-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-rose-500/25 blur-3xl" aria-hidden="true" />
            <h2 className="relative font-display text-3xl font-semibold tracking-tight sm:text-4xl">{t.closing.title}</h2>
            <p className="relative mt-3 text-mist">{t.closing.text}</p>
            <Link href={apply} className="btn btn-primary relative mt-8 px-9 text-lg">
              {t.closing.cta}
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
