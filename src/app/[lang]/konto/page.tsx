import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { Account } from "@/components/Account";

export const metadata: Metadata = { title: "Mein Konto", robots: { index: false } };

export default async function AccountPage({ params }: PageProps<"/[lang]/konto">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return <Account lang={lang} t={dict.account} buddyT={dict.apply.buddy} />;
}
