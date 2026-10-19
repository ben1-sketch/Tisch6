import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { PrintButton } from "@/components/admin/PrintButton";
import { LogoMark } from "@/components/Logo";
import { requireAdmin } from "@/lib/admin/auth";
import { type Dinner, type Restaurant, db } from "@/lib/db";
import { CARD_RULES } from "@/lib/messages";
import { formatDateTime } from "@/lib/time";

export const metadata: Metadata = { title: "Gesprächskarte" };

/** Druckversion der Gesprächskarte – eine Karte pro Tisch */
export default async function CardPrintPage({ params }: PageProps<"/admin/karte/[id]">) {
  await requireAdmin();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const client = db();
  const dinner = (await client.from("dinners").select("*").eq("id", id).maybeSingle()).data as Dinner | null;
  if (!dinner) notFound();
  const restaurant = (await client.from("restaurants").select("*").eq("id", dinner.restaurant_id).maybeSingle()).data as Restaurant | null;
  const card = dinner.conversation_card;

  return (
    <main className="min-h-dvh px-4 py-8 print:p-0">
      <div className="mx-auto mb-6 flex max-w-xl items-center justify-between gap-3 print:hidden">
        <Link href={`/admin/tische/${dinner.id}`} className="text-sm text-gold-300 hover:underline">
          ← zurück zum Tisch
        </Link>
        {card && <PrintButton />}
      </div>

      {card ? (
        <article className="mx-auto max-w-xl rounded-3xl border border-black/10 bg-white p-8 text-[#0b1120] shadow-xl print:max-w-none print:rounded-none print:border-0 print:shadow-none">
          <header className="flex items-center justify-between gap-4 border-b border-[#c09a57] pb-4">
            <div className="flex items-center gap-2 font-display text-xl font-semibold">
              <LogoMark className="h-8 w-8" />
              <span>
                Tisch<span className="text-[#d16d86]">6</span>
              </span>
            </div>
            <div className="text-right text-xs text-[#4a5280]">
              {formatDateTime(new Date(dinner.starts_at))}
              <br />
              {restaurant?.name}
            </div>
          </header>
          <h1 className="mt-6 font-display text-2xl font-semibold">Eure Gesprächskarte</h1>
          <div className="mt-6 space-y-6">
            {card.runden.map((r) => (
              <section key={r.name}>
                <h2 className="text-sm font-semibold tracking-wide text-[#d16d86] uppercase">{r.name}</h2>
                <ol className="mt-2 list-decimal space-y-2 pl-5 text-lg leading-snug">
                  {r.fragen.map((q) => (
                    <li key={q}>{q}</li>
                  ))}
                </ol>
              </section>
            ))}
          </div>
          <footer className="mt-8 rounded-2xl bg-[#fdf1f4] p-4 text-sm">
            <p className="font-semibold">Zwei Regeln</p>
            <ul className="mt-1 space-y-1">
              {CARD_RULES.map((rule) => (
                <li key={rule}>· {rule}</li>
              ))}
            </ul>
          </footer>
        </article>
      ) : (
        <p className="mx-auto max-w-xl rounded-2xl border border-white/10 p-6 text-center text-mist">
          Für diesen Tisch gibt es noch keine Gesprächskarte. Du kannst sie auf der Tisch-Seite erstellen.
        </p>
      )}
    </main>
  );
}
