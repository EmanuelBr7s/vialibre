'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import type { Challenge } from '@/types';
import ChallengeCard from './ChallengeCard';
import { AD_FALLBACK } from '@/data/ads';
import { useAdvertisement } from '@/contexts/AdvertisementContext';
import UserDropdown from '@/components/UserDropdown';
import { FOCUS_RING, TOUCH_TARGET } from '@/components/ui/classes';
import { useFocusTrap } from '@/hooks/useFocusTrap';

interface SidebarProps {
  challenges: Challenge[];
  /** Abre el modal de creación de problemáticas (opcional). */
  onOpenCreate?: () => void;
}

function isAdActive(expirationDate: string): boolean {
  return new Date().getTime() < new Date(expirationDate).getTime();
}

export default function Sidebar({ challenges, onOpenCreate }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const { ad: currentAd } = useAdvertisement();

  const hasActiveAd = currentAd !== null && isAdActive(currentAd.expiration_date);
  const ad = hasActiveAd && currentAd ? currentAd : null;

  useFocusTrap(drawerRef, mobileOpen, () => setMobileOpen(false));

  // Auto-collapse on resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setCollapsed(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const recentList = (
    <nav aria-label="Problemáticas recientes">
      <ul className="space-y-3">
        {challenges.slice(0, 5).map((challenge) => (
          <li key={challenge.id}>
            <Link href={`/feed/${challenge.id}`} className={`block rounded-lg ${FOCUS_RING}`}>
              <ChallengeCard challenge={challenge} />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );

  const adBlock = (
    <div className="border-t border-gray-200 p-4 bg-white" data-tour="ad-slot">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
        Publicidad
      </h3>
      <div aria-live="polite">
        {ad ? (
          <a
            href={ad.link_url}
            target="_blank"
            rel="noopener noreferrer"
            className={`block overflow-hidden rounded-lg border border-gray-200 hover:shadow-md transition-shadow ${FOCUS_RING}`}
          >
            {ad.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={ad.image_url}
                alt={ad.title}
                className="w-full h-32 object-cover bg-gray-100"
              />
            ) : (
              <div className="w-full h-32 bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white" aria-hidden="true">
                <span className="text-2xl font-bold">{ad.title.charAt(0)}</span>
              </div>
            )}
            <div className="p-3">
              <p className="text-sm font-semibold text-gray-900">{ad.title}</p>
              <p className="text-xs text-gray-500 mt-1">{ad.description}</p>
            </div>
          </a>
        ) : (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
            <p className="text-sm font-medium text-gray-600">{AD_FALLBACK.title}</p>
            <p className="text-xs text-gray-400 mt-1">{AD_FALLBACK.description}</p>
          </div>
        )}
      </div>
    </div>
  );

  const brand = (
    <Link href="/feed" className={`flex items-center gap-3 ${FOCUS_RING} rounded-lg`}>
      <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center shrink-0" aria-hidden="true">
        <span className="text-white font-bold text-xl">V</span>
      </div>
      {!collapsed && (
        <div className="min-w-0">
          <p className="text-xl font-bold text-gray-900 truncate">ViaLibre</p>
          <p className="text-xs text-gray-500 truncate">Innovación Abierta</p>
        </div>
      )}
    </Link>
  );

  const toggleCollapse = () => setCollapsed((c) => !c);

  return (
    <>
      {/* ── Mobile slide-over drawer (secondary navigation) ── */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50" role="presentation">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div
            id="mobile-sidebar-drawer"
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menú lateral"
            className="absolute top-0 left-0 h-full w-[85%] max-w-xs bg-white shadow-xl flex flex-col safe-area-inset"
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              {brand}
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Cerrar menú lateral"
                className={`inline-flex items-center justify-center w-10 h-10 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 ${TOUCH_TARGET} ${FOCUS_RING}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 scroll-smooth-native">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                Problemáticas Recientes
              </h2>
              {recentList}
            </div>
            {adBlock}
          </div>
        </div>
      )}

      {/* ── Desktop/Tablet Sidebar ── */}
      <aside
        ref={sidebarRef}
        className={`hidden lg:flex h-screen sticky top-0 bg-gray-50 border-r border-gray-200 flex-col transition-all duration-300 ease-out ${
          collapsed ? 'w-20' : 'w-[30%] min-w-[280px] max-w-[360px]'
        }`}
        aria-label="Navegación principal"
      >
        <header className={`p-4 border-b border-gray-200 flex items-center gap-3 ${collapsed ? 'justify-center' : 'justify-between'}`}>
          {!collapsed && brand}
          {/* Usuario actual (avatar + "Cerrar Sesión") arriba, junto a la marca; y colapsar/expandir siempre accesible */}
          <div className={`flex items-center shrink-0 ${collapsed ? '' : 'gap-2'}`}>
            {!collapsed && <UserDropdown onOpenCreate={onOpenCreate} />}
            <button
              type="button"
              onClick={toggleCollapse}
              aria-label={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
              aria-expanded={!collapsed}
              className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:bg-gray-200 hover:text-gray-700 ${TOUCH_TARGET} ${FOCUS_RING}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                {collapsed ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                )}
              </svg>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 scroll-smooth-native">
          {!collapsed && (
            <>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                Problemáticas Recientes
              </h2>
              {recentList}
            </>
          )}
        </div>

        {!collapsed && adBlock}
      </aside>
    </>
  );
}