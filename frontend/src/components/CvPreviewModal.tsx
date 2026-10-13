'use client';

import { useRef } from 'react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { FOCUS_RING, TOUCH_TARGET } from '@/components/ui/classes';

interface CvPreviewModalProps {
  /** URL blob del PDF (api.getUserCvBlobUrl). */
  url: string;
  fileName: string;
  title: string;
  onClose: () => void;
}

/** Visor modal de una hoja de vida en PDF con opción de descarga. */
export default function CvPreviewModal({ url, fileName, title, onClose }: CvPreviewModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, true, onClose);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="presentation">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cv-preview-title"
        className="bg-white rounded-xl shadow-xl w-full max-w-3xl flex flex-col max-h-[90vh]"
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 id="cv-preview-title" className="text-base font-bold text-gray-900 truncate">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar hoja de vida"
            className={`inline-flex items-center justify-center w-10 h-10 text-gray-400 hover:text-gray-600 text-2xl leading-none rounded-lg hover:bg-gray-100 ${FOCUS_RING}`}
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
        <iframe src={url} title={`Previsualización de ${fileName}`} className="w-full flex-1 min-h-[70vh] border-0" />
        <div className="flex items-center justify-between gap-3 p-4 border-t border-gray-200">
          <p className="text-sm text-gray-500 truncate">{fileName}</p>
          <a
            href={url}
            download={fileName}
            className={`inline-flex items-center justify-center px-4 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 ${TOUCH_TARGET} ${FOCUS_RING}`}
          >
            Descargar PDF
          </a>
        </div>
      </div>
    </div>
  );
}
