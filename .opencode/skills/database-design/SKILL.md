---
name: database-design
description: "Diseño y modificación del modelo de datos de VíaLibre reutilizando entidades existentes, evitando duplicidades, manteniendo integridad y gestionando migraciones seguras. Úsala al añadir o cambiar tablas, columnas, relaciones, enums o índices en PostgreSQL, o al planear un cambio de esquema en los servicios auth/core/match con Alembic."
---

# Diseño de base de datos (database-design)

Objetivo: evolucionar el modelo de datos **sin duplicar** lo que ya existe y sin romper la integridad ni la separación por servicios. Una sola base `vialibre`, tres esquemas: `vialibre_auth`, `vialibre_core`, `vialibre_match`; cada servicio es dueño de **exactamente un** esquema.

## Cuándo usar esta skill

- Al añadir/alterar tablas, columnas, relaciones, enums o índices.
- Al necesitar persistir datos nuevos para una funcionalidad.
- Antes de escribir o regenerar una migración Alembic.
- Al dudar entre reutilizar una entidad o crear una nueva.

## Entidades existentes (reutilizar antes de crear)

- auth (`vialibre_auth`): `User` (`models/user.py`), `Role` (`models/role.py`). `User` ya incluye perfil, CV binario (`cv_data`, `deferred`) y `role_id` FK.
- core (`vialibre_core`): `Challenge` (`models/challenge.py`, con `tipo` = reto/practica/empleo), `Category` (`models/category.py`).
- match (`vialibre_match`): `Interaction` (`models/interaction.py`), `Reaction` (`models/reaction.py`), `InteractionDocument` (`models/document.py`, binario `deferred`).

## Procedimiento

1. Verifica si la entidad/campo ya existe (skills `codebase-audit` o lectura directa de `models/`). Reutiliza o extiende; no dupliques.
2. Decide el esquema propietario según el servicio que consume el dato. No crees tablas de un servicio dentro del esquema de otro.
3. Modela en SQLAlchemy 2.x declarativo, siguiendo el estilo existente:
   - `Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)`.
   - `__table_args__ = {"schema": "vialibre_<svc>"}` (usa tupla si además hay constraints).
   - `created_at`/`updated_at` con `default=datetime.utcnow` y `onupdate=datetime.utcnow`.
   - Enums locales en español cuando el dominio lo pida; define el enum **en el modelo local**, no en `vialibre_common`.
4. Para binarios grandes (documentos, CV), sigue el patrón existente: `deferred(Column(LargeBinary, ...))` en Postgres. No introduzcas almacenamiento de objetos sin justificarlo.
5. **Registra el modelo**: impórtalo en `services/<svc>/app/models/__init__.py` **y** en `services/<svc>/alembic/env.py`, o el autogenerate no lo verá.
6. Genera la migración con `make migrate-<svc> MSG=descripcion` (equivale a `alembic revision --autogenerate` + `upgrade head`). No escribas revisiones a mano: son autogeneradas y están en `.gitignore`.
7. Revisa la migración autogenerada: que solo afecte a tu esquema, que no intente recrear ni eliminar tablas de otros servicios, y que incluya FKs/índices/constraints esperados.
8. Si cambias datos sembrados, sincroniza los UUID fijos compartidos entre `seed.py`, `seed_core.py` y `seed_match.py`.

## Reglas técnicas

- `include_name` en cada `alembic/env.py` restringe el autogenerate a su esquema. No lo elimines.
- Los servicios no se ejecutan en el host: `database_url` fija host `postgres`. Ejecuta Alembic dentro del contenedor (`make migrate-<svc>`), no en local.
- Referencias entre servicios (`author_id`, `solucionador_id`, `challenge_id`) son UUID **sin FK**. No agregues FK cross-service.
- Una entidad por tabla; evita tablas espejo o campos duplicados de otro servicio. Si necesitas datos de otro servicio, resuélvelos por HTTP.
- Migraciones "seguras": evita `NOT NULL` sobre columnas con datos sin `server_default` o backfill; no elimines columnas con datos sin plan; no renombres sin estrategia.
- Mantén los seeds idempotentes.

## Criterios de validación

- La migración autogenerada toca **solo** el esquema del servicio correspondiente.
- Tras `make migrate-<svc>`, `alembic upgrade head` aplica y `alembic downgrade -1` revierte sin error (cuando aplique).
- El modelo se ve en autogenerate (import correcto en `models/__init__.py` y `alembic/env.py`).
- No hay duplicidad de entidades ni FKs cross-service.
- Los seeds siguen coincidiendo con los UUID fijos.

## Errores a evitar

- Escribir revisiones Alembic a mano o esperar revisiones versionadas en git (están gitignored).
- Autogenerar sin importar el modelo (la migración sale vacía).
- Dejar que un `migrate` borre tablas ajenas (falta o se rompió `include_name`).
- Poner enum compartido en inglés donde el servicio usa enum local en español.
- Añadir FK entre esquemas o entre servicios.
- Duplicar una entidad existente (p. ej. nueva tabla de usuarios o de documentos).

## Criterios de finalización verificables

- [ ] Entidad reutilizada o añadida sin duplicar las existentes.
- [ ] Modelo importado en `models/__init__.py` y `alembic/env.py`.
- [ ] Migración generada con `make migrate-<svc>`, revisada y limitada a su esquema.
- [ ] `upgrade head` aplicado correctamente; persistencia verificada con una lectura real.
- [ ] Seeds/ UUID fijos sin desincronizar.
