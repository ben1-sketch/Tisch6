-- Tisch6 · Etappe 3: Adminbereich
-- Nach 0001–0004 im SQL Editor ausführen. Kann gefahrlos mehrfach ausgeführt werden.

-- Interne Notiz zu einer Person (sieht nur das Team)
alter table public.applications add column if not exists admin_note text;

-- 'removed' = vom Team storniert oder zurückgezogen (z. B. Dinner abgesagt, Profil gesperrt)
alter table public.seats drop constraint if exists seats_status_check;
alter table public.seats add constraint seats_status_check
  check (status in ('invited', 'offered', 'confirmed', 'declined', 'expired', 'cancelled', 'cancelled_late',
                    'attended', 'no_show', 'postponed', 'withdrawn', 'removed'));

-- Platz von Hand bestätigen, z. B. bar bezahlt oder eingeladen
alter table public.seats drop constraint if exists seats_paid_with_check;
alter table public.seats add constraint seats_paid_with_check
  check (paid_with in ('stripe', 'package', 'manual'));

-- Rabatt von Hand (z. B. als Entschuldigung); Gutschriften ganzer Tischteilnahmen laufen über packages (kind 'gutschrift')
alter table public.discounts drop constraint if exists discounts_reason_check;
alter table public.discounts add constraint discounts_reason_check
  check (reason in ('referral', 'five_person', 'manual'));

-- Protokoll aller Eingriffe im Adminbereich (und der Anmeldeversuche).
-- Ohne Namen oder E-Mail-Adressen: Wird ein Profil gelöscht, bleibt nur ein anonymer Eintrag.
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

-- Hilfreich für die Übersichten
create index if not exists reports_status_idx on public.reports (status);
create index if not exists notifications_created_idx on public.notifications (created_at desc);
create index if not exists payments_created_idx on public.payments (created_at desc);
