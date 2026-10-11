'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import { useRoleGuard } from '@/hooks/useRoleGuard';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import {
  ORG_CHALLENGES,
  CHALLENGE_STATUS_BADGE,
  CHALLENGE_STATUS_LABEL,
  type OrgChallenge,
} from '@/data/mock';
import { FOCUS_RING, btnPrimary } from '@/components/ui/classes';
import SkeletonBlock from '@/components/ui/SkeletonBlock';

export default function MisProblematicasPage() {
  const allowed = useRoleGuard('publicador');
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<OrgChallenge[]>(ORG_CHALLENGES);

  const load = useCallback(async () => {
    if (!allowed || !user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { challenges } = await api.getChallenges({ skip: 0, limit: 100 });
      const mine = challenges.filter((c) => String(c.author_id) === String(user.id));
      const enriched = await Promise.all(
        mine.map(async (c): Promise<OrgChallenge> => {
          let applicantsCount = 0;
          try {
            const { total } = await api.getChallengeApplicants(c.id);
            applicantsCount = total;
          } catch {
            // sin postulaciones registradas
          }
          return {
            id: c.id,
            title: c.title,
            status: c.status,
            applicantsCount,
            shortDescription: c.short_description,
          };
        })
      );
      setRows(enriched);
    } catch {
      // Sin backend disponible: se muestran problemáticas demostrativas.
      setRows(ORG_CHALLENGES);
    } finally {
      setLoading(false);
    }
  }, [allowed, user]);

  useEffect(() => {
    load();
  }, [load]);

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
        className="flex-1 p-4 sm:p-6 lg:p-8 max-w-4xl focus:outline-none pb-safe-bottom"
      >
        <header className="mb-6">
          <h1 className="text-fluid-2xl font-bold text-gray-900">Mis Problemáticas</h1>
          <p className="text-fluid-sm text-gray-500 mt-1">
            Problemáticas publicadas por tu organización. Gestiona los postulantes de cada una
            desde el detalle.
          </p>
        </header>

        {loading ? (
          <div className="space-y-4" role="status" aria-label="Cargando problemáticas">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-28 w-full" />
            ))}
          </div>
        ) : (
          <ul className="space-y-4">
            {rows.length === 0 ? (
              <li className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 text-gray-500 shadow-sm">
                Aún no tienes problemáticas publicadas.
              </li>
            ) : (
              rows.map((challenge) => (
                <li key={challenge.id}>
                  <article className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-fluid-xs font-medium shrink-0 ${CHALLENGE_STATUS_BADGE[challenge.status]}`}
                          >
                            {CHALLENGE_STATUS_LABEL[challenge.status]}
                          </span>
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-fluid-xs font-medium bg-primary-50 text-primary-700 shrink-0">
                            {challenge.applicantsCount}{' '}
                            {challenge.applicantsCount === 1 ? 'postulado' : 'postulados'}
                          </span>
                        </div>
                        <h2 className="text-fluid-base font-semibold text-gray-900 truncate">
                          {challenge.title}
                        </h2>
                        <p className="text-fluid-sm text-gray-600 mt-1">
                          {challenge.shortDescription}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <Link
                        href={`/feed/${challenge.id}`}
                        className={`${btnPrimary} w-full sm:w-auto ${FOCUS_RING}`}
                      >
                        Gestionar Postulantes →
                      </Link>
                    </div>
                  </article>
                </li>
              ))
            )}
          </ul>
        )}
      </main>
    </div>
  );
}