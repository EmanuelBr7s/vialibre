'use client';

import Sidebar from '@/components/Sidebar';
import ProfileEditor from '@/components/ProfileEditor';
import { useRoleGuard } from '@/hooks/useRoleGuard';
import { UserRole } from '@/types';

export default function PerfilOrganizacionPage() {
  const allowed = useRoleGuard(UserRole.PUBLICADOR);

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
        className="flex-1 p-4 sm:p-6 lg:p-8 max-w-3xl focus:outline-none pb-safe-bottom"
      >
        <header className="mb-6">
          <h1 className="text-fluid-2xl font-bold text-gray-900">Perfil de Organización</h1>
          <p className="text-fluid-sm text-gray-500 mt-1">
            Edita los datos de tu organización, tu cargo y los canales de comunicación preferidos.
          </p>
        </header>

        <ProfileEditor role={UserRole.PUBLICADOR} />
      </main>
    </div>
  );
}