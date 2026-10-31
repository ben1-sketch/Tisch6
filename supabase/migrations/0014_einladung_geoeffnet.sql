-- Tisch6 · Einladung geöffnet: wann ein Gast seine Einladung zum ersten Mal im Browser geöffnet hat.
-- Die letzte Erinnerung kurz vor Fristende geht nur an Gäste ohne Reaktion – Einladung nie geöffnet,
-- nie mit dem Bezahlen begonnen und nicht abgesagt (Wunsch des Inhabers).
-- Nach 0013 im SQL Editor ausführen. Kann gefahrlos mehrfach ausgeführt werden.

alter table public.seats add column if not exists viewed_at timestamptz;
