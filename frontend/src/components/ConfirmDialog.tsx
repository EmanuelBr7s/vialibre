'use client';

import { useRef } from 'react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { FOCUS_RING, TOUCH_TARGET } from '@/components/ui/classes';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Modal de confirmación accesible (role="alertdialog"). Atrapa el foco,
 * cierra con Escape y restaura el foco al elemento previo.
 */
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  busy = false,
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmId = 'confirm-dialog-title';

  useFocusTrap(dialogRef, open, onCancel);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={confirmId}
        aria-describedby="confirm-dialog-desc"
        className="bg-white rounded-xl shadow-xl w-full max-w-md"
      >
        <div className="p-6 pb-2">
          <h2 id={confirmId} className="text-lg font-bold text-gray-900">
            {title}
          </h2>
          <p id="confirm-dialog-desc" className="mt-2 text-sm text-gray-600">
            {description}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 p-6">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className={`flex-1 px-4 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-60 ${TOUCH_TARGET} ${FOCUS_RING}`}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            aria-busy={busy}
            className={`flex-1 px-4 rounded-lg font-medium text-white disabled:opacity-60 ${TOUCH_TARGET} ${FOCUS_RING} ${
              destructive
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-primary-600 hover:bg-primary-700'
            }`}
          >
            {busy ? 'Procesando…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}