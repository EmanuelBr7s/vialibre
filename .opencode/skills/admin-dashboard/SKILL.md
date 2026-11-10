---
name: admin-dashboard
description: "Construcción de interfaces administrativas en VíaLibre coherentes con el frontend Next.js 14 existente (tablas, filtros, formularios, estados y accesibilidad). Úsala al crear o ampliar páginas bajo /admin, paneles de moderación, listados con filtros, formularios de gestión o cualquier pantalla de gestión que deba verse y comportarse como el resto de la aplicación."
---

# Panel de administración (admin-dashboard)

Objetivo: construir interfaces administrativas **coherentes con el frontend actual**, reutilizando componentes, tokens de estilo y patrones de accesibilidad ya presentes. No introduzcas una librería de UI ni un sistema de diseño paralelo.

## Cuándo usar esta skill

- Al añadir o ampliar páginas bajo `frontend/src/app/admin/`.
- Al crear tablas con filtros/paginación, formularios de gestión o estados de carga/error/vacío.
- Al conectar una vista administrativa con endpoints reales (hoy `admin/dashboard` usa datos mock).

## Estado actual que debes reutilizar

- Estructura App Router en `frontend/src/app`; el panel admin vive en `frontend/src/app/admin/{dashboard,anuncios}` con `loading.tsx` hermanos.
- Página de referencia: `frontend/src/app/admin/dashboard/page.tsx` (KPIs + tabla + acción de activar/desactivar, con `aria-live`, `aria-label`, `scope="col"`).
- Guard de rol cliente: `frontend/src/hooks/useRoleGuard.ts` (redirige a `/login` o `/feed`). Ruta protegida en `frontend/src/middleware.ts` (`/admin` ya está en `PROTECTED_PATHS`).
- Estilos y utilidades: `frontend/src/components/ui/classes.ts` (`FOCUS_RING`, `TOUCH_TARGET`) y `SkeletonBlock.tsx`; paleta Tailwind con tokens `primary-*`, `secondary-*`, `gray-*`, `amber-*`, `sky-*`.
- Navegación: `frontend/src/components/Sidebar.tsx`; diálogos: `ConfirmDialog.tsx`; menú de usuario: `UserDropdown.tsx`.
- Cliente API: `frontend/src/lib/api.ts` (usa `AUTH_COOKIE_NAME`, añade `Authorization`). Tipos en `frontend/src/types/index.ts`.
- Datos mock actuales: `frontend/src/data/mock.ts` (`ADMIN_KPIS`, `ADMIN_USERS`, `ROLE_LABEL`).

## Procedimiento

1. Auditúa primero qué componentes/utilidades existen (skill `codebase-audit`) y reutilízalos.
2. Define la página en `frontend/src/app/admin/<seccion>/page.tsx` con `'use client'` si hay estado, más su `loading.tsx` con skeletons.
3. Protege con `useRoleGuard('admin')` y renderiza un estado "Cargando…" accesible (`role="status"`) mientras `allowed` sea falso.
4. Reutiliza `Sidebar` y el layout de `main` con `id="main-content"`, `tabIndex={-1}` y el foco como en la página de referencia.
5. Para datos reales, añade métodos al `ApiClient` (`frontend/src/lib/api.ts`) hacia endpoints `/v1/...` y tipa la respuesta en `types/index.ts`. No llames `fetch` directo desde el componente.
6. Tablas: `<table>` semántica, `<th scope="col">`, encabezados en `text-xs uppercase`, filas con estado visual (activo/inactivo), acciones con `TOUCH_TARGET` + `FOCUS_RING`.
7. Filtros y paginación: estado local controlado, parámetros espejo de los `query params` del backend (p. ej. `skip`/`limit`/`q`), y contador de resultados.
8. Formularios: labels asociados, validación, estados de envío/éxito/error; feedback con `aria-live="polite"`.
9. Estados completos: carga (skeleton), vacío, error, y respuesta tras acción (feedback efímero como en `dashboard`).
10. Accesibilidad: navegación por teclado, foco visible, contraste, textos alternativos, `aria-*` donde aporte.

## Reglas técnicas

- TypeScript y componentes funcionales; sigue el alias `@/*` → `src/*`.
- No añadas dependencias de UI salvo petición explícita y justificada; el estilo es Tailwind utilitario con los tokens existentes.
- La autorización real está en el backend; el guard del frontend es solo UX (ver skill `auth-rbac-security`).
- Mantén el patrón de idioma de la UI en español (`Cargando…`, "Usuarios Registrados", etc.).
- No dupliques tipos: extiéndelos en `frontend/src/types/index.ts`.
- Respeta el ancho de columna y el `overflow-x-auto` para tablas en pantallas pequeñas.

## Criterios de validación

- La página se ve y comporta como `admin/dashboard` (mismos tokens, radio, espaciado, tipografía).
- Tabla con `scope`, acciones alcanzables por teclado y foco visible.
- Estados de carga/vacío/error/éxito presentes.
- Datos provenientes de `api.ts` (si aplica), no mock "hardcodeado" salvo que el usuario lo pida.
- `npm run lint` en `frontend/` pasa sin errores nuevos.

## Errores a evitar

- Introducir otra librería de componentes o tema.
- Usar `div` clicables en vez de `button`/`table` semánticos.
- Olvidar `loading.tsx`/estados vacíos y dejar pantallas en blanco.
- Confiar la seguridad solo al guard del cliente.
- Inventar endpoints que no existen o tipar mal la respuesta del backend.

## Criterios de finalización verificables

- [ ] Página(s) creada(s) bajo `frontend/src/app/admin/` reutilizando componentes existentes.
- [ ] `useRoleGuard('admin')` y estados accesibles implementados.
- [ ] Tabla/filtros/formularios con accesibilidad verificada (teclado, foco, `aria`).
- [ ] Integración con `api.ts` y `types/index.ts` cuando corresponde.
- [ ] `npm run lint` ejecutado sin errores nuevos (resultado real).
