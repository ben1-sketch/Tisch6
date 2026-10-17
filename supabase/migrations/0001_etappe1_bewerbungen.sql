-- Tisch6 · Etappe 1: Bewerbungen & KI-Onboarding
-- Im Supabase-Dashboard unter "SQL Editor" einmalig ausführen.

create table if not exists public.applications (
  -- 1:1 zum Auth-User (Handynummer-Login). Löschen des Users löscht die Bewerbung.
  id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  status text not null default 'onboarding'
    check (status in ('onboarding', 'submitted', 'accepted', 'waitlist', 'rejected')),
  locale text not null default 'de',

  first_name text not null,
  email text not null,
  phone text,

  -- DSGVO: Einwilligungen (inkl. Art. 9 für sensible Angaben wie Unverträglichkeiten / Orientierung)
  consent_version text not null,
  consent_at timestamptz not null,

  -- KI-Onboarding
  transcript jsonb not null default '[]'::jsonb,
  user_turns integer not null default 0,
  profile jsonb,
  personality_type text,
  submitted_at timestamptz
);

create index if not exists applications_status_idx on public.applications (status);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists applications_touch on public.applications;
create trigger applications_touch
  before update on public.applications
  for each row execute function public.touch_updated_at();

-- Row Level Security: User dürfen nur ihre eigene Bewerbung lesen.
-- Alle Schreibzugriffe laufen über den Server (Service Role), damit Status
-- und Profil nicht vom Browser aus manipuliert werden können.
alter table public.applications enable row level security;

drop policy if exists "eigene Bewerbung lesen" on public.applications;
create policy "eigene Bewerbung lesen"
  on public.applications for select
  to authenticated
  using ((select auth.uid()) = id);
