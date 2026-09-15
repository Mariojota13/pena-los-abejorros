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

No hay registro público: solo un administrador puede crear miembros, en dos pasos.

1. **Crea su ficha en la app**: entra como admin, ve a **Miembros → + Añadir**, y rellena su nombre, email, cumpleaños y cargo.
2. **Crea su cuenta de acceso en Supabase**: en el panel de Supabase, ve a **Authentication → Users → Add user**, introduce el **mismo email** que pusiste en el paso 1 y una contraseña (compártesela por el canal que prefieras). Marca **Auto Confirm User** para que pueda entrar sin necesidad de confirmar por correo.

La primera vez que esa persona inicie sesión en la app con ese email y contraseña, se vincula automáticamente a la ficha que creaste. Si alguien puede entrar en la app pero no aparece con su nombre, comprueba que el email coincide exactamente en ambos sitios.

Cada miembro puede cambiar su propia contraseña luego desde **Perfil → Cambiar contraseña**. Si alguien la olvida, tienes que resetearla tú desde el panel de Supabase (Authentication → Users → selecciona el usuario → Reset password), ya que no hay un email de "recuperar contraseña" automático configurado.

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
