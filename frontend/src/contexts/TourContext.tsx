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
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from './AuthContext';
import { isTalentRole } from '@/lib/constants';
import {
  TOUR_COMPLETED_KEY,
  TOUR_STEPS,
  type TourRole,
  type TourStep,
} from '@/data/tour';

interface TourContextValue {
  active: boolean;
  index: number;
  total: number;
  step: TourStep | null;
  start: () => void;
  next: () => void;
  back: () => void;
  skip: () => void;
  finish: () => void;
}

const TourContext = createContext<TourContextValue | undefined>(undefined);

export function TourProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [steps, setSteps] = useState<TourStep[]>([]);
  const [index, setIndex] = useState(0);
  const [active, setActive] = useState(false);
  const startTimer = useRef<number | null>(null);

  // Limpieza del temporizador de inicio al desmontar.
  useEffect(
    () => () => {
      if (startTimer.current !== null) window.clearTimeout(startTimer.current);
    },
    []
  );

  // El rol admin reutiliza los pasos del Publicador.
  const stepsForRole = useCallback((): TourStep[] => {
    const role = user?.role ?? 'publicador';
    const tourRole: TourRole = isTalentRole(role) ? 'solucionador' : 'publicador';
    return TOUR_STEPS[tourRole];
  }, [user?.role]);

  const start = useCallback(() => {
    setSteps(stepsForRole());
    setIndex(0);
    try {
      window.localStorage.removeItem(TOUR_COMPLETED_KEY);
    } catch {
      // almacenamiento no disponible
    }
    const doStart = () => setActive(true);
    if (typeof window !== 'undefined' && pathname !== '/feed') {
      router.push('/feed');
      if (startTimer.current !== null) window.clearTimeout(startTimer.current);
      startTimer.current = window.setTimeout(doStart, 450);
    } else {
      doStart();
    }
  }, [pathname, router, stepsForRole]);

  const stopAndMark = useCallback(() => {
    setActive(false);
    setIndex(0);
    try {
      window.localStorage.setItem(TOUR_COMPLETED_KEY, '1');
    } catch {
      // almacenamiento no disponible
    }
  }, []);

  const skip = useCallback(() => stopAndMark(), [stopAndMark]);
  const finish = useCallback(() => stopAndMark(), [stopAndMark]);

  const next = useCallback(() => {
    if (steps.length === 0) return;
    if (index >= steps.length - 1) {
      finish();
      return;
    }
    setIndex((prev) => prev + 1);
  }, [index, steps.length, finish]);

  const back = useCallback(() => setIndex((prev) => Math.max(0, prev - 1)), []);

  const value = useMemo<TourContextValue>(
    () => ({
      active,
      index,
      total: steps.length,
      step: steps[index] ?? null,
      start,
      next,
      back,
      skip,
      finish,
    }),
    [active, index, steps, start, next, back, skip, finish]
  );

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

export function useTour(): TourContextValue {
  const ctx = useContext(TourContext);
  if (!ctx) {
    throw new Error('useTour debe usarse dentro de <TourProvider>');
  }
  return ctx;
}