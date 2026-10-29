-- Tisch6 · SMS-Zustellung: Twilio nimmt eine SMS an und meldet erst danach, ob sie angekommen ist.
-- Der Durchlauf fragt nach und trägt „delivered“ (zugestellt) oder „failed“ (nicht zugestellt) ein.
-- Nach 0008 im SQL Editor ausführen. Kann gefahrlos mehrfach ausgeführt werden.
alter table public.notifications drop constraint if exists notifications_status_check;
alter table public.notifications add constraint notifications_status_check
  check (status in ('pending', 'sent', 'delivered', 'failed', 'logged'));
