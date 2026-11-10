'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { useProfile } from '@/hooks/useProfile';
import { TOUR_MENU_BODY_CLASS, TOUR_MENU_EVENT } from '@/data/tour';
import { UserRole } from '@/types';
import { FOCUS_RING } from '@/components/ui/classes';

interface UserDropdownProps {
  /** Abre el modal de creación de problemáticas (solo disponible donde exista). */
  onOpenCreate?: () => void;
}

type MenuItem =
  | { id: string; label: string; href: string }
  | { id: string; label: string; action: () => void; disabled?: boolean };

interface RoleMeta {
  label: string;
  badgeClass: string;
  dotClass: string;
}

const ROLE_META: Record<UserRole, RoleMeta> = {
  [UserRole.PUBLICADOR]: {
    label: 'Empresa',
    badgeClass: 'bg-primary-100 text-primary-700',
    dotClass: 'bg-primary-500',
  },
  [UserRole.SOLUCIONADOR]: {
    label: 'Estudiante',
    badgeClass: 'bg-gray-100 text-gray-700',
    dotClass: 'bg-gray-400',
  },
  [UserRole.EGRESADO]: {
    label: 'Egresado',
    badgeClass: 'bg-amber-100 text-amber-700',
    dotClass: 'bg-amber-500',
  },
  [UserRole.ADMIN]: {
    label: 'Administración',
    badgeClass: 'bg-secondary-100 text-secondary-700',
    dotClass: 'bg-secondary-500',
  },
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0]?.charAt(0) ?? '';
  const last = parts[parts.length - 1]?.charAt(0) ?? '';
  return (first + last).toUpperCase();
}

