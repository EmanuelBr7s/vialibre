'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import PracticeDocuments from '@/components/PracticeDocuments';
import { useRoleGuard } from '@/hooks/useRoleGuard';
import { TALENT_ROLES } from '@/lib/constants';
import api from '@/lib/api';
import type { ChallengeTipo, ContactInfo, InteractionStatus } from '@/types';
import { APP_STATUS_BADGE, APP_STATUS_LABEL } from '@/data/mock';
import { MODULE_BY_ID } from '@/data/modules';
import { FOCUS_RING, TOUCH_TARGET } from '@/components/ui/classes';
import SkeletonBlock from '@/components/ui/SkeletonBlock';

interface Row {
  id: string;
  challengeId: string;
  title: string;
  empresa: string;
  tipo: ChallengeTipo | null;
  status: InteractionStatus;
  message?: string;
}

export default function MisPostulacionesPage() {
  const allowed = useRoleGuard(TALENT_ROLES);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [contactByRow, setContactByRow] = useState<Record<string, ContactInfo>>({});
  const [contactError, setContactError] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { interactions } = await api.getMyInteractions({ limit: 100 });
      const enriched = await Promise.all(
        interactions.map(async (interaction): Promise<Row> => {
          let title = 'Publicación';
          let empresa = 'Empresa';
          let tipo: ChallengeTipo | null = null;
          try {
            const ch = await api.getChallenge(interaction.challenge_id);
            title = ch.title;
            empresa = ch.empresa_nombre || ch.author_name || empresa;
            tipo = ch.tipo;
          } catch {
            // mantiene valores por defecto
          }
          return {
            id: interaction.id,
            challengeId: interaction.challenge_id,
            title,
            empresa,
            tipo,
            status: interaction.status,
            message: interaction.message ?? undefined,
          };
        })
      );
      setRows(enriched);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar tus postulaciones');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (allowed) load();
  }, [allowed, load]);

  const handleToggleContact = async (row: Row) => {
    if (openId === row.id) {
      setOpenId(null);
      return;
    }
    setOpenId(row.id);
    setContactError((prev) => ({ ...prev, [row.id]: '' }));
    if (contactByRow[row.id]) return;
    try {
      const info = await api.getInteractionContactInfo(row.id);
      setContactByRow((prev) => ({ ...prev, [row.id]: info }));
    } catch (err) {
      setContactError((prev) => ({
        ...prev,
        [row.id]: err instanceof Error ? err.message : 'Contacto no disponible',
      }));
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
        className="flex-1 p-4 sm:p-6 lg:p-8 max-w-4xl focus:outline-none"
      >
        <header className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Mis Postulaciones</h1>
          <p className="text-sm text-gray-500 mt-1">
            Retos, prácticas y ofertas a las que te postulaste. Cuando una empresa te selecciona
            se desbloquea su contacto; en prácticas, además, cargas tus documentos y descargas tu
            carta de aval.
          </p>
        </header>

        {error && (
          <div role="alert" className="mb-6 text-sm text-red-600 bg-red-50 rounded-lg p-4 border border-red-200">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-4" role="status" aria-label="Cargando postulaciones">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-28 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-300 p-8 text-center">
            <p className="text-sm text-gray-600">Aún no te has postulado a ninguna publicación.</p>
            <Link
              href="/feed"
              className={`mt-4 inline-flex items-center justify-center px-5 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 ${TOUCH_TARGET} ${FOCUS_RING}`}
            >
              Explorar ofertas
            </Link>
          </div>
        ) : (
          <ul className="space-y-4">
            {rows.map((row) => {
              const isOpen = openId === row.id;
              const contact = contactByRow[row.id];
              const mod = row.tipo ? MODULE_BY_ID[row.tipo] : null;
              return (
                <li key={row.id}>
                  <article className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {row.empresa}
                      </span>
                      {mod && (
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${mod.badgeClass}`}>
                          {mod.singular}
                        </span>
                      )}
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                          APP_STATUS_BADGE[row.status]
                        }`}
                      >
                        {APP_STATUS_LABEL[row.status]}
                      </span>
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      <Link
                        href={`/feed/${row.challengeId}`}
                        className={`hover:text-primary-700 ${FOCUS_RING} rounded`}
                      >
                        {row.title}
                      </Link>
                    </h2>
                    {row.message && (
                      <p className="text-sm text-gray-600 mt-1 italic">&ldquo;{row.message}&rdquo;</p>
                    )}

                    {row.status === 'aprobado' && (
                      <div className="mt-4">
                        <button
                          onClick={() => handleToggleContact(row)}
                          aria-expanded={isOpen}
                          aria-controls={`contact-panel-${row.id}`}
                          className={`inline-flex items-center text-sm font-medium text-secondary-700 px-3 -mx-3 rounded-lg ${TOUCH_TARGET} ${FOCUS_RING}`}
                        >
                          {isOpen ? 'Ocultar contacto' : 'Ver contacto de la empresa'} →
                        </button>

                        {isOpen && (
                          <div
                            id={`contact-panel-${row.id}`}
                            className="mt-3 bg-secondary-50 rounded-lg border border-secondary-200 p-4 space-y-2"
                          >
                            {contactError[row.id] && (
                              <p className="text-sm text-red-600">{contactError[row.id]}</p>
                            )}
                            {contact && (
                              <dl className="space-y-1 text-sm">
                                <div>
                                  <dt className="sr-only">Nombre</dt>
                                  <dd className="font-medium text-gray-900">
                                    {contact.empresa_nombre || contact.full_name}
                                  </dd>
                                </div>
                                <div>
                                  <dt className="sr-only">Email</dt>
                                  <dd className="text-gray-700">{contact.email}</dd>
                                </div>
                                {contact.phone && (
                                  <div>
                                    <dt className="sr-only">Teléfono</dt>
                                    <dd className="text-gray-700">{contact.phone}</dd>
                                  </div>
                                )}
                              </dl>
                            )}
                          </div>
                        )}

                        {row.tipo === 'practica' && <PracticeDocuments interactionId={row.id} editable />}
                      </div>
                    )}
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
