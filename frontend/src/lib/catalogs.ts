// Catálogos del expediente de prácticas. Los valores son los que valida el
// backend (match-service, schemas/practica.py); las etiquetas son las que se
// muestran al usuario.

import { InteractionStatus } from '@/types';

export interface CatalogOption {
  value: string;
  label: string;
}

export const ESTADOS_PRACTICA: CatalogOption[] = [
  { value: 'en_revision', label: 'En revisión' },
  { value: 'en_proceso', label: 'En proceso' },
  { value: 'culminada', label: 'Culminada' },
  { value: 'suspendida', label: 'Suspendida' },
  { value: 'cancelada', label: 'Cancelada' },
];

export const MODALIDADES_PRACTICA: CatalogOption[] = [
  { value: 'presencial', label: 'Presencial' },
  { value: 'remoto', label: 'Remoto' },
  { value: 'hibrido', label: 'Híbrido' },
];

export const TIPOS_PRACTICA: CatalogOption[] = [
  { value: 'empresarial', label: 'Empresarial' },
  { value: 'social', label: 'Social' },
  { value: 'investigacion', label: 'Investigación' },
];

export const PERIODOS_ACADEMICOS: CatalogOption[] = [
  { value: '1', label: 'Primer semestre (1)' },
  { value: '2', label: 'Segundo semestre (2)' },
];

export const INTERACTION_STATUS_LABEL: Record<InteractionStatus, string> = {
  [InteractionStatus.PENDIENTE]: 'Pendiente',
  [InteractionStatus.APROBADO]: 'Aprobado',
  [InteractionStatus.RECHAZADO]: 'Rechazado',
};

/** ¿El valor pertenece al catálogo? (los registros antiguos pueden no estarlo). */
export function inCatalog(options: CatalogOption[], value: string | null | undefined): boolean {
  return !!value && options.some((option) => option.value === value);
}

/** Etiqueta del catálogo; un valor antiguo fuera de catálogo se muestra tal cual. */
export function catalogLabel(options: CatalogOption[], value: string | null | undefined): string {
  if (!value) return '—';
  return options.find((option) => option.value === value)?.label ?? value;
}

/** Año y periodo como una sola etiqueta: "2026-2". */
export function periodoLabel(anio: string | null | undefined, periodo: string | null | undefined): string {
  if (anio && periodo) return `${anio}-${periodo}`;
  return anio || periodo || '—';
}
