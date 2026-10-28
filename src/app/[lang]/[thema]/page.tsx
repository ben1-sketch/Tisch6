import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ApplyLink } from "@/components/ApplyLink";
import { Ornament } from "@/components/Ornament";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { ogBild } from "@/lib/bilder";
import { dinnerDaysPhrase, dinnerWeekdays } from "@/lib/dinner-days";
import { canonicalOrigin } from "@/lib/site";
import { fill } from "@/lib/text";
import { THEMEN, themaBySlug } from "@/lib/themen";

// Dinner-Tage kommen aus den Lokalen – alle 5 Minuten neu
export const revalidate = 300;
export const dynamicParams = false;

export function generateStaticParams() {
  return THEMEN.map((t) => ({ thema: t.slug }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/[thema]">): Promise<Metadata> {
  const { lang, thema } = await params;
  const t = themaBySlug(thema);
  if (!t || !isLocale(lang)) return {};
  const dict = await getDictionary(lang);
  const url = `${canonicalOrigin}/${lang}/${t.slug}`;
  return {
    title: t.title,
    description: t.description,
    alternates: { canonical: url },
    // openGraph ersetzt den Eintrag des Layouts komplett – daher Bild und Name hier noch einmal
    openGraph: {
      title: t.title,
      description: t.description,
      url,
      siteName: "Tisch6",
      locale: "de_AT",
      type: "website",
      images: [{ url: ogBild, width: 1200, height: 630, alt: dict.meta.imageAlt }],
    },
  };
}

/** Themenseite für Google: ein Suchbegriff, echter Inhalt, Weg zur Bewerbung */
export default async function ThemaPage({ params }: PageProps<"/[lang]/[thema]">) {
  const { lang, thema } = await params;
  const t = themaBySlug(thema);
  if (!t || !isLocale(lang)) notFound();
  const tage = dinnerDaysPhrase(await dinnerWeekdays());
  const apply = `/${lang}/bewerben`;
  const faq = t.faq.map((f) => ({ q: f.q, a: fill(f.a, { tage }) }));
  // „Mehr zum Thema“: die nächsten fünf Seiten der Liste – so verlinkt jede Seite andere und jede wird verlinkt
  const index = THEMEN.indexOf(t);
  const related = Array.from({ length: Math.min(5, THEMEN.length - 1) }, (_, i) => THEMEN[(index + 1 + i) % THEMEN.length]);
  const structured = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structured).replace(/</g, "\\u003c") }} />

      <section className="px-4 pt-20 pb-14 text-center sm:px-6 sm:pt-28">
        <div className="mx-auto max-w-3xl">
          <p className="eyebrow">{t.eyebrow}</p>
          <Ornament className="mt-6" />
          <h1 className="mt-8 font-display text-4xl leading-tight text-balance sm:text-6xl">{t.h1}</h1>
          <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-cloud/80">{t.lead}</p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <ApplyLink href={apply} className="btn btn-primary">
              Kostenlos bewerben
            </ApplyLink>
            <Link href={`/${lang}#so-gehts`} className="btn btn-ghost">
              So funktioniert Tisch6
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-3xl space-y-6 px-4 pb-20 sm:px-6">
        {t.sections.map((s) => (
          <section key={s.title} className="glass rounded-3xl p-6 sm:p-8">
            <h2 className="font-display text-2xl sm:text-3xl">{s.title}</h2>
            {s.text && <p className="mt-4 leading-relaxed text-mist">{fill(s.text, { tage })}</p>}
            {s.points && (
              <ul className="mt-5 space-y-3">
                {s.points.map((p) => (
                  <li key={p} className="flex gap-3 leading-relaxed text-mist">
                    <span className="mt-2.5 h-1.5 w-1.5 flex-none rotate-45 bg-gold-400" aria-hidden="true" />
                    <span>{fill(p, { tage })}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      <section className="border-t border-gold-400/10 bg-night-950/50">
        <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6 sm:py-24">
          <h2 className="text-center font-display text-3xl sm:text-4xl">Häufige Fragen</h2>
          <Ornament className="mt-6" />
          <div className="mt-10 divide-y divide-gold-400/15 border-y border-gold-400/15">
            {faq.map((f) => (
              <details key={f.q} className="group py-6">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 font-display text-xl sm:text-2xl">
                  {f.q}
                  <span className="text-3xl leading-none font-light text-gold-400 transition duration-300 group-open:rotate-45" aria-hidden="true">
                    +
                  </span>
                </summary>
                <p className="mt-4 leading-relaxed text-mist">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-20 text-center sm:px-6 sm:py-28">
        <div className="mx-auto max-w-2xl">
          <Ornament />
          <h2 className="mt-8 font-display text-3xl leading-tight sm:text-5xl">Dein Platz am Tisch wartet.</h2>
          <p className="mt-5 text-lg text-cloud/80">
            Bewerbung kostenlos – bezahlt wird erst, wenn dein Tisch steht. Tische gibt es {tage}.
          </p>
          <ApplyLink href={apply} className="btn btn-primary mt-10">
            Jetzt bewerben
          </ApplyLink>
          <nav aria-label="Mehr zum Thema" className="mt-14 text-sm text-mist">
            <p className="eyebrow">Mehr zum Thema</p>
            <ul className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-2">
              {related.map((o) => (
                <li key={o.slug}>
                  <Link href={`/${lang}/${o.slug}`} className="underline decoration-gold-400/40 underline-offset-4 transition hover:text-gold-300">
                    {o.short}
                  </Link>
                </li>
              ))}
              <li>
                <Link href={`/${lang}/ratgeber`} className="underline decoration-gold-400/40 underline-offset-4 transition hover:text-gold-300">
                  Alle Themen
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </section>
    </>
  );
}
