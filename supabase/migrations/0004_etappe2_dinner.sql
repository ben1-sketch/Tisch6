-- Tisch6 · Etappe 2: Bewertung, Tische, Einladungen, Zahlungen, Wiedersehen
-- Nach 0001–0003 im SQL Editor ausführen. Kann gefahrlos mehrfach ausgeführt werden.

-- ---------------------------------------------------------------------------
-- Bewerbungen erweitern
-- ---------------------------------------------------------------------------
alter table public.applications drop constraint if exists applications_status_check;
alter table public.applications add constraint applications_status_check
  check (status in ('onboarding', 'submitted', 'accepted', 'waitlist', 'rejected', 'blocked'));

alter table public.applications
  add column if not exists city text not null default 'wien',
  add column if not exists evaluated_at timestamptz,
  add column if not exists evaluation jsonb,
  -- Warum auf der Warteliste: 'balance' (Geschlechterverhältnis), 'format' (passt noch an keinen 3+3-Tisch), 'review'
  add column if not exists waitlist_reason text,
  add column if not exists accepted_at timestamptz,
  -- Bereit für den nächsten Tisch seit … (null = gerade nicht verfügbar, z. B. gebucht oder pausiert)
  add column if not exists available_since timestamptz,
  add column if not exists lebenszeichen_at timestamptz,
  add column if not exists last_invited_at timestamptz,
  -- Nicht gebuchte Einladungen in Folge; ab 2 nur noch einmal im Monat
  add column if not exists missed_bookings integer not null default 0,
  add column if not exists last_nudge_at timestamptz,
  add column if not exists no_shows integer not null default 0,
  add column if not exists under_review boolean not null default false,
  add column if not exists blocked_at timestamptz,
  add column if not exists founder boolean not null default false,
  -- Bei der eingeladenen Person: Empfehlungsrabatt für die einladende Person bereits gutgeschrieben
  add column if not exists referral_rewarded_at timestamptz,
  -- Für Links ohne Login, z. B. „Ich bin wieder dabei“
  add column if not exists magic_token text unique default replace(gen_random_uuid()::text, '-', '');

update public.applications set magic_token = default where magic_token is null;

-- ---------------------------------------------------------------------------
-- Stammlokale
-- ---------------------------------------------------------------------------
create table if not exists public.restaurants (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  address text not null,
  district text,
  maps_url text,
  email text,
  phone text,
  weekdays text[] not null default '{mo,di,mi,do,fr,sa,so}',
  start_time time not null default '19:00',
  tables_per_evening integer not null default 1 check (tables_per_evening > 0),
  active boolean not null default true,
  notes text
);

-- ---------------------------------------------------------------------------
-- Dinner und Plätze
-- ---------------------------------------------------------------------------
create table if not exists public.dinners (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  restaurant_id uuid not null references public.restaurants (id),
  starts_at timestamptz not null,
  status text not null default 'inviting'
    check (status in ('inviting', 'confirmed', 'completed', 'postponed', 'cancelled')),
  matching jsonb,
  reserved_count integer,
  feedback_sent_at timestamptz,
  wrapped_up_at timestamptz
);
create index if not exists dinners_starts_idx on public.dinners (starts_at);
create index if not exists dinners_status_idx on public.dinners (status);

create table if not exists public.seats (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  dinner_id uuid not null references public.dinners (id) on delete cascade,
  application_id uuid not null references public.applications (id) on delete cascade,
  token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  status text not null default 'invited'
    check (status in ('invited', 'offered', 'confirmed', 'declined', 'expired', 'cancelled',
                      'cancelled_late', 'attended', 'no_show', 'postponed', 'withdrawn')),
  replacement boolean not null default false,
  expires_at timestamptz,
  checkout_started_at timestamptz,
  confirmed_at timestamptz,
  ended_at timestamptz,
  price_cents integer,
  paid_with text check (paid_with in ('stripe', 'package')),
  payment_id uuid,
  package_id uuid,
  discount_id uuid,
  icebreaker jsonb
);
-- Niemand wird für dasselbe Dinner zweimal eingeladen
create unique index if not exists seats_one_per_dinner on public.seats (dinner_id, application_id);
create index if not exists seats_application_idx on public.seats (application_id);
create index if not exists seats_status_idx on public.seats (status);

