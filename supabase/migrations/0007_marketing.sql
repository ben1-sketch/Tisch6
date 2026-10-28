-- Tisch6 · Marketing: Foto-Erlaubnis, Zitate nach dem Abend, Herkunft der Bewerbungen
-- Nach 0001–0006 im SQL Editor ausführen. Kann gefahrlos mehrfach ausgeführt werden.

-- Freiwillig: Ein Foto vom Tisch darf auf Instagram (ohne Namen) – jederzeit widerrufbar.
-- null = keine Angabe
alter table public.seats add column if not exists photo_ok boolean;

-- „Wie war der Abend – in einem Satz?“ Nur mit Einwilligung anonym auf Instagram und tisch6.at
alter table public.feedback
  add column if not exists quote text,
  add column if not exists quote_ok boolean not null default false;

-- Woher kommt die Bewerbung? source: instagram, google, empfehlung, presse, werbung, sonstiges;
-- source_detail: Werbelink (utm_source/utm_campaign) bzw. Einladungscode
alter table public.applications
  add column if not exists source text,
  add column if not exists source_detail text;
