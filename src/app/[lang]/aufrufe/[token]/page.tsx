import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { OptOut } from "@/components/OptOut";
import { OPT_OUT_TOKEN } from "@/lib/campaigns";

export const metadata: Metadata = { title: "Abbestellen", robots: { index: false } };

export default async function OptOutPage({ params }: PageProps<"/[lang]/aufrufe/[token]">) {
  const { lang, token } = await params;
  if (!isLocale(lang) || !OPT_OUT_TOKEN.test(token)) notFound();
  const dict = await getDictionary(lang);
  return <OptOut token={token} lang={lang} t={dict.optOut} />;
}
