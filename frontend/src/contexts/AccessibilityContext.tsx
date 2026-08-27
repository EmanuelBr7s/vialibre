'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import type { ContrastMode, FontSize } from '@/data/accessibility';

const STORAGE_KEY = 'vialibre-a11y';

interface A11yState {
  fontSize: FontSize;
  contrastMode: ContrastMode;
  dyslexiaFont: boolean;
  reduceMotion: boolean;
  readingGuide: boolean;
}

interface AccessibilityContextValue extends A11yState {
  /** Panel flotante (drawer) de accesibilidad abierto. */
  panelOpen: boolean;
  /** Modal de guía de atajos de teclado abierto. */
  shortcutsOpen: boolean;
  setFontSize: (value: FontSize) => void;
  setContrastMode: (value: ContrastMode) => void;
  setDyslexiaFont: (value: boolean) => void;
  setReduceMotion: (value: boolean) => void;
  setReadingGuide: (value: boolean) => void;
  setPanelOpen: (value: boolean) => void;
  setShortcutsOpen: (value: boolean) => void;
  resetAll: () => void;
}

const DEFAULT_STATE: A11yState = {
  fontSize: 'normal',
  contrastMode: 'none',
  dyslexiaFont: false,
  reduceMotion: false,
  readingGuide: false,
};

const AccessibilityContext = createContext<AccessibilityContextValue | undefined>(undefined);

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable ||
    tag === 'BUTTON' ||
    tag === 'A'
  );
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function loadStoredState(): A11yState {
  if (typeof window === 'undefined') return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<A11yState>;
    return {
      fontSize: parsed.fontSize ?? DEFAULT_STATE.fontSize,
      contrastMode: parsed.contrastMode ?? DEFAULT_STATE.contrastMode,
      dyslexiaFont: parsed.dyslexiaFont ?? DEFAULT_STATE.dyslexiaFont,
      reduceMotion: parsed.reduceMotion ?? prefersReducedMotion(),
      readingGuide: parsed.readingGuide ?? DEFAULT_STATE.readingGuide,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();

  const [state, setState] = useState<A11yState>(DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  // Hidratación desde localStorage (una sola vez, tras montar en cliente).
  useEffect(() => {
    const stored = loadStoredState();
    setState(stored);
    setHydrated(true);
  }, []);

  // Aplica los atributos data-* al elemento <html> en tiempo real.
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.fontSize = state.fontSize;
    root.dataset.contrast = state.contrastMode;
    root.dataset.dyslexia = state.dyslexiaFont ? 'on' : 'off';
    root.dataset.reduceMotion = state.reduceMotion ? 'on' : 'off';
    root.dataset.readingGuide = state.readingGuide ? 'on' : 'off';
  }, [state]);

  // Persiste cuando cambian los valores (después de hidratar).
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // almacenamiento no disponible: se ignora
    }
  }, [state, hydrated]);

  const setFontSize = useCallback((value: FontSize) => {
    setState((prev) => ({ ...prev, fontSize: value }));
  }, []);
  const setContrastMode = useCallback((value: ContrastMode) => {
    setState((prev) => ({ ...prev, contrastMode: value }));
  }, []);
  const setDyslexiaFont = useCallback((value: boolean) => {
    setState((prev) => ({ ...prev, dyslexiaFont: value }));
  }, []);
  const setReduceMotion = useCallback((value: boolean) => {
    setState((prev) => ({ ...prev, reduceMotion: value }));
  }, []);
  const setReadingGuide = useCallback((value: boolean) => {
    setState((prev) => ({ ...prev, readingGuide: value }));
  }, []);
  const resetAll = useCallback(() => {
    setState((prev) => ({
      ...DEFAULT_STATE,
      reduceMotion: prefersReducedMotion(),
    }));
  }, []);

  // Atajos de teclado globales (ignora la escritura en campos y combinaciones con modificadores).
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;

      switch (event.key.toLowerCase()) {
        case '?':
          if (!event.shiftKey) return;
          event.preventDefault();
          setPanelOpen(false);
          setShortcutsOpen(true);
          break;
        case 'c':
          event.preventDefault();
          setPanelOpen(false);
          setShortcutsOpen(true);
          break;
        case 'a':
          event.preventDefault();
          setShortcutsOpen(false);
          setPanelOpen((prev) => !prev);
          break;
        case 'g':
          if (!isAuthenticated) return;
          event.preventDefault();
          router.push('/feed');
          break;
        case 's':
          if (!isAuthenticated) return;
          event.preventDefault();
          router.push('/settings');
          break;
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [router, isAuthenticated, user?.role]);

  const value = useMemo<AccessibilityContextValue>(
    () => ({
      ...state,
      panelOpen,
      shortcutsOpen,
      setFontSize,
      setContrastMode,
      setDyslexiaFont,
      setReduceMotion,
      setReadingGuide,
      setPanelOpen,
      setShortcutsOpen,
      resetAll,
    }),
    [
      state,
      panelOpen,
      shortcutsOpen,
      setFontSize,
      setContrastMode,
      setDyslexiaFont,
      setReduceMotion,
      setReadingGuide,
      setPanelOpen,
      setShortcutsOpen,
      resetAll,
    ]
  );

  return (
    <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>
  );
}

export function useAccessibility(): AccessibilityContextValue {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return ctx;
}
