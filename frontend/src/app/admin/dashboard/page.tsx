'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { useRoleGuard } from '@/hooks/useRoleGuard';
import { ADMIN_KPIS, ADMIN_USERS, ROLE_LABEL, type AdminUserRow } from '@/data/mock';
import { FOCUS_RING, TOUCH_TARGET } from '@/components/ui/classes';
import { UserRole } from '@/types';

const ACCENT: Record<string, string> = {
  primary: 'bg-primary-100 text-primary-700',
  secondary: 'bg-secondary-100 text-secondary-700',
  amber: 'bg-amber-100 text-amber-700',
  sky: 'bg-sky-100 text-sky-700',
};

const ROLE_BADGE: Record<string, string> = {
  [UserRole.ADMIN]: 'bg-secondary-100 text-secondary-700',
  [UserRole.PUBLICADOR]: 'bg-primary-100 text-primary-700',
  [UserRole.SOLUCIONADOR]: 'bg-gray-100 text-gray-700',
  [UserRole.EGRESADO]: 'bg-amber-100 text-amber-700',
};

export default function AdminDashboardPage() {
  const allowed = useRoleGuard(UserRole.ADMIN);
  const [users, setUsers] = useState<AdminUserRow[]>(ADMIN_USERS);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!allowed) {
    return (
      <div role="status" className="flex min-h-screen items-center justify-center text-gray-500">
        Cargando…
      </div>
    );
  }

  const toggleUser = (id: string) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, is_active: !u.is_active } : u))
    );
    const user = users.find((u) => u.id === id);
    if (user) {
      const next = !user.is_active;
      setFeedback(
        next
          ? `Cuenta de ${user.full_name} activada.`
          : `Cuenta de ${user.full_name} desactivada.`
      );
      window.setTimeout(() => setFeedback(null), 2500);
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar challenges={[]} />

      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 p-4 sm:p-6 lg:p-8 focus:outline-none"
      >
        <header className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Panel de Administración</h1>
          <p className="text-sm text-gray-500 mt-1">
            Métricas clave y moderación de usuarios registrados.
          </p>
        </header>

        {/* KPIs */}
        <section aria-label="Métricas clave" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {ADMIN_KPIS.map((kpi) => (
            <div key={kpi.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg mb-3 ${ACCENT[kpi.accent]}`}>
                <span className="text-sm font-bold" aria-hidden="true">
                  {kpi.label.trim().charAt(0)}
                </span>
              </div>
              <p className="text-xs text-gray-500">{kpi.label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{kpi.value}</p>
              <p className="text-xs text-green-600 mt-1">{kpi.delta}</p>
            </div>
          ))}
        </section>

        {/* Tabla de usuarios */}
        <section aria-label="Usuarios registrados" className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Usuarios Registrados</h2>
            <span className="text-sm text-gray-500">{users.length} usuarios</span>
          </div>

          <div aria-live="polite">
            {feedback && (
              <div role="status" className="mx-6 mt-4 text-sm text-green-700 bg-green-50 rounded-lg p-3 border border-green-200">
                {feedback}
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-gray-500 border-b border-gray-100">
                  <th scope="col" className="px-6 py-3">Usuario</th>
                  <th scope="col" className="px-6 py-3">Rol</th>
                  <th scope="col" className="px-6 py-3">Registro</th>
                  <th scope="col" className="px-6 py-3">Estado</th>
                  <th scope="col" className="px-6 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-6 py-3">
                      <p className="font-medium text-gray-900">{user.full_name}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </td>
                    <td className="px-6 py-3">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${ROLE_BADGE[user.role]}`}>
                        {ROLE_LABEL[user.role]}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-gray-600">{user.created_at}</td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                          user.is_active ? 'text-green-700' : 'text-red-600'
                        }`}
                      >
                        <span
                          className={`inline-block w-2 h-2 rounded-full ${user.is_active ? 'bg-green-500' : 'bg-red-500'}`}
                          aria-hidden="true"
                        />
                        {user.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => toggleUser(user.id)}
                        className={`inline-flex items-center justify-center px-4 rounded-lg text-xs font-medium border transition ${TOUCH_TARGET} ${FOCUS_RING} ${
                          user.is_active
                            ? 'border-red-300 text-red-600 hover:bg-red-50'
                            : 'border-green-300 text-green-600 hover:bg-green-50'
                        }`}
                      >
                        {user.is_active ? 'Desactivar' : 'Activar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
