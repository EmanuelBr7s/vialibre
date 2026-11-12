'use client';

import Link from 'next/link';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import UserDropdown from '@/components/UserDropdown';
import { FOCUS_RING, TOUCH_TARGET } from '@/components/ui/classes';

const AccessibilityIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 2a3 3 0 100 6 3 3 0 000-6zM12 9c-2.2 0-4.4 1-6.1 2.9l2.3 2.3c1.8-1.9 4.1-2.9 3.8-2.9.3 0 2 .6 3.8 1.9l2.3-2.3A8.1 8.1 0 0012 9z" />
  </svg>
);

interface MobileHeaderProps {
  onMenuOpen?: () => void;
}

export default function MobileHeader({ onMenuOpen }: MobileHeaderProps) {
  const { setPanelOpen } = useAccessibility();

  return (
    <header className="lg:hidden sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-200 px-4 py-3 flex items-center justify-between">
      <Link href="/feed" prefetch={false} className="flex items-center gap-2" aria-label="VíaLibre - Inicio">
        <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-lg">V</span>
        </div>
        <span className="font-bold text-gray-900">VíaLibre</span>
      </Link>
      <div className="flex items-center gap-2">
        <UserDropdown />
        <button
          onClick={() => setPanelOpen(true)}
          aria-label="Accesibilidad"
          className={`w-10 h-10 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 ${TOUCH_TARGET} ${FOCUS_RING}`}
        >
          <AccessibilityIcon />
        </button>
        {onMenuOpen && (
          <button
            onClick={onMenuOpen}
            aria-label="Abrir menú"
            className={`w-10 h-10 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 ${TOUCH_TARGET} ${FOCUS_RING}`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
      </div>
    </header>
  );
}