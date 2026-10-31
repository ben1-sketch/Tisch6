-- Tisch6 · SMS-Aufträge: einzelne Kurznachrichten an ausgewählte Gäste, die der Durchlauf verschickt –
-- z. B. eine Zahl-Erinnerung auf Wunsch des Inhabers. Das Team trägt eine Zeile ein, der nächste Durchlauf
-- (alle 10 Minuten) schickt sie als Push an die Tisch6-App oder sonst als SMS – jeden Auftrag höchstens einmal.
-- Mit Platz und ohne eigenen Text: die übliche Zahl-Erinnerung, nur solange der Platz noch offen ist.
-- Nach 0012 im SQL Editor ausführen. Kann gefahrlos mehrfach ausgeführt werden.

create table if not exists public.sms_auftraege (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  application_id uuid not null references public.applications (id) on delete cascade,
  -- optional: der Platz, um den es geht (Link in der Nachricht, und nur solange er noch offen ist)
  seat_id uuid references public.seats (id) on delete cascade,
  -- eigener Text; leer = Zahl-Erinnerung zum Platz
  body text check (body is null or length(body) between 1 and 640),
  -- frühestens ab dann verschicken
  not_before timestamptz not null default now(),
  done_at timestamptz,
  -- sent, failed, duplicate, übersprungen oder ein Fehlertext
  result text,
  constraint sms_auftraege_inhalt check (body is not null or seat_id is not null)
);
create index if not exists sms_auftraege_offen_idx on public.sms_auftraege (not_before) where done_at is null;
alter table public.sms_auftraege enable row level security;