-- ---------------------------------------------------------------------------
-- Zahlungen, Gründungspakete, Rabatte
-- ---------------------------------------------------------------------------
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  -- Bleibt für die Buchhaltung erhalten, auch wenn das Profil gelöscht wird
  application_id uuid references public.applications (id) on delete set null,
  seat_id uuid references public.seats (id) on delete set null,
  kind text not null check (kind in ('seat', 'package')),
  amount_cents integer not null,
  stripe_session_id text unique,
  stripe_payment_intent text,
  status text not null default 'paid' check (status in ('paid', 'refunded')),
  refunded_at timestamptz
);

create table if not exists public.packages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  application_id uuid not null references public.applications (id) on delete cascade,
  payment_id uuid references public.payments (id) on delete set null,
  kind text not null default 'founder',
  total integer not null default 3,
  remaining integer not null check (remaining >= 0),
  expires_at timestamptz not null
);
create index if not exists packages_application_idx on public.packages (application_id);

create table if not exists public.discounts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  application_id uuid not null references public.applications (id) on delete cascade,
  reason text not null check (reason in ('referral', 'five_person')),
  price_cents integer not null,
  source_id uuid not null,
  used_at timestamptz,
  used_seat_id uuid references public.seats (id) on delete set null
);
create unique index if not exists discounts_once on public.discounts (application_id, reason, source_id);

-- ---------------------------------------------------------------------------
-- Nach dem Dinner: Wiedersehen, Feedback, Matches, Meldungen
-- ---------------------------------------------------------------------------
create table if not exists public.feedback (
  seat_id uuid primary key references public.seats (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  rating_evening integer check (rating_evening between 1 and 5),
  rating_table integer check (rating_table between 1 and 5),
  improve text,
  wants_to_see uuid[] not null default '{}',
  absent uuid[] not null default '{}',
  share_phone boolean not null default true
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  dinner_id uuid not null references public.dinners (id) on delete cascade,
  a_id uuid not null references public.applications (id) on delete cascade,
  b_id uuid not null references public.applications (id) on delete cascade,
  check (a_id < b_id),
  unique (dinner_id, a_id, b_id)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  dinner_id uuid references public.dinners (id) on delete set null,
  reporter_id uuid references public.applications (id) on delete set null,
  reported_id uuid references public.applications (id) on delete set null,
  reason text,
  status text not null default 'open' check (status in ('open', 'dismissed', 'blocked')),
  resolved_at timestamptz,
  admin_note text
);

-- ---------------------------------------------------------------------------
-- Versandprotokoll (E-Mail/SMS) – der eindeutige Schlüssel verhindert Doppelversand
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  application_id uuid references public.applications (id) on delete cascade,
  channel text not null check (channel in ('email', 'sms')),
  kind text not null,
  dedupe_key text unique,
  recipient text not null,
  subject text,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'logged')),
  provider_id text,
  error text
);
create index if not exists notifications_application_idx on public.notifications (application_id);

-- Was die KI aus dem Feedback gelernt hat (fließt ins Matching ein)
create table if not exists public.learnings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  feedback_count integer not null,
  notes text not null
);

-- Sperre, damit sich zwei automatische Durchläufe nie überschneiden
create table if not exists public.job_locks (
  name text primary key,
  locked_until timestamptz not null default 'epoch'
);
insert into public.job_locks (name) values ('tick') on conflict (name) do nothing;

-- ---------------------------------------------------------------------------
-- Zugriff: alles nur über den Server (Service Role), nichts direkt aus dem Browser
-- ---------------------------------------------------------------------------
alter table public.restaurants enable row level security;
alter table public.dinners enable row level security;
alter table public.seats enable row level security;
alter table public.payments enable row level security;
alter table public.packages enable row level security;
alter table public.discounts enable row level security;
alter table public.feedback enable row level security;
alter table public.matches enable row level security;
alter table public.reports enable row level security;
alter table public.notifications enable row level security;
alter table public.learnings enable row level security;
alter table public.job_locks enable row level security;

grant select, insert, update, delete on
  public.restaurants, public.dinners, public.seats, public.payments, public.packages, public.discounts,
  public.feedback, public.matches, public.reports, public.notifications, public.learnings, public.job_locks
to service_role;
