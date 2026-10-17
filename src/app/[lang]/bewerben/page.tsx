import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { ApplyFlow } from "@/components/ApplyFlow";

export const metadata: Metadata = { title: "Bewerbung" };

export default async function ApplyPage({ params, searchParams }: PageProps<"/[lang]/bewerben">) {
  const { lang } = await params;
  const { mit } = await searchParams;
  const invitedBy = typeof mit === "string" && /^[a-z0-9]{8}$/.test(mit) ? mit : undefined;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return <ApplyFlow lang={lang} t={dict.apply} invitedBy={invitedBy} />;
}
