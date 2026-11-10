import { UserRole } from '@/types';

export const AUTH_COOKIE_NAME = 'vialibre_token';

/** Roles que se postulan a ofertas y tienen perfil profesional (estudiante y egresado). */
export const TALENT_ROLES: UserRole[] = [UserRole.SOLUCIONADOR, UserRole.EGRESADO];

export const isTalentRole = (role?: UserRole | null): boolean =>
  !!role && TALENT_ROLES.includes(role);
