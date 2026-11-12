/**
 * Validaciones de cliente para los formularios administrativos.
 *
 * Espejo de las reglas que el backend ya aplica con Pydantic; no se añaden
 * restricciones que el backend no imponga (p. ej. `Empresa.contacto_email`
 * es un `str` simple, sin validación de formato).
 */

import {
  ESTADOS_PRACTICA,
  MODALIDADES_PRACTICA,
  PERIODOS_ACADEMICOS,
  TIPOS_PRACTICA,
  type CatalogOption,
} from '@/lib/catalogs';

export type FieldErrors = Record<string, string>;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value.trim());
}

/** Formato `EmailStr`, válido solo donde el backend valida el correo (tutores). */
export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function maxLength(value: string, max: number): string | null {
  return value.length > max ? `Máximo ${max} caracteres.` : null;
}

function optionalUuid(value: string, field: string): string | null {
  if (value.trim() === '') return null;
  return isUuid(value) ? null : `${field} debe ser un UUID válido.`;
}

/** `fecha_fin` no puede ser anterior a `fecha_inicio` (422 en el backend). */
export function validateDateRange(
  fechaInicio: string,
  fechaFin: string
): string | null {
  if (fechaInicio && fechaFin && fechaFin < fechaInicio) {
    return 'La fecha de fin no puede ser anterior a la fecha de inicio.';
  }
  return null;
}

/** `duracion_horas` debe ser un entero >= 0 (`ge=0` en el backend). */
export function validateNonNegativeInt(value: string): string | null {
  if (value.trim() === '') return null;
  if (!/^\d+$/.test(value.trim())) {
    return 'Debe ser un número entero.';
  }
  return Number(value) < 0 ? 'Debe ser mayor o igual a 0.' : null;
}

export interface TutorDraft {
  identificacion: string;
  nombres: string;
  apellidos: string;
  email: string;
  telefono: string;
  programa_academico: string;
  user_id: string;
  activo: boolean;
}

export function validateTutor(draft: TutorDraft): FieldErrors {
  const errors: FieldErrors = {};
  const checks: Array<[string, string | null]> = [
    ['identificacion', maxLength(draft.identificacion, 20)],
    ['nombres', maxLength(draft.nombres, 255)],
    ['apellidos', maxLength(draft.apellidos, 255)],
    ['telefono', maxLength(draft.telefono, 50)],
    ['programa_academico', maxLength(draft.programa_academico, 255)],
    [
      'email',
      draft.email.trim() !== '' && !isValidEmail(draft.email)
        ? 'El correo no tiene un formato válido.'
        : null,
    ],
    ['user_id', optionalUuid(draft.user_id, 'El usuario')],
  ];
  checks.forEach(([field, message]) => {
    if (message) errors[field] = message;
  });
  return errors;
}

export interface EmpresaDraft {
  nit: string;
  razon_social: string;
  sector: string;
  representante_legal: string;
  contacto_email: string;
  contacto_telefono: string;
  publicador_user_id: string;
  activa: boolean;
}

export function validateEmpresa(draft: EmpresaDraft): FieldErrors {
  const errors: FieldErrors = {};
  const checks: Array<[string, string | null]> = [
    ['nit', maxLength(draft.nit, 20)],
    ['razon_social', maxLength(draft.razon_social, 255)],
    ['sector', maxLength(draft.sector, 100)],
    ['representante_legal', maxLength(draft.representante_legal, 255)],
    // El backend guarda el correo como texto libre (max 255), sin validar formato.
    ['contacto_email', maxLength(draft.contacto_email, 255)],
    ['contacto_telefono', maxLength(draft.contacto_telefono, 50)],
    ['publicador_user_id', optionalUuid(draft.publicador_user_id, 'El publicador')],
  ];
  checks.forEach(([field, message]) => {
    if (message) errors[field] = message;
  });
  return errors;
}

