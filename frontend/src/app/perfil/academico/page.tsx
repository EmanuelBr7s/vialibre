'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import ProfileEditor from '@/components/ProfileEditor';
import ResumeUploader from '@/components/ResumeUploader';
import { useRoleGuard } from '@/hooks/useRoleGuard';
import { FOCUS_RING } from '@/components/ui/classes';

export default function PerfilAcademicoPage() {
  const allowed = useRoleGuard('solucionador');
  const [available, setAvailable] = useState(true);

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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Perfil Académico</h1>
          <p className="text-sm text-gray-500 mt-1">
            Edita tus datos personales, información académica y gestiona tu hoja de vida (CV).
          </p>
        </header>

        <div className="space-y-5">
          <ProfileEditor role="solucionador" />

          <ResumeUploader />

          {/* Interruptor de disponibilidad */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-900">Disponible para postulaciones</p>
              <p className="text-xs text-gray-500">
                {available
                  ? 'Recibes nuevas propuestas de problemáticas.'
                  : 'Oculto temporalmente de nuevas propuestas.'}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={available}
              aria-label="Disponible para postulaciones"
              onClick={() => setAvailable((prev) => !prev)}
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