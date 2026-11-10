'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTour } from '@/contexts/TourContext';
import OnboardingModal from './OnboardingModal';
import FeatureTour from './FeatureTour';
import { ONBOARDING_KEY, onboardingKey, type TourRole } from '@/data/tour';
import { UserRole } from '@/types';
import { isTalentRole } from '@/lib/constants';

function roleToTourRole(role: UserRole): TourRole {
  return isTalentRole(role) ? UserRole.SOLUCIONADOR : UserRole.PUBLICADOR;
}

/**
 * Orquesta el onboarding (wizard) y el recorrido guiado para el usuario
 * autenticado la primera vez que entra a la plataforma.
 */
export default function OnboardingManager() {
  const { user, isAuthenticated, loading } = useAuth();
  const { start } = useTour();
  const [open, setOpen] = useState(false);

useEffect(() => {
    if (loading) return;
    if (!isAuthenticated || !user?.id) return;
    // Limpieza única del flag global antiguo (antes de la clave por usuario).
    try {
      if (window.localStorage.getItem(ONBOARDING_KEY) !== null) {
        window.localStorage.removeItem(ONBOARDING_KEY);
      }
    } catch {
      // almacenamiento no disponible
    }
    let completed = true;
    const key = onboardingKey(user.id);
    try {
      completed = window.localStorage.getItem(key) === '1';
    } catch {
      completed = false;
    }
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[onboarding] user=%s key=%s completed=%s', user.id, key, completed);
    }
    if (!completed) setOpen(true);
  }, [loading, isAuthenticated, user]);

  const markOnboardingDone = () => {
    if (!user?.id) return;
    const key = onboardingKey(user.id);
    try {
      window.localStorage.setItem(key, '1');
      if (process.env.NODE_ENV !== 'production') {
        console.debug('[onboarding] mark done key=%s', key);
      }
    } catch {
      // almacenamiento no disponible
    }
    setOpen(false);
  };

  const handleClose = () => markOnboardingDone();

  const handleStartTour = () => {
    markOnboardingDone();
    start();
  };

  return (
    <>
      <OnboardingModal
        open={open}
        role={roleToTourRole(user?.role ?? UserRole.PUBLICADOR)}
        onClose={handleClose}
        onStartTour={handleStartTour}
      />
      <FeatureTour />
    </>
  );
}