import { ApiError } from '@/lib/api';

/** Mensaje legible de un error de API o inesperado. */
export function errorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return 'Ocurrió un error inesperado.';
}

/** Comprueba el código HTTP del error (401, 403, 409, 422…). */
export function isStatus(err: unknown, status: number): boolean {
  return err instanceof ApiError && err.status === status;
}

/**
 * Lleva el foco al primer campo con error, según el orden en pantalla.
 * `order` es la lista de [campo, id del elemento].
 */
export function focusFirstError(
  errors: Record<string, string>,
  order: ReadonlyArray<readonly [string, string]>
): void {
  const first = order.find(([field]) => errors[field]);
  if (first) document.getElementById(first[1])?.focus();
}

/** Quita los errores de los campos indicados (al editarlos dejan de estar pendientes). */
export function withoutErrors(
  errors: Record<string, string>,
  fields: readonly string[]
): Record<string, string> {
  if (!fields.some((field) => field in errors)) return errors;
  const next = { ...errors };
  fields.forEach((field) => delete next[field]);
  return next;
}
