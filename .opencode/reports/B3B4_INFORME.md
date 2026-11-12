# Informe B3-B.4 — Validaciones preventivas F5

Fecha: 2026-10-18 · Rama `feature/funcionalidades-eric-jassir` (HEAD `8a6211b`, sin staging)
Bloque: exclusivamente B3-B.4 en el orden autorizado (F5.2 → F5.3 → F5.1). Sin migraciones, sin cambios de esquema, sin reconstrucciones de imagen, sin staging ni commits. No se abordó B3-B.3 ni D6; no se implementó F5.1b.

## 0. Nota de entorno

Docker Desktop no estaba corriendo al iniciar el bloque (el daemon y los contenedores estaban abajo). Se inició el daemon y se levantó el stack con `docker-compose up -d` (imágenes existentes, **sin** `docker-compose build`). Verificado después: frontend `e8af349d5bd0` (imagen de B3-A.2 intacta), auth/core/match de hace 2 días, nginx/pg sin tocar. Los servicios corren `uvicorn --reload`, por lo que los cambios de código se aplicaron en caliente sin reiniciar contenedores.

## 1. Archivos modificados

| Archivo | Cambio |
|---|---|
| `services/core-service/tests/test_endpoints_challenges.py` (**nuevo**) | 23 pruebas de caracterización de los endpoints de retos (F5.2). Ningún cambio de código de servicio. |
| `services/match-service/app/api/v1/endpoints/practicas.py` | `_get_practica_or_404` acepta `for_update: bool = False` (`select...with_for_update()`); `update_practica` lo invoca con `for_update=True`. `get_practica` y el resto del archivo intactos. |
| `services/match-service/tests/test_concurrencia_practicas.py` (**nuevo**) | 7 pruebas de F5.3 (2 carreras reales con ambos órdenes de adquisición, 1 no-regresión de campos distintos, 2 secuenciales, 401 y 403). |
| `services/match-service/app/api/v1/endpoints/interactions.py` | `apply_to_challenge`: +import de `_validate_challenge` desde `app.api.v1.endpoints.practicas` (sin ciclos: practicas no importa a interactions) y +llamada `await _validate_challenge(data.challenge_id)` tras el chequeo local de duplicado e antes del `db.add`. |
| `services/match-service/tests/test_validacion_apply_reto.py` (**nuevo**) | 5 pruebas de F5.1 (400 fantasma, 502 caído, 201 exito + persistencia, orden de validaciones, 401 conservado). |
| `services/match-service/tests/test_concurrencia_duplicados.py` | **Adaptación documentada** de los 2 tests `apply` de B3-B.1 (ver §5): +`monkeypatch` con el transporte falso de 200 ya existente en el archivo (`_cliente_reto_practica`). La maquinaria de carrera (sesión rival, bloqueo observado en `pg_stat_activity`) no se tocó. |

`services/core-service/app/api/v1/endpoints/challenges.py` **no se modificó en este bloque** (el ` M` visible en `git diff` corresponde a los cambios preexistentes de B3-A).

## 2. Hallazgos confirmados y cambios aplicados

### F5.2 — transiciones de estado en core (Fase 1) · caracterización, sin cambio funcional
- **Confirmado**: `update_challenge` (PATCH) aplica cualquier valor de `status` sin máquina de estados y sin `with_for_update`; `ChallengeCreate` no admite `status` (todo reto nace `abierto`); el listado por defecto sólo muestra `abierto` salvo que se filtre por `author_id`; no hay ningún llamador UI del PATCH; no existe regla de transición definida en código ni en documentos (los flujos de `diseno-modelo-datos.md` §F están "sujetos a confirmación").
- **Aplicado**: SÓLO pruebas de caracterización (23) que fijan los contratos actuales: roles de creación (201 publicador / 403 otros), listado público y sus filtros (`status`, `tipo`, `author_id`, límites de paginación → 422), lectura pública y 404, máquina "inexistente" (autor/admin transicionan libremente entre los 3 estados; no-admin → 403 con su detail; `status` inválido → 422; PATCH sin `status` preserva el estado; campos fuera de `ChallengeUpdate` (`author_id`, `is_featured`, `featured_score`) se ignoran sin cambios) y borrado (204 autor/admin, 403 no-autor, 404 doble borrado). **Sin máquina de estados ni restricciones nuevas.**

