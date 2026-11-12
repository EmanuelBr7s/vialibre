---
name: testing-and-quality
description: "Pruebas funcionales, de integración, de seguridad y de regresión en VíaLibre, verificando persistencia y documentando resultados reales. Úsala al validar una funcionalidad nueva o un arreglo, al comprobar autorización de endpoints, al verificar que los datos se guardan de verdad, o al ejecutar comprobaciones antes de dar una tarea por terminada."
---

# Pruebas y calidad (testing-and-quality)

Objetivo: demostrar con evidencia que una funcionalidad funciona de extremo a extremo y que los datos **se persisten**. Documenta siempre resultados **reales** (comandos ejecutados y salida observada). Nunca afirmes que algo funciona sin haberlo comprobado.

## Cuándo usar esta skill

- Al terminar cualquier funcionalidad o corrección.
- Al comprobar autorización (401/403) y accesos no autorizados.
- Al verificar que los datos se guardan y se recuperan de PostgreSQL.
- Al buscar regresiones en funcionalidad existente.

## Estado actual que debes conocer

- **No existe suite de pruebas, linter Python ni CI.** No inventes uno ni asumas pytest/jest disponibles. Inspecciona primero (`find` de `tests/`, `pyproject.toml`, `pytest.ini`, `jest.config`, `.github/workflows`).
- Único lint disponible: `npm run lint` en `frontend/`.
- El stack se levanta con `make up`; primer arranque: `make setup-db`. Servicios y puertos: nginx `80`, frontend `3000`, auth `8001`, core `8002`, match `8003`, Postgres host `5433`.
- Salud de servicios: `/health` en cada servicio (verifica antes de probar).
- Los servicios no corren en el host (`database_url` fija host `postgres`); ejecuta comandos dentro de contenedores (`docker-compose exec ...`, `make ...`).

## Procedimiento

1. Audita qué herramientas de prueba existen realmente. Si no hay, elige verificación pragmática contra el stack en marcha (HTTP) antes que crear infraestructura no solicitada.
2. Levanta el stack (`make up` + `make setup-db` si hace falta) y comprueba `/health` de cada servicio.
3. **Pruebas funcionales:** ejercita el flujo por sus endpoints (`curl`/httpx) con datos válidos; confirma respuestas y efectos.
4. **Integración:** verifica las llamadas cross-service (auth↔core↔match) y que las referencias por UUID resuelven.
5. **Seguridad:** sin token → 401; token de rol insuficiente → 403; recurso ajeno → 403; token manipulado/expirado → 401. Cubre rutas admin.
6. **Persistencia:** tras una escritura, vuelve a leer (por API o por `psql`) y confirma que el dato está en la tabla y esquema correctos.
7. **Regresión:** vuelve a probar los flujos existentes relacionados para asegurar que no se rompieron.
8. Frontend: ejecuta `npm run lint` y, si aplica, `npm run build`.
9. Documenta el resultado: comando, entrada, salida observada (códigos HTTP, filas, capturas/logs) y veredicto. Reporta fallos y limitaciones con honestidad.

## Reglas técnicas

- No declares éxito sin evidencia; distingue "ejecutado y verificado" de "no verificado".
- Usa credenciales demo reales de `services/auth-service/app/seed.py` (p. ej. `admin@vialibre.edu.co`). No inventes usuarios ni roles.
- Respeta la separación de esquemas (`vialibre_auth`, `vialibre_core`, `vialibre_match`) al comprobar persistencia.
- Si creas archivos de prueba, que sean mínimos y no alteren datos de producción/demo de forma destructiva; prefiere `make clean` (borra el volumen) solo si el usuario lo aprueba.
- No añadas dependencias de prueba sin justificarlo (y `make build` si toca `requirements*.txt`).
- Limpia datos de prueba que hayas insertado.

## Criterios de validación

- Cada caso tiene entrada, comando real y salida observada.
- Se cubren los cuatro tipos: funcional, integración, seguridad y regresión.
- La persistencia se verifica volviendo a leer el dato.
- Los accesos no autorizados devuelven el código correcto (401 vs 403).
- `npm run lint` (y `build` si aplica) ejecutados con resultado real.

## Errores a evitar

- Afirmar que funciona sin haberlo probado.
- Asumir un framework de pruebas inexistente o crear infraestructura no pedida.
- Probar solo el "camino feliz" y omitir 401/403/errores.
- Verificar solo en memoria sin comprobar la base de datos.
- Dejar datos de prueba contaminando la base.
- Reportar resultados inventados o "esperados" en vez de observados.

## Criterios de finalización verificables

- [ ] Stack en marcha y `/health` verificado en los 3 servicios.
- [ ] Pruebas funcionales, de integración, de seguridad y de regresión ejecutadas.
- [ ] Persistencia confirmada con una lectura posterior.
- [ ] Resultados documentados con comandos y salida **real** (incluidos fallos, si los hay).
- [ ] `npm run lint` (y `build` si aplica) ejecutados; datos de prueba limpiados.
