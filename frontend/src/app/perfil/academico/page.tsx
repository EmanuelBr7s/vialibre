'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import ProfileEditor from '@/components/ProfileEditor';
import ResumeUploader from '@/components/ResumeUploader';
import { useRoleGuard } from '@/hooks/useRoleGuard';
import { TALENT_ROLES } from '@/lib/constants';
import { FOCUS_RING } from '@/components/ui/classes';
import { UserRole } from '@/types';

export default function PerfilAcademicoPage() {
  const allowed = useRoleGuard(TALENT_ROLES);
  const { user, updateUser } = useAuth();
  const [savingAvailable, setSavingAvailable] = useState(false);
  const available = user?.disponible ?? true;
  const isGraduate = user?.role === UserRole.EGRESADO;

  const toggleAvailable = async () => {
    setSavingAvailable(true);
    try {
      await updateUser({ disponible: !available });
    } finally {
      setSavingAvailable(false);
    }
  };

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
        className="flex-1 p-4 sm:p-6 lg:p-8 max-w-3xl focus:outline-none"
      >
        <header className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {isGraduate ? 'Perfil Profesional' : 'Perfil Académico'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Así te ven las empresas en el banco de hojas de vida: datos, habilidades, enlaces y tu CV.
          </p>
        </header>

        <div className="space-y-5">
          <ProfileEditor role={UserRole.SOLUCIONADOR} />

          <ResumeUploader />

          {/* Interruptor de disponibilidad */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-900">
                {isGraduate ? 'Buscando empleo' : 'Disponible para prácticas y retos'}
              </p>
              <p className="text-xs text-gray-500">
                {available
                  ? 'Las empresas pueden encontrarte en el banco de hojas de vida.'
                  : 'Oculto temporalmente del banco de hojas de vida.'}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={available}
              aria-label={isGraduate ? 'Buscando empleo' : 'Disponible para prácticas y retos'}
              aria-busy={savingAvailable}
              disabled={savingAvailable}
              onClick={toggleAvailable}
              className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${FOCUS_RING} ${
                available ? 'bg-secondary-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                  available ? 'translate-x-6' : 'translate-x-1'
                }`}
                aria-hidden="true"
              />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}