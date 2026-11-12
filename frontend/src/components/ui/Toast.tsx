'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { FOCUS_RING, TOUCH_TARGET } from '@/components/ui/classes';

type ToastTone = 'success' | 'error';

interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastApi | undefined>(undefined);

const DURATION_MS = 5000;

const TONE_CLASS: Record<ToastTone, string> = {
  success: 'text-green-700 bg-green-50 border-green-200',
  error: 'text-red-600 bg-red-50 border-red-200',
};

/**
 * Avisos breves que quedan fijos en pantalla (no dependen de dónde esté el
 * scroll): confirman una acción o informan de un fallo y se cierran solos.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, number>());

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const schedule = useCallback(
    (id: number) => {
      const previous = timers.current.get(id);
      if (previous !== undefined) window.clearTimeout(previous);
      timers.current.set(
        id,
        window.setTimeout(() => dismiss(id), DURATION_MS)
      );
    },
    [dismiss]
  );

  /** Mientras se lee (ratón encima o foco dentro) el aviso no se cierra. */
  const pause = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (tone: ToastTone, message: string) => {
      const id = nextId.current;
      nextId.current += 1;
      setToasts((current) => [...current.slice(-2), { id, tone, message }]);
      schedule(id);
    },
    [schedule]
  );

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((timer) => window.clearTimeout(timer));
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (message) => push('success', message),
      error: (message) => push('error', message),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* Por encima de la barra inferior (móvil) y del botón de accesibilidad (escritorio). */}
      <div className="pointer-events-none fixed inset-x-4 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-[60] flex flex-col items-center gap-2 lg:inset-x-auto lg:right-6 lg:items-end">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.tone === 'error' ? 'alert' : 'status'}
            onMouseEnter={() => pause(toast.id)}
            onMouseLeave={() => schedule(toast.id)}
            onFocus={() => pause(toast.id)}
            onBlur={() => schedule(toast.id)}
            className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border p-4 text-fluid-sm shadow-lg ${TONE_CLASS[toast.tone]}`}
          >
            <p className="min-w-0 flex-1 break-words">{toast.message}</p>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label="Cerrar aviso"
              className={`-my-2 -mr-2 inline-flex shrink-0 items-center justify-center rounded-lg text-fluid-lg leading-none opacity-70 hover:opacity-100 ${TOUCH_TARGET} ${FOCUS_RING}`}
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}
