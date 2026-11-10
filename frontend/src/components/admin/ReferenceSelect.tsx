import { INPUT_FOCUS } from '@/components/ui/classes';

export interface ReferenceOption {
  value: string;
  label: string;
}

/** Texto obligatorio mientras `empresa_id`/`tutor_docente_id` no se validan. */
export const UNVERIFIED_REFERENCE_NOTICE =
  'El backend todavía no verifica la existencia de esta asociación. La selección no garantiza que la referencia sea válida al guardar.';

interface ReferenceSelectProps {
  id: string;
  label: string;
  options: ReferenceOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  loading?: boolean;
  error?: string | null;
  notice?: boolean;
  /** Valor presente en los datos pero ausente de las opciones cargadas. */
  unknownLabel?: string;
}

/**
 * Selector de referencia (UUID) con estados de carga/error/vacío.
 *
 * No permite introducir UUID arbitrarios: en caso de error queda deshabilitado
 * y si el valor actual no está entre las opciones se muestra como referencia
 * no verificada en lugar de sustituirlo.
 */
export default function ReferenceSelect({
  id,
  label,
  options,
  value,
  onChange,
  loading = false,
  error = null,
  notice = false,
  unknownLabel = 'referencia no verificada',
}: ReferenceSelectProps) {
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;

  const valueInOptions = value !== null && options.some((o) => o.value === value);
  const showUnknown = value !== null && !valueInOptions;

  const optionsToRender: ReferenceOption[] = [];
  if (loading) {
    optionsToRender.push({ value: '', label: 'Cargando…' });
  } else if (error) {
    optionsToRender.push({ value: '', label: 'No se pudieron cargar las opciones' });
  } else {
    optionsToRender.push({ value: '', label: 'Sin asignar' });
    optionsToRender.push(...options);
    if (showUnknown && value !== null) {
      optionsToRender.push({ value, label: `${value} (${unknownLabel})` });
    }
  }

  const disabled = loading || error !== null;
  const selectValue = value !== null && (valueInOptions || showUnknown) ? value : '';

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <select
        id={id}
        value={selectValue}
        disabled={disabled}
        aria-invalid={!!error || undefined}
        aria-describedby={`${helpId}${error ? ` ${errorId}` : ''}`}
        onChange={(event) => onChange(event.target.value === '' ? null : event.target.value)}
        className={`w-full px-4 py-3 rounded-lg border border-gray-300 ${INPUT_FOCUS} bg-white text-gray-900 disabled:opacity-60 disabled:bg-gray-50`}
      >
        {optionsToRender.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {error ? (
        <p id={errorId} role="alert" className="mt-1 text-xs text-red-600">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p id={helpId} className="mt-1 text-xs text-gray-500">
          Cargando opciones disponibles…
        </p>
      ) : error ? (
        <p id={helpId} className="mt-1 text-xs text-gray-500">
          Corrige el error de carga para poder asociar una referencia.
        </p>
      ) : options.length === 0 ? (
        <p id={helpId} className="mt-1 text-xs text-gray-500">
          No hay registros disponibles para seleccionar.
        </p>
      ) : showUnknown ? (
        <p id={helpId} className="mt-1 text-xs text-amber-700">
          El valor guardado no está en la lista de opciones. Se muestra como referencia no
          verificada.
        </p>
      ) : null}

      {notice ? (
        <p className="mt-1 text-xs text-amber-700">{UNVERIFIED_REFERENCE_NOTICE}</p>
      ) : null}
    </div>
  );
}
