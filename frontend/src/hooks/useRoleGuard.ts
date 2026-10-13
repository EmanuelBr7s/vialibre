'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/types';

/**
 * Guard de rol para páginas privadas del menú de usuario.
 *
 * - No autenticado  → redirige a /login.
 * - Rol distinto   → redirige a /feed.
 * - Cargando       → devuelve false (la página muestra un estado de carga).
 *
 * @returns true cuando el usuario autenticado tiene el rol esperado.
 */
export function useRoleGuard(requiredRole: UserRole | UserRole[]): boolean {
  const { isAuthenticated, loading, user } = useAuth();
  const router = useRouter();
  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  const hasRole = !!user && roles.includes(user.role);

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    if (!hasRole) {
      router.replace('/feed');
    }
  }, [loading, isAuthenticated, hasRole, router]);

  // El guard solo permite renderizar cuando ya se resolvió y el rol coincide.
  return !loading && isAuthenticated && hasRole;
}
