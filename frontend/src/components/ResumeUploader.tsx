'use client';

import { useRef, useState, type ChangeEvent, type DragEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import ConfirmDialog from '@/components/ConfirmDialog';
import { FOCUS_RING, TOUCH_TARGET, TOUCH_TARGET_LG, btnPrimary, btnSecondary, btnDanger } from '@/components/ui/classes';
import { formatDate, formatFileSize } from '@/lib/profileStorage';

const RESUME_ACCEPT = 'application/pdf';
const RESUME_MAX_BYTES = 5 * 1024 * 1024;

export default function ResumeUploader() {
  const { loading, resumeInfo, resumeUrl, uploadResume, removeResume } = useProfile();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const [dragActive, setDragActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useFocusTrap(previewRef, previewOpen, () => setPreviewOpen(false));

  const handleFile = async (file: File | undefined | null) => {
    if (!file) return;
    setError(null);
    setSuccess(null);

    if (file.type !== RESUME_ACCEPT && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Solo se permiten archivos PDF.');
      return;
    }
    if (file.size > RESUME_MAX_BYTES) {
      setError('El archivo supera el límite de 5 MB.');
      return;
    }

    setBusy(true);
    try {
      await uploadResume(file);
      setSuccess(`El CV «${file.name}» se guardó como activo.`);
    } catch {
      setError('No se pudo subir el archivo. Inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    handleFile(file);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  };

  const handleDelete = async () => {
    setConfirmOpen(false);
    setError(null);
    setSuccess(null);
    setBusy(true);
    try {
      await removeResume(false);
      setSuccess('Hoja de vida eliminada.');
    } catch {
      setError('No se pudo eliminar el archivo. Inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <section
        aria-label="Hoja de vida"
        role="status"
        className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6"
      >
        <div className="animate-pulse space-y-3">
          <div className="h-5 w-40 bg-gray-200 rounded" aria-hidden="true" />
          <div className="h-24 w-full bg-gray-200 rounded" aria-hidden="true" />
        </div>
      </section>
    );
  }

  return (
    <section id="hoja-de-vida" aria-labelledby="resume-title" className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6">
      <h3 id="resume-title" className="text-fluid-base font-semibold text-gray-900 mb-1">
        Hoja de Vida (CV)
      </h3>
      <p className="text-fluid-xs text-gray-500">Formato PDF · máx. 5 MB</p>

      <div aria-live="polite" className="mt-4 space-y-2">
        {success && (
          <div role="status" className="text-fluid-sm text-green-700 bg-green-50 rounded-lg p-3 border border-green-200">
            {success}
          </div>
        )}
        {error && (
          <div role="alert" className="text-fluid-sm text-red-600 bg-red-50 rounded-lg p-3 border border-red-200">
            {error}
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        id="resume-file"
        type="file"
        accept={RESUME_ACCEPT}
        onChange={handleInputChange}
        className="sr-only"
      />

      {resumeInfo ? (
        <div className="mt-4">
          {/* Tarjeta de estado del CV */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="min-w-0">
                <p className="text-fluid-sm font-medium text-gray-900 truncate" title={resumeInfo.fileName}>
                  {resumeInfo.fileName}
                </p>
                <dl className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-1 text-fluid-xs text-gray-500">
                  <div className="flex gap-1">
                    <dt className="sr-only">Última actualización</dt>
                    <dd>Actualizado: {formatDate(resumeInfo.updatedAt)}</dd>
                  </div>
                  <div className="flex gap-1">
                    <dt className="sr-only">Tamaño</dt>
                    <dd>{formatFileSize(resumeInfo.size)}</dd>
                  </div>
                </dl>
              </div>
              <span className="inline-flex items-center gap-1.5 shrink-0 px-3 py-1 rounded-full text-fluid-xs font-medium bg-green-100 text-green-700">
                <span className="w-2 h-2 rounded-full bg-green-500" aria-hidden="true" />
                CV Activo
              </span>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => setPreviewOpen(true)}
                disabled={!resumeUrl || busy}
                className={`${btnSecondary} w-full sm:w-auto`}
              >
                Previsualizar / Ver PDF
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={busy}
                className={`${btnPrimary} w-full sm:w-auto`}
              >
                {busy && (
                  <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" aria-hidden="true" />
                )}
                {busy ? 'Subiendo…' : 'Actualizar CV'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                disabled={busy}
                className={`${btnDanger} w-full sm:w-auto`}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Zona de carga Drag & Drop */
        <div
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={handleKeyDown}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          aria-label="Arrastra tu hoja de vida en PDF aquí o selecciona un archivo"
          className={`mt-4 flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 sm:p-8 text-center transition-colors ${TOUCH_TARGET_LG} ${FOCUS_RING} ${
            dragActive
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-300 bg-gray-50 hover:border-primary-400'
          }`}
        >
          <span
            className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center"
            aria-hidden="true"
          >
            <svg
              className="w-6 h-6 text-primary-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </span>
          <p className="text-fluid-sm font-medium text-gray-700">
            {dragActive ? 'Suelta el archivo aquí' : 'Arrastra tu CV en PDF aquí'}
          </p>
          <p className="text-fluid-xs text-gray-500">o presiona la zona para seleccionarlo</p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`${btnPrimary} w-full sm:w-auto`}
          >
            Seleccionar archivo
          </button>
          <p className="text-fluid-xs text-gray-400">Solo PDF · máx. 5 MB</p>
        </div>
      )}

      {/* Modal de previsualización - Bottom Sheet en móvil */}
      {previewOpen && resumeUrl && (
        <div
          className="fixed inset-0 z-50 flex lg:items-center lg:justify-center bg-black/50 p-4"
          role="presentation"
        >
          <div
            ref={previewRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="resume-preview-title"
            className="w-full max-w-3xl bg-white rounded-t-2xl lg:rounded-xl shadow-xl flex flex-col max-h-[90vh] lg:max-h-[85vh] animate-slide-up"
          >
            <div className="bottom-sheet-handle" aria-hidden="true" />
            <header className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <h3 id="resume-preview-title" className="text-fluid-base font-bold text-gray-900 truncate">
                {resumeInfo?.fileName}
              </h3>
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                aria-label="Cerrar previsualización"
                className={`inline-flex items-center justify-center w-10 h-10 text-gray-400 hover:text-gray-600 text-2xl leading-none rounded-lg hover:bg-gray-100 ${TOUCH_TARGET_LG} ${FOCUS_RING}`}
              >
                <span aria-hidden="true">×</span>
              </button>
            </header>
            <div className="flex-1 overflow-hidden">
              <iframe
                src={resumeUrl}
                title={`Previsualización de ${resumeInfo?.fileName ?? 'la hoja de vida'}`}
                className="w-full h-full border-0"
              />
            </div>
            <footer className="p-4 border-t border-gray-200 bg-white">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full">
                <p className="text-fluid-sm text-gray-500 truncate">{resumeInfo?.fileName}</p>
                <a
                  href={resumeUrl}
                  download={resumeInfo?.fileName}
                  className={`${btnPrimary} w-full sm:w-auto`}
                >
                  Descargar PDF
                </a>
              </div>
            </footer>
          </div>
        </div>
      )}

      {/* Confirmación de eliminación */}
      <ConfirmDialog
        open={confirmOpen}
        title="¿Eliminar hoja de vida?"
        description="Esta acción eliminará tu CV en PDF. No podrás recuperarlo."
        confirmLabel="Eliminar CV"
        cancelLabel="Cancelar"
        busy={busy}
        destructive
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </section>
  );
}