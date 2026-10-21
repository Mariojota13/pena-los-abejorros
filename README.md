# Abejorros

App web (PWA) para la comunidad Abejorros: información general, cumpleaños, eventos, miembros/cargos y perfil.

**Stack:** React + Vite + TypeScript + Tailwind, [Supabase](https://supabase.com) (base de datos, almacenamiento y autenticación por email/contraseña), desplegada en [Vercel](https://vercel.com).

## Configuración inicial (Supabase)

1. Crea una cuenta gratuita en [supabase.com](https://supabase.com) y un nuevo proyecto.
2. En **SQL Editor**, pega y ejecuta el contenido de [`supabase/schema.sql`](supabase/schema.sql).
3. En **Project Settings > API**, copia la **Project URL** y la clave **anon public**.
4. Copia `.env.example` a `.env.local` y rellena:
   ```
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   ```

## Cómo dar de alta a un miembro nuevo

No hay registro público: solo un administrador puede crear miembros, y se hace todo desde la app.

1. Entra como admin y ve a **Miembros → + Añadir**.
2. Rellena su nombre, email, cumpleaños, cargo y una **contraseña inicial** (mínimo 6 caracteres).
3. Al guardar, la app crea a la vez su ficha y su cuenta de acceso (función `create-member` de Supabase). Comparte con esa persona su email y contraseña por el canal que prefieras.

Cada miembro puede cambiar su propia contraseña luego desde **Perfil → Cambiar contraseña**. Si alguien la olvida, tienes que resetearla tú desde el panel de Supabase (Authentication → Users → selecciona el usuario → Reset password), ya que no hay un email de "recuperar contraseña" automático configurado.

Al eliminar un miembro desde la app (función `delete-member`) se borra también su cuenta de acceso y sus datos.

> Las funciones `create-member` y `delete-member` están en `supabase/functions/` y deben estar desplegadas en tu proyecto de Supabase.

## Cambios en la base de datos

Los cambios posteriores al esquema inicial están en `supabase/migrations/`. Cada archivo se ejecuta una sola vez en **SQL Editor** de Supabase. `supabase/schema.sql` ya los incluye, para instalaciones desde cero.

## Desarrollo local

```bash
npm install
npm run dev
```

## Despliegue (Vercel)

1. Sube este proyecto a un repositorio de GitHub.
2. En [vercel.com](https://vercel.com), importa el repositorio.
3. Añade las mismas variables de entorno (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) en **Project Settings > Environment Variables**.
4. Despliega. Vercel te da una URL pública (ej. `abejorros.vercel.app`) instalable como app desde el navegador móvil ("Añadir a pantalla de inicio").
