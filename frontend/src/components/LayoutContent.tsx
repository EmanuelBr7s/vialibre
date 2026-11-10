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
      <MobileHeader />
      <main id="main-content" tabIndex={-1} className="flex-1 min-h-0 lg:pl-0 focus:outline-none">
        {children}
      </main>
    </div>
  );
}