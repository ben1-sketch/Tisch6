-- Tisch6 · Etappe 1: "Bring eine Freundin mit"
-- Nach 0001 im SQL Editor ausführen. Kann gefahrlos mehrfach ausgeführt werden.

-- Persönlicher Einladungscode jeder Bewerbung (für den Link tisch6.at/de/bewerben?mit=CODE)
alter table public.applications
  add column if not exists invite_code text unique
    default lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

update public.applications set invite_code = default where invite_code is null;
alter table public.applications alter column invite_code set not null;

-- Verknüpfte Begleitung: zu zweit beworben, beim Matching an VERSCHIEDENE Tische
alter table public.applications
  add column if not exists buddy_id uuid references public.applications (id) on delete set null;
