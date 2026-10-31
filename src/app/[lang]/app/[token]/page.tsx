import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { db } from "@/lib/db";
import { vapidKeys } from "@/lib/push";
import { appView } from "@/lib/views";
import { MarkVisitor } from "@/components/MarkVisitor";
import { TischApp } from "@/components/TischApp";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[lang]/app/[token]">): Promise<Metadata> {
  const { token } = await params;
  return {
    title: "Deine Tisch6-App",
    robots: { index: false },
    // persönliches Manifest: Wer die Seite zum Home-Bildschirm hinzufügt, landet beim Öffnen wieder hier
    manifest: `/api/app/${encodeURIComponent(token)}/manifest`,
  };
}

/** Persönliche App-Seite – der Link aus Einladung und E-Mail ist der Schlüssel, ein Login braucht es nicht. */
export default async function AppPage({ params }: PageProps<"/[lang]/app/[token]">) {
  const { lang, token } = await params;
  if (!isLocale(lang)) notFound();
  const client = db();
  const view = await appView(client, token);
  if (!view) notFound();
  const [dict, keys] = await Promise.all([getDictionary(lang), vapidKeys(client)]);
  return (
    <>
      <MarkVisitor status={view.team ? "team" : view.next ? "eingeladen" : "beworben"} app={view.token} />
      <TischApp view={view} t={dict.app} lang={lang} vapidKey={keys.publicKey} />
    </>
  );
}
