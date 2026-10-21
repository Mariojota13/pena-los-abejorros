-- Asistencia a eventos: cada miembro puede marcar "Voy" o "No voy" en cada evento.
-- Ejecutar una vez en Supabase: SQL Editor > New query > pegar > Run.

create table if not exists event_attendance (
  event_id uuid not null references events(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  status text not null check (status in ('voy', 'no_voy')),
  updated_at timestamptz not null default now(),
  primary key (event_id, profile_id)
);

alter table event_attendance enable row level security;

-- Cualquier miembro puede ver quién va a cada evento
drop policy if exists "attendance_select" on event_attendance;
create policy "attendance_select" on event_attendance
  for select using (auth.role() = 'authenticated');

-- Cada miembro solo puede apuntarse, cambiar o quitar su propia respuesta
drop policy if exists "attendance_insert_own" on event_attendance;
create policy "attendance_insert_own" on event_attendance
  for insert with check (
    profile_id in (select id from profiles where auth_user_id = auth.uid())
  );

drop policy if exists "attendance_update_own" on event_attendance;
create policy "attendance_update_own" on event_attendance
  for update using (
    profile_id in (select id from profiles where auth_user_id = auth.uid())
  ) with check (
    profile_id in (select id from profiles where auth_user_id = auth.uid())
  );

drop policy if exists "attendance_delete_own" on event_attendance;
create policy "attendance_delete_own" on event_attendance
  for delete using (
    profile_id in (select id from profiles where auth_user_id = auth.uid())
  );