export interface PracticaDraft {
  estado_administrativo: string;
  modalidad: string;
  tipo_practica: string;
  duracion_horas: string;
  fecha_inicio: string;
  fecha_fin: string;
  anio_academico: string;
  periodo_academico: string;
  observaciones_institucionales: string;
}

/** Año académico: cuatro dígitos entre 2000 y el año siguiente al actual. */
export function validateAcademicYear(value: string, now: Date = new Date()): string | null {
  const text = value.trim();
  if (text === '') return null;
  const max = now.getFullYear() + 1;
  if (!/^\d{4}$/.test(text) || Number(text) < 2000 || Number(text) > max) {
    return `Escribe un año de cuatro dígitos entre 2000 y ${max}.`;
  }
  return null;
}

/** Duración de la práctica: entero entre 1 y 2000 horas. */
export function validateHours(value: string): string | null {
  const text = value.trim();
  if (text === '') return null;
  if (!/^\d+$/.test(text)) return 'Debe ser un número entero de horas.';
  const hours = Number(text);
  return hours < 1 || hours > 2000 ? 'Debe estar entre 1 y 2000 horas.' : null;
}

function inOptions(value: string, options: CatalogOption[], label: string): string | null {
  if (value === '' || options.some((option) => option.value === value)) return null;
  return `Elige ${label} de la lista.`;
}

/**
 * Valida el expediente de una práctica.
 * `unchanged` son los campos que conservan el valor ya guardado: no se vuelven
 * a validar (un registro antiguo puede tener valores fuera de catálogo) ni se
 * reenvían al guardar.
 */
export function validatePractica(
  draft: PracticaDraft,
  unchanged: ReadonlySet<string> = new Set()
): FieldErrors {
  const errors: FieldErrors = {};
  const checks: Array<[string, string | null]> = [
    ['estado_administrativo', inOptions(draft.estado_administrativo, ESTADOS_PRACTICA, 'un estado')],
    ['modalidad', inOptions(draft.modalidad, MODALIDADES_PRACTICA, 'una modalidad')],
    ['tipo_practica', inOptions(draft.tipo_practica, TIPOS_PRACTICA, 'un tipo de práctica')],
    ['duracion_horas', validateHours(draft.duracion_horas)],
    ['fecha_fin', validateDateRange(draft.fecha_inicio, draft.fecha_fin)],
    ['anio_academico', validateAcademicYear(draft.anio_academico)],
    ['periodo_academico', inOptions(draft.periodo_academico, PERIODOS_ACADEMICOS, 'un periodo')],
    ['observaciones_institucionales', maxLength(draft.observaciones_institucionales, 2000)],
  ];
  checks.forEach(([field, message]) => {
    if (!message) return;
    // El rango de fechas depende de las dos: basta con que cambie una.
    const skip =
      field === 'fecha_fin'
        ? unchanged.has('fecha_fin') && unchanged.has('fecha_inicio')
        : unchanged.has(field);
    if (!skip) errors[field] = message;
  });

  // Año y periodo forman una sola referencia ("2026-2"): van juntos o ninguno.
  // Un registro antiguo con solo uno de los dos se puede guardar si no se tocan.
  const pairUntouched = unchanged.has('anio_academico') && unchanged.has('periodo_academico');
  const anio = draft.anio_academico.trim();
  if (pairUntouched) return errors;
  if (anio !== '' && draft.periodo_academico === '' && !errors.periodo_academico) {
    errors.periodo_academico = 'Indica también el periodo.';
  }
  if (anio === '' && draft.periodo_academico !== '' && !errors.anio_academico) {
    errors.anio_academico = 'Indica también el año.';
  }
  return errors;
}

/** Aviso (no bloquea): la fecha de inicio cae en un año distinto al académico. */
export function periodMismatchWarning(draft: PracticaDraft): string | null {
  const anio = draft.anio_academico.trim();
  if (!/^\d{4}$/.test(anio) || !draft.fecha_inicio) return null;
  return draft.fecha_inicio.slice(0, 4) === anio
    ? null
    : `La fecha de inicio no corresponde al año académico ${anio}.`;
}
