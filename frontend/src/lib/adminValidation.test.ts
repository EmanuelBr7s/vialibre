import { describe, expect, it } from 'vitest';
import {
  isUuid,
  isValidEmail,
  validateDateRange,
  validateEmpresa,
  periodMismatchWarning,
  validateAcademicYear,
  validateHours,
  validateNonNegativeInt,
  validatePractica,
  validateTutor,
  type EmpresaDraft,
  type PracticaDraft,
  type TutorDraft,
} from '@/lib/adminValidation';

const TUTOR: TutorDraft = {
  identificacion: '123',
  nombres: 'Ana',
  apellidos: 'Pérez',
  email: 'ana@uni.edu.co',
  telefono: '3000000000',
  programa_academico: 'Ingeniería',
  user_id: '',
  activo: true,
};

const EMPRESA: EmpresaDraft = {
  nit: '900123456',
  razon_social: 'ACME',
  sector: 'Servicios',
  representante_legal: 'Luis',
  contacto_email: 'contacto@acme.co',
  contacto_telefono: '6010000000',
  publicador_user_id: '',
  activa: true,
};

const PRACTICA: PracticaDraft = {
  estado_administrativo: 'en_proceso',
  modalidad: 'presencial',
  tipo_practica: 'empresarial',
  duracion_horas: '320',
  fecha_inicio: '2026-01-01',
  fecha_fin: '2026-06-30',
  anio_academico: '2026',
  periodo_academico: '1',
  observaciones_institucionales: '',
};

describe('helpers base', () => {
  it('detecta UUID válidos e inválidos', () => {
    expect(isUuid('6d7f1a2b-3c4d-4e5f-8a9b-0c1d2e3f4a5b')).toBe(true);
    expect(isUuid('no-es-uuid')).toBe(false);
  });

  it('valida formato de correo', () => {
    expect(isValidEmail('a@b.co')).toBe(true);
    expect(isValidEmail('a@b')).toBe(false);
  });

  it('rechaza duraciones no enteras o negativas', () => {
    expect(validateNonNegativeInt('320')).toBeNull();
    expect(validateNonNegativeInt('')).toBeNull();
    expect(validateNonNegativeInt('12.5')).not.toBeNull();
    expect(validateNonNegativeInt('abc')).not.toBeNull();
  });

  it('rechaza rangos de fecha invertidos', () => {
    expect(validateDateRange('2026-01-01', '2026-06-30')).toBeNull();
    expect(validateDateRange('2026-06-30', '2026-01-01')).not.toBeNull();
  });
});

describe('validateTutor', () => {
  it('acepta un borrador válido', () => {
    expect(validateTutor(TUTOR)).toEqual({});
  });

  it('marca correo con formato inválido', () => {
    expect(validateTutor({ ...TUTOR, email: 'correo-malo' }).email).toBeTruthy();
  });

  it('marca user_id que no es UUID', () => {
    expect(validateTutor({ ...TUTOR, user_id: 'x' }).user_id).toBeTruthy();
  });

  it('limita longitudes de Pydantic', () => {
    expect(validateTutor({ ...TUTOR, identificacion: 'x'.repeat(21) }).identificacion).toBeTruthy();
  });
});

describe('validateEmpresa', () => {
  it('no valida el formato del correo de contacto (el backend lo guarda como texto)', () => {
    expect(validateEmpresa({ ...EMPRESA, contacto_email: 'texto-libre' })).toEqual({});
  });

  it('sí limita la longitud del correo de contacto a 255', () => {
    expect(
      validateEmpresa({ ...EMPRESA, contacto_email: 'x'.repeat(256) }).contacto_email
    ).toBeTruthy();
  });
});

describe('validatePractica', () => {
  it('acepta un borrador válido', () => {
    expect(validatePractica(PRACTICA)).toEqual({});
  });

  it('marca fecha_fin anterior a fecha_inicio', () => {
    expect(
      validatePractica({ ...PRACTICA, fecha_inicio: '2026-06-30', fecha_fin: '2026-01-01' })
        .fecha_fin
    ).toBeTruthy();
  });

  it('marca duración con formato inválido', () => {
    expect(validatePractica({ ...PRACTICA, duracion_horas: 'doce' }).duracion_horas).toBeTruthy();
  });
});

describe('validatePractica · catálogos, año y periodo', () => {
  it('exige año de cuatro dígitos en rango', () => {
    expect(validatePractica({ ...PRACTICA, anio_academico: '26' }).anio_academico).toBeTruthy();
    expect(validatePractica({ ...PRACTICA, anio_academico: '1999' }).anio_academico).toBeTruthy();
    expect(validatePractica({ ...PRACTICA, anio_academico: '2026-2' }).anio_academico).toBeTruthy();
    expect(validateAcademicYear('2026', new Date('2026-11-11'))).toBeNull();
    expect(validateAcademicYear('2028', new Date('2026-11-11'))).toBeTruthy();
  });

  it('año y periodo van juntos', () => {
    expect(
      validatePractica({ ...PRACTICA, anio_academico: '2026', periodo_academico: '' }).periodo_academico
    ).toBe('Indica también el periodo.');
    expect(
      validatePractica({ ...PRACTICA, anio_academico: '', periodo_academico: '2' }).anio_academico
    ).toBe('Indica también el año.');
    expect(validatePractica({ ...PRACTICA, anio_academico: '', periodo_academico: '' })).toEqual({});
  });

  it('rechaza valores fuera de catálogo y periodos distintos de 1 o 2', () => {
    const errors = validatePractica({
      ...PRACTICA,
      estado_administrativo: 'inventado',
      modalidad: 'a distancia',
      tipo_practica: 'otra',
      periodo_academico: '3',
    });
    expect(Object.keys(errors).sort()).toEqual([
      'estado_administrativo',
      'modalidad',
      'periodo_academico',
      'tipo_practica',
    ]);
  });

  it('no vuelve a validar un valor antiguo que no se ha cambiado', () => {
    const legacy = { ...PRACTICA, estado_administrativo: 'en_curso' };
    expect(validatePractica(legacy, new Set(['estado_administrativo']))).toEqual({});
  });

  it('limita la duración a 1–2000 horas', () => {
    expect(validateHours('0')).toBeTruthy();
    expect(validateHours('2001')).toBeTruthy();
    expect(validateHours('480')).toBeNull();
  });

  it('avisa, sin bloquear, si la fecha de inicio no cae en el año académico', () => {
    expect(periodMismatchWarning({ ...PRACTICA, fecha_inicio: '2025-08-01' })).toMatch(/2026/);
    expect(periodMismatchWarning(PRACTICA)).toBeNull();
  });
});
