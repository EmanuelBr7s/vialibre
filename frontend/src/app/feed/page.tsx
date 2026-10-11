'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import Banner from '@/components/Banner';
import FeaturedCard from '@/components/FeaturedCard';
import ChallengeCard from '@/components/ChallengeCard';
import ChallengeCardSkeleton from '@/components/skeletons/ChallengeCardSkeleton';
import FeaturedCardSkeleton from '@/components/skeletons/FeaturedCardSkeleton';
import CreateChallengeModal from '@/components/CreateChallengeModal';
import api from '@/lib/api';
import type { Challenge } from '@/types';
import { FOCUS_RING, TOUCH_TARGET } from '@/components/ui/classes';

export default function FeedPage() {
  const { isAuthenticated, loading, user } = useAuth();
  const router = useRouter();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [featured, setFeatured] = useState<Challenge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const loadChallenges = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [all, feat] = await Promise.all([
        api.getChallenges({ limit: 30 }),
        api.getChallenges({ featured_only: true }),
      ]);
      setChallenges(all.challenges);
      setFeatured(feat.challenges);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar problemáticas');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    loadChallenges();
  }, [loading, isAuthenticated, router, loadChallenges]);

  const handleCreated = (challenge: Challenge) => {
    // Actualiza el feed localmente sin recargar la página (estado/caché).
    setChallenges((prev) => [challenge, ...prev]);
    if (challenge.is_featured) {
      setFeatured((prev) => [challenge, ...prev]);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-500">
        Cargando…
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const canPublish = user?.role === 'publicador' || user?.role === 'admin';
  const toggleModal = () => setModalOpen((open) => !open);

  return (
    <div className="flex min-h-screen">
      <Sidebar
        challenges={challenges}
        onOpenCreate={canPublish ? () => setModalOpen(true) : undefined}
      />

      <main id="main-content" tabIndex={-1} className="flex-1 p-4 sm:p-6 lg:p-8 focus:outline-none">
        <Banner
          onCreateProblematica={
            canPublish
              ? () => setModalOpen(true)
              : undefined
          }
          modalOpen={modalOpen}
        />

        {/* Error state */}
        {error && (
          <div
            role="alert"
            className="mb-6 text-sm text-red-600 bg-red-50 rounded-lg p-4 border border-red-200"
          >
            {error}
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Problemáticas</h2>
          {canPublish && (
            <button
              onClick={toggleModal}
              data-tour="publicar"
              aria-expanded={modalOpen}
              aria-controls="create-challenge-dialog"
              aria-haspopup="dialog"
              className={`bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition disabled:opacity-60 ${TOUCH_TARGET} ${FOCUS_RING}`}
            >
              + Publicar Problemática
            </button>
          )}
        </div>

        <div aria-live="polite">
          {isLoading ? (
            <div className="space-y-8">
              <section aria-label="Cargando problemáticas destacadas">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Problemáticas Destacadas
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <FeaturedCardSkeleton key={i} />
                  ))}
                </div>
              </section>

              <section aria-label="Cargando últimas problemáticas" data-tour="feed-section">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Últimas Problemáticas
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <ChallengeCardSkeleton key={i} />
                  ))}
                </div>
              </section>
            </div>
          ) : (
            <div className="space-y-10">
              {featured.length > 0 && (
                <section id="problematicas" aria-label="Problemáticas destacadas">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">
                    Problemáticas Destacadas
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {featured.map((challenge) => (
                      <FeaturedCard key={challenge.id} challenge={challenge} />
                    ))}
                  </div>
                </section>
              )}

              <section aria-label="Últimas problemáticas" data-tour="feed-section">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Últimas Problemáticas
                </h2>
                {challenges.length === 0 ? (
                  <p className="text-gray-500">Aún no hay problemáticas publicadas.</p>
                ) : (
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                      {challenges.map((challenge) => (
                        <Link
                          key={challenge.id}
                          href={`/feed/${challenge.id}`}
                          className={`block rounded-lg ${FOCUS_RING}`}
                        >
                          <ChallengeCard challenge={challenge} />
                        </Link>
                      ))}
                    </div>
                )}
              </section>
            </div>
          )}
        </div>
      </main>

      <CreateChallengeModal open={modalOpen} onClose={() => setModalOpen(false)} onCreated={handleCreated} />
    </div>
  );
}
