'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import { useRoleGuard } from '@/hooks/useRoleGuard';
import api from '@/lib/api';
import type { ContactInfo } from '@/types';
import {
  MY_APPLICATIONS,
  APP_STATUS_BADGE,
  APP_STATUS_LABEL,
  type ApplicantStatus,
} from '@/data/mock';
import { FOCUS_RING, TOUCH_TARGET, TOUCH_TARGET_LG } from '@/components/ui/classes';
import SkeletonBlock from '@/components/ui/SkeletonBlock';

interface Row {
  id: string;
  challengeId: string;
  title: string;
  empresa: string;
  status: ApplicantStatus;
  message?: string;
  contact?: ContactInfo;
}

export default function MisPostulacionesPage() {
  const allowed = useRoleGuard('solucionador');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [contactByRow, setContactByRow] = useState<Record<string, ContactInfo>>({});
  const [contactError, setContactError] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { interactions } = await api.getMyInteractions({});
      const enriched = await Promise.all(
        interactions.map(async (interaction): Promise<Row> => {
          let title = 'Problemática';
          let empresa = 'Publicador';
          try {
            const ch = await api.getChallenge(interaction.challenge_id);
            title = ch.title;
            empresa = ch.empresa_nombre || ch.author_name || empresa;
          } catch {
            // mantiene valores por defecto
          }
          return {
            id: interaction.id,
            challengeId: interaction.challenge_id,
            title,
            empresa,
            status: interaction.status as ApplicantStatus,
            message: interaction.message ?? undefined,
          };
        })
      );
      setRows(enriched);
    } catch {
      // Sin backend disponible: se muestran filas demostrativas.
      setRows(MY_APPLICATIONS);
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
    if (row.contact) return;
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
        className="flex-1 p-4 sm:p-6 lg:p-8 max-w-4xl focus:outline-none pb-safe-bottom"
      >
        <header className="mb-6">
          <h1 className="text-fluid-2xl font-bold text-gray-900">Mis Postulaciones</h1>
          <p className="text-fluid-sm text-gray-500 mt-1">
            Problemáticas a las que te has postulado como solucionador. Cuando un publicador
            apruebe tu postulación, se desbloquea el contacto.
          </p>
        </header>

        {loading ? (
          <div className="space-y-4" role="status" aria-label="Cargando postulaciones">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-28 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 text-gray-500 shadow-sm">
            Aún no tienes postulaciones. Explora el feed y postúlate a una problemática.
          </p>
        ) : (
          <ul className="space-y-4">
            {rows.map((row) => {
              const isOpen = openId === row.id;
              const contact = row.contact || contactByRow[row.id];
              return (
                <li key={row.id}>
                  <article className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="text-fluid-xs font-medium text-gray-500 uppercase tracking-wider truncate">
                            {row.empresa}
                          </span>
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-fluid-xs font-medium shrink-0 ${APP_STATUS_BADGE[row.status]}`}
                          >
                            {APP_STATUS_LABEL[row.status]}
                          </span>
                        </div>
                        <h2 className="text-fluid-base font-semibold text-gray-900 truncate">
                          <Link
                            href={`/feed/${row.challengeId}`}
                            className={`hover:text-primary-700 ${FOCUS_RING} rounded`}
                          >
                            {row.title}
                          </Link>
                        </h2>
                        {row.message && (
                          <p className="text-fluid-sm text-gray-600 mt-1 italic">“{row.message}”</p>
                        )}
                      </div>
                    </div>

                    {row.status === 'aprobado' && (
                      <div className="mt-4">
                        <button
                          onClick={() => handleToggleContact(row)}
                          aria-expanded={isOpen}
                          aria-controls={`contact-panel-${row.id}`}
                          className={`inline-flex items-center text-fluid-sm font-medium text-secondary-700 px-2 -mx-2 rounded-lg ${TOUCH_TARGET} ${FOCUS_RING}`}
                        >
                          {isOpen ? 'Ocultar contacto' : 'Ver contacto del publicador'} →
                        </button>

                        {isOpen && (
                          <div
                            id={`contact-panel-${row.id}`}
                            className="mt-3 bg-secondary-50 rounded-lg border border-secondary-200 p-4 space-y-2"
                          >
                            {contactError[row.id] && (
                              <p className="text-fluid-sm text-red-600">{contactError[row.id]}</p>
                            )}
                            {contact && (
                              <dl className="space-y-1 text-fluid-sm">
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