-- Ejecuta este script en el SQL Editor de tu proyecto de Supabase
-- (Panel de Supabase > SQL Editor > New query > pega esto > Run)

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  name text not null,
  nickname text,
  email text,
  birthday date,
  role_title text,
  is_admin boolean not null default false,
  member_since_year integer,
  avatar_path text,
  created_at timestamptz not null default now()
);

create unique index if not exists profiles_email_unique on profiles (lower(email)) where email is not null;

alter table profiles enable row level security;

-- Cualquier persona autenticada puede ver los perfiles
create policy "profiles_select" on profiles
  for select using (auth.role() = 'authenticated');

-- Solo un administrador puede crear fichas de miembro nuevas
create policy "profiles_insert_admin" on profiles
  for insert with check (
    exists (select 1 from profiles p where p.auth_user_id = auth.uid() and p.is_admin = true)
  );

-- Solo puedes actualizar el perfil que te pertenece
create policy "profiles_update_own" on profiles
  for update using (auth_user_id = auth.uid());

-- El administrador puede actualizar cualquier perfil
create policy "profiles_update_admin" on profiles
  for update using (
    exists (select 1 from profiles p where p.auth_user_id = auth.uid() and p.is_admin = true)
  );

-- Al iniciar sesión por primera vez, vincula tu cuenta a la ficha de miembro
-- que tenga el mismo email y que todavía no esté reclamada por nadie
create policy "profiles_claim_own" on profiles
  for update
  using (
    auth_user_id is null
    and email is not null
    and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
  with check (auth_user_id = auth.uid());

-- Nadie puede cambiar su propio cargo o hacerse administrador desde la app;
-- solo un administrador existente puede cambiar esos dos campos de cualquiera.
-- (Si se ejecuta esta sentencia directamente desde el SQL Editor, sin sesión de usuario, no se aplica esta restricción.)
create or replace function public.prevent_self_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  acting_is_admin boolean;
begin
  if auth.uid() is null then
    return new;
  end if;

  select coalesce(is_admin, false) into acting_is_admin
  from profiles where auth_user_id = auth.uid();

  if not coalesce(acting_is_admin, false) then
    if new.role_title is distinct from old.role_title then
      new.role_title := old.role_title;
    end if;
    if new.is_admin is distinct from old.is_admin then
      new.is_admin := old.is_admin;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_guard_privileges on profiles;
create trigger profiles_guard_privileges
  before update on profiles
  for each row execute function public.prevent_self_privilege_escalation();

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  location text,
  event_date date not null,
  event_time time,
  created_by_profile_id uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table events enable row level security;

-- Cualquier persona autenticada puede ver los eventos
create policy "events_select" on events
  for select using (auth.role() = 'authenticated');

-- Cualquier persona autenticada puede crear eventos
create policy "events_insert" on events
  for insert with check (auth.role() = 'authenticated');

-- Solo quien creó el evento puede editarlo o borrarlo
create policy "events_update_own" on events
  for update using (
    created_by_profile_id in (select id from profiles where auth_user_id = auth.uid())
  );

create policy "events_delete_own" on events
  for delete using (
    created_by_profile_id in (select id from profiles where auth_user_id = auth.uid())
  );

-- Información general de la comunidad (una única fila)
create table if not exists community_info (
  id int primary key default 1,
  email text,
  bank_account text,
  statutes_path text,
  dues_target numeric(10,2),
  updated_at timestamptz not null default now(),
  constraint community_info_singleton check (id = 1)
);

insert into community_info (id) values (1) on conflict (id) do nothing;

alter table community_info enable row level security;

create policy "community_info_select" on community_info
  for select using (auth.role() = 'authenticated');

create policy "community_info_update_admin" on community_info
  for update using (
    exists (select 1 from profiles p where p.auth_user_id = auth.uid() and p.is_admin = true)
  );

-- El tesorero también puede actualizar esta fila (para fijar el objetivo de cuotas),
-- pero un trigger le impide tocar el resto de campos (email, cuenta bancaria, estatutos)
create policy "community_info_update_treasurer" on community_info
  for update using (
    exists (select 1 from profiles p where p.auth_user_id = auth.uid() and p.role_title = 'Tesorero')
  );

create or replace function public.restrict_community_info_to_dues_target()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  acting_is_admin boolean;
begin
  if auth.uid() is null then
    return new;
  end if;

  select coalesce(is_admin, false) into acting_is_admin
  from profiles where auth_user_id = auth.uid();

  if not coalesce(acting_is_admin, false) then
    new.email := old.email;
    new.bank_account := old.bank_account;
    new.statutes_path := old.statutes_path;
  end if;

  return new;
end;
$$;

drop trigger if exists community_info_guard_fields on community_info;
create trigger community_info_guard_fields
  before update on community_info
  for each row execute function public.restrict_community_info_to_dues_target();

-- Almacenamiento del PDF de estatutos
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

create policy "documents_select" on storage.objects
  for select using (bucket_id = 'documents' and auth.role() = 'authenticated');

create policy "documents_write_admin" on storage.objects
  for all using (
    bucket_id = 'documents' and exists (select 1 from profiles p where p.auth_user_id = auth.uid() and p.is_admin = true)
  ) with check (
    bucket_id = 'documents' and exists (select 1 from profiles p where p.auth_user_id = auth.uid() and p.is_admin = true)
  );

-- Almacenamiento de fotos de perfil (público: cualquiera con el enlace puede verlas,
-- pero solo el propio miembro o un admin pueden subirlas/cambiarlas)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatars_write_own" on storage.objects
  for all using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select id::text from profiles where auth_user_id = auth.uid())
  ) with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select id::text from profiles where auth_user_id = auth.uid())
  );

