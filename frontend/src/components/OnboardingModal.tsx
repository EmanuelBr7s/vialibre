'use client';

import { useEffect, useRef, useState } from 'react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import {
  ONBOARDING_STEPS,
  type OnboardingIcon,
  type TourRole,
} from '@/data/tour';
import { FOCUS_RING, TOUCH_TARGET, TOUCH_TARGET_LG } from '@/components/ui/classes';

interface OnboardingModalProps {
  open: boolean;
  role: TourRole;
  onClose: () => void;
  onStartTour: () => void;
}

function OnboardingIcon({ name }: { name: OnboardingIcon }) {
  const common = {
    className: 'w-12 h-12 text-white',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    viewBox: '0 0 24 24',
    'aria-hidden': true,
  };
  switch (name) {
    case 'community':
      return (
        <svg {...common}>
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
        </svg>
      );
    case 'publish':
      return (
        <svg {...common}>
          <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
        </svg>
      );
    case 'profile':
      return (
        <svg {...common}>
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
          <circle cx="12" cy="7" r="4" />
          <path d="M12 11h.01" />
        </svg>
      );
    case 'apply':
      return (
        <svg {...common}>
          <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
        </svg>
      );
    case 'evaluate':
      return (
        <svg {...common}>
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
          <path d="M9 5a2 2 0 012-2h2a2 2 0 012 2M9 5a2 2 0 002 2h2a2 2 0 002-2" />
          <path d="M9 14l2 2 4-4" />
        </svg>
      );
  }
}

export default function OnboardingModal({
  open,
  role,
  onClose,
  onStartTour,
}: OnboardingModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<'next' | 'prev' | null>(null);
  const slides = ONBOARDING_STEPS[role];
  const current = slides[index];

  useFocusTrap(dialogRef, open, onClose);

  useEffect(() => {
    if (open) setIndex(0);
  }, [open]);

  const goNext = () => {
    if (index < slides.length - 1) {
      setDirection('next');
      setIndex((i) => i + 1);
    }
  };

  const goPrev = () => {
    if (index > 0) {
      setDirection('prev');
      setIndex((i) => i - 1);
    }
  };

  const isLast = index === slides.length - 1;

  if (!open) return null;

  const slideEnterClass = direction === 'next'
    ? 'animate-slide-in-right'
    : direction === 'prev'
      ? 'animate-slide-in-left'
      : 'animate-slide-in-right';
  const slideExitClass = direction === 'next'
    ? 'animate-slide-out-left'
    : direction === 'prev'
      ? 'animate-slide-out-right'
      : 'animate-slide-out-left';

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col animate-modal-enter"
      role="presentation"
      style={{
        background: 'linear-gradient(to bottom right, var(--tw-gradient-from), var(--tw-gradient-via), var(--tw-gradient-to))',
      } as React.CSSProperties}
    >
      <style jsx>{`
        .gradient-bg {
          background: linear-gradient(to bottom right, #1e3a8a, #1e40af, #14532d);
        }
      `}</style>

      <div className="gradient-bg fixed inset-0" aria-hidden="true" />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        aria-describedby="onboarding-desc"
        className="relative flex flex-col h-full w-full max-w-4xl mx-auto px-4 sm:px-6 pb-safe-bottom"
      >
        {/* ── Header: Dots + Omitir ── */}
        <header className="flex items-center justify-between h-16 shrink-0">
          <div className="flex items-center justify-center gap-2" aria-hidden="true">
            {slides.map((slide, i) => (
              <span
                key={slide.title}
                className={`h-1.5 rounded-full transition-all duration-300 ease-out ${
                  i === index
                    ? 'w-10 bg-white'
                    : i < index
                      ? 'w-6 bg-white/60'
                      : 'w-2 bg-white/30'
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`flex items-center gap-2 px-4 py-2 text-fluid-sm font-medium text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors ${TOUCH_TARGET_LG} ${FOCUS_RING}`}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            <span className="hidden sm:inline">Omitir</span>
          </button>
        </header>

        {/* ── Centro: Slides animados ── */}
        <main className="flex-1 flex items-center justify-center overflow-hidden relative">
          <div
            className={`absolute inset-0 flex items-center justify-center px-4 sm:px-6 ${
              slideEnterClass
            }`}
            style={{ animationDuration: '300ms' }}
          >
            <div className="w-full max-w-2xl text-center">
              {/* Icono */}
              <div
                className="w-24 h-24 mx-auto rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center animate-fade-in-up"
                style={{ animationDelay: '75ms' }}
              >
                <OnboardingIcon name={current.icon} />
              </div>

              {/* Título */}
              <h2
                id="onboarding-title"
                className="mt-6 text-fluid-2xl sm:text-fluid-3xl font-bold text-white animate-fade-in-up"
                style={{ animationDelay: '150ms' }}
              >
                {current.title}
              </h2>

              {/* Descripción */}
              <p
                id="onboarding-desc"
                className="mt-4 text-fluid-lg sm:text-fluid-xl text-white/80 max-w-lg mx-auto animate-fade-in-up"
                style={{ animationDelay: '225ms' }}
              >
                {current.description}
              </p>
            </div>
          </div>

          {/* Slide saliente (para animación de salida) */}
          {direction && index > 0 && index < slides.length && (
            <div
              className={`absolute inset-0 flex items-center justify-center px-4 sm:px-6 ${slideExitClass}`}
              style={{ animationDuration: '300ms', pointerEvents: 'none' }}
              aria-hidden="true"
            >
              <div className="w-full max-w-2xl text-center opacity-0">
                <div className="w-24 h-24 mx-auto rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
                  <OnboardingIcon name={slides[index - (direction === 'next' ? 1 : -1)].icon} />
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Anuncio accesible del paso actual */}
        <p className="sr-only" aria-live="polite">
          Paso {index + 1} de {slides.length}: {current.title}
        </p>

        {/* ── Footer: Botones de navegación ── */}
        <footer className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 p-4 sm:p-6 shrink-0 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
          {index > 0 && (
            <button
              type="button"
              onClick={goPrev}
              className={`flex items-center gap-2 px-6 py-3 text-fluid-base font-medium text-white/90 hover:text-white hover:bg-white/10 rounded-xl transition-colors ${TOUCH_TARGET_LG} ${FOCUS_RING} w-full sm:w-auto`}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Atrás
            </button>
          )}
          <button
            type="button"
            onClick={isLast ? onStartTour : goNext}
            className={`ml-auto flex items-center gap-2 px-8 py-3 text-fluid-base font-semibold text-primary-900 bg-white hover:bg-primary-50 rounded-xl shadow-lg transition-all ${TOUCH_TARGET_LG} ${FOCUS_RING} w-full sm:w-auto`}
          >
            {isLast ? 'Comenzar recorrido' : 'Siguiente'}
            {!isLast && (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            )}
          </button>
        </footer>
      </div>
    </div>
  );
}