-- Permite que un administrador edite o borre cualquier evento,
-- no solo los que ha creado él mismo.
-- Ejecutar una vez en Supabase: SQL Editor > New query > pegar > Run.

drop policy if exists "events_update_admin" on events;
create policy "events_update_admin" on events
  for update using (
    exists (select 1 from profiles p where p.auth_user_id = auth.uid() and p.is_admin = true)
  );

drop policy if exists "events_delete_admin" on events;
create policy "events_delete_admin" on events
  for delete using (
    exists (select 1 from profiles p where p.auth_user_id = auth.uid() and p.is_admin = true)
  );
