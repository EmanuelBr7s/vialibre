'use client';

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
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
import { ChallengeTipo, UserRole } from '@/types';
import { LAB_CONTACT, MODULES, MODULE_BY_ID, defaultModuleFor } from '@/data/modules';
import { FOCUS_RING, TOUCH_TARGET, btnSecondary } from '@/components/ui/classes';

/** Publicaciones que se piden por módulo, las que se listan y las destacadas. */
const FETCH_LIMIT = 100;
const FEED_LIMIT = 30;
const FEATURED_LIMIT = 20;

export default function FeedPage() {
  const { isAuthenticated, loading, user } = useAuth();
  const router = useRouter();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [featured, setFeatured] = useState<Challenge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // El servidor gratuito se suspende sin uso: si la carga se alarga, se avisa.
  const [slowLoad, setSlowLoad] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ChallengeTipo | null>(null);

  // Publicaciones ya cargadas por módulo: al volver a una pestaña se muestran
  // al instante y se refrescan en segundo plano.
  const cache = useRef(new Map<ChallengeTipo, Challenge[]>());
  const currentTab = useRef<ChallengeTipo | null>(null);

  const showList = useCallback((list: Challenge[]) => {
    setChallenges(list.slice(0, FEED_LIMIT));
    setFeatured(list.filter((challenge) => challenge.is_featured).slice(0, FEATURED_LIMIT));
  }, []);

  const loadChallenges = useCallback(
    async (tipo: ChallengeTipo) => {
      currentTab.current = tipo;
      const cached = cache.current.get(tipo);
      if (cached) showList(cached);
      setIsLoading(!cached);
      setError(null);
      try {
        // Una sola petición por módulo: las destacadas salen de la misma lista.
        const { challenges: list } = await api.getChallenges({ limit: FETCH_LIMIT, tipo });
        cache.current.set(tipo, list);
        // Si mientras tanto se cambió de pestaña, no se pisa lo que se ve.
        if (currentTab.current === tipo) showList(list);
      } catch (err) {
        if (currentTab.current === tipo && !cached) {
          setError(err instanceof Error ? err.message : 'Error al cargar las publicaciones');
        }
      } finally {
        if (currentTab.current === tipo) setIsLoading(false);
      }
    },
    [showList]
  );

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    // Pestaña inicial según el perfil (estudiante → prácticas, egresado → empleo).
    setActiveTab((tab) => tab ?? defaultModuleFor(user?.role));
  }, [loading, isAuthenticated, router, user?.role]);

  useEffect(() => {
    if (activeTab) loadChallenges(activeTab);
  }, [activeTab, loadChallenges]);

  useEffect(() => {
    if (!isLoading) {
      setSlowLoad(false);
      return;
    }
    const timer = window.setTimeout(() => setSlowLoad(true), 4000);
    return () => window.clearTimeout(timer);
  }, [isLoading]);

  const handleCreated = (challenge: Challenge) => {
    // Si se publicó en otro módulo, se cambia de pestaña (recarga ese módulo).
    if (challenge.tipo !== activeTab) {
      setActiveTab(challenge.tipo);
      return;
    }
    // Actualiza el feed localmente sin recargar la página (estado/caché).
    const list = [challenge, ...(cache.current.get(challenge.tipo) ?? challenges)];
    cache.current.set(challenge.tipo, list);
    showList(list);
  };

  // Flechas izquierda/derecha entre pestañas (patrón ARIA tabs).
  const handleTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const index = MODULES.findIndex((m) => m.id === activeTab);
    const step = e.key === 'ArrowRight' ? 1 : MODULES.length - 1;
    const next = MODULES[(index + step) % MODULES.length];
    setActiveTab(next.id);
    document.getElementById(`tab-${next.id}`)?.focus();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-500">
        Cargando…
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const canPublish = user?.role === UserRole.PUBLICADOR || user?.role === UserRole.ADMIN;
  const toggleModal = () => setModalOpen((open) => !open);
  const current = MODULE_BY_ID[activeTab ?? ChallengeTipo.RETO];

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
            className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-fluid-sm text-red-600 bg-red-50 rounded-lg p-4 border border-red-200"
          >
            <p>{error}</p>
            {activeTab && (
              <button
                type="button"
                onClick={() => loadChallenges(activeTab)}
                className={`${btnSecondary} w-full sm:w-auto shrink-0`}
              >
                Reintentar
              </button>
            )}
          </div>
        )}

        {slowLoad && !error && (
          <div
            role="status"
            className="mb-6 text-fluid-sm text-primary-700 bg-primary-50 rounded-lg p-4 border border-primary-200"
          >
            El servidor se está despertando. La primera carga puede tardar hasta un minuto…
          </div>
        )}

        {/* Pestañas de módulos: retos, prácticas y ofertas laborales */}
        <div
          role="tablist"
          aria-label="Tipo de publicación"
          className="flex gap-1 overflow-x-auto border-b border-gray-200 mb-4"
        >
          {MODULES.map((m) => {
            const selected = m.id === activeTab;
            return (
              <button
                key={m.id}
                id={`tab-${m.id}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls="module-panel"
                tabIndex={selected ? 0 : -1}
                onClick={() => setActiveTab(m.id)}
                onKeyDown={handleTabKeyDown}
                className={`shrink-0 px-4 -mb-px border-b-2 text-sm font-medium transition-colors ${TOUCH_TARGET} ${FOCUS_RING} ${
                  selected
                    ? 'border-primary-600 text-primary-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {m.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <p className="text-sm text-gray-600 max-w-2xl">{current.description}</p>
          {canPublish && (
            <button
              onClick={toggleModal}
              data-tour="publicar"
              aria-expanded={modalOpen}
              aria-controls="create-challenge-dialog"
              aria-haspopup="dialog"
              className={`bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition disabled:opacity-60 ${TOUCH_TARGET} ${FOCUS_RING}`}
            >
              + Publicar {current.singular.toLowerCase()}
            </button>
          )}
        </div>

        {activeTab === ChallengeTipo.RETO && (
          <aside
            aria-label="Contacto del Laboratorio de Innovación"
            className="mb-8 flex flex-col sm:flex-row sm:items-center gap-4 rounded-xl border border-violet-200 bg-violet-50 p-5"
          >
            <div
              className="w-12 h-12 shrink-0 rounded-full bg-violet-600 text-white flex items-center justify-center font-semibold"
              aria-hidden="true"
            >
              {LAB_CONTACT.nombre.charAt(0)}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">
                ¿Tienes un reto para la universidad?
              </p>
              <p className="text-sm text-gray-600">
                {LAB_CONTACT.nombre}, {LAB_CONTACT.cargo.toLowerCase()}, acompaña cada reto y
                conecta a tu empresa con los semilleros de innovación.
              </p>
            </div>
            <a
              href={`mailto:${LAB_CONTACT.email}`}
              className={`inline-flex items-center justify-center px-4 rounded-lg border border-violet-300 text-violet-700 text-sm font-medium hover:bg-violet-100 ${TOUCH_TARGET} ${FOCUS_RING}`}
            >
              {LAB_CONTACT.email}
            </a>
          </aside>
        )}

        <div id="module-panel" role="tabpanel" aria-labelledby={`tab-${current.id}`} aria-live="polite">
          {isLoading ? (
            <div className="space-y-8">
              <section aria-label="Cargando destacados">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Destacados
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <FeaturedCardSkeleton key={i} />
                  ))}
                </div>
              </section>

              <section aria-label="Cargando publicaciones" data-tour="feed-section">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Publicaciones recientes
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
                <section id="problematicas" aria-label="Destacados">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">
                    Destacados
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {featured.map((challenge) => (
                      <FeaturedCard key={challenge.id} challenge={challenge} />
                    ))}
                  </div>
                </section>
              )}

              <section aria-label="Publicaciones recientes" data-tour="feed-section">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Publicaciones recientes
                </h2>
                {challenges.length === 0 ? (
                  <p className="text-gray-500">Aún no hay publicaciones en este módulo.</p>
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

      <CreateChallengeModal
        open={modalOpen}
        defaultTipo={current.id}
        onClose={() => setModalOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}
