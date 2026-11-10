---
name: auth-rbac-security
description: "Autorización por roles y permisos en VíaLibre con mínimo privilegio: proteger endpoints, garantizar acceso exclusivo al administrador autorizado y probar accesos no autorizados. Úsala al añadir roles, permisos o rutas administrativas, al definir quién puede ver/editar/borrar un recurso, o al revisar la seguridad de un endpoint en los servicios FastAPI y en el frontend Next.js."
---

# Autenticación, RBAC y seguridad (auth-rbac-security)

Objetivo: implementar autorización por roles y permisos sobre la autenticación JWT que **ya existe**, con mínimo privilegio y acceso exclusivo al administrador. El módulo administrativo es, inicialmente, exclusivo del administrador autorizado.

## Cuándo usar esta skill

- Al crear o proteger rutas administrativas (backend y frontend).
- Al introducir permisos por rol o por recurso ("solo el dueño", "solo admin", "solo la empresa autora").
- Al revisar si un endpoint existente filtra datos o permite escalada de privilegios.
- Antes de habilitar cualquier rol nuevo.

## Estado actual que debes conocer (no reemplazar)

- Emisión de JWT: `services/auth-service/app/core/security.py` → `create_access_token(user_id, role, ...)` con claims `sub`, `role`, `exp`, `iat`.
- Verificación de JWT (compartida): `shared/python/vialibre_common/auth.py` → `verify_token(...)`, que valida el rol contra el enum `UserRole`.
- Dependencias por servicio: `services/{auth,core,match}-service/app/api/deps.py` exponen `get_current_user`. En auth/core devuelve `TokenPayload`; en match devuelve `AuthContext(payload, token)`.
- Roles: `UserRole` en `shared/python/vialibre_common/schemas.py` = `publicador`, `solucionador`, `egresado`, `admin`. Tabla `Role` y `User.role_id` (FK) en `services/auth-service/app/models/`.
- **No existe** todavía una dependencia reutilizable de tipo `require_role`. Varios endpoints comprueban el rol a mano (p. ej. `auth-service/.../users.py` en `/talent` y en `/{user_id}/cv`; `match-service/.../documents.py` en `_load`).
- Frontend: el JWT vive en una cookie (`AUTH_COOKIE_NAME`); `frontend/src/middleware.ts` solo comprueba **presencia** de cookie para `/admin`; `frontend/src/hooks/useRoleGuard.ts` valida el rol en cliente. La seguridad real debe estar **en el backend**.

## Procedimiento

1. Describe el recurso y quién puede ver/crear/editar/borrar. Empieza por "denegar por defecto".
2. Decide el rol/permiso con el modelo existente. Reutiliza `UserRole`; para el administrador usa el rol `admin` ya sembrado (`services/auth-service/app/seed.py`).
3. Si necesitas una comprobación reutilizable, añádela en el `api/deps.py` **de cada servicio que la use** (los servicios no comparten código de dependencias, solo la librería `vialibre_common`). Aplica el patrón:
   - `get_current_user` (ya existe) → `require_role(*roles)` que valide `payload.role` y lance `HTTPException(403)` si no coincide.
4. Aplica la dependencia a cada endpoint sensible. Para recursos por dueño, combina rol + comparación de `sub`/`author_id`/`solucionador_id` (ver `_load` en `match-service/.../documents.py`).
5. Refuerza el frontend: mantén `useRoleGuard`/`middleware.ts` como UX, nunca como única barrera. Extiende `PROTECTED_PATHS`/matcher en `middleware.ts` si añades rutas.
6. Registra siempre 401 (sin token) vs 403 (token sin permiso) de forma consistente.
7. Escribe las pruebas de acceso denegado (ver criterios) y ejecútalas contra el stack en marcha.

### Rol futuro de prácticas / proyección social

El sistema podría incorporar en el futuro un rol restringido para gestión de prácticas o proyección social. **Hoy no debe asignarse ni habilitarse automáticamente**:

- No lo añadas al enum `UserRole` ni a `TALENT_ROLES` salvo petición explícita.
- No lo siembres en `services/auth-service/app/seed.py`.
- No lo incluyas en permisos por defecto ni en el registro público.
- Si se menciona, documéntalo como propuesta/apagado y deja su activación como decisión manual.

## Reglas técnicas

- El rol viaja **firmado** en el JWT; no confíes en roles enviados por query/body/cabeceras.
- Verifica el token con `verify_token` de `vialibre_common`; no dupliques lógica de decodificación.
- Mínimo privilegio: denegar por defecto, conceder explícitamente. El admin es el único con acceso total al módulo administrativo.
- No expongas datos sensibles (p. ej. `cv_data`, `document.data`) sin comprobar autorización: en SQLAlchemy esos binarios están en columnas `deferred`.
- Consistencia entre servicios: si un recurso es de auth pero se consume en match, valida en **ambos** donde corresponda.
- No cambies el esquema de claims del JWT sin actualizar `TokenPayload` y `verify_token` a la vez.

## Criterios de validación

- Endpoints protegidos devuelven **401** sin token y **403** con token de rol insuficiente.
- El acceso al módulo/admin está restringido exclusivamente al rol `admin` autorizado.
- Ningún endpoint confía en el rol declarado en el cliente.
- Las pruebas incluyen: sin token, token válido de rol inferior, token de admin, recurso ajeno (dueño ≠ `sub`), y token manipulado/expirado.
- No se habilitó ni autoasignó el rol futuro de prácticas/proyección social.

## Errores a evitar

- Dejar la autorización solo en el frontend (`useRoleGuard`/middleware).
- Proteger unas rutas y olvidar otras del mismo recurso o del servicio hermano.
- Devolver 404 por conveniencia donde corresponde 403, o mezclar 401 y 403.
- Sembrar/habilitar roles nuevos "por comodidad".
- Serializar campos sensibles antes de comprobar permisos.

## Criterios de finalización verificables

- [ ] Cada endpoint nuevo o modificado tiene autorización explícita y mínimo privilegio.
- [ ] Existe (si aplica) una dependencia de rol reutilizable en el `api/deps.py` correspondiente.
- [ ] Pruebas de acceso no autorizado escritas y ejecutadas, con resultado real documentado (401/403 observados).
- [ ] El rol futuro de prácticas/proyección social permanece ausente/deshabilitado y sin autoasignación.
- [ ] Frontend alineado (guard + middleware) sin ser la única barrera.
