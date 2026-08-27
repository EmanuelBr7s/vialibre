'use client';

import { useRef } from 'react';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { FONT_SIZES, CONTRAST_MODES } from '@/data/accessibility';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { FOCUS_RING, TOUCH_TARGET } from '@/components/ui/classes';
import AccessibilityShortcutsModal from './AccessibilityShortcutsModal';

function Switch({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
}) {
  const id = `switch-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <label htmlFor={id} className="text-sm text-gray-700 cursor-pointer">
        {label}
        {description && <span className="block text-xs text-gray-500">{description}</span>}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors ${
          checked ? 'bg-primary-600 border-primary-600' : 'bg-gray-200 border-gray-300'
        } ${FOCUS_RING}`}
      >
        <span
          aria-hidden="true"
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

export default function AccessibilityPanel() {
  const {
    panelOpen,
    setPanelOpen,
    setShortcutsOpen,
    fontSize,
    setFontSize,
    contrastMode,
    setContrastMode,
    dyslexiaFont,
    setDyslexiaFont,
    reduceMotion,
    setReduceMotion,
    readingGuide,
    setReadingGuide,
    resetAll,
  } = useAccessibility();
  const panelRef = useRef<HTMLDivElement>(null);

  useFocusTrap(panelRef, panelOpen, () => setPanelOpen(false));

  return (
    <>
      {/* ── Botón flotante global ── */}
      <button
        type="button"
        onClick={() => setPanelOpen(!panelOpen)}
        aria-haspopup="dialog"
        aria-expanded={panelOpen}
        aria-label="Abrir panel de accesibilidad"
        title="Accesibilidad (A)"
        className={`fixed bottom-6 right-6 z-50 inline-flex items-center justify-center w-14 h-14 rounded-full bg-secondary-600 text-white shadow-lg hover:bg-secondary-700 ${TOUCH_TARGET} ${FOCUS_RING}`}
      >
        <svg
          className="w-7 h-7"
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M12 2a3 3 0 100 6 3 3 0 000-6zM12 9c-2.2 0-4.4 1-6.1 2.9l2.3 2.3c1.8-1.9 4.1-2.9 3.8-2.9.3 0 2 .6 3.8 1.9l2.3-2.3A8.1 8.1 0 0012 9z" />
        </svg>
      </button>

      {/* ── Drawer lateral de accesibilidad ── */}
      {panelOpen && (
        <div className="fixed inset-0 z-[60]" role="presentation">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setPanelOpen(false)}
            aria-hidden="true"
          />
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="a11y-panel-title"
            className="absolute top-0 right-0 h-full w-[320px] max-w-[85vw] bg-white shadow-xl flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 id="a11y-panel-title" className="text-base font-bold text-gray-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-secondary-600" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 2a3 3 0 100 6 3 3 0 000-6zM12 9c-2.2 0-4.4 1-6.1 2.9l2.3 2.3c1.8-1.9 4.1-2.9 3.8-2.9.3 0 2 .6 3.8 1.9l2.3-2.3A8.1 8.1 0 0012 9z" />
                </svg>
                Accesibilidad
              </h2>
              <button
                type="button"
                onClick={() => setPanelOpen(false)}
                aria-label="Cerrar panel de accesibilidad"
                className={`inline-flex items-center justify-center w-10 h-10 text-gray-400 hover:text-gray-600 text-2xl leading-none rounded-lg hover:bg-gray-100 ${FOCUS_RING}`}
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4" aria-live="polite">
              {/* Tipografía */}
              <section className="mb-5">
                <h3 className="text-sm font-semibold text-gray-800 mb-2">Tamaño de tipografía</h3>
                <div className="grid grid-cols-4 gap-2">
                  {FONT_SIZES.map((size) => (
                    <button
                      key={size.id}
                      type="button"
                      aria-pressed={fontSize === size.id}
                      onClick={() => setFontSize(size.id)}
                      className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-2 ${TOUCH_TARGET} ${
                        fontSize === size.id
                          ? 'border-primary-600 bg-primary-50 text-primary-700'
                          : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                      } ${FOCUS_RING}`}
                    >
                      <span aria-hidden="true" className="font-bold leading-none">
                        {size.sample}
                      </span>
                      <span className="text-[10px]">{size.label}</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* Contraste y daltonismo */}
              <section className="mb-5">
                <h3 className="text-sm font-semibold text-gray-800 mb-2">
                  Contraste y daltonismo
                </h3>
                <div className="space-y-1">
                  {CONTRAST_MODES.map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      aria-pressed={contrastMode === mode.id}
                      onClick={() => setContrastMode(mode.id)}
                      className={`w-full text-left rounded-lg border px-3 py-2 ${TOUCH_TARGET} ${
                        contrastMode === mode.id
                          ? 'border-primary-600 bg-primary-50 text-primary-700'
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      } ${FOCUS_RING}`}
                    >
                      <span className="block text-sm font-medium">{mode.label}</span>
                      <span className="block text-xs text-gray-500">{mode.description}</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* Opciones de lectura */}
              <section className="mb-5 space-y-2">
                <h3 className="text-sm font-semibold text-gray-800">Lectura y movimiento</h3>
                <Switch
                  checked={dyslexiaFont}
                  onChange={setDyslexiaFont}
                  label="Fuente para dislexia"
                  description="Tipografía de alta legibilidad con mayor interlineado."
                />
                <Switch
                  checked={reduceMotion}
                  onChange={setReduceMotion}
                  label="Reducir movimiento"
                  description="Desactiva animaciones y transiciones (respetando tu preferencia del sistema)."
                />
                <Switch
                  checked={readingGuide}
                  onChange={setReadingGuide}
                  label="Guía de lectura"
                  description="Regla horizontal para seguir el texto sin perderte."
                />
              </section>

              {/* Atajos de teclado */}
              <button
                type="button"
                onClick={() => setShortcutsOpen(true)}
                className={`w-full rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 px-4 py-2.5 flex items-center justify-center gap-2 ${TOUCH_TARGET} ${FOCUS_RING}`}
              >
                Atajos de teclado
              </button>

              <div className="mt-4">
                <button
                  type="button"
                  onClick={resetAll}
                  className={`w-full rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 px-4 py-2.5 flex items-center justify-center gap-2 ${TOUCH_TARGET} ${FOCUS_RING}`}
                >
                  Restablecer preferencias
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <AccessibilityShortcutsModal />
    </>
  );
}
