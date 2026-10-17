import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";

const SEAT_TRAITS = ["tiefgründig", "humorvoll", "abenteuerlustig", "ruhig", "gesellig", "neugierig"];

/** Illustration: ein runder Tisch mit sechs Plätzen, die von der KI verbunden werden. */
function TableVisual() {
  const seats = SEAT_TRAITS.map((trait, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    return { trait, x: 200 + 140 * Math.cos(angle), y: 200 + 140 * Math.sin(angle), rose: i % 2 === 1 };
  });
  return (
    <div className="relative mx-auto aspect-square w-full max-w-md">
      <div className="absolute inset-8 rounded-full bg-rose-500/20 blur-3xl" />
      <svg viewBox="0 0 400 400" className="relative h-full w-full" role="img" aria-label="Sechs Plätze an einem runden Tisch">
        <g className="animate-orbit" style={{ transformOrigin: "200px 200px" }}>
          <circle cx="200" cy="200" r="175" fill="none" stroke="rgb(167 174 208 / 0.15)" strokeDasharray="2 8" />
        </g>
        {seats.map((a, i) =>
          seats.slice(i + 1).map((b, j) => (
            <line key={`${i}-${j}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="rgb(244 182 194 / 0.12)" />
          )),
        )}
        <circle cx="200" cy="200" r="70" fill="var(--color-night-800)" stroke="var(--color-rose-400)" strokeWidth="2" />
        <text x="200" y="196" textAnchor="middle" className="fill-cloud font-display" fontSize="26" fontWeight="600">
          6
        </text>
        <text x="200" y="220" textAnchor="middle" className="fill-mist" fontSize="11" letterSpacing="2">
          PLÄTZE
        </text>
        {seats.map((s) => (
          <g key={s.trait}>
            <circle cx={s.x} cy={s.y} r="26" fill="var(--color-night-700)" stroke={s.rose ? "var(--color-rose-500)" : "var(--color-cloud)"} strokeOpacity="0.7" />
            <circle cx={s.x} cy={s.y} r="7" fill={s.rose ? "var(--color-rose-500)" : "var(--color-cloud)"} />
            <text x={s.x} y={s.y + 44} textAnchor="middle" className="fill-mist" fontSize="12">
              {s.trait}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

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
          <TableVisual />
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
        <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {t.how.steps.map((s, i) => (
            <li key={s.title} className="relative rounded-2xl border border-white/10 bg-night-800/60 p-6">
              <span className="font-display text-sm font-semibold text-rose-400">0{i + 1}</span>
              <h3 className="mt-2 font-display text-xl font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-mist">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Matching-Regeln */}
      <section className="border-y border-white/5 bg-night-950/60">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{t.table.title}</h2>
          <dl className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {t.table.rules.map((r) => (
              <div key={r.v} className="border-l-2 border-rose-400/60 pl-4">
                <dt className="font-display text-4xl font-semibold text-gradient">{r.k}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-mist">{r.v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Sicherheit */}
      <section id="sicherheit" className="scroll-mt-20 mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="glass rounded-3xl p-8 sm:p-12">
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
