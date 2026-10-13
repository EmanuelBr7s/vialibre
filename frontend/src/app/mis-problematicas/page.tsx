'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import SkeletonBlock from '@/components/ui/SkeletonBlock';
import { useAuth } from '@/contexts/AuthContext';
import { useRoleGuard } from '@/hooks/useRoleGuard';
import api from '@/lib/api';
import { CHALLENGE_STATUS_BADGE, CHALLENGE_STATUS_LABEL } from '@/data/mock';
import { MODULES, MODULE_BY_ID } from '@/data/modules';
import type { Challenge, ChallengeTipo } from '@/types';
import { FOCUS_RING, TOUCH_TARGET } from '@/components/ui/classes';

interface Row extends Challenge {
  applicantsCount: number | null;
}

export default function MisPublicacionesPage() {
  const allowed = useRoleGuard('publicador');
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ChallengeTipo | 'todos'>('todos');

  const load = useCallback(async (authorId: string) => {
    setLoading(true);
    setError(null);
    try {
      const { challenges } = await api.getChallenges({ author_id: authorId, limit: 100 });
      // ponytail: una petición de postulados por publicación; endpoint de conteo agregado si crece.
      const counts = await Promise.all(
        challenges.map((c) =>
          api
            .getChallengeApplicants(c.id)
            .then((r) => r.total)
            .catch(() => null)
        )
      );
      setRows(challenges.map((c, i) => ({ ...c, applicantsCount: counts[i] })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar tus publicaciones');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (allowed && user) load(user.id);
  }, [allowed, user, load]);

  if (!allowed) {
    return (
      <div role="status" className="flex min-h-screen items-center justify-center text-gray-500">
        Cargando…
      </div>
    );
  }

  const visible = filter === 'todos' ? rows : rows.filter((r) => r.tipo === filter);
  const organizacion = user?.empresa_nombre || user?.full_name;

  return (
    <div className="flex min-h-screen">
      <Sidebar challenges={rows} />

      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 p-4 sm:p-6 lg:p-8 max-w-4xl focus:outline-none"
      >
        <header className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Mis Publicaciones</h1>
          <p className="text-sm text-gray-500 mt-1">
            Retos, prácticas y ofertas laborales publicadas por {organizacion}. Gestiona los
            postulados de cada una desde el detalle.
          </p>
        </header>

        <div className="flex flex-wrap gap-2 mb-5" role="group" aria-label="Filtrar por módulo">
          {[{ id: 'todos' as const, label: 'Todas' }, ...MODULES].map((m) => (
            <button
              key={m.id}
              type="button"
              aria-pressed={filter === m.id}
              onClick={() => setFilter(m.id)}
              className={`px-3 rounded-full border text-sm font-medium ${TOUCH_TARGET} ${FOCUS_RING} ${
                filter === m.id
                  ? 'border-primary-600 bg-primary-50 text-primary-700'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {error && (
          <div role="alert" className="mb-6 text-sm text-red-600 bg-red-50 rounded-lg p-4 border border-red-200">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-4" role="status" aria-label="Cargando publicaciones">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-36 w-full" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-300 p-8 text-center">
            <p className="text-sm text-gray-600">Aún no tienes publicaciones en este módulo.</p>
            <Link
              href="/feed"
              className={`mt-4 inline-flex items-center justify-center px-5 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 ${TOUCH_TARGET} ${FOCUS_RING}`}
            >
              Ir a publicar
            </Link>
          </div>
        ) : (
          <ul className="space-y-4">
            {visible.map((challenge) => {
              const mod = MODULE_BY_ID[challenge.tipo];
              const count = challenge.applicantsCount;
              return (
                <li key={challenge.id}>
                  <article className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex flex-col sm:flex-row gap-4">
                    {challenge.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={challenge.image_url}
                        alt=""
                        className="w-full sm:w-36 h-28 object-cover rounded-lg bg-gray-100 shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${mod.badgeClass}`}>
                          {mod.singular}
                        </span>
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                            CHALLENGE_STATUS_BADGE[challenge.status]
                          }`}
                        >
                          {CHALLENGE_STATUS_LABEL[challenge.status]}
                        </span>
                        {count !== null && (
                          <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-primary-50 text-primary-700">
                            {count} {count === 1 ? 'postulado' : 'postulados'}
                          </span>
                        )}
                      </div>
                      <h2 className="text-lg font-semibold text-gray-900">{challenge.title}</h2>
                      <p className="text-sm text-gray-600 mt-1">{challenge.short_description}</p>
                      <Link
                        href={`/feed/${challenge.id}`}
                        className={`mt-4 inline-flex items-center justify-center px-5 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition ${TOUCH_TARGET} ${FOCUS_RING}`}
                      >
                        Gestionar postulados →
                      </Link>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
