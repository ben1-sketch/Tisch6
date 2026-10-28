import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ApplyLink } from "@/components/ApplyLink";
import { Ornament } from "@/components/Ornament";
import { isLocale } from "@/i18n/config";
import { canonicalOrigin } from "@/lib/site";
import { THEMEN } from "@/lib/themen";

export async function generateMetadata({ params }: PageProps<"/[lang]/ratgeber">): Promise<Metadata> {
  const { lang } = await params;
  return {
    title: "Ratgeber: Singles in Wien kennenlernen",
    description:
      "Alles rund um Singles, Dating und Kennenlernen in Wien: Dinner-Dating, Partnersuche, Singles ab 30 und ab 40, Dating ohne App und wie ein Abend bei Tisch6 abläuft.",
    alternates: { canonical: `${canonicalOrigin}/${lang}/ratgeber` },
  };
}

/** Übersicht aller Themenseiten – für Menschen, die stöbern, und für Google */
export default async function Ratgeber({ params }: PageProps<"/[lang]/ratgeber">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  return (
    <>
      <section className="px-4 pt-20 pb-12 text-center sm:px-6 sm:pt-28">
        <div className="mx-auto max-w-3xl">
          <p className="eyebrow">Ratgeber</p>
          <Ornament className="mt-6" />
          <h1 className="mt-8 font-display text-4xl leading-tight text-balance sm:text-6xl">Singles in Wien kennenlernen</h1>
          <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-cloud/80">
            Wo, wie und mit wem: alles rund um Dating und Kennenlernen in Wien – und wie ein Abend bei Tisch6 abläuft.
          </p>
        </div>
      </section>

      <div className="mx-auto grid max-w-5xl gap-5 px-4 pb-16 sm:grid-cols-2 sm:px-6">
        {THEMEN.map((t) => (
          <Link key={t.slug} href={`/${lang}/${t.slug}`} className="glass block rounded-3xl p-6 transition hover:border-gold-400/40 sm:p-8">
            <p className="eyebrow">{t.eyebrow}</p>
            <h2 className="mt-3 font-display text-2xl">{t.title}</h2>
            <p className="mt-3 leading-relaxed text-mist">{t.description}</p>
          </Link>
        ))}
      </div>

      <section className="px-4 pb-24 text-center sm:px-6">
        <ApplyLink href={`/${lang}/bewerben`} className="btn btn-primary">
          Kostenlos bewerben
        </ApplyLink>
      </section>
    </>
  );
}
