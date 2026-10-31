-- Tisch6 · Web-App: Benachrichtigungen aufs Handy (Web-Push) statt SMS.
-- Gäste schalten Benachrichtigungen auf ihrer persönlichen App-Seite ein – jedes Gerät ist ein Eintrag.
-- Die Schlüssel für Web-Push (VAPID) erzeugt die App beim ersten Gebrauch selbst und legt sie in app_secrets ab.
-- Nach 0011 im SQL Editor ausführen. Kann gefahrlos mehrfach ausgeführt werden.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  -- beim Löschen des Profils verschwinden auch die Geräte; leer = Gerät des Tisch6-Teams (zum Testen der App)
  application_id uuid references public.applications (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  last_sent_at timestamptz
);
create index if not exists push_subscriptions_application_idx on public.push_subscriptions (application_id);
alter table public.push_subscriptions enable row level security;

-- Geheimnisse, die die App selbst verwaltet (nur der Server liest sie)
create table if not exists public.app_secrets (
  name text primary key,
  value text not null,
  created_at timestamptz not null default now()
);
alter table public.app_secrets enable row level security;

alter table public.notifications drop constraint if exists notifications_channel_check;
alter table public.notifications add constraint notifications_channel_check check (channel in ('email', 'sms', 'push'));
