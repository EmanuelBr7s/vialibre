import { labelClass, errorClass, hintClass } from '@/components/ui/classes';
import Select from '@/components/ui/Select';

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
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <Select
        id={id}
        value={selectValue}
        disabled={disabled}
        aria-invalid={!!error || undefined}
        aria-describedby={`${helpId}${error ? ` ${errorId}` : ''}`}
        onChange={(event) => onChange(event.target.value === '' ? null : event.target.value)}
        className="disabled:opacity-60 disabled:bg-gray-50 disabled:cursor-not-allowed"
      >
        {optionsToRender.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>

      {error ? (
        <p id={errorId} role="alert" className={errorClass}>
          {error}
        </p>
      ) : null}

      {loading ? (
        <p id={helpId} className={hintClass}>
          Cargando opciones disponibles…
        </p>
      ) : error ? (
        <p id={helpId} className={hintClass}>
          Corrige el error de carga para poder asociar una referencia.
        </p>
      ) : options.length === 0 ? (
        <p id={helpId} className={hintClass}>
          No hay registros disponibles para seleccionar.
        </p>
      ) : showUnknown ? (
        <p id={helpId} className="mt-1 text-fluid-xs text-amber-700">
          El valor guardado no está en la lista de opciones. Se muestra como referencia no
          verificada.
        </p>
      ) : null}

      {notice ? (
        <p className="mt-1 text-fluid-xs text-amber-700">{UNVERIFIED_REFERENCE_NOTICE}</p>
      ) : null}
    </div>
  );
}
