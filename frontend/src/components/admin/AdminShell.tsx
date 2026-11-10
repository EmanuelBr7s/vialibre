'use client';

import type { ReactNode } from 'react';
import Sidebar from '@/components/Sidebar';
import { useRoleGuard } from '@/hooks/useRoleGuard';
import { UserRole } from '@/types';

interface AdminShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

/**
 * Chrome de las pantallas administrativas: aplica `useRoleGuard(UserRole.ADMIN)`
 * (la autorización real sigue siendo la del backend) y reutiliza la misma
 * estructura Sidebar + <main> que el resto de la aplicación.
 */
export default function AdminShell({ title, subtitle, children }: AdminShellProps) {
  const allowed = useRoleGuard(UserRole.ADMIN);

  if (!allowed) {
    return (
      <div role="status" className="flex min-h-screen items-center justify-center text-gray-500">
        Cargando…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar challenges={[]} />

      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 p-4 sm:p-6 lg:p-8 focus:outline-none"
      >
        <header className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{title}</h1>
          <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        </header>

        {children}
      </main>
    </div>
  );
}
