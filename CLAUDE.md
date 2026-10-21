# Contexto para Claude — App Peña Los Abejorros

Este archivo resume cómo está montada la app y cómo trabajamos en ella, para que cualquier conversación nueva con Claude pueda ponerse al día leyéndolo.

## Qué es

App web instalable en el móvil (PWA) para la Peña Los Abejorros. Secciones:

| Ruta | Página | Archivo |
|---|---|---|
| `/` | Inicio | `src/pages/Home.tsx` |
| `/cumpleanos` | Cumpleaños | `src/pages/Birthdays.tsx` |
| `/eventos` | Eventos | `src/pages/Events.tsx` |
| `/miembros` | Miembros y cargos | `src/pages/Members.tsx` |
| `/cuotas` | Tesorería / cuotas | `src/pages/Treasury.tsx` |
| `/multas` | Sanciones | `src/pages/Sanctions.tsx` |
| `/perfil` | Perfil | `src/pages/Profile.tsx` |

Sin sesión se muestra `Login`; con sesión pero sin ficha de miembro, `NoProfile`. Las rutas están en `src/App.tsx` y la barra inferior en `src/components/BottomNav.tsx`.

Cargos disponibles (`src/lib/roles.ts`): Socio, Vocal, Tesorero, Presidente, Vicepresidente, Secretario.

## Stack

- **Frontend:** React 19 + Vite + TypeScript + Tailwind CSS 4 (+ `vite-plugin-pwa`).
- **Backend:** Supabase (base de datos, almacenamiento y login por email/contraseña). Esquema en `supabase/schema.sql`; funciones `create-member` y `delete-member` en `supabase/functions/`.
- **Variables de entorno:** `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (en `.env.local` en local y en Vercel → Settings → Environment Variables). Nunca subir claves al repo.
- **Despliegue:** Vercel, conectado a este repo de GitHub (`Mariojota13/pena-los-abejorros`). Cada push a `main` se publica solo en 1-2 minutos.

## Flujo de trabajo

1. Mario conecta en Cowork la carpeta local del repo: `C:\Users\Mario\Documents\GitHub\pena-los-abejorros`.
2. Claude edita los archivos directamente en esa carpeta.
3. Mario revisa los cambios en **GitHub Desktop**, hace **Commit to main** y luego **Push origin**.
4. Vercel publica automáticamente.

Para deshacer algo ya publicado, se vuelve a cambiar el código y se hace otro commit + push (o en GitHub Desktop: History → clic derecho en el commit → *Revert changes in commit*).

## Notas para Claude

- **Git desde la VM de Cowork:** la carpeta es un checkout de Windows con finales de línea CRLF. Usar siempre `git -c core.autocrlf=true ...` para ver cambios reales; sin eso, git marca todos los archivos como modificados.
- **Archivos `.lock`:** los comandos git desde la VM dejan `.git/index.lock` porque no se pueden borrar archivos sin permiso, y eso rompe GitHub Desktop. Usar `git --no-optional-locks` para comandos de solo lectura, y pedir permiso de borrado al inicio si hace falta usar git. Si queda un lock, moverlo (`mv .git/index.lock .git/stale-index-lock-N`). Claude no hace commits ni push: los hace Mario desde GitHub Desktop.
- **Color de marca:** amarillo `#EAE032`. Si se cambia el fondo, hay que tocarlo en `src/index.css` (`body` y `#root`), en `vite.config.ts` (`theme_color` y `background_color`), en `index.html` (`<meta name="theme-color">`, barra de estado del móvil) y en `src/pages/Login.tsx` (`bg-[#EAE032]`).
- **Cambios en Supabase:** los cambios de base de datos van como archivo nuevo en `supabase/migrations/` (Mario lo ejecuta en el SQL Editor) y también se añaden a `supabase/schema.sql`.
- **Usuarios de prueba:** `supabase/pruebas/crear_usuarios_prueba.sql` crea 7 miembros `@abejorros.test` (contraseña `Prueba123`) con cuotas, multas, eventos y asistencias marcados "PRUEBA"; `borrar_usuarios_prueba.sql` lo elimina todo.
- **Alta de miembros:** desde la app (Miembros → + Añadir), que crea ficha y cuenta con la función `create-member`. Ver README.
- **Desarrollo local:** `npm install` y luego `npm run dev` (puerto 5173).
