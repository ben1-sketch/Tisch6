-- Tisch6 · Etappe 1: Verifizierungsfoto & Empfehlungsprogramm
-- Nach 0001 und 0002 im SQL Editor ausführen. Kann gefahrlos mehrfach ausgeführt werden.

-- Pfad zum verschlüsselten Verifizierungsfoto (nur für den Admin, nie für andere Gäste)
alter table public.applications add column if not exists photo_path text;

-- Wer hat diese Person eingeladen? Grundlage für den Empfehlungsrabatt (Etappe 2)
alter table public.applications
  add column if not exists referred_by uuid references public.applications (id) on delete set null;
create index if not exists applications_referred_by_idx on public.applications (referred_by);

-- Privater Speicher für die Fotos. Ohne Policies: nur der Server (Service Role) hat Zugriff.
insert into storage.buckets (id, name, public)
values ('verification-photos', 'verification-photos', false)
on conflict (id) do update set public = false;
