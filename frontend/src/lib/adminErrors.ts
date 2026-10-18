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
