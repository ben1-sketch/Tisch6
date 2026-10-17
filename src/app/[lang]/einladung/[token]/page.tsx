import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { db } from "@/lib/db";
import { seatView } from "@/lib/views";
import { SeatPage } from "@/components/SeatPage";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Deine Einladung", robots: { index: false } };

export default async function InvitationPage({ params, searchParams }: PageProps<"/[lang]/einladung/[token]">) {
  const { lang, token } = await params;
  if (!isLocale(lang)) notFound();
  const view = await seatView(db(), token);
  if (!view) notFound();
  const dict = await getDictionary(lang);
  const { bezahlt, melden } = await searchParams;
  return <SeatPage view={view} t={dict.seat} lang={lang} paid={bezahlt === "1"} openReport={melden === "1"} />;
}
