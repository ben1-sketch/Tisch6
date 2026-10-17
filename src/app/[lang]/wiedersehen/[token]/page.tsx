import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { db } from "@/lib/db";
import { feedbackView } from "@/lib/views";
import { FeedbackForm } from "@/components/FeedbackForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Wiedersehen & Feedback", robots: { index: false } };

export default async function FeedbackPage({ params }: PageProps<"/[lang]/wiedersehen/[token]">) {
  const { lang, token } = await params;
  if (!isLocale(lang)) notFound();
  const view = await feedbackView(db(), token);
  if (!view) notFound();
  const dict = await getDictionary(lang);
  return <FeedbackForm view={view} t={dict.feedback} />;
}
