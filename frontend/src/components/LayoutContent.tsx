'use client';

import { useAuth } from '@/contexts/AuthContext';
import MobileHeader from '@/components/MobileHeader';

interface LayoutContentProps {
  children: React.ReactNode;
}

export default function LayoutContent({ children }: LayoutContentProps) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-500">
        Cargando…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Sin sesión (login/registro) no hay cabecera ni barra inferior de la app. */}
      {isAuthenticated ? <MobileHeader /> : null}
      <main
        id="main-content"
        tabIndex={-1}
        // En móvil la barra inferior es fija: se reserva su alto para que no tape el final
        // de la página. Sin `min-h-0`: el contenedor debe crecer con el contenido, o la
        // reserva quedaría dentro de la primera pantalla y no al final.
        className={`flex-1 min-w-0 lg:pl-0 focus:outline-none ${
          isAuthenticated ? 'pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0' : ''
        }`}
      >
        {children}
      </main>
    </div>
  );
}