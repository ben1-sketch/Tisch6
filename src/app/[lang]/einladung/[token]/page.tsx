import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { db } from "@/lib/db";
import { seatView } from "@/lib/views";
import { MarkVisitor } from "@/components/MarkVisitor";
import { SeatSeen } from "@/components/SeatSeen";
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
  const active = ["invited", "offered", "confirmed"].includes(view.status) && view.dinnerStatus !== "cancelled";
  return (
    <>
      {/* vor MarkVisitor, damit Geräte des Teams noch als solche erkannt werden */}
      {(view.status === "invited" || view.status === "offered") && <SeatSeen token={token} />}
      <MarkVisitor status={active ? "eingeladen" : "beworben"} app={view.appToken} keep={!active} />
      <SeatPage view={view} t={dict.seat} lang={lang} paid={bezahlt === "1"} openReport={melden === "1"} />
    </>
  );
}
