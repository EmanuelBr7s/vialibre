'use client';

import { useEffect, useRef, useState } from 'react';
import { useTour } from '@/contexts/TourContext';
import { TOUR_MENU_BODY_CLASS, TOUR_MENU_EVENT } from '@/data/tour';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { FOCUS_RING, TOUCH_TARGET, TOUCH_TARGET_LG } from '@/components/ui/classes';

const TOOLTIP_WIDTH_DESKTOP = 330;

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface TooltipPosition {
  top: number;
  left: number;
  placement: 'top' | 'bottom' | 'bottom-sheet';
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export default function FeatureTour() {
  const { active, step, index, total, next, back, skip } = useTour();
  const [rect, setRect] = useState<Rect | null>(null);
  const [tooltip, setTooltip] = useState<TooltipPosition | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // Localiza el objetivo resaltado del paso actual.
  useEffect(() => {
    if (!active || !step) {
      setRect(null);
      return;
    }

    let cancelled = false;
    const timers: number[] = [];

    const read = () => {
      if (cancelled) return;
      const el = document.querySelector<HTMLElement>(step.selector);
      if (!el) {
        setRect(null);
        return;
      }
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };

    if (step.requiresMenu) {
      document.body.classList.add(TOUR_MENU_BODY_CLASS);
      window.dispatchEvent(new CustomEvent(TOUR_MENU_EVENT, { detail: { open: true } }));
      timers.push(window.setTimeout(() => timers.push(window.setTimeout(read, 120)), 140));
    } else {
      const el = document.querySelector<HTMLElement>(step.selector);
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      timers.push(window.setTimeout(read, 60));
    }

    const onScroll = () => read();
    const onResize = () => read();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);

    return () => {
      cancelled = true;
      timers.forEach((t) => window.clearTimeout(t));
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
      document.body.classList.remove(TOUR_MENU_BODY_CLASS);
      window.dispatchEvent(new CustomEvent(TOUR_MENU_EVENT, { detail: { open: false } }));
    };
  }, [active, step]);

  // Calcula la posición del tooltip (con respaldo si el objetivo no existe).
  useEffect(() => {
    const place = () => {
      const panel = panelRef.current;
      const h = panel?.offsetHeight ?? 220;
      const tooltipWidth = isMobile ? window.innerWidth - 24 : TOOLTIP_WIDTH_DESKTOP;
      const left = clamp((window.innerWidth - tooltipWidth) / 2, 12, window.innerWidth - tooltipWidth - 12);

      // Sin objetivo medible: centramos el panel para no perder la navegación del recorrido.
      if (!rect) {
        setTooltip({ top: 40, left, placement: isMobile ? 'bottom-sheet' : 'bottom' });
        return;
      }

      const spaceBelow = window.innerHeight - (rect.top + rect.height);
      const spaceAbove = rect.top;

      // En móvil, usar bottom-sheet
      let placement: 'top' | 'bottom' | 'bottom-sheet';
      if (isMobile) {
        placement = 'bottom-sheet';
      } else {
        placement = spaceBelow - 24 >= h ? 'bottom' : spaceAbove - 24 >= h ? 'top' : spaceBelow > spaceAbove ? 'bottom' : 'top';
      }

      const top = placement === 'bottom' ? rect.top + rect.height + 12 : Math.max(12, rect.top - h - 12);
      setTooltip({ top, left, placement });
    };
    place();
    const t = window.setTimeout(place, 60);
    return () => window.clearTimeout(t);
  }, [rect, isMobile]);

  // Cerrar o saltar el recorrido con Escape.
  useFocusTrap(panelRef, active, skip);

  const stopPropagation = (event: React.SyntheticEvent) => event.stopPropagation();

  if (!active || !step || !tooltip) return null;

  const tooltipWidth = isMobile ? `calc(100vw - 24px)` : `${TOOLTIP_WIDTH_DESKTOP}px`;
  const tooltipMaxWidth = isMobile ? 'calc(100vw - 24px)' : `${TOOLTIP_WIDTH_DESKTOP}px`;

  // En móvil: bottom sheet
  if (isMobile && tooltip.placement === 'bottom-sheet') {
    return (
      <>
        <p className="sr-only" aria-live="polite">
          Paso {index + 1} de {total}: {step.title}
        </p>

        <div
          className="fixed inset-0 z-[60]"
          role="presentation"
          onPointerDown={stopPropagation}
          onTouchEnd={stopPropagation}
        >
          {/* Spotlight sobre el elemento */}
          {rect && (
            <>
              <div
                className="absolute"
                style={{
                  top: rect.top,
                  left: rect.left,
                  width: rect.width,
                  height: rect.height,
                  borderRadius: 12,
                  boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
                  transition: 'top .25s, left .25s, width .25s, height .25s',
                  pointerEvents: 'none',
                }}
              />
              <div
                className="absolute border-2 border-white rounded-xl"
                style={{
                  top: rect.top - 3,
                  left: rect.left - 3,
                  width: rect.width + 6,
                  height: rect.height + 6,
                  transition: 'top .25s, left .25s, width .25s, height .25s',
                  pointerEvents: 'none',
                }}
              />
            </>
          )}

          {/* Bottom Sheet Tooltip */}
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="tour-title"
            aria-describedby="tour-desc"
            className="fixed inset-x-0 bottom-0 z-[80] bg-white rounded-t-2xl shadow-2xl border-t border-gray-200 max-h-[85vh] animate-slide-up"
            style={{ maxWidth: 'none' }}
          >
            <div className="bottom-sheet-handle" aria-hidden="true" />
            <header className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <p className="text-fluid-xs font-semibold text-primary-700">
                Paso {index + 1} de {total}
              </p>
              <button
                type="button"
                onClick={skip}
                className={`px-2 py-1 text-fluid-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg ${TOUCH_TARGET} ${FOCUS_RING}`}
              >
                Saltar
              </button>
            </header>
            <div className="p-4 pb-safe-bottom">
              <h2 id="tour-title" className="text-fluid-base font-bold text-gray-900">
                {step.title}
              </h2>
              <p id="tour-desc" className="mt-1 text-fluid-sm text-gray-600">
                {step.description}
              </p>
            </div>
            <footer className="sticky bottom-0 bg-white border-t border-gray-200 p-4 pt-3 flex flex-col sm:flex-row items-center gap-2 sm:justify-between">
              <button
                type="button"
                onClick={back}
                disabled={index === 0}
                className={`w-full sm:w-auto px-4 py-2.5 text-fluid-sm rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed ${TOUCH_TARGET_LG} ${FOCUS_RING}`}
              >
                Atrás
              </button>
              <button
                type="button"
                onClick={next}
                className={`w-full sm:w-auto ml-auto px-4 py-2.5 text-fluid-sm rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 ${TOUCH_TARGET_LG} ${FOCUS_RING}`}
              >
                {index === total - 1 ? 'Finalizar recorrido' : 'Siguiente'}
              </button>
            </footer>
          </div>
        </div>
      </>
    );
  }

  // Desktop: tooltip flotante
  return (
    <>
      <p className="sr-only" aria-live="polite">
        Paso {index + 1} de {total}: {step.title}
      </p>

      <div
        className="fixed inset-0 z-[60]"
        role="presentation"
        onPointerDown={stopPropagation}
        onTouchEnd={stopPropagation}
      >
        {/* Spotlight */}
        {rect && (
          <>
            <div
              className="absolute"
              style={{
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height,
                borderRadius: 12,
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
                transition: 'top .25s, left .25s, width .25s, height .25s',
                pointerEvents: 'none',
              }}
            />
            <div
              className="absolute border-2 border-white rounded-xl"
              style={{
                top: rect.top - 3,
                left: rect.left - 3,
                width: rect.width + 6,
                height: rect.height + 6,
                transition: 'top .25s, left .25s, width .25s, height .25s',
                pointerEvents: 'none',
              }}
            />
          </>
        )}

        {/* Tooltip */}
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="tour-title"
          aria-describedby="tour-desc"
          className="fixed z-[80] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
          style={{
            top: tooltip.top,
            left: tooltip.left,
            width: tooltipWidth,
            maxWidth: tooltipMaxWidth,
          }}
        >
          {tooltip && (
            <span
              aria-hidden="true"
              className={`absolute w-3 h-3 bg-white rotate-45 ${
                tooltip.placement === 'bottom' ? '-top-1.5 border-t border-l' : '-bottom-1.5 border-b border-r'
              }`}
              style={{ left: 'calc(50% - 6px)' }}
            />
          )}
          <header className="flex items-center justify-between gap-3 p-4 pb-1">
            <p className="text-fluid-xs font-semibold text-primary-700">
              Paso {index + 1} de {total}
            </p>
            <button
              type="button"
              onClick={skip}
              className={`px-2 py-1 text-fluid-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg ${TOUCH_TARGET} ${FOCUS_RING}`}
            >
              Saltar
            </button>
          </header>
          <div className="px-4">
            <h2 id="tour-title" className="text-fluid-base font-bold text-gray-900">
              {step.title}
            </h2>
            <p id="tour-desc" className="mt-1 text-fluid-sm text-gray-600">
              {step.description}
            </p>
          </div>
          <footer className="flex items-center gap-2 p-4 pt-3">
            <button
              type="button"
              onClick={back}
              disabled={index === 0}
              className={`px-4 py-2 text-fluid-sm rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed ${TOUCH_TARGET} ${FOCUS_RING}`}
            >
              Atrás
            </button>
            <button
              type="button"
              onClick={next}
              className={`ml-auto px-4 py-2 text-fluid-sm rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 ${TOUCH_TARGET} ${FOCUS_RING}`}
            >
              {index === total - 1 ? 'Finalizar recorrido' : 'Siguiente'}
            </button>
          </footer>
        </div>
      </div>
    </>
  );
}