'use client';

import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import { useRoleGuard } from '@/hooks/useRoleGuard';
import {
  ORG_CHALLENGES,
  CHALLENGE_STATUS_BADGE,
  CHALLENGE_STATUS_LABEL,
} from '@/data/mock';
import { FOCUS_RING, TOUCH_TARGET } from '@/components/ui/classes';

export default function MisProblematicasPage() {
  const allowed = useRoleGuard('publicador');

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
        className="flex-1 p-4 sm:p-6 lg:p-8 max-w-4xl focus:outline-none"
      >
        <header className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Mis Problemáticas</h1>
          <p className="text-sm text-gray-500 mt-1">
            Problemáticas publicadas por tu organización (Artesanías Llamas). Gestiona los
            postulantes de cada una desde el detalle.
          </p>
        </header>

        <ul className="space-y-4">
          {ORG_CHALLENGES.map((challenge) => (
            <li key={challenge.id}>
              <article className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                          CHALLENGE_STATUS_BADGE[challenge.status]
                        }`}
                      >
                        {CHALLENGE_STATUS_LABEL[challenge.status]}
                      </span>
                      <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-primary-50 text-primary-700">
                        {challenge.applicantsCount}{' '}
                        {challenge.applicantsCount === 1 ? 'postulado' : 'postulados'}
                      </span>
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {challenge.title}
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">{challenge.shortDescription}</p>
                  </div>
                </div>

                <div className="mt-4">
                  <Link
                    href={`/feed/${challenge.id}`}
                    className={`inline-flex items-center justify-center px-5 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition ${TOUCH_TARGET} ${FOCUS_RING}`}
                  >
                    Gestionar Postulantes →
                  </Link>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
