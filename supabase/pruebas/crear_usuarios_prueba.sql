-- =====================================================================
-- USUARIOS Y DATOS DE PRUEBA — Peña Los Abejorros
-- =====================================================================
-- Crea 7 miembros de prueba (uno por cada combinación de permisos) con
-- su cuenta de acceso ya confirmada, más cuotas, multas, una sanción y
-- dos eventos con asistencia para ver la app "llena".
--
-- Cómo usarlo: Supabase > SQL Editor > New query > pegar todo > Run.
-- Se puede ejecutar varias veces: si un usuario ya existe, no lo duplica.
--
-- Todos entran con la contraseña:  Prueba123
-- Para borrarlo todo después: supabase/pruebas/borrar_usuarios_prueba.sql
-- =====================================================================

do $$
declare
  u record;
  v_user_id uuid;
  v_profile_id uuid;
  v_presidente uuid;
  v_tesorero uuid;
  v_socio uuid;
  v_vocal uuid;
  v_evento1 uuid;
  v_evento2 uuid;
begin
  for u in
    select * from (values
      -- email,                         nombre,                 apodo,       cargo,            admin,  cumpleaños (relativo a hoy para probar "hoy" y "mañana"),            socio desde
      ('presidente@abejorros.test',    'Prueba Presidente',    'El Jefe',   'Presidente',     true,   (current_date - interval '41 years')::date,                       2010),
      ('tesorero@abejorros.test',      'Prueba Tesorero',      'Calderilla','Tesorero',       false,  (current_date + 1 - interval '36 years')::date,                   2014),
      ('secretario@abejorros.test',    'Prueba Secretario',    null,        'Secretario',     false,  (current_date + 25 - interval '34 years')::date,                  2016),
      ('vice@abejorros.test',          'Prueba Vicepresidente',null,        'Vicepresidente', false,  (current_date + 43 - interval '38 years')::date,                  2012),
      ('vocal@abejorros.test',         'Prueba Vocal',         null,        'Vocal',          false,  (current_date + 130 - interval '31 years')::date,                 2019),
      ('socio@abejorros.test',         'Prueba Socio',         'Novato',    'Socio',          false,  (current_date + 232 - interval '28 years')::date,                 2023),
      ('sincumple@abejorros.test',     'Prueba Sin Cumple',    null,        'Socio',          false,  null::date,                                                       null::int)
    ) as t(email, name, nickname, role_title, is_admin, birthday, member_since)
  loop
    -- 1) Cuenta de acceso (si no existe ya)
    select id into v_user_id from auth.users where lower(email) = u.email;

    if v_user_id is null then
      v_user_id := gen_random_uuid();

      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at,
        confirmation_token, recovery_token, email_change_token_new, email_change
      ) values (
        '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated', u.email,
        extensions.crypt('Prueba123', extensions.gen_salt('bf')),
        now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
        now(), now(),
        '', '', '', ''
      );

      insert into auth.identities (
        id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
      ) values (
        gen_random_uuid(), v_user_id, v_user_id::text, 'email',
        jsonb_build_object('sub', v_user_id::text, 'email', u.email, 'email_verified', true),
        now(), now(), now()
      );
    end if;

    -- 2) Ficha de miembro, vinculada a la cuenta
    select id into v_profile_id from public.profiles where lower(email) = u.email;

    if v_profile_id is null then
      insert into public.profiles (auth_user_id, name, nickname, email, birthday, role_title, is_admin, member_since_year)
      values (v_user_id, u.name, u.nickname, u.email, u.birthday, u.role_title, u.is_admin, u.member_since)
      returning id into v_profile_id;
    else
      update public.profiles
         set auth_user_id = v_user_id, name = u.name, nickname = u.nickname, birthday = u.birthday,
             role_title = u.role_title, is_admin = u.is_admin, member_since_year = u.member_since
       where id = v_profile_id;
    end if;
  end loop;

  select id into v_presidente from public.profiles where email = 'presidente@abejorros.test';
  select id into v_tesorero   from public.profiles where email = 'tesorero@abejorros.test';
  select id into v_socio      from public.profiles where email = 'socio@abejorros.test';
  select id into v_vocal      from public.profiles where email = 'vocal@abejorros.test';

  -- 3) Objetivo de cuota: solo se fija si todavía no hay ninguno
  update public.community_info set dues_target = 80 where id = 1 and dues_target is null;

  -- 4) Datos de ejemplo (se borran y se vuelven a crear para no duplicarlos)
  delete from public.dues      where concept like 'PRUEBA%';
  delete from public.fines     where reason  like 'PRUEBA%';
  delete from public.sanctions where reason  like 'PRUEBA%';
  delete from public.events    where title   like 'PRUEBA%';

  -- Cuotas: unos al día, otros a medias y otros sin pagar
  insert into public.dues (profile_id, concept, amount, paid_on, created_by_profile_id)
  select p.id, 'PRUEBA - ' || c.concept, c.amount, current_date - c.days_ago, v_tesorero
  from (values
    ('presidente@abejorros.test', 'Cuota anual',        80.00, 40),
    ('tesorero@abejorros.test',   'Cuota anual',        80.00, 35),
    ('secretario@abejorros.test', 'Primer pago cuota',  40.00, 30),
    ('secretario@abejorros.test', 'Segundo pago cuota', 40.00, 5),
    ('vice@abejorros.test',       'Primer pago cuota',  50.00, 20),
    ('vocal@abejorros.test',      'Primer pago cuota',  20.00, 12)
    -- "socio" y "sincumple" no han pagado nada
  ) as c(email, concept, amount, days_ago)
  join public.profiles p on p.email = c.email;

  -- Multas y sanción
  insert into public.fines (profile_id, reason, amount, status, issued_on, created_by_profile_id) values
    (v_socio, 'PRUEBA - Llegar tarde al encierro', 10.00, 'pendiente', current_date - 10, v_presidente),
    (v_vocal, 'PRUEBA - No traer la camiseta',      5.00, 'pagada',    current_date - 25, v_presidente);

  insert into public.sanctions (profile_id, reason, severity, issued_on, created_by_profile_id) values
    (v_vocal, 'PRUEBA - Faltar a la asamblea sin avisar', 'leve', current_date - 15, v_presidente);

  -- Eventos: uno próximo, otro más adelante y uno ya pasado
  insert into public.events (title, description, location, event_date, event_time, created_by_profile_id)
  values ('PRUEBA - Cena de la peña', 'Cena de prueba para ver la asistencia.', 'Bar Manolo', current_date + 3, '21:30', v_presidente)
  returning id into v_evento1;

  insert into public.events (title, description, location, event_date, event_time, created_by_profile_id)
  values ('PRUEBA - Encierro y almuerzo', null, 'Plaza Mayor', current_date + 20, '09:00', v_socio)
  returning id into v_evento2;

  insert into public.events (title, description, location, event_date, event_time, created_by_profile_id)
  values ('PRUEBA - Asamblea de septiembre', 'Evento pasado.', 'Local de la peña', current_date - 30, '19:00', v_presidente);

  -- Asistencia (solo si ya se ejecutó la migración de asistencia a eventos)
  if to_regclass('public.event_attendance') is not null then
    execute $sql$
      insert into public.event_attendance (event_id, profile_id, status)
      select $1, p.id, a.status
      from (values
        ('presidente@abejorros.test', 'voy'),
        ('tesorero@abejorros.test',   'voy'),
        ('secretario@abejorros.test', 'voy'),
        ('vice@abejorros.test',       'no_voy')
      ) as a(email, status)
      join public.profiles p on p.email = a.email
    $sql$ using v_evento1;
  end if;

  raise notice 'Usuarios de prueba listos. Contraseña para todos: Prueba123';
end
$$;

-- Resumen de lo creado
select p.name as nombre, p.email, p.role_title as cargo, p.is_admin as admin, p.birthday as cumpleanos,
       (p.auth_user_id is not null) as tiene_cuenta
from public.profiles p
where p.email like '%@abejorros.test'
order by p.is_admin desc, p.name;
