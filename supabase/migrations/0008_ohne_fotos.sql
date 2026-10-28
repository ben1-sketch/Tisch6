-- Tisch6 · Keine Foto-Erlaubnis: Fotos von Gästen werden nie veröffentlicht, also wird auch nicht gefragt.
-- Nach 0007 im SQL Editor ausführen. Kann gefahrlos mehrfach ausgeführt werden.
alter table public.seats drop column if exists photo_ok;
