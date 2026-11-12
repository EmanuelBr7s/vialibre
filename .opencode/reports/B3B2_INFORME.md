# Informe B3-B.2 — Concurrencia en aprobaciones y corrección de privacidad

Fecha: 2026-10-18 · Rama `feature/funcionalidades-eric-jassir` (HEAD `8a6211b`, sin staging)
Bloque: exclusivamente B3-B.2. Sin migraciones, reinicios, staging ni cambios de contratos ajenos.

## 1. Archivos modificados

| Archivo | Cambio |
|---|---|
| `services/match-service/app/api/v1/endpoints/interactions.py` | Endpoint `PATCH /{id}/approve`: bloqueo de fila `SELECT ... FOR UPDATE` + relectura bajo lock + máquina de estados (`pendiente → aprobado \| rechazado`, si no → 409) + reseteo de contacto al rechazar (F1). Endpoint `GET /{id}/contact`: defensa en profundidad — exige `status=aprobado` además de `contact_unlocked` (I1). Corregido un import duplicado de `raise_duplicate_conflict` introducido accidentalmente en B3-B.1. |
| `services/match-service/tests/test_endpoints_interactions.py` | Fixture `_create_interaction` acepta `status`; los 7 tests de contacto usan `status=APROBADO` (la nueva condición exige aprobación para llegar al bloque remoto que estos tests ejercitan). Sin cambios de aserciones. |
| `services/match-service/tests/test_resolucion_interacciones.py` | **Nuevo**: 13 pruebas (11 secuenciales de máquina de estados, contacto, autorización e I4; 2 de concurrencia real contra PostgreSQL). |

No se tocaron: modelos, migraciones, restricciones, esquemas de BD, `apply`, borrado, prácticas, reacciones, documentos, core-service, roles ni frontend. `seed_match.py` ya mantenía coherencia (solo desbloquea si `aprobado`) y no requirió cambios.

## 2. Flujo transaccional antes y después

**Antes (F3 abierto):** SELECT sin lock → llamada HTTP a core → autorización → `status = data.status` a ciegas → si aprobado y no desbloqueado, desbloquear → flush. Dos peticiones concurrentes podían aprobar y rechazar la misma interacción; el rechazo no reseteaba el contacto (F1: estado `rechazado` con `contact_unlocked=True` y contacto entregable).

**Después:** idéntico hasta la autorización (la llamada a core y sus 502 ocurren **antes** de cualquier lock, I4) → `SELECT ... FOR UPDATE` con `populate_existing=True` sobre la fila concreta (bloqueo de fila únicamente, sin globales) → 404 si fue borrada en paralelo → **revalidación bajo el lock**: estado ≠ `pendiente` → 409 `Interaction has already been resolved`; objetivo `pendiente` → 409 `Invalid interaction status transition` (I2) → transición: aprobado ⇒ `contact_unlocked=True` + `contact_unlocked_at=utcnow()`; rechazado ⇒ `contact_unlocked=False` + `contact_unlocked_at=None` (F1/I1) → flush; el commit y la liberación del lock ocurren en `get_db` al cerrar la petición.

Detalle técnico crítico: `populate_existing=True` es obligatorio — sin él, SQLAlchemy devuelve la instancia cacheada del primer SELECT con el estado **anterior** al lock, y el segundo contendiente aplicaría su transición sobre valores obsoletos (doble transición). La prueba de concurrencia nº 8 detectaría exactamente ese fallo (espera `200 + 409`, no `200 + 200`).

`GET /{id}/contact`: el chequeo pasa de `not contact_unlocked` a `not contact_unlocked or status != APROBADO`, con el mismo 403 `Contact information is not unlocked yet` (contrato intacto, el chequeo sigue siendo previo a cualquier llamada remota).

## 3. Invariantes verificadas

- **I1** — `contact_unlocked=True` solo con `aprobado` (aprobado ⇒ True con marca; rechazado ⇒ False + `at=None`; defensa en profundidad en contacto para filas anómalas preexistentes).
- **I2** — Única transición exitosa `pendiente → aprobado | rechazado`; cualquier petición posterior sobre fila resuelta ⇒ 409 sin mutar nada; objetivo `pendiente` ⇒ 409 (nueva semántica degenerada, ver §6).
- **I3** — Autorizaciones intactas: rol público, autor del challenge y 403 existentes sin cambios (tests nuevos los blindan).
- **I4** — La llamada a core ocurre antes del lock; verificado con la fila bloqueada por otra sesión: la petición responde 502 sin esperar al lock (la prueba fallaría si el orden regresara).

## 4. Pruebas

