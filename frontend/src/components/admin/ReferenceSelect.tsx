import Link from 'next/link';
import { labelClass, errorClass, hintClass, FOCUS_RING } from '@/components/ui/classes';
import Combobox from '@/components/ui/Combobox';

export interface ReferenceOption {
  value: string;
  label: string;
  /** Segunda línea opcional de la opción. */
  description?: string;
}

/** Aviso mientras `empresa_id`/`tutor_docente_id` no se validan en el servidor. */
export const UNVERIFIED_REFERENCE_NOTICE =
  'La empresa y el tutor se guardan como referencia: confirma que sigan activos antes de formalizar.';

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
  /** Texto y destino para registrar el primer elemento cuando la lista está vacía. */
  emptyText?: string;
  emptyAction?: { href: string; label: string };
  /** Texto de la opción que deja el campo sin valor. */
  clearLabel?: string;
  required?: boolean;
  /** Error de validación del formulario (no deshabilita el campo). */
  fieldError?: string | null;
}

/**
 * Selector de referencia (UUID) con búsqueda y estados de carga/error/vacío.
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
  emptyText = 'No hay registros disponibles para seleccionar.',
  emptyAction,
  clearLabel = 'Sin asignar',
  required = false,
  fieldError = null,
}: ReferenceSelectProps) {
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;
  const fieldErrorId = `${id}-field-error`;

  const valueInOptions = value !== null && options.some((o) => o.value === value);
  const showUnknown = value !== null && !valueInOptions;

  const comboOptions: ReferenceOption[] =
    showUnknown && value !== null
      ? [...options, { value, label: `…${value.slice(-4)} (${unknownLabel})` }]
      : options;

  const disabled = loading || error !== null;
  const isEmpty = !loading && !error && options.length === 0;
  // 9: solo se referencian los textos de ayuda que de verdad están en pantalla.
  const hasHelp = loading || !!error || isEmpty || showUnknown;
  const describedBy = [fieldError ? fieldErrorId : null, error ? errorId : null, hasHelp ? helpId : null]
    .filter(Boolean)
    .join(' ');
  const placeholder = loading
    ? 'Cargando…'
    : error
    ? 'No se pudieron cargar las opciones'
    : clearLabel;

  return (
    <div>
      <label id={`${id}-label`} htmlFor={id} className={labelClass}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      <Combobox
        id={id}
        options={comboOptions}
        value={value ?? ''}
        onChange={(next) => onChange(next === '' ? null : next)}
        placeholder={placeholder}
        clearLabel={clearLabel}
        disabled={disabled}
        invalid={!!error || !!fieldError}
        describedBy={describedBy || undefined}
        required={required}
        noOptionsText={emptyText}
      />

      {fieldError ? (
        <p id={fieldErrorId} role="alert" className={errorClass}>
          {fieldError}
        </p>
      ) : null}

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
      ) : isEmpty ? (
        <p id={helpId} className={hintClass}>
          {emptyText}
          {emptyAction ? (
            <>
              {' '}
              <Link
                href={emptyAction.href}
                className={`font-medium text-primary-600 underline hover:text-primary-700 rounded ${FOCUS_RING}`}
              >
                {emptyAction.label}
              </Link>
            </>
          ) : null}
        </p>
      ) : showUnknown ? (
        <p id={helpId} className="mt-1 text-fluid-xs text-amber-700">
          El valor guardado no está en la lista de opciones. Se muestra como referencia no
          verificada.
        </p>
      ) : null}

      {notice ? <p className="mt-1 text-fluid-xs text-amber-700">{UNVERIFIED_REFERENCE_NOTICE}</p> : null}
    </div>
  );
}
