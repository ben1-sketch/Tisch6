import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { SetTable } from "@/components/SetTable";

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = await getDictionary(lang);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
        <div className="absolute -top-40 right-0 h-96 w-96 rounded-full bg-rose-500/15 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pt-16 pb-20 sm:px-6 md:grid-cols-2 md:pt-24">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-rose-400/30 bg-rose-400/10 px-3 py-1 text-xs font-medium tracking-wide text-rose-300">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
              {t.hero.eyebrow}
            </p>
            <h1 className="mt-6 font-display text-4xl leading-tight font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              {t.hero.title1}
              <br />
              {t.hero.title2}
              <br />
              <span className="text-gradient">{t.hero.title3}</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-mist">{t.hero.lead}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={`/${lang}/bewerben`}
                className="rounded-full bg-rose-400 px-7 py-3.5 text-center font-semibold text-night-950 shadow-lg shadow-rose-500/20 transition hover:bg-rose-300"
              >
                {t.hero.cta}
              </Link>
              <a href="#so-gehts" className="rounded-full border border-white/15 px-7 py-3.5 text-center font-medium hover:border-white/30">
                {t.hero.secondary}
              </a>
            </div>
            <p className="mt-4 text-sm text-mist/80">{t.hero.note}</p>
          </div>
          <SetTable label={t.hero.imageAlt} />
        </div>
      </section>

      {/* Vier Argumente */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {t.pillars.map((p) => (
            <article key={p.title} className="glass rounded-2xl p-6">
              <h2 className="font-display text-lg font-semibold">{p.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-mist">{p.text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Ablauf */}
      <section id="so-gehts" className="scroll-mt-20 mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{t.how.title}</h2>
        <p className="mt-3 text-mist">{t.how.lead}</p>
        <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {t.how.steps.map((s, i) => (
            <li key={s.title} className="relative rounded-2xl border border-white/10 bg-night-800/60 p-6">
              <span className="font-display text-sm font-semibold text-rose-400">0{i + 1}</span>
              <h3 className="mt-2 font-display text-xl font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-mist">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Matching-Regeln & Persönlichkeitsachsen */}
      <section className="border-y border-white/5 bg-night-950/60">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{t.table.title}</h2>
            <p className="mt-3 leading-relaxed text-mist">{t.table.lead}</p>
            <ul className="mt-8 space-y-5" aria-label="Persönlichkeitsachsen">
              {t.table.axes.map(([left, right], i) => (
                <li key={left}>
                  <div className="flex justify-between text-sm">
                    <span>{left}</span>
                    <span>{right}</span>
                  </div>
                  <div className="relative mt-2 h-1.5 rounded-full bg-gradient-to-r from-night-600 via-rose-500/60 to-night-600">
                    {[18, 46, 80].map((pos, j) => (
                      <span
                        key={j}
                        className={`absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-night-950 ${j === 1 ? "bg-rose-400" : "bg-cloud"}`}
                        style={{ left: `${(pos + i * 13) % 90 + 5}%` }}
                      />
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <dl className="grid content-center gap-6 sm:grid-cols-2">
            {t.table.rules.map((r) => (
              <div key={r.v} className="border-l-2 border-rose-400/60 pl-4">
                <dt className="font-display text-4xl font-semibold text-gradient">{r.k}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-mist">{r.v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Bring eine Freundin mit */}
      <section className="mx-auto max-w-6xl px-4 pt-16 sm:px-6">
        <div className="grid items-center gap-6 rounded-3xl border border-rose-400/25 bg-gradient-to-r from-rose-500/15 to-night-800/40 p-8 sm:p-10 md:grid-cols-[1fr_auto]">
          <div>
            <h2 className="font-display text-2xl font-semibold sm:text-3xl">{t.buddy.title}</h2>
            <p className="mt-3 max-w-2xl leading-relaxed text-mist">{t.buddy.text}</p>
          </div>
          <Link href={`/${lang}/bewerben`} className="rounded-full border border-rose-400/60 px-6 py-3 text-center font-medium text-rose-300 hover:bg-rose-400/10">
            {t.buddy.cta}
          </Link>
        </div>
      </section>

      {/* Preise */}
      <section id="preise" className="scroll-mt-20 mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{t.prices.title}</h2>
        <p className="mt-3 text-mist">{t.prices.lead}</p>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <article className="glass flex flex-col rounded-3xl p-8">
            <h3 className="font-display text-xl font-semibold">{t.prices.single.name}</h3>
            <p className="mt-4 font-display text-5xl font-semibold">{t.prices.single.price}</p>
            <p className="mt-1 text-sm text-mist">{t.prices.single.unit}</p>
            <ul className="mt-6 space-y-2 text-sm text-mist">
              {t.prices.single.points.map((p) => (
                <li key={p}>· {p}</li>
              ))}
            </ul>
          </article>
          <article className="relative flex flex-col overflow-hidden rounded-3xl border border-rose-400/50 bg-gradient-to-br from-night-700 to-night-800 p-8 shadow-xl shadow-rose-500/10">
            <div className="absolute -top-20 -right-20 h-48 w-48 rounded-full bg-rose-500/25 blur-3xl" />
            <span className="relative self-start rounded-full bg-rose-400 px-3 py-1 text-xs font-semibold text-night-950">{t.prices.founder.badge}</span>
            <h3 className="relative mt-4 font-display text-xl font-semibold">{t.prices.founder.name}</h3>
            <p className="relative mt-4 flex items-baseline gap-3">
              <span className="font-display text-5xl font-semibold text-gradient">{t.prices.founder.price}</span>
              <span className="text-mist line-through">{t.prices.founder.was}</span>
            </p>
            <p className="relative mt-1 text-sm text-mist">{t.prices.founder.unit}</p>
            <ul className="relative mt-6 space-y-2 text-sm text-mist">
              {t.prices.founder.points.map((p) => (
                <li key={p}>· {p}</li>
              ))}
            </ul>
          </article>
        </div>
        <p className="mt-6 text-sm text-mist">{t.prices.note}</p>
      </section>

      {/* Sicherheit & Stammlokale */}
      <section id="sicherheit" className="scroll-mt-20 mx-auto grid max-w-6xl gap-5 px-4 pb-16 sm:px-6 lg:grid-cols-[2fr_1fr]">
        <div className="glass rounded-3xl p-8 sm:p-10">
          <h2 className="font-display text-3xl font-semibold tracking-tight">{t.safety.title}</h2>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {t.safety.items.map((item) => (
              <li key={item} className="flex gap-3 text-mist">
                <svg viewBox="0 0 20 20" className="mt-0.5 h-5 w-5 flex-none text-rose-400" aria-hidden="true">
                  <path fill="currentColor" d="M8.2 13.6 4.6 10l-1.2 1.2 4.8 4.8 9-9-1.2-1.2z" />
                </svg>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-3xl border border-white/10 bg-night-800/60 p-8 sm:p-10">
          <h2 className="font-display text-2xl font-semibold">{t.places.title}</h2>
          <p className="mt-4 leading-relaxed text-mist">{t.places.text}</p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-20 mx-auto max-w-3xl px-4 py-16 sm:px-6">
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

      {/* Abschluss */}
      <section className="px-4 pb-24 sm:px-6">
        <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-rose-400/20 bg-gradient-to-br from-night-700 to-night-800 px-6 py-14 text-center">
          <div className="absolute -bottom-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-rose-500/25 blur-3xl" />
          <h2 className="relative font-display text-3xl font-semibold tracking-tight sm:text-4xl">{t.finalCta.title}</h2>
          <p className="relative mt-3 text-mist">{t.finalCta.text}</p>
          <Link
            href={`/${lang}/bewerben`}
            className="relative mt-8 inline-block rounded-full bg-rose-400 px-8 py-3.5 font-semibold text-night-950 transition hover:bg-rose-300"
          >
            {t.finalCta.cta}
          </Link>
        </div>
      </section>
    </>
  );
}
