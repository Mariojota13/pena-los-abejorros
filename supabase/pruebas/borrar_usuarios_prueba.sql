-- =====================================================================
-- BORRAR USUARIOS Y DATOS DE PRUEBA — Peña Los Abejorros
-- =====================================================================
-- Elimina todo lo que creó crear_usuarios_prueba.sql:
-- los miembros con email @abejorros.test, sus cuentas de acceso, y las
-- cuotas, multas, sanciones, asistencias y eventos marcados "PRUEBA".
-- No toca a los miembros ni los datos reales.
--
-- Cómo usarlo: Supabase > SQL Editor > New query > pegar todo > Run.
-- =====================================================================

delete from public.events    where title   like 'PRUEBA%';
delete from public.dues      where concept like 'PRUEBA%';
delete from public.fines     where reason  like 'PRUEBA%';
delete from public.sanctions where reason  like 'PRUEBA%';

-- Al borrar la ficha se borran también sus cuotas, multas, sanciones y asistencias
delete from public.profiles where email like '%@abejorros.test';

-- Cuentas de acceso (sus "identities" se borran solas)
delete from auth.users where email like '%@abejorros.test';

select count(*) as miembros_de_prueba_restantes from public.profiles where email like '%@abejorros.test';
