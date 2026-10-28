-- Tisch6 · Komplette Datenbank in einem Schritt (enthält 0001–0008 aus supabase/migrations)
-- Supabase → SQL Editor → New query → alles einfügen → Run. Am Ende steht „Fertig – die Datenbank ist komplett eingerichtet“.
-- Kann gefahrlos mehrfach ausgeführt werden: ergänzt nur, was fehlt – vorhandene Daten bleiben unverändert.
-- Kommt eine neue Migration dazu, diese Datei mit ergänzen.

create table if not exists public.applications (
  id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  status text not null default 'onboarding'
    check (status in ('onboarding', 'submitted', 'accepted', 'waitlist', 'rejected')),
  locale text not null default 'de',

  first_name text not null,
  email text not null,
  phone text,

  consent_version text not null,
  consent_at timestamptz not null,

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

alter table public.applications enable row level security;

drop policy if exists "eigene Bewerbung lesen" on public.applications;
create policy "eigene Bewerbung lesen"
  on public.applications for select
  to authenticated
  using ((select auth.uid()) = id);

grant select, insert, update, delete on public.applications to service_role;
grant select on public.applications to authenticated;

alter table public.applications
  add column if not exists invite_code text unique
    default lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

update public.applications set invite_code = default where invite_code is null;
alter table public.applications alter column invite_code set not null;

alter table public.applications
  add column if not exists buddy_id uuid references public.applications (id) on delete set null;

alter table public.applications add column if not exists photo_path text;

alter table public.applications
  add column if not exists referred_by uuid references public.applications (id) on delete set null;
create index if not exists applications_referred_by_idx on public.applications (referred_by);

insert into storage.buckets (id, name, public)
values ('verification-photos', 'verification-photos', false)
on conflict (id) do update set public = false;

alter table public.applications drop constraint if exists applications_status_check;
alter table public.applications add constraint applications_status_check
  check (status in ('onboarding', 'submitted', 'accepted', 'waitlist', 'rejected', 'blocked'));

alter table public.applications
  add column if not exists city text not null default 'wien',
  add column if not exists evaluated_at timestamptz,
  add column if not exists evaluation jsonb,
  add column if not exists waitlist_reason text,
  add column if not exists accepted_at timestamptz,
  add column if not exists available_since timestamptz,
  add column if not exists lebenszeichen_at timestamptz,
  add column if not exists last_invited_at timestamptz,
  add column if not exists missed_bookings integer not null default 0,
  add column if not exists last_nudge_at timestamptz,
  add column if not exists no_shows integer not null default 0,
  add column if not exists under_review boolean not null default false,
  add column if not exists blocked_at timestamptz,
  add column if not exists founder boolean not null default false,
  add column if not exists referral_rewarded_at timestamptz,
  add column if not exists magic_token text unique default replace(gen_random_uuid()::text, '-', '');

update public.applications set magic_token = default where magic_token is null;

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
create unique index if not exists seats_one_per_dinner on public.seats (dinner_id, application_id);
create index if not exists seats_application_idx on public.seats (application_id);
create index if not exists seats_status_idx on public.seats (status);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
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

create table if not exists public.learnings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  feedback_count integer not null,
  notes text not null
);

create table if not exists public.job_locks (
  name text primary key,
  locked_until timestamptz not null default 'epoch'
);
insert into public.job_locks (name) values ('tick') on conflict (name) do nothing;

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

alter table public.applications add column if not exists admin_note text;

alter table public.seats drop constraint if exists seats_status_check;
alter table public.seats add constraint seats_status_check
  check (status in ('invited', 'offered', 'confirmed', 'declined', 'expired', 'cancelled', 'cancelled_late',
                    'attended', 'no_show', 'postponed', 'withdrawn', 'removed'));

alter table public.seats drop constraint if exists seats_paid_with_check;
alter table public.seats add constraint seats_paid_with_check
  check (paid_with in ('stripe', 'package', 'manual'));

alter table public.discounts drop constraint if exists discounts_reason_check;
alter table public.discounts add constraint discounts_reason_check
  check (reason in ('referral', 'five_person', 'manual'));

create table if not exists public.admin_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  action text not null,
  application_id uuid references public.applications (id) on delete set null,
  dinner_id uuid references public.dinners (id) on delete set null,
  detail text
);
create index if not exists admin_log_created_idx on public.admin_log (created_at desc);
create index if not exists admin_log_application_idx on public.admin_log (application_id);

alter table public.admin_log enable row level security;
grant select, insert, update, delete on public.admin_log to service_role;

create index if not exists reports_status_idx on public.reports (status);
create index if not exists notifications_created_idx on public.notifications (created_at desc);
create index if not exists payments_created_idx on public.payments (created_at desc);

alter table public.dinners
  add column if not exists decided_at timestamptz,
  add column if not exists conversation_card jsonb,
  add column if not exists moved_at timestamptz;

alter table public.applications add column if not exists rejected_at timestamptz;
update public.applications set rejected_at = updated_at where status = 'rejected' and rejected_at is null;

update public.dinners set decided_at = now()
where decided_at is null
  and (status in ('completed', 'cancelled', 'postponed') or starts_at < now() + interval '24 hours');

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

-- 0007/0008 Marketing: Zitate nach dem Abend, Herkunft der Bewerbungen (keine Foto-Erlaubnis – Fotos von Gästen werden nie veröffentlicht)
alter table public.seats drop column if exists photo_ok;

-- „Wie war der Abend – in einem Satz?“ Nur mit Einwilligung anonym auf Instagram und tisch6.at
alter table public.feedback
  add column if not exists quote text,
  add column if not exists quote_ok boolean not null default false;

-- Woher kommt die Bewerbung? source: instagram, google, empfehlung, presse, werbung, sonstiges;
-- source_detail: Werbelink (utm_source/utm_campaign) bzw. Einladungscode
alter table public.applications
  add column if not exists source text,
  add column if not exists source_detail text;

select case
  when to_regclass('public.dinners') is not null
   and to_regclass('public.admin_log') is not null
   and to_regclass('public.affinities') is not null
  then 'Fertig – die Datenbank ist komplett eingerichtet'
  else 'Es fehlt noch etwas – bitte Bescheid geben'
end as ergebnis;
