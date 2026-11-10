---
name: document-automation
description: "Integración de plantillas DOCX institucionales en VíaLibre conservando el formato, generando documentos editables y aportando autoguardado, versionado y almacenamiento seguro. Úsala al generar documentos con formato institucional a partir de plantillas, al reemplazar o complementar la generación de PDF, o al añadir edición, guardado y control de versiones de documentos."
---

# Automatización de documentos (document-automation)

Objetivo: generar documentos institucionales a partir de **plantillas DOCX**, conservando el formato de la plantilla y entregando salida **editable**, con autoguardado, versionado y almacenamiento seguro. Esta plataforma hoy genera PDF mínimo; amplíala sin romper lo existente.

## Cuándo usar esta skill

- Al generar cartas, certificados, actas u oficios institucionales con formato controlado.
- Al necesitar documentos **editables** (DOCX) en vez de PDF de solo lectura.
- Al añadir autoguardado, versionado o almacenamiento seguro de documentos generados.
- Al integrar plantillas institucionales (`.docx`) facilitadas por la universidad.

## Estado actual que debes conocer

- Generador de PDF mínimo: `shared/python/vialibre_common/pdf.py` (`Pdf`, `A4_WIDTH`, `A4_HEIGHT`). Se usa en seeds (`services/auth-service/app/seed.py`) y en la carta de aval (`services/match-service/app/api/v1/endpoints/documents.py` → `build_endorsement_letter`).
- Almacenamiento de documentos: binario en PostgreSQL, columna `deferred`. Ejemplos: `InteractionDocument` (`match-service/app/models/document.py`) y `User.cv_data` (`auth-service/app/models/user.py`).
- Descargas/downloads: patrón `Response(content=..., media_type=..., headers={"Content-Disposition": f"inline/attachment; filename*=UTF-8''{quote(nombre)}"})`.
- Carga de archivos: multipart con validación por firma de bytes y límite (5 MB) en `documents.py` y `users.py`.
- Frontend: `frontend/src/components/PracticeDocuments.tsx`, `CvPreviewModal.tsx`, y métodos de archivos en `frontend/src/lib/api.ts` (`uploadFile`, `fetchBlobUrl`).
- **No existe** soporte DOCX hoy. No asumas ninguna librería: inspecciona `requirements*.txt` y `frontend/package.json` antes de proponer una.

## Procedimiento

1. Inspecciona qué hay hoy (skill `codebase-audit`). Decide si la plantilla institucional se puede representar con la librería de PDF actual o si hace falta DOCX.
2. Si hace falta DOCX: justifica la elección de librería, comprueba que no exista ya, y añádela en el `requirements*.txt` del servicio correcto. **Recuerda:** las dependencias van horneadas en la imagen → hay que `make build` tras cambiarlas.
3. Coloca las plantillas institucionales en un directorio versionado del repo o como binario en la base; no incrustes rutas absolutas del sistema.
4. Implementa el relleno de plantilla respetando estilos (tablas, encabezados, fuentes) — que la salida sea **editable**, no una imagen ni un PDF "horneado".
5. Modela el documento generado reutilizando el patrón existente (binario `deferred` en Postgres) y, si el usuario pide historial, una tabla de versiones con `documento_id`, `version`, `created_at`, `author_id` (UUID desnudo, sin FK cross-service).
6. Nombra y sirve archivos con `Content-Disposition` y `quote()` como ya se hace, con el tipo MIME correcto (`application/vnd.openxmlformats-officedocument.wordprocessingml.document`).
7. Autoguardado: define cuándo guarda (por cambios, por intervalo, al salir), evita escrituras concurrentes y muestra estado (guardando/guardado/error) con `aria-live`.
8. Almacenamiento seguro: valida tipo de archivo por firma de bytes, aplica límite de tamaño, controla acceso con autorización (skill `auth-rbac-security`) y no expongas binarios sin comprobar permisos.
9. Frontend: reutiliza `api.ts` (subida multipart y descarga blob) y componentes existentes; mantén el estilo del proyecto.

## Reglas técnicas

- Conservar el formato de la plantilla es requisito, no opcional: verifica el DOCX resultante abriéndolo/parseándolo.
- Documentos editables: la salida no debe aplanarse a PDF salvo que se pida explícitamente; si se ofrecen ambos, genera DOCX editable **y** una exportación PDF.
- No guardes documentos en el sistema de archivos local del contenedor (se pierde al recrear); usa la base o un almacenamiento justificado.
- Sigue el patrón `deferred` para binarios y su descarga autorizada.
- Versionado: nunca sobrescribas la versión anterior si se pidió historial; inserta una nueva versión.
- Límite y validación de subidas como en el código existente (firma de bytes + tamaño máximo).
- Cambios de dependencias → `make build`; el código compartido está montado en `/shared` (reinicia el servicio para tomarlo).

## Criterios de validación

- El documento generado conserva la estructura de la plantilla (encabezados, tablas, estilos) y **abre como DOCX editable**.
- Los datos (nombres, fechas, códigos) se inyectan correctamente desde las entidades reales.
- El autoguardado guarda y recupera cambios sin perderlos; se observan los estados.
- Existe versionado consultable si se solicitó.
- La descarga respeta autorización y no filtra binarios.
- Tras cambiar dependencias, `make build` y el servicio arrancan; validación real del archivo generado.

## Errores a evitar

- Asumir una librería documental sin comprobarla ni justificarla.
- Aplanar la salida a imagen/PDF y llamarlo "editable".
- Perder el formato institucional de la plantilla.
- Guardar documentos fuera del contenedor (pérdida de datos).
- Servir binarios sin comprobar permisos.
- Olvidar `make build` tras tocar `requirements*.txt` (código nuevo sin dependencia instalada).

## Criterios de finalización verificables

- [ ] Plantilla institucional integrada y salida DOCX editable verificada con datos reales.
- [ ] Almacenamiento siguiendo el patrón existente (binario + descarga autorizada).
- [ ] Autoguardado y versionado implementados y probados (si se solicitaron).
- [ ] Validación de tipo/tamaño y control de acceso en subida/descarga.
- [ ] `make build` ejecutado si hubo nuevas dependencias; servicio en marcha y documento generado real documentado.
