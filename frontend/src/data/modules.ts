// ── Módulos de publicación para la empresa ──
// Acordados con la universidad: retos empresariales (vía Laboratorio de
// Innovación), prácticas empresariales para estudiantes y ofertas laborales
// para egresados.

import { AfiliacionAcademica, ChallengeTipo, Modalidad, UserRole } from '@/types';

export interface ModuleMeta {
  id: ChallengeTipo;
  label: string;
  /** Nombre en singular para badges y botones. */
  singular: string;
  description: string;
  badgeClass: string;
}

export const MODULES: ModuleMeta[] = [
  {
    id: ChallengeTipo.RETO,
    label: 'Retos empresariales',
    singular: 'Reto',
    description:
      'Problemáticas de empresas que se resuelven con el Laboratorio de Innovación y sus semilleros.',
    badgeClass: 'bg-violet-100 text-violet-700',
  },
  {
    id: ChallengeTipo.PRACTICA,
    label: 'Prácticas empresariales',
    singular: 'Práctica',
    description: 'Plazas de práctica profesional para estudiantes de últimos semestres.',
    badgeClass: 'bg-primary-100 text-primary-700',
  },
  {
    id: ChallengeTipo.EMPLEO,
    label: 'Ofertas laborales',
    singular: 'Empleo',
    description: 'Vacantes para egresados de la Universidad Libre.',
    badgeClass: 'bg-amber-100 text-amber-700',
  },
];

export const MODULE_BY_ID = Object.fromEntries(MODULES.map((m) => [m.id, m])) as Record<
  ChallengeTipo,
  ModuleMeta
>;

/** Pestaña inicial del feed según quién entra. */
export function defaultModuleFor(role?: UserRole): ChallengeTipo {
  if (role === UserRole.EGRESADO) return ChallengeTipo.EMPLEO;
  if (role === UserRole.SOLUCIONADOR) return ChallengeTipo.PRACTICA;
  return ChallengeTipo.RETO;
}

/** Pestañas del banco de hojas de vida, alineadas con los tres módulos. */
export const TALENT_TABS: {
  id: ChallengeTipo;
  label: string;
  description: string;
  params: { role?: UserRole.SOLUCIONADOR | UserRole.EGRESADO; afiliacion?: string };
}[] = [
  {
    id: ChallengeTipo.RETO,
    label: 'Pupilos de innovación',
    description: 'Estudiantes vinculados al Laboratorio de Innovación, listos para resolver retos.',
    params: { afiliacion: AfiliacionAcademica.LABORATORIO_INNOVACION },
  },
  {
    id: ChallengeTipo.PRACTICA,
    label: 'Estudiantes para práctica',
    description: 'Estudiantes de la Universidad Libre disponibles para práctica empresarial.',
    params: { role: UserRole.SOLUCIONADOR },
  },
  {
    id: ChallengeTipo.EMPLEO,
    label: 'Egresados',
    description: 'Egresados en búsqueda de empleo.',
    params: { role: UserRole.EGRESADO },
  },
];

export const MODALIDAD_LABEL: Record<Modalidad, string> = {
  [Modalidad.PRESENCIAL]: 'Presencial',
  [Modalidad.REMOTO]: 'Remoto',
  [Modalidad.HIBRIDO]: 'Híbrido',
};

// Contacto del Laboratorio de Innovación para los retos empresariales.
// ponytail: dato fijo; mover a configuración administrable cuando la
// universidad confirme el canal oficial.
export const LAB_CONTACT = {
  nombre: 'David',
  cargo: 'Coordinador del Laboratorio de Innovación',
  email: 'innovacion@vialibre.edu.co',
};
