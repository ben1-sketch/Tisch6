import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/LoginForm";
import { LogoMark } from "@/components/Logo";
import { isAdmin } from "@/lib/admin/auth";
import { MIN_PASSWORD_LENGTH, passwordStatus, safeAdminPath } from "@/lib/admin/session";

export const metadata: Metadata = { title: "Anmelden" };

export default async function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  const { weiter } = await searchParams;
  const target = safeAdminPath(weiter);
  if (await isAdmin()) redirect(target);
  const status = passwordStatus();

  return (
    <main className="bg-grid flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="glass w-full max-w-sm rounded-3xl p-6 sm:p-8">
        <div className="flex items-center gap-2 font-display text-xl font-semibold">
          <LogoMark />
          <span>
            Tisch<span className="text-gold-400">6</span>
          </span>
          <span className="text-base font-normal text-mist">Admin</span>
        </div>
        {status === "ok" ? (
          <LoginForm weiter={target} />
        ) : (
          <div className="mt-6 space-y-3 text-sm text-mist">
            <p className="font-medium text-cloud">Der Adminbereich ist noch nicht eingerichtet.</p>
            <p>
              {status === "short"
                ? `Das Passwort in ADMIN_PASSWORD ist zu kurz – bitte mindestens ${MIN_PASSWORD_LENGTH} Zeichen.`
                : "In Vercel fehlt die Variable ADMIN_PASSWORD."}{" "}
              Danach einmal neu deployen. Anleitung: docs/SETUP-ETAPPE-3.md
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
