'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { currentAd, type AdSlot } from '@/data/ads';

interface AdvertisementContextValue {
  /** Anuncio actual (null = espacio disponible). */
  ad: AdSlot | null;
  /** Actualiza el anuncio global; refleja el cambio en toda la app (ej. sidebar). */
  updateAd: (ad: AdSlot | null) => void;
}

const AdvertisementContext = createContext<AdvertisementContextValue | undefined>(undefined);

export function AdvertisementProvider({ children }: { children: ReactNode }) {
  const [ad, setAd] = useState<AdSlot | null>(currentAd);

  const updateAd = useCallback((next: AdSlot | null) => {
    setAd(next);
  }, []);

  const value = useMemo<AdvertisementContextValue>(
    () => ({ ad, updateAd }),
    [ad, updateAd]
  );

  return (
    <AdvertisementContext.Provider value={value}>{children}</AdvertisementContext.Provider>
  );
}

export function useAdvertisement(): AdvertisementContextValue {
  const ctx = useContext(AdvertisementContext);
  if (!ctx) {
    throw new Error('useAdvertisement must be used within an AdvertisementProvider');
  }
  return ctx;
}
