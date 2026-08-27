'use client';

import { useEffect, useRef, useState } from 'react';
import { useTour } from '@/contexts/TourContext';
import { TOUR_MENU_BODY_CLASS, TOUR_MENU_EVENT } from '@/data/tour';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { FOCUS_RING, TOUCH_TARGET } from '@/components/ui/classes';

const TOOLTIP_WIDTH = 330;

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface TooltipPosition {
  top: number;
  left: number;
  placement: 'top' | 'bottom';
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export default function FeatureTour() {
  const { active, step, index, total, next, back, skip } = useTour();
  const [rect, setRect] = useState<Rect | null>(null);
  const [tooltip, setTooltip] = useState<TooltipPosition | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

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
      // Abre el menú de usuario y espera a que exista el ítem objetivo.
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

  // Calcula la posición del tooltip (abajo si hay espacio, si no arriba).
  useEffect(() => {
    if (!rect) {
      setTooltip(null);
      return;
    }
    const place = () => {
      const panel = panelRef.current;
      const h = panel?.offsetHeight ?? 220;
      const spaceBelow = window.innerHeight - (rect.top + rect.height);
      const spaceAbove = rect.top;
      const placement: 'bottom' | 'top' =
        spaceBelow - 24 >= h ? 'bottom' : spaceAbove - 24 >= h ? 'top' : spaceBelow > spaceAbove ? 'bottom' : 'top';
      const left = clamp(
        rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2,
        12,
        window.innerWidth - TOOLTIP_WIDTH - 12
      );
      const top = placement === 'bottom' ? rect.top + rect.height + 12 : Math.max(12, rect.top - h - 12);
      setTooltip({ top, left, placement });
    };
    place();
    const t = window.setTimeout(place, 60);
    return () => window.clearTimeout(t);
  }, [rect]);

  // Cerrar o saltar el recorrido con Escape.
  useFocusTrap(panelRef, active, skip);

  const stopPropagation = (event: React.SyntheticEvent) => event.stopPropagation();

  return (
    <>
      {/* Anuncio accesible del paso actual */}
      <p className="sr-only" aria-live="polite">
        {active ? `Paso ${index + 1} de ${total}: ${step?.title}` : ''}
      </p>

      {active && (
        <div
          className="fixed inset-0 z-[60]"
          role="presentation"
          onPointerDown={stopPropagation}
          onTouchEnd={stopPropagation}
        >
          {/* Agujero (spotlight) sobre el elemento resaltado */}
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

          {/* Tooltip del paso */}
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="tour-title"
            aria-describedby="tour-desc"
            className="fixed z-[80] w-[330px] max-w-[calc(100vw-24px)] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
            style={tooltip ? { top: tooltip.top, left: tooltip.left } : { top: 120, left: 12 }}
          >
            {tooltip && (
              <span
                aria-hidden="true"
                className={`absolute w-3 h-3 bg-white rotate-45 ${
                  tooltip.placement === 'bottom' ? '-top-1.5 border-t border-l' : '-bottom-1.5 border-b border-r'
                }`}
                style={{ left: TOOLTIP_WIDTH / 2 - 6 }}
              />
            )}
            <header className="flex items-center justify-between gap-3 p-4 pb-1">
              <p className="text-xs font-semibold text-primary-700">
                Paso {index + 1} de {total}
              </p>
              <button
                type="button"
                onClick={skip}
                className={`px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg ${FOCUS_RING}`}
              >
                Saltar todas las tooltips
              </button>
            </header>
            <div className="px-4">
              <h2 id="tour-title" className="text-base font-bold text-gray-900">
                {step?.title}
              </h2>
              <p id="tour-desc" className="mt-1 text-sm text-gray-600">
                {step?.description}
              </p>
            </div>
            <footer className="flex items-center gap-2 p-4 pt-3">
              <button
                type="button"
                onClick={back}
                disabled={index === 0}
                className={`px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed ${TOUCH_TARGET} ${FOCUS_RING}`}
              >
                Atrás
              </button>
              <button
                type="button"
                onClick={next}
                className={`ml-auto px-4 py-2 text-sm rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 ${TOUCH_TARGET} ${FOCUS_RING}`}
              >
                {index === total - 1 ? 'Finalizar recorrido' : 'Siguiente'}
              </button>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}