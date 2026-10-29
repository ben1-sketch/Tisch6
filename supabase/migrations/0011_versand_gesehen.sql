-- Tisch6 · Versandfehler als gesehen markieren: Der gelbe Hinweis in der Admin-Übersicht zeigt nur neue Fehler.
-- Wer die Fehlerliste unter Versand öffnet, markiert alle angezeigten Fehler als gesehen.
-- Nach 0010 im SQL Editor ausführen. Kann gefahrlos mehrfach ausgeführt werden.
alter table public.notifications add column if not exists seen_at timestamptz;