**Nuevas (13, `test_resolucion_interacciones.py`) — requisitos del bloque:**
1. aprobar `pendiente` → 200, `aprobado`, desbloqueado con marca (req. 1)
2. rechazar `pendiente` (con flag anómalo) → 200, `rechazado`, contacto reseteado (req. 2)
3. rechazar `aprobada` → 409 y estado/contacto **exactamente sin tocar** (req. 3, regresión F3/F1)
4. aprobar `rechazada` → 409 sin alterar nada (I2)
5. objetivo `pendiente` → 409 `Invalid interaction status transition` (I2)
6. contacto de `rechazada` con flag en True → 403, sin llamada remota (req. 4)
7. contacto de `pendiente` con flag en True → 403 (req. 5)
8. contacto de `aprobada` con flag y usuario autorizado (el solucionador) → 200 con datos (req. 6)
9. `solucionador` intenta aprobar → 403; `publicador` no autor → 403 (req. 7 / I3)
10. I4: fila bloqueada + core caido → 502 sin bloquearse (req. 10)
11. **Concurrencia real (req. 8):** sesión ajena retiene `FOR UPDATE` sin commitear; dos peticiones HTTP reales (aprobar y rechazar, hilos propios) quedan **observadamente** bloqueadas en `pg_stat_activity` (`wait_event_type='Lock'`, consulta `FOR UPDATE` sobre `vialibre_match.interactions`, sondeo con conexión fresca) antes de liberar; resultado: exactamente `200 + 409` en cualquier orden de ganador; estado final persistido validado contra combinaciones inválidas de `status`/`contact_unlocked`/`contact_unlocked_at` y coherente con la respuesta ganadora. Sin bloqueo observado, la prueba **falla** (no simula éxito).
12. **Aislamiento de locks (req. 9):** con X bloqueada y observada, resolver Y concurrentemente → 200 sin esperar; X termina tras liberar → 200; ambas filas coherentes.

Adaptados: 7 tests de contacto de B3-A (solo fixture a `APROBADO`; aserciones intactas).

**Resultados:**
- `match-service`: **59 passed** (base 46 + 13 nuevas), 9.68 s
- `auth-service`: **30 passed** (sin cambios)
- `core-service`: **18 passed** (sin cambios)
- Frontend: `npm run lint` limpio · vitest **45 passed** (5 archivos)

Ninguna prueba omitida ni fallo de entorno.

## 5. Validación en el stack vivo

No se reinició ningún contenedor: `match-service` corre `uvicorn --reload` y el proceso vivo ya sirve el endpoint con bloqueo de fila (verificado en B3-B.1 con el mismo patrón para B3-B.1). Las suites corren dentro de los propios contenedores contra la PostgreSQL real de la plataforma (aislamiento por datos de prueba y limpieza en `finally`); no se realizaron escrituras manuales fuera del entorno de pruebas.

## 6. Riesgos residuales, limitaciones y decisiones

- **Semántica nueva para objetivo `pendiente`:** antes devolvía 200 sin transición efectiva; ahora 409 `Invalid interaction status transition` (I2 restringe las transiciones exitosas a `aprobado|rechazado`). Ningún test existente ni el frontend envía este valor.
- **Detalle 409 nuevo:** `Interaction has already been resolved` — contrato nuevo pero coherente con los mensajes en inglés del endpoint; no expone SQL, tablas ni restricciones.
- **Orden de cola de locks:** con dos contendientes encolados, PostgreSQL decide el ganador; la lógica y las pruebas no dependen del orden.
- **`populate_existing` como punto único de corrección:** si se retirara, la doble transición volvería; la prueba nº 8 lo cubre.
- **`contact_unlocked_at` en aprobación:** se fija siempre al momento de aprobar (antes se preservaba si la fila anómala ya venía desbloqueada; diferencia irrelevante en filas válidas).
- **Frontend:** `ApplicantsSection`/`ContactSection` solo leen `contact_unlocked`; con el fix, una fila `rechazada` muestra contacto bloqueado — comportamiento deseado y compatible.

## 7. Estado Git

Sin `git add`, staging ni commits (staging vacío). El trabajo preexistente sin confirmar está intacto; los cambios de este bloque son aditivos en el árbol de trabajo (`interactions.py` y `test_endpoints_interactions.py` modificados; `test_resolucion_interacciones.py` nuevo dentro del directorio sin seguimiento `services/match-service/tests/`).

## 8. Pendiente tras este bloque

- **B3-B.3** (requiere autorización y decisión D6): guardia de borrado de interacciones con práctica formalizada y requisito de estado en `create_practica`.
- **B3-B.4** (requiere autorización): validaciones preventivas F5.