### F5.3 — carrera de fechas en `update_practica` (Fase 2) · defecto confirmado y corregido
- **Confirmado (rojo, evidencia capturada)**: dos PATCH concurrentes (`fecha_fin=2026-01-15` y `fecha_inicio=2026-03-01` sobre fechas inicialmente nulas) ambos devolvían 200 y persistían `fecha_inicio=2026-03-01, fecha_fin=2026-01-15` — invariante `fecha_fin >= fecha_inicio` violada — en **ambos órdenes** de llegada.
- **Aplicado**: bloqueo de fila con `SELECT ... FOR UPDATE` en la lectura que usa `update_practica` (patrón TOCTOU del plan, transacción única vía `get_db`). La segunda petición relee bajo lock el estado vigente y su envío se rechaza con 422 si la pareja resultante es inválida. No hay llamadas HTTP bajo el bloqueo (el endpoint no las tiene). Sémantica PATCH, autorización y códigos secuenciales intactos.

### F5.1 — `apply` sin validar el reto (Fase 3) · defecto confirmado y corregido
- **Confirmado (rojo, evidencia capturada)**: `apply` no consultaba jamás a core. Reto fantasma → 201 con fila huérfana; core caído → 201 también (0 consultas a core). **F5.1b (elegibilidad por estado)**: sigue sin validarse — decisión pendiente, fuera de alcance.
- **Aplicado**: reutilización de `_validate_challenge` de `practicas.py` tras el chequeo local de duplicado y antes del insert (orden autorizado: autorización → duplicado local → core → insert). Contratos: 400 `challenge_id no corresponde a una publicacion existente` (contra core real) y 502 `No se pudo validar la publicacion` sólo para `httpx.HTTPError`, sin URLs, hostnames ni trazas en la respuesta; en ambos casos la fila no se persiste. El éxito 201 y el 409 local se conservan.

## 3. Evidencia antes y después (rojo/verde)

| Fase | Antes (rojo) | Después (verde) |
|---|---|---|
| F5.2 | n/a (pruebas de caracterización: documentan el actual) | `core-service`: **41 passed** (18 base + 23) |
| F5.3 | `test_concurrencia_practicas.py`: **2 failed, 5 passed** — `AssertionError: La fila persistida viola la invariante fecha_fin >= fecha_inicio: fecha_inicio=2026-03-01, fecha_fin=2026-01-15` en los dos escenarios | **7 passed** (2.21 s: el bloqueo `FOR UPDATE` se observó en `pg_stat_activity`; de no observarse, la prueba falla a los 20 s) |
| F5.1 | `test_validacion_apply_reto.py`: **4 failed, 1 passed** — fantasma → 201 (esperaba 400), core caído → 201 (esperaba 502), `total_consultas == 0` (esperaba 1); el 401 ya pasaba | **5 passed** (0.77 s) |

Regresión provocada por F5.1 (detectada al correr la suite completa, §5) → adaptada → **11 passed** en `test_concurrencia_duplicados.py`.

## 4. Comandos ejecutados y resultados reales

```
docker-compose ps / docker info / health (8001,8002,8003)   -> stack arriba, 3×200
docker-compose exec -T core-service pytest -q               -> 41 passed   (Fase 1)
docker-compose exec -T match-service pytest -q tests/test_concurrencia_practicas.py
   ANTES del fix -> 2 failed, 5 passed  (defecto demostrado)
   DESPUÉS       -> 7 passed
docker-compose exec -T match-service pytest -q               -> 66 passed   (Fase 2 completa)
docker-compose exec -T match-service pytest -q tests/test_validacion_apply_reto.py
   ANTES del fix -> 4 failed, 1 passed  (defecto demostrado)
   DESPUÉS       -> 5 passed
docker-compose exec -T match-service pytest -q               -> 2 failed, 69 passed  (regresión §5)
docker-compose exec -T match-service pytest -q tests/test_concurrencia_duplicados.py -> 11 passed
docker-compose exec -T match-service pytest -q               -> 71 passed   (FINAL)
docker-compose exec -T core-service pytest -q                -> 41 passed   (FINAL)
docker-compose exec -T auth-service pytest -q                -> 30 passed   (sin cambios)
npm run lint (frontend/)                                     -> No ESLint warnings or errors
npx vitest run (frontend/)                                   -> 5 files, 45 passed
git diff --cached --name-only                                -> (vacío)
```

Totales finales: **match 71** (59 base + 7 F5.3 + 5 F5.1), **core 41** (18 + 23), **auth 30**, lint limpio, vitest 45.

## 5. Regresiones detectadas y su resolución

Al aplicar F5.1, la suite completa de match falló en **2 tests de B3-B.1** (evidencia capturada):
1. `test_apply_duplicado_secuencial_devuelve_409` — el primer POST ahora devolvía 400 (reto fantasma) en lugar de 201.
2. `test_apply_duplicado_concurrente_devuelve_409` — la petición era rechazada con 400 antes del INSERT, por lo que el bloqueo del índice único nunca ocurrió y la maquinaria **falló ruidosamente** ("El INSERT concurrente nunca quedo bloqueado…"), como estaba diseñado.

