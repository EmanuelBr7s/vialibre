'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import api from '@/lib/api';
import type { ContactInfo, Interaction, User } from '@/types';
import { FOCUS_RING, TOUCH_TARGET, TOUCH_TARGET_LG, btnPrimary, btnSecondary, btnDanger } from '@/components/ui/classes';
import SkeletonBlock from '@/components/ui/SkeletonBlock';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useBottomSheet } from '@/hooks/useBottomSheet';
import { getResumeBlobUrl, getResumeMeta } from '@/lib/profileStorage';

interface ApplicantsSectionProps {
  challengeId: string;
  currentUserId: string;
}

interface ApplicantWithUser extends Interaction {
  user?: User;
}

const STATUS_LABEL: Record<string, string> = {
  pendiente: 'Pendiente',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
};

const STATUS_BADGE: Record<string, string> = {
  pendiente: 'bg-yellow-100 text-yellow-700',
  aprobado: 'bg-green-100 text-green-700',
  rechazado: 'bg-red-100 text-red-700',
};

const StatusDot = ({ active }: { active: boolean }) => (
  <span className={`inline-block w-2 h-2 rounded-full ${active ? 'bg-green-500' : 'bg-red-500'}`} aria-hidden="true" />
);

export default function ApplicantsSection({
  challengeId,
  currentUserId,
}: ApplicantsSectionProps) {
  const [applicants, setApplicants] = useState<ApplicantWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [contactInfo, setContactInfo] = useState<ContactInfo | null>(null);
  const [contactError, setContactError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Estado de previsualización del CV del postulado
  const previewRef = useRef<HTMLDivElement>(null);
  const [cvOpen, setCvOpen] = useState<{ url: string; fileName: string } | null>(null);
  const [cvLoadingId, setCvLoadingId] = useState<string | null>(null);
  const [cvNotice, setCvNotice] = useState<string | null>(null);

  const cvSheet = useBottomSheet(false);

  const loadApplicants = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { interactions } = await api.getChallengeApplicants(challengeId);

      // Resolve user info for each applicant (for display purposes)
      const withUsers = await Promise.all(
        interactions.map(async (interaction) => {
          try {
            const user = await api.getUserById(interaction.solucionador_id);
            return { ...interaction, user };
          } catch {
            return interaction as ApplicantWithUser;
          }
        })
      );
      setApplicants(withUsers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los postulados');
    } finally {
      setLoading(false);
    }
  }, [challengeId]);

  useEffect(() => {
    loadApplicants();
  }, [loadApplicants]);

  const handleApproveReject = async (
    interactionId: string,
    status: 'aprobado' | 'rechazado'
  ) => {
    setBusyId(interactionId);
    setActionError(null);
    setActionSuccess(null);
    try {
      await api.approveInteraction(interactionId, status);
      setActionSuccess(
        status === 'aprobado'
          ? 'Postulación aprobada. El contacto quedó desbloqueado.'
          : 'Postulación rechazada.'
      );
      await loadApplicants();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Error al actualizar');
    } finally {
      setBusyId(null);
    }
  };

  const handleViewContact = async (interactionId: string) => {
    if (selected === interactionId) {
      setSelected(null);
      setContactInfo(null);
      setContactError(null);
      return;
    }
    setSelected(interactionId);
    setContactInfo(null);
    setContactError(null);
    try {
      const info = await api.getInteractionContactInfo(interactionId);
      setContactInfo(info);
    } catch (err) {
      setContactError(err instanceof Error ? err.message : 'Contacto no disponible');
    }
  };

  /**
   * Abre la previsualización del CV del solucionador. El visto bueno no es
   * requisito: el publicador puede evaluar el perfil desde la postulación.
   */
  const openApplicantCv = async (solucionadorId: string) => {
    setCvLoadingId(solucionadorId);
    setCvNotice(null);
    try {
      const [url, meta] = await Promise.all([
        getResumeBlobUrl(solucionadorId),
        Promise.resolve(getResumeMeta(solucionadorId)),
      ]);
      if (url && meta) {
        setCvOpen({ url, fileName: meta.fileName });
        cvSheet.openSheet();
      } else {
        setCvNotice('Este postulado aún no ha adjuntado una hoja de vida.');
      }
    } catch {
      setCvNotice('No se pudo cargar la hoja de vida de este postulado.');
    } finally {
      setCvLoadingId(null);
    }
  };

  if (loading) {
    return (
      <div
        className="bg-gray-50 rounded-xl border border-gray-200 p-4 sm:p-6 mt-8"
        role="status"
        aria-label="Cargando postulados"
      >
        <SkeletonBlock className="h-5 w-40 mb-4" />
        <div className="space-y-4">
          <SkeletonBlock className="h-28 w-full" />
          <SkeletonBlock className="h-28 w-full" />
        </div>
      </div>
    );
  }

  if (!loading && applicants.length === 0) {
    return (
      <section aria-label="Postulados" className="bg-gray-50 rounded-xl border border-gray-200 p-4 sm:p-6 mt-8">
        <h3 className="text-fluid-lg font-semibold text-gray-900 mb-2">Postulados</h3>
        <p className="text-fluid-sm text-gray-600">
          Aún no hay postulaciones para esta problemática.
        </p>
      </section>
    );
  }

  return (
    <section aria-label="Postulados" className="bg-gray-50 rounded-xl border border-gray-200 p-4 sm:p-6 mt-8">
      <h3 className="text-fluid-lg font-semibold text-gray-900 mb-4">
        Postulados ({applicants.length})
      </h3>
      <p className="text-fluid-sm text-gray-600 mb-4">
        Evalúa las postulaciones y selecciona al candidato definitivo. Al aprobar, se
        desbloquea el contacto entre ambas partes.
      </p>

      <div aria-live="polite" className="space-y-3 mb-4">
        {actionError && (
          <div role="alert" className="text-fluid-sm text-red-600 bg-red-50 rounded-lg p-3 border border-red-200">
            {actionError}
          </div>
        )}
        {actionSuccess && (
          <div role="status" className="text-fluid-sm text-green-700 bg-green-50 rounded-lg p-3 border border-green-200">
            {actionSuccess}
          </div>
        )}
        {cvNotice && (
          <div role="status" className="text-fluid-sm text-primary-700 bg-primary-50 rounded-lg p-3 border border-primary-200">
            {cvNotice}
          </div>
        )}
      </div>

      <ul className="space-y-4">
        {applicants.map((applicant) => {
          const panelId = `contact-panel-${applicant.id}`;
          const isOpen = selected === applicant.id;
          const isBusy = busyId === applicant.id;
          return (
            <li key={applicant.id}>
              <article className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                  <div className="min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">
                      {applicant.user?.full_name || 'Solucionador'}
                    </h4>
                    <p className="text-fluid-xs text-gray-500">
                      {applicant.user?.programa_academico || 'Programa académico no disponible'}
                    </p>
                    <p className="text-fluid-xs text-gray-400 mt-1 truncate">{applicant.user?.email}</p>
                  </div>
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-fluid-xs font-medium shrink-0 ${STATUS_BADGE[applicant.status] || 'bg-gray-100 text-gray-700'}`}
                  >
                    {STATUS_LABEL[applicant.status] || applicant.status}
                  </span>
                </div>

                {applicant.message && (
                  <p className="text-fluid-sm text-gray-600 mt-3 italic">“{applicant.message}”</p>
                )}

                {applicant.status === 'pendiente' && (
                  <div className="flex flex-col sm:flex-row gap-3 mt-4">
                    <button
                      onClick={() => handleApproveReject(applicant.id, 'aprobado')}
                      disabled={isBusy}
                      aria-busy={isBusy}
                      className={`${btnPrimary} w-full sm:w-auto`}
                    >
                      {isBusy ? 'Actualizando…' : 'Aprobar y desbloquear contacto'}
                    </button>
                    <button
                      onClick={() => handleApproveReject(applicant.id, 'rechazado')}
                      disabled={isBusy}
                      className={`${btnDanger} w-full sm:w-auto`}
                    >
                      {isBusy ? 'Actualizando…' : 'Rechazar'}
                    </button>
                  </div>
                )}

                {applicant.contact_unlocked && (
                  <button
                    onClick={() => handleViewContact(applicant.id)}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    className={`mt-3 inline-flex items-center text-fluid-sm font-medium text-primary-600 hover:text-primary-700 rounded-lg px-2 -mx-2 ${TOUCH_TARGET} ${FOCUS_RING}`}
                  >
                    {isOpen ? 'Ocultar contacto' : 'Ver contacto'} →
                  </button>
                )}

                {applicant.status !== 'rechazado' && (
                  <button
                    onClick={() => openApplicantCv(applicant.solucionador_id)}
                    disabled={cvLoadingId === applicant.solucionador_id}
                    aria-busy={cvLoadingId === applicant.solucionador_id}
                    className={`mt-3 inline-flex items-center gap-2 text-fluid-sm font-medium text-primary-600 hover:text-primary-700 rounded-lg px-2 -mx-2 ${TOUCH_TARGET} ${FOCUS_RING}`}
                  >
                    {cvLoadingId === applicant.solucionador_id ? (
                      <>
                        <span
                          className="animate-spin h-3.5 w-3.5 border-2 border-primary-600 border-t-transparent rounded-full"
                          aria-hidden="true"
                        />
                        Cargando CV…
                      </>
                    ) : (
                      'Ver hoja de vida (CV)'
                    )}
                  </button>
                )}

                {isOpen && (
                  <div
                    id={panelId}
                    className="mt-3 bg-primary-50 rounded-lg border border-primary-200 p-3 space-y-2"
                  >
                    {contactError && <p className="text-fluid-sm text-red-600">{contactError}</p>}
                    {contactInfo && (
                      <dl className="space-y-1">
                        <div>
                          <dt className="sr-only">Nombre</dt>
                          <dd className="text-fluid-sm font-medium text-primary-700">
                            {contactInfo.full_name}
                          </dd>
                        </div>
                        <div>
                          <dt className="sr-only">Email</dt>
                          <dd className="text-fluid-sm text-gray-700">{contactInfo.email}</dd>
                        </div>
                        {contactInfo.phone && (
                          <div>
                            <dt className="sr-only">Teléfono</dt>
                            <dd className="text-fluid-sm text-gray-700">{contactInfo.phone}</dd>
                          </div>
                        )}
                      </dl>
                    )}
                  </div>
                )}
              </article>
            </li>
          );
        })}
      </ul>

      {/* Bottom Sheet de previsualización del CV del postulado */}
      {cvOpen && cvSheet.open && (
        <div
          className="fixed inset-0 z-50 flex lg:items-center lg:justify-center bg-black/50 p-4"
          role="presentation"
        >
          <div
            ref={cvSheet.sheetRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="applicant-cv-preview-title"
            className="w-full max-w-3xl bg-white rounded-t-2xl lg:rounded-xl shadow-xl flex flex-col max-h-[90vh] lg:max-h-[85vh] animate-slide-up"
            style={{ transform: `translateY(${cvSheet.dragOffset}px)` }}
            onTouchStart={cvSheet.onTouchStart}
            onTouchMove={cvSheet.onTouchMove}
            onTouchEnd={cvSheet.onTouchEnd}
          >
            <div className="bottom-sheet-handle" aria-hidden="true" />
            <header className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <h3 id="applicant-cv-preview-title" className="text-fluid-base font-bold text-gray-900 truncate">
                Hoja de vida del postulado
              </h3>
              <button
                type="button"
                onClick={cvSheet.closeSheet}
                aria-label="Cerrar hoja de vida"
                className={`inline-flex items-center justify-center w-10 h-10 text-gray-400 hover:text-gray-600 text-2xl leading-none rounded-lg hover:bg-gray-100 ${TOUCH_TARGET_LG} ${FOCUS_RING}`}
              >
                <span aria-hidden="true">×</span>
              </button>
            </header>
            <div className="flex-1 overflow-hidden">
              <iframe
                src={cvOpen.url}
                title={`Previsualización de ${cvOpen.fileName}`}
                className="w-full h-full border-0"
              />
            </div>
            <footer className="p-4 border-t border-gray-200 bg-white">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full">
                <p className="text-fluid-sm text-gray-500 truncate">{cvOpen.fileName}</p>
                <a
                  href={cvOpen.url}
                  download={cvOpen.fileName}
                  className={`${btnPrimary} w-full sm:w-auto`}
                >
                  Descargar PDF
                </a>
              </div>
            </footer>
          </div>
        </div>
      )}
    </section>
  );
}