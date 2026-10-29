-- Tisch6 · Supabase-Sicherheitshinweise vom 29.10.2026 (Database Linter):
-- Die Hilfsfunktion, die bei neuen Tabellen automatisch RLS einschaltet, soll nicht über die öffentliche API
-- aufrufbar sein, und die Zeitstempel-Funktion bekommt einen festen Suchpfad.
-- Nach 0009 im SQL Editor ausführen. Kann gefahrlos mehrfach ausgeführt werden.
do $$
begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'rls_auto_enable') then
    revoke execute on function public.rls_auto_enable() from anon, authenticated, public;
  end if;
end $$;
alter function public.touch_updated_at() set search_path = '';