export default function UserDropdown({ onOpenCreate }: UserDropdownProps) {
  const { user, logout } = useAuth();
  const { setPanelOpen } = useAccessibility();
  const { avatarUrl } = useProfile();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Cierre al hacer clic fuera del menú (omitido mientras el tour guía dentro del menú)
  useEffect(() => {
    if (!open) return;
    const handlePointer = (event: MouseEvent | TouchEvent) => {
      if (document.body.classList.contains(TOUR_MENU_BODY_CLASS)) return;
      const target = event.target as Node;
      if (containerRef.current && !containerRef.current.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('touchend', handlePointer);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('touchend', handlePointer);
    };
  }, [open]);

  // Apertura/cierre programático desde el recorrido guiado.
  useEffect(() => {
    const handleTourMenu = (event: Event) => {
      const detail = (event as CustomEvent<{ open: boolean }>).detail;
      setOpen(detail.open);
    };
    window.addEventListener(TOUR_MENU_EVENT, handleTourMenu);
    return () => window.removeEventListener(TOUR_MENU_EVENT, handleTourMenu);
  }, []);

  // Cierre con Escape y devolución del foco al botón
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setOpen(false);
      buttonRef.current?.focus();
    }
  };

  if (!user) return null;

  const meta = ROLE_META[user.role];

  const handleItemClick = (action?: () => void) => {
    setOpen(false);
    action?.();
  };

  const navigate = (href: string) => {
    setOpen(false);
    // Si ya estamos en el destino, cerramos y salimos (evita re-navegación a la misma ruta).
    if (pathname === href) return;
    router.push(href);
  };

  const items: MenuItem[] = (() => {
    const roleItems: MenuItem[] = (() => {
      switch (user.role) {
        case UserRole.PUBLICADOR:
          return [
            { id: 'mis-problematicas', label: 'Mis Publicaciones', href: '/mis-problematicas' },
            { id: 'talento', label: 'Banco de Hojas de Vida', href: '/talento' },
            {
              id: 'publicar',
              label: 'Nueva Publicación',
              action: onOpenCreate ?? (() => undefined),
              disabled: !onOpenCreate,
            },
            { id: 'perfil-org', label: 'Perfil de Organización', href: '/perfil/organizacion' },
          ];
        case UserRole.SOLUCIONADOR:
        case UserRole.EGRESADO:
          return [
            { id: 'mis-postulaciones', label: 'Mis Postulaciones', href: '/mis-postulaciones' },
            {
              id: 'mi-perfil',
              label: user.role === UserRole.EGRESADO ? 'Mi Perfil Profesional' : 'Mi Perfil Académico',
              href: '/perfil/academico',
            },
            {
              id: 'hoja-de-vida',
              label: 'Mi Hoja de Vida (CV)',
              href: '/perfil/academico#hoja-de-vida',
            },
          ];
        case UserRole.ADMIN:
          return [
            { id: 'panel-admin', label: 'Panel de Administración', href: '/admin/dashboard' },
            { id: 'gestion-tutores', label: 'Tutores Docentes', href: '/admin/tutores' },
            { id: 'gestion-empresas', label: 'Empresas', href: '/admin/empresas' },
            { id: 'gestion-practicas', label: 'Prácticas Formalizadas', href: '/admin/practicas' },
            { id: 'talento', label: 'Banco de Hojas de Vida', href: '/talento' },
            { id: 'gestion-anuncios', label: 'Gestión de Anuncios / Pautas', href: '/admin/anuncios' },
          ];
      }
    })();

    return [
      ...roleItems,
      { id: 'configuracion', label: 'Configuración', href: '/settings' },
      { id: 'accesibilidad', label: 'Accesibilidad', action: () => setPanelOpen(true) },
    ];
  })();

  const close = () => setOpen(false);

  return (
    <div ref={containerRef} className="relative" onKeyDown={handleKeyDown}>
      {/* ── Avatar button (disparador) ── */}
      <button
        ref={buttonRef}
        id="user-dropdown-trigger"
        type="button"
        data-tour="open-user-menu"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls="user-dropdown-menu"
        aria-label={`Menú de usuario: ${user.full_name}`}
        className={`relative inline-flex items-center justify-center w-10 h-10 rounded-full border border-gray-200 bg-white hover:bg-gray-50 transition-colors ${FOCUS_RING}`}
      >
        {avatarUrl || user.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl || user.avatar_url || ''}
            alt=""
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          <span className="text-sm font-semibold text-gray-700" aria-hidden="true">
            {getInitials(user.full_name)}
          </span>
        )}
        {/* Indicador sutil de rol */}
        <span
          className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-white ${meta.dotClass}`}
          aria-hidden="true"
        />
      </button>

      {/* ── Dropdown menu ── */}
      {open && (
        <div
          id="user-dropdown-menu"
          role="menu"
          aria-labelledby="user-dropdown-trigger"
          className="absolute right-0 top-12 z-50 w-64 bg-white border border-gray-200 rounded-xl shadow-xl"
        >
          {/* Encabezado */}
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900 truncate">{user.full_name}</p>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
            <span
              className={`inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-medium ${meta.badgeClass}`}
            >
              {meta.label}
            </span>
          </div>

          {/* Items dinámicos */}
          <div className="py-1">
            {items.map((item) => {
              const itemClass = `w-full block text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors ${FOCUS_RING}`;

              // Ítem de navegación → Link real a una ruta.
              if ('href' in item) {
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    role="menuitem"
                    data-tour={
                      item.id === 'perfil-org'
                        ? 'menu-perfil-org'
                        : item.id === 'mi-perfil'
                          ? 'menu-mi-perfil'
                          : item.id === 'panel-admin'
                            ? 'menu-panel-admin'
                            : undefined
                    }
                    onClick={() => navigate(item.href)}
                    className={itemClass}
                  >
                    {item.label}
                  </Link>
                );
              }

              // Ítem de acción → botón que ejecuta la acción (p. ej. "Publicar" o "Accesibilidad").
              if (item.disabled) {
                return (
                  <div
                    key={item.id}
                    role="menuitem"
                    aria-disabled="true"
                    className="px-4 py-2.5 text-sm text-gray-400 cursor-not-allowed"
                  >
                    <span className="block">{item.label}</span>
                    <span className="block text-[10px] text-gray-300">No disponible en esta vista</span>
                  </div>
                );
              }
              return (
                <button
                  key={item.id}
                  type="button"
                  role="menuitem"
                  onClick={() => handleItemClick(item.action)}
                  className={itemClass}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Cerrar Sesión */}
          <div className="border-t border-gray-100 py-1">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                close();
                logout();
              }}
              className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 hover:text-red-600 hover:bg-red-50 transition-colors ${FOCUS_RING}`}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              Cerrar Sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
