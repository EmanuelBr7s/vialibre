'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function RootRedirectPage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    router.replace(isAuthenticated ? '/feed' : '/login');
  }, [loading, isAuthenticated, router]);

  return (
    <div
      role="status"
      className="flex min-h-screen items-center justify-center text-gray-500"
    >
      Redirigiendo…
    </div>
  );
}
