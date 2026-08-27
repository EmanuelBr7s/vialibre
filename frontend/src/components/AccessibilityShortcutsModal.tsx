'use client';

import { useRef } from 'react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { KEYBOARD_SHORTCUTS } from '@/data/accessibility';
import { FOCUS_RING, TOUCH_TARGET } from '@/components/ui/classes';

export default function AccessibilityShortcutsModal() {
  const { shortcutsOpen, setShortcutsOpen } = useAccessibility();
  const dialogRef = useRef<HTMLDivElement>(null);

  useFocusTrap(dialogRef, shortcutsOpen, () => setShortcutsOpen(false));

  if (!shortcutsOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
        aria-describedby="shortcuts-desc"
        className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 id="shortcuts-title" className="text-lg font-bold text-gray-900">
            Atajos de teclado
          </h2>
          <button
            type="button"
            onClick={() => setShortcutsOpen(false)}
            aria-label="Cerrar"
            className={`inline-flex items-center justify-center w-10 h-10 text-gray-400 hover:text-gray-600 text-2xl leading-none rounded-lg hover:bg-gray-100 ${FOCUS_RING}`}
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <p id="shortcuts-desc" className="sr-only">
          Lista de accesos directos de navegación por teclado en VíaLibre.
        </p>

        <ul className="p-6 space-y-2" role="list">
          {KEYBOARD_SHORTCUTS.map((shortcut) => (
            <li
              key={shortcut.keys.join('+')}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 py-2 border-b border-gray-100 last:border-0"
            >
              <span className="text-sm text-gray-700">{shortcut.action}</span>
              <span className="flex items-center gap-1 flex-wrap">
                {shortcut.keys.map((key) => (
                  <kbd
                    key={key}
                    className="px-2 py-1 text-xs font-medium text-gray-800 bg-gray-100 border border-gray-300 rounded"
                  >
                    {key}
                  </kbd>
                ))}
                <span className="ml-2 text-[10px] text-gray-400 uppercase tracking-wider">
                  {shortcut.scope}
                </span>
              </span>
            </li>
          ))}
        </ul>

        <div className="flex justify-end px-6 pb-6">
          <button
            type="button"
            onClick={() => setShortcutsOpen(false)}
            className={`px-5 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 ${TOUCH_TARGET} ${FOCUS_RING} inline-flex items-center`}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
