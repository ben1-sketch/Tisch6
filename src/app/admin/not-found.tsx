import Link from "next/link";

export default function AdminNotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="glass max-w-sm rounded-3xl p-8 text-center">
        <p className="font-display text-xl font-semibold">Nicht gefunden</p>
        <p className="mt-2 text-sm text-mist">Diesen Eintrag gibt es nicht (mehr) – vielleicht wurde das Profil gelöscht.</p>
        <Link href="/admin" className="mt-5 inline-block rounded-full bg-rose-400 px-5 py-2.5 text-sm font-semibold text-night-950 hover:bg-rose-300">
          Zur Übersicht
        </Link>
      </div>
    </main>
  );
}
