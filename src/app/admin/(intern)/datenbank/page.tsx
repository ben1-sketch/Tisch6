import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { Card, Facts, Notice, PageTitle } from "@/components/admin/ui";
import { isAdmin } from "@/lib/admin/auth";
import { checkDatabase } from "@/lib/admin/health";

export const metadata: Metadata = { title: "Datenbank" };

const state = (ok: boolean, alt: string) => (ok ? "✓ vorhanden" : `fehlt (oder ${alt})`);

function Steps({ children }: { children: ReactNode }) {
  return <ol className="list-decimal space-y-2 pl-5 text-sm text-cloud">{children}</ol>;
}

/** Wo die drei Supabase-Werte stehen und wohin sie in Vercel gehören */
function CopyKeys() {
  return (
    <Steps>
      <li>
        Am einfachsten: in Supabase <b>Project Settings → Integrations → Vercel</b> öffnen und dein Vercel-Projekt verbinden – das trägt die Werte von
        selbst ein.
      </li>
      <li>
        Oder von Hand in Vercel unter <b>Einstellungen → Umgebungsvariablen</b>:
        <ul className="mt-1 list-disc space-y-1 pl-5 text-mist">
          <li>
            <code>NEXT_PUBLIC_SUPABASE_URL</code> = „Project URL“ aus Supabase <b>Project Settings → Data API</b>
          </li>
          <li>
            <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> = „Publishable key“ aus <b>Project Settings → API Keys</b>
          </li>
          <li>
            <code>SUPABASE_SECRET_KEY</code> = „Secret key“ von derselben Seite – geheim halten
          </li>
        </ul>
      </li>
      <li>Danach in Vercel neu veröffentlichen und diese Seite neu laden.</li>
    </Steps>
  );
}

export default async function DatabasePage() {
  // Bewusst ohne requireAdmin – das würde bei fehlender Datenbank wieder hierher leiten
  if (!(await isAdmin())) redirect(`/admin/login?weiter=${encodeURIComponent("/admin/datenbank")}`);
  const h = await checkDatabase();
  const ref = h.host?.split(".")[0] ?? null;

  return (
    <>
      <PageTitle title="Datenbank" sub="Verbindung zwischen der Website (Vercel) und Supabase" />
      <div className="space-y-4">
        {h.ok ? (
          <Notice tone="green">
            Die Datenbank ist verbunden und vollständig eingerichtet.{" "}
            <Link href="/admin" className="underline">
              Zur Übersicht
            </Link>
          </Notice>
        ) : (
          <Notice tone="red">
            {h.problem === "env" && "Vercel ist noch nicht mit Supabase verbunden – es fehlen Zugangsdaten."}
            {h.problem === "tables" && `Vercel ist mit dem Supabase-Projekt „${ref}“ verbunden – dort fehlen aber die Tisch6-Tabellen.`}
            {h.problem === "key" && "Der Schlüssel in SUPABASE_SECRET_KEY passt nicht zu diesem Supabase-Projekt."}
            {h.problem === "connection" && "Supabase antwortet nicht."}
            {h.detail && <span className="mt-1 block text-xs opacity-80">Meldung: {h.detail}</span>}
          </Notice>
        )}

        <Card title="In Vercel eingetragen">
          <Facts
            rows={[
              ["Supabase-Projekt", ref ? `${ref} (${h.host})` : "–"],
              ["NEXT_PUBLIC_SUPABASE_URL", h.env.url ? "✓ vorhanden" : "fehlt"],
              ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", state(h.env.publishableKey, "…_ANON_KEY")],
              ["SUPABASE_SECRET_KEY", state(h.env.secretKey, "SUPABASE_SERVICE_ROLE_KEY")],
            ]}
          />
          <p className="mt-3 text-xs text-mist">Hier stehen nie die Werte selbst, nur ob sie da sind.</p>
        </Card>

        {!h.ok && (
          <Card title="So behebst du es">
            {h.problem === "env" && <CopyKeys />}
            {h.problem === "tables" && (
              <Steps>
                <li>
                  Supabase öffnen. In der Adresszeile steht <code>…/project/KENNUNG</code>. Ist die Kennung <b>{ref}</b>?
                </li>
                <li>
                  <b>Ja:</b> In genau diesem Projekt im <b>SQL Editor</b> den Inhalt von <code>supabase/alles-in-einem.sql</code> einfügen und <b>Run</b>.
                  Dann diese Seite neu laden.
                </li>
                <li>
                  <b>Nein:</b> Vercel zeigt auf ein anderes Supabase-Projekt als das, in dem du das SQL ausgeführt hast. Trag die Werte des richtigen
                  Projekts ein:
                  <div className="mt-2">
                    <CopyKeys />
                  </div>
                </li>
              </Steps>
            )}
            {h.problem === "key" && (
              <Steps>
                <li>
                  In <code>SUPABASE_SECRET_KEY</code> muss der <b>Secret key</b> stehen (beginnt mit <code>sb_secret_</code>) – nicht der Publishable
                  oder anon key.
                </li>
                <li>
                  Zu finden in Supabase unter <b>Project Settings → API Keys</b>, im Projekt <b>{ref}</b>.
                </li>
                <li>In Vercel korrigieren, neu veröffentlichen, diese Seite neu laden.</li>
              </Steps>
            )}
            {h.problem === "connection" && (
              <Steps>
                <li>
                  Kostenlose Supabase-Projekte schlafen nach einer Woche ohne Nutzung ein: Projekt in Supabase öffnen und <b>Restore project</b> tippen.
                </li>
                <li>
                  Sonst die <code>NEXT_PUBLIC_SUPABASE_URL</code> in Vercel prüfen – sie sieht aus wie <code>https://KENNUNG.supabase.co</code>.
                </li>
              </Steps>
            )}
          </Card>
        )}

        <p className="text-sm">
          <Link href="/admin/datenbank" className="text-rose-300 hover:underline">
            Erneut prüfen
          </Link>
        </p>
      </div>
    </>
  );
}