create policy "avatars_write_admin" on storage.objects
  for all using (
    bucket_id = 'avatars' and exists (select 1 from profiles p where p.auth_user_id = auth.uid() and p.is_admin = true)
  ) with check (
    bucket_id = 'avatars' and exists (select 1 from profiles p where p.auth_user_id = auth.uid() and p.is_admin = true)
  );

-- Cuotas pagadas por cada miembro (solo el tesorero las gestiona)
create table if not exists dues (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  concept text not null,
  amount numeric(10,2) not null,
  paid_on date not null,
  created_by_profile_id uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table dues enable row level security;

-- Cada miembro ve sus propias cuotas; el tesorero y el admin ven las de todos
create policy "dues_select" on dues
  for select using (
    profile_id in (select id from profiles where auth_user_id = auth.uid())
    or exists (select 1 from profiles p where p.auth_user_id = auth.uid() and p.is_admin = true)
    or exists (select 1 from profiles p where p.auth_user_id = auth.uid() and p.role_title = 'Tesorero')
  );

-- Solo quien tenga el cargo de Tesorero puede crear, editar o borrar cuotas
create policy "dues_write_treasurer" on dues
  for all using (
    exists (select 1 from profiles p where p.auth_user_id = auth.uid() and p.role_title = 'Tesorero')
  ) with check (
    exists (select 1 from profiles p where p.auth_user_id = auth.uid() and p.role_title = 'Tesorero')
  );

-- Multas y sanciones (solo el admin las gestiona)
create table if not exists fines (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  reason text not null,
  amount numeric(10,2) not null,
  status text not null default 'pendiente' check (status in ('pendiente', 'pagada')),
  issued_on date not null,
  created_by_profile_id uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table fines enable row level security;

-- Cada miembro ve sus propias multas; el admin ve las de todos
create policy "fines_select" on fines
  for select using (
    profile_id in (select id from profiles where auth_user_id = auth.uid())
    or exists (select 1 from profiles p where p.auth_user_id = auth.uid() and p.is_admin = true)
  );

-- Solo el admin puede crear, editar o borrar multas
create policy "fines_write_admin" on fines
  for all using (
    exists (select 1 from profiles p where p.auth_user_id = auth.uid() and p.is_admin = true)
  ) with check (
    exists (select 1 from profiles p where p.auth_user_id = auth.uid() and p.is_admin = true)
  );

create table if not exists sanctions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  reason text not null,
  severity text not null check (severity in ('leve', 'grave', 'muy grave')),
  issued_on date not null,
  created_by_profile_id uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table sanctions enable row level security;

-- Cada miembro ve sus propias sanciones; el admin ve las de todos
create policy "sanctions_select" on sanctions
  for select using (
    profile_id in (select id from profiles where auth_user_id = auth.uid())
    or exists (select 1 from profiles p where p.auth_user_id = auth.uid() and p.is_admin = true)
  );

-- Solo el admin puede crear, editar o borrar sanciones
create policy "sanctions_write_admin" on sanctions
  for all using (
    exists (select 1 from profiles p where p.auth_user_id = auth.uid() and p.is_admin = true)
  ) with check (
    exists (select 1 from profiles p where p.auth_user_id = auth.uid() and p.is_admin = true)
  );
