import type { SelectHTMLAttributes } from 'react';
import { INPUT_SURFACE } from '@/components/ui/classes';

// Trazos de los íconos (24×24, trazo 2), mismo estilo que el resto de la app.
const ICON_PATHS = {
  academico: [
    'M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222',
  ],
  grupo: [
    'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
  ],
  calendario: ['M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'],
  ubicacion: [
    'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z',
    'M15 11a3 3 0 11-6 0 3 3 0 016 0z',
  ],
  maletin: [
    'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  ],
  nivel: [
    'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  ],
  mensaje: [
    'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
  ],
  respaldo: [
    'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
  ],
} as const;

export type SelectIcon = keyof typeof ICON_PATHS;

function Icon({ paths, className }: { paths: readonly string[]; className: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      {paths.map((d) => (
        <path key={d} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} />
      ))}
    </svg>
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  /** Ícono a la izquierda que indica qué se elige. */
  icon?: SelectIcon;
  /** Relleno reducido, para formularios compactos como el modal de publicación. */
  compact?: boolean;
}

/**
 * Desplegable nativo con el estilo de la app: ícono, flecha propia y texto
 * atenuado mientras el valor está vacío (''). Sigue siendo un <select>, así que
 * conserva el teclado, los lectores de pantalla y la lista nativa en móvil.
 */
export default function Select({ icon, compact = false, className = '', value, children, ...props }: SelectProps) {
  const empty = value === '';
  const padding = compact
    ? `py-2 pr-10 ${icon ? 'pl-10' : 'pl-3'}`
    : `py-3 pr-11 ${icon ? 'pl-11' : 'pl-4'}`;
  const inset = 'px-3';

  return (
    <div className="relative">
      {icon && (
        <span className={`pointer-events-none absolute inset-y-0 left-0 flex items-center ${inset} text-gray-400`}>
          <Icon paths={ICON_PATHS[icon]} className="w-5 h-5" />
        </span>
      )}
      <select
        value={value}
        {...props}
        className={`${INPUT_SURFACE} ${padding} appearance-none cursor-pointer truncate ${
          empty ? 'text-gray-500' : 'text-gray-900'
        } [&>option]:text-gray-900 ${className}`}
      >
        {children}
      </select>
      <span className={`pointer-events-none absolute inset-y-0 right-0 flex items-center ${inset} text-gray-500`}>
        <Icon paths={['M19 9l-7 7-7-7']} className="w-4 h-4" />
      </span>
    </div>
  );
}
