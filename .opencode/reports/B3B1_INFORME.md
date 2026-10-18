# B3-B.1 — Manejo determinista de duplicados concurrentes — INFORME

## 1. Archivos modificados y motivo

### Código de servicio (aditivo, sin cambios de modelo/esquema/contrato de éxito)

| Archivo | Cambio |
|---|---|
| `services/match-service/app/api/duplicates.py` (nuevo) | Clasificador `raise_duplicate_conflict(exc, constraint=, detail=)`. Traduce a HTTP 409 la violación de la restricción única nombrada; cualquier otra violación de integridad se registra (`logger.error` con `exc_info`) y se propaga sin clasificar. |
| `services/auth-service/app/api/duplicates.py` (nuevo) | Copia idéntica (cada servicio es propietario de su código; no se tocó la librería compartida). |
| `services/match-service/app/api/v1/endpoints/interactions.py` | `POST /interactions/apply`: `db.flush()` envuelto en `try/except IntegrityError` → `rollback()` → 409 con el mismo `detail` del chequeo secuencial (`uq_solucionador_challenge`). |
| `services/match-service/app/api/v1/endpoints/practicas.py` | `POST /practicas`: ídem (`uq_practica_interaction`, `Ya existe una practica formalizada para esta interaccion`). |
| `services/match-service/app/api/v1/endpoints/reactions.py` | `POST /reactions`: ídem (`uq_user_challenge_reaction_type`, `You already have a {tipo} reaction for this challenge`). |
| `services/match-service/app/api/v1/endpoints/documents.py` | `PUT /{id}/documentos/{tipo}`: ídem (`uq_interaction_document_tipo`). Detalle nuevo (ver §2): el upsert secuencial no tenía duplicado. |
| `services/auth-service/app/api/v1/endpoints/auth.py` | `POST /auth/register`: ídem (`ix_vialibre_auth_users_email` — índice único verificado en la BD viva, no restricción de tabla). |

### Pruebas

| Archivo | Contenido |
|---|---|
| `services/match-service/tests/test_concurrencia_duplicados.py` (nuevo) | 11 pruebas: unidad, ciclo de vida de sesión, contratos secuenciales y 4 carreras reales (apply, práctica, reacción, documento). |
| `services/auth-service/tests/test_concurrencia_registro.py` (nuevo) | 5 pruebas: unidad, secuencial, autorización y carrera real de registro. |
| `services/auth-service/tests/helpers.py` | Exportación aditiva de `TestSession` (espejo del helper de match; ya existente allí). |

No se modificaron modelos, restricciones, migraciones, esquemas, roles, permisos ni contratos de éxito. No se añadió `with_for_update()`. No se tocó el borrado de interacciones, `contact_unlocked`, `/contact`, la formalización ni el estado de challenges (B3-B.2/B.3). No se ejecutaron migraciones ni reinicios.

## 2. Comportamiento anterior y posterior

| Endpoint | Antes (duplicado concurrente) | Después | Secuencial (sin cambios) |
|---|---|---|---|
| `POST /interactions/apply` | `IntegrityError` sin capturar → **500** | **409** `You already applied to this challenge` | 409 con ese detalle |
| `POST /practicas` | **500** | **409** `Ya existe una practica formalizada para esta interaccion` | 409 (ya cubierto por suite previa) |
| `POST /reactions` | **500** | **409** `You already have a {tipo} reaction for this challenge` | 409 con ese detalle |
| `PUT /interactions/{id}/documentos/{tipo}` | **500** | **409** `El documento fue cargado por otra solicitud; intentalo de nuevo` | El segundo PUT sigue devolviendo **200** con reemplazo (upsert intacto) |
| `POST /auth/register` | **500** | **409** `Email already registered` | 409 con ese detalle |

Único contrato nuevo: el 409 de documentos bajo carrera, que no existía antes (el upsert secuencial reemplaza, no duplica).

## 3. Tratamiento específico de restricciones y errores no reconocidos

- **Identificación estricta**: el mensaje del motor debe contener a la vez la marca `duplicate key value violates unique constraint` **y** el nombre exacto de la restricción del endpoint. Solo entonces se lanza el 409 con el mismo `detail` del chequeo secuencial.
- **No se clasifican falsamente** otras violaciones: otra restricción única con nombre distinto, `NOT NULL` o clave foránea no coinciden con ambos marcadores → el `IntegrityError` original se propaga tras registrar el incidente (`logger.error` con `exc_info`; el cliente recibe el 500 genérico de FastAPI, sin SQL, nombres internos ni datos).
- **Ciclo de vida de sesión**: en cada endpoint se ejecuta `await db.rollback()` antes de responder, porque el fallo deja la sesión en transacción abortada; el `raise` posterior entra en el `except` de `get_db`, que hace un segundo rollback (no destructivo) y cierra. No hay doble commit.
- **Restricciones únicas conservadas** como mecanismo de integridad (son las que resuelven la carrera); este bloque solo traduce su violación a HTTP.

## 4. Pruebas ejecutadas

**UNITARIAS (IntegrityError simulado — NO demuestra carrera, solo la traducción; así se etiquetan en los docstrings):**
`test_clasificador_reconoce_su_restriccion_unica`, `test_clasificador_no_confunde_otra_violacion_de_integridad` (otra única, NOT NULL, FK), `test_clasificador_reconoce_email_duplicado`, `test_clasificador_no_confunde_otra_violacion_de_integridad` (auth), `test_sesion_sigue_usable_tras_rollback_de_duplicado`.

**CONTRATOS SECENCIALES/AUTORIZACIÓN (HTTP real):** apply duplicado → 409 (y primer POST → 201); apply sin token → 401; reacción duplicada → 409; documento doble PUT → 200 con reemplazo (`filename` nuevo, mismo `size`); registro duplicado → 409 (y el primero → 201 con `access_token`); registro con rol admin → 422 (validación de esquema intacta).

**CONCURRENCIA REAL contra PostgreSQL (5):** en todas, una sesión independiente mantiene el INSERT **sin commitear**; una petición HTTP real (TestClient, hilo propio) intenta el mismo INSERT y **queda bloqueada de verdad** por el índice único; la sincronización **observa ese bloqueo en `pg_stat_activity`** (`wait_event_type='Lock'`, conexión fresca por sondeo, filtrado en Python) y solo entonces libera al rival. **Si el INSERT no se bloquea, la prueba falla** — no simula éxito. Tras el 409 se verifica además que el servicio sigue operativo (POST posterior → 201):
`test_apply_duplicado_concurrente_devuelve_409`, `test_practica_duplicada_concurrente_devuelve_409`, `test_reaccion_duplicada_concurrente_devuelve_409`, `test_documento_duplicado_concurrente_devuelve_409` (el reto a core se finge; el índice único es real), `test_registro_duplicado_concurrente_devuelve_409`.

Nota de validación del método: se instrumentaron eventos de SQLAlchemy y `pg_stat_activity` en diagnósticas temporales (ya eliminadas) que confirmaron el INSERT bloqueado (`wait_event='Lock'`) y la resolución en 409 por la vía de la carrera. El primer diseño del observador no veía el bloqueo; se rehízo al patrón validado (conexión fresca por sondeo + filtrado en Python) y ahora detecta el bloqueo en <1 s.

## 5. Resultados de suites y lint

| Comando | Resultado | Línea base | Explicación de la diferencia |
|---|---|---|---|
| `match-service pytest -q` | **46 passed** | 35 | +11 pruebas nuevas de este bloque |
| `auth-service pytest -q` | **30 passed** | 25 | +5 pruebas nuevas de este bloque |
| `core-service pytest -q` | **18 passed** | 18 | Sin cambios (sin regresiones) |
| `npm run lint` (frontend) | Limpio | Limpio | Frontend no tocado; se ejecuta por procedimiento |

Todas las diferencias quedan explicadas por las 16 pruebas nuevas; ninguna prueba previa cambió de resultado.

## 6. Riesgos residuales, limitaciones y estado Git

- **Procesos vivos sin reinicio (restricción respetada)**: ambos Dockerfiles usan `uvicorn --reload` sobre los directorios montados, y se verificó en los contenedores en ejecución que los cinco endpoints ya contienen el manejo nuevo. Aun así, la validación funcional completa de este bloque se hizo vía pytest dentro del contenedor (importa el mismo código), no contra el stack desplegado.
- **Identificación por nombre de restricción**: si una futura migración renombrara `uq_solucionador_challenge`, `uq_practica_interaction`, `uq_user_challenge_reaction_type`, `uq_interaction_document_tipo` o el índice `ix_vialibre_auth_users_email`, la violación dejaría de clasificarse y volvería a 500 (comportamiento previo, degradación segura). Los nombres se verificaron en la BD viva antes de implementar.
- **409 de documentos es un contrato nuevo** (único sin análogo secuencial); el frontend actual no distingue mensajes 409, solo el status, por lo que no requiere cambios.
- **Concurrencia testeada en las 5 operaciones críticas**; `update_practica` no tiene restricción única que le compita (queda para F5/B3-B.4).
- **Árbol Git**: staging vacío (sin `git add`, commits ni ramas); HEAD `8a6211b` en `feature/funcionalidades-eric-jassir`. Este bloque añade a lo preexistente: 2 módulos nuevos de servicio, 2 ficheros de pruebas nuevos, la exportación de `TestSession` en el helper de auth y ediciones aditivas en los 5 endpoints. Tras la primera ejecución se retiró el fichero de diagnóstica temporal `tests/_diag_carrera.py`. Todo el trabajo preexistente sin confirmar se conserva intacto.
