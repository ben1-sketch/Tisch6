import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { Rejoin } from "@/components/Rejoin";

export const metadata: Metadata = { title: "Wieder dabei", robots: { index: false } };

export default async function RejoinPage({ params }: PageProps<"/[lang]/weiter/[token]">) {
  const { lang, token } = await params;
  if (!isLocale(lang) || !/^[a-f0-9]{32}$/.test(token)) notFound();
  const dict = await getDictionary(lang);
  return <Rejoin token={token} lang={lang} t={dict.rejoin} />;
}
