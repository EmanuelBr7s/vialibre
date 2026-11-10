'use client';

import { useEffect } from 'react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useBottomSheet } from '@/hooks/useBottomSheet';
import { FOCUS_RING, TOUCH_TARGET_LG, btnPrimary } from '@/components/ui/classes';

interface CvPreviewModalProps {
  /** URL blob del PDF (api.getUserCvBlobUrl). */
  url: string;
  fileName: string;
  title: string;
  onClose: () => void;
}

/**
 * Visor de una hoja de vida en PDF con opción de descarga.
 * En móvil se presenta como bottom sheet (se cierra arrastrando hacia abajo);
 * en escritorio, como modal centrado.
 */
export default function CvPreviewModal({ url, fileName, title, onClose }: CvPreviewModalProps) {
  const sheet = useBottomSheet(true);
  useFocusTrap(sheet.sheetRef, sheet.open, sheet.closeSheet);

  // El hook gestiona el cierre (Escape, arrastre, botón); se notifica al padre.
  useEffect(() => {
    if (!sheet.open) onClose();
  }, [sheet.open, onClose]);

  if (!sheet.open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end lg:items-center lg:justify-center bg-black/50 lg:p-4"
      role="presentation"
    >
      <div
        ref={sheet.sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cv-preview-title"
        className="w-full max-w-3xl bg-white rounded-t-2xl lg:rounded-xl shadow-xl flex flex-col max-h-[90vh] lg:max-h-[85vh] animate-slide-up"
        style={{ transform: `translateY(${sheet.dragOffset}px)` }}
        onTouchStart={sheet.onTouchStart}
        onTouchMove={sheet.onTouchMove}
        onTouchEnd={sheet.onTouchEnd}
      >
        <div className="bottom-sheet-handle lg:hidden" aria-hidden="true" />
        <header className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <h3 id="cv-preview-title" className="text-fluid-base font-bold text-gray-900 truncate">
            {title}
          </h3>
          <button
            type="button"
            onClick={sheet.closeSheet}
            aria-label="Cerrar hoja de vida"
            className={`inline-flex items-center justify-center w-10 h-10 text-gray-400 hover:text-gray-600 text-2xl leading-none rounded-lg hover:bg-gray-100 ${TOUCH_TARGET_LG} ${FOCUS_RING}`}
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>
        <div className="flex-1 overflow-hidden">
          <iframe
            src={url}
            title={`Previsualización de ${fileName}`}
            className="w-full h-full min-h-[60vh] lg:min-h-[70vh] border-0"
          />
        </div>
        <footer className="p-4 border-t border-gray-200 bg-white pb-safe-bottom">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full">
            <p className="text-fluid-sm text-gray-500 truncate">{fileName}</p>
            <a href={url} download={fileName} className={`${btnPrimary} w-full sm:w-auto`}>
              Descargar PDF
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}
