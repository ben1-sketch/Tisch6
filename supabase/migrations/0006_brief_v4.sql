-- Tisch6 · Brief v4: Gesprächskarte, 24-Stunden-Regel, Verschieben, lernendes Matching
-- Nach 0001–0005 im SQL Editor ausführen. Kann gefahrlos mehrfach ausgeführt werden.

alter table public.dinners
  -- Entscheidung 24 Stunden vorher: ab fünf Zusagen findet der Tisch statt, sonst Absage mit Guthaben
  add column if not exists decided_at timestamptz,
  -- Gesprächskarte für den ganzen Tisch: drei Runden (Aperitif, Hauptgang, Dessert)
  add column if not exists conversation_card jsonb,
  -- vom Team verschoben – wer danach absagt, zahlt nichts
  add column if not exists moved_at timestamptz;

-- Abgelehnte Bewerbungen werden nach 30 Tagen automatisch gelöscht (Minderjährige sofort)
alter table public.applications add column if not exists rejected_at timestamptz;
update public.applications set rejected_at = updated_at where status = 'rejected' and rejected_at is null;

-- Was schon vorbei oder knapp vor Beginn ist, gilt als entschieden
update public.dinners set decided_at = now()
where decided_at is null
  and (status in ('completed', 'cancelled', 'postponed') or starts_at < now() + interval '24 hours');

-- Lernendes Matching: wer wollte wen wiedersehen – als Momentaufnahme der Persönlichkeitstypen.
-- Wird ein Profil gelöscht, bleibt für die anderen nur der anonyme Typ übrig.
create table if not exists public.affinities (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  dinner_id uuid references public.dinners (id) on delete set null,
  from_id uuid references public.applications (id) on delete set null,
  to_id uuid references public.applications (id) on delete set null,
  from_typ text,
  from_achsen integer[],
  to_typ text,
  to_achsen integer[]
);
create index if not exists affinities_from_idx on public.affinities (from_id);
create index if not exists affinities_to_idx on public.affinities (to_id);
create unique index if not exists affinities_once on public.affinities (dinner_id, from_id, to_id);

alter table public.affinities enable row level security;
grant select, insert, update, delete on public.affinities to service_role;