**Resolución (mínima y documentada en el propio código)**: a los dos tests se les añadió `monkeypatch` con `_cliente_reto_practica` (transporte falso que responde 200 a cualquier GET, ya existente en el archivo) para que el reto remoto "exista". No se debilitó nada: la sesión rival sin commitear, la observación real del bloqueo en `pg_stat_activity`, las aserciones de 409 y el `otro`→201 posteriores permanecen intactos; sólo cambia la existencia remota del reto. El chequeo local de duplicado sigue respondiendo antes de cualquier llamada remota (consecuencia del orden autorizado, ahora verificado por `test_apply_duplicado_local_no_vuelve_a_consultar_core`).

## 6. Pruebas de concurrencia y limitaciones

**F5.3** (`test_concurrencia_practicas.py`): PostgreSQL real, dos solicitudes HTTP reales en hilos propios sobre sesiones independientes, sincronización por eventos — la solicitud A se detiene *dentro* del endpoint tras su lectura; sólo se libera cuando B confirma su lectura (pre-fix) **o** su `SELECT ... FOR UPDATE` bloqueado aparece en `pg_stat_activity` (post-fix, conexión fresca por sondeo); si ninguna señal llega, la prueba falla. Dos pruebas cubren **ambos órdenes de adquisición** del lock ("fin-primero" e "inicio-primero") y la aserción se hace sobre la **fila persistida** (`_assert_invariante`), no sólo sobre códigos: es el resultado en BD lo que demuestra la corrección. Intercalaciones reproducidas: A lee → B lee (y escribe, pre-fix) → se libera A → A escribe; con el lock, B nunca lee hasta que A commitea.

Limitaciones: (a) los escenarios parten de fechas inicialmente nulas con envíos solapados de un campo cada uno — otros estados iniciales se cubren parcialmente por la vía secuencial; (b) el lock se toma sobre una sola fila y el endpoint no hace llamadas HTTP, así que no se evalúa contención multi-fila; (c) la barrera se inyecta sobre `_get_practica_or_404` (seam de prueba), pero endpoint, HTTP y BD son reales.

**F5.1**: la carrera real de duplicados de B3-B.1 sigue verificando el bloqueo del índice único contra PostgreSQL; el único mock añadido es la existencia del reto remoto (no el bloqueo).

## 7. Decisiones pendientes (no resueltas por inferencia)

1. **F5.1b — elegibilidad por estado del reto**: `apply` sigue aceptando retos `cerrado`/`en_progreso`; nadie define la regla (feed implícito = `abierto`, docs §F "sujeto a confirmación"). Requiere decisión expresa; si se adopta, además habría que decidir el código (400 vs 409) y la guarda en `feed/[id]/page.tsx`.
2. **Máquina de estados de `Challenge`**: inexistente como regla institucional; F5.2 sólo la caracteriza. Definirla es decisión institucional (y vendría con su `with_for_update`).
3. **B3-B.3 / D6**: no abordadas (guardia de borrado de interacciones con `Practica`; exigir `aprobado` en `create_practica`).
4. Fuera de alcance documentado: validación de retos en `reactions` (misma clase que F5.1), `category_id` inválido → 500 genérico en core, valores inválidos de filtros de listado no evaluados, huérfanos por borrado de reto (arquitectura sin FK), restauración del modo mock del frontend.

## 8. Criterios de aceptación

1. ✔ F5.2 documentado con 23 pruebas; `challenges.py` sin cambios funcionales.
2. ✔ F5.3: la carrera reproducida no persiste combinación inválida (rojo→verde, ambos órdenes, invariante sobre la fila).
3. ✔ F5.1: sin interacciones huérfanas (400 sin persistencia) y fallo remoto → 502 sin fugas internas.
4. ✔ Las pruebas reales de concurrencia siguen observando bloqueos y resultados persistidos (F5.3: `FOR UPDATE` en `pg_stat_activity`; B3-B.1: índice único intacto).
5. ✔ Suites en verde: match 71, core 41, auth 30, lint limpio, vitest 45.
6. ✔ Sin migraciones, sin cambios fuera de alcance, sin staging, sin commits.

## 9. Estado de Git

- Rama `feature/funcionalidades-eric-jassir`, HEAD `8a6211b` (sin cambios de historial).
- **No se hizo `git add`, staging ni commit alguno**: `git diff --cached --name-only` → vacío.
- No se usó `git reset`, `git clean`, checkout ni ningún comando destructivo; todo el trabajo preexistente (modificado y sin seguimiento) se conserva íntegro.
- Archivos nuevos de este bloque (sin seguimiento, junto al resto del trabajo no stageado): `services/core-service/tests/test_endpoints_challenges.py`, `services/match-service/tests/test_concurrencia_practicas.py`, `services/match-service/tests/test_validacion_apply_reto.py`; informe: `.opencode/reports/B3B4_INFORME.md`.
