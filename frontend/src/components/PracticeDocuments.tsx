'use client';

import { useCallback, useEffect, useState, type ChangeEvent } from 'react';
import api from '@/lib/api';
import type { DocumentChecklist } from '@/types';
import { FOCUS_RING, TOUCH_TARGET } from '@/components/ui/classes';

interface PracticeDocumentsProps {
  interactionId: string;
  /** true: el estudiante carga sus documentos; false: la empresa solo consulta. */
  editable: boolean;
}

const ACCEPT = 'application/pdf,image/jpeg,image/png';
const MAX_BYTES = 5 * 1024 * 1024;

function saveBlob(url: string, fileName: string) {
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Documentos requisito de una práctica aprobada y descarga de la carta de aval.
 * No se muestra si la postulación no es una práctica en la que hubo selección.
 */
export default function PracticeDocuments({ interactionId, editable }: PracticeDocumentsProps) {
  const [checklist, setChecklist] = useState<DocumentChecklist | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setChecklist(await api.getPracticeDocuments(interactionId));
    } catch {
      setChecklist(null);
    }
  }, [interactionId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!checklist?.aplica) return null;

  const uploaded = checklist.requeridos.filter((r) => r.documento).length;
  const total = checklist.requeridos.length;

  const handleUpload = async (tipo: string, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setError('El archivo supera el límite de 5 MB.');
      return;
    }
    setBusy(tipo);
    setError(null);
    try {
      await api.uploadPracticeDocument(interactionId, tipo, file);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el documento.');
    } finally {
      setBusy(null);
    }
  };

  const openDocument = async (tipo: string) => {
    try {
      window.open(await api.getPracticeDocumentBlobUrl(interactionId, tipo), '_blank', 'noopener');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo abrir el documento.');
    }
  };

  const downloadLetter = async () => {
    setBusy('carta');
    setError(null);
    try {
      saveBlob(await api.getEndorsementLetterBlobUrl(interactionId), 'Carta de aval.pdf');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo generar la carta de aval.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <section
      aria-label="Documentos de la práctica"
      className="mt-4 rounded-lg border border-primary-200 bg-primary-50/60 p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-900">
          {editable ? 'Documentos para tu práctica' : 'Documentos de práctica del estudiante'}
        </h3>
        <span
          className={`text-xs font-medium px-2.5 py-1 rounded-full ${
            checklist.completos ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
          }`}
        >
          {uploaded}/{total} cargados
        </span>
      </div>
      {editable && !checklist.completos && (
        <p className="text-xs text-gray-600 mt-1">
          Carga los documentos requisito (PDF, JPG o PNG, máx. 5 MB) para descargar tu carta de aval.
        </p>
      )}

      <ul className="mt-3 space-y-2">
        {checklist.requeridos.map((req) => (
          <li
            key={req.tipo}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg bg-white border border-gray-200 px-3 py-2"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${req.documento ? 'bg-green-500' : 'bg-gray-300'}`}
                  aria-hidden="true"
                />
                {req.label}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {req.documento ? req.documento.filename : 'Pendiente'}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              {req.documento && (
                <button
                  type="button"
                  onClick={() => openDocument(req.tipo)}
                  className={`px-3 rounded-lg text-sm font-medium text-primary-700 hover:bg-primary-50 ${TOUCH_TARGET} ${FOCUS_RING}`}
                >
                  Ver
                  <span className="sr-only"> {req.label}</span>
                </button>
              )}
              {editable && (
                <label
                  className={`inline-flex items-center px-3 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer ${TOUCH_TARGET} has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary-600`}
                >
                  {busy === req.tipo ? 'Cargando…' : req.documento ? 'Reemplazar' : 'Cargar'}
                  <span className="sr-only"> {req.label}</span>
                  <input
                    type="file"
                    accept={ACCEPT}
                    className="sr-only"
                    disabled={!!busy}
                    onChange={(e) => handleUpload(req.tipo, e)}
                  />
                </label>
              )}
            </div>
          </li>
        ))}
      </ul>

      <div aria-live="polite">
        {error && (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {error}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={downloadLetter}
        disabled={!checklist.completos || busy === 'carta'}
        aria-busy={busy === 'carta'}
        className={`mt-3 w-full inline-flex items-center justify-center px-4 rounded-lg bg-secondary-600 text-white text-sm font-medium hover:bg-secondary-700 disabled:opacity-50 disabled:cursor-not-allowed ${TOUCH_TARGET} ${FOCUS_RING}`}
      >
        {busy === 'carta'
          ? 'Generando carta…'
          : checklist.completos
            ? 'Descargar carta de aval (PDF)'
            : 'Carta de aval disponible al completar los documentos'}
      </button>
    </section>
  );
}
