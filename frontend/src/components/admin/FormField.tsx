import { inputClass, labelClass, errorClass, hintClass, FOCUS_RING, TOUCH_TARGET } from '@/components/ui/classes';
import Select from '@/components/ui/Select';

interface TextFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  type?: string;
  maxLength?: number;
  placeholder?: string;
  required?: boolean;
  /** Teclado sugerido en móvil (p. ej. 'numeric'). */
  inputMode?: 'text' | 'numeric' | 'email' | 'tel';
  min?: number;
  max?: number;
  /** Ayuda o aviso que no bloquea el envío. */
  hint?: string | null;
}

/** Labeled text input with inline validation message (a11y wired). */
export function TextField({
  id,
  label,
  value,
  onChange,
  error = null,
  type = 'text',
  maxLength,
  placeholder,
  required = false,
  inputMode,
  min,
  max,
  hint = null,
}: TextFieldProps) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ');
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        required={required}
        inputMode={inputMode}
        min={min}
        max={max}
        aria-invalid={!!error || undefined}
        aria-describedby={describedBy || undefined}
        onChange={(event) => onChange(event.target.value)}
        className={inputClass}
      />
      {error ? (
        <p id={errorId} role="alert" className={errorClass}>
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className={`${hintClass} text-amber-700`}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

interface SelectFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  error?: string | null;
  /** Texto de la opción vacía. */
  placeholder?: string;
}

/**
 * Desplegable de catálogo con etiqueta y error. Un valor guardado que ya no
 * está en el catálogo se conserva como «valor actual» en lugar de perderse.
 */
export function SelectField({
  id,
  label,
  value,
  onChange,
  options,
  error = null,
  placeholder = 'Sin especificar',
}: SelectFieldProps) {
  const errorId = `${id}-error`;
  const isLegacy = value !== '' && !options.some((option) => option.value === value);
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <Select
        id={id}
        value={value}
        aria-invalid={!!error || undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
        {isLegacy ? <option value={value}>{`${value} (valor actual)`}</option> : null}
      </Select>
      {error ? (
        <p id={errorId} role="alert" className={errorClass}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

interface TextAreaFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  rows?: number;
  maxLength?: number;
}

/** Labeled multiline input used for free-text notes. */
export function TextAreaField({
  id,
  label,
  value,
  onChange,
  error = null,
  rows = 3,
  maxLength,
}: TextAreaFieldProps) {
  const errorId = `${id}-error`;
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <textarea
        id={id}
        rows={rows}
        maxLength={maxLength}
        value={value}
        aria-invalid={!!error || undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => onChange(event.target.value)}
        className={inputClass}
      />
      {error ? (
        <p id={errorId} role="alert" className={errorClass}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

interface CheckboxFieldProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/** Accessible checkbox used for the `activo`/`activa`/`bilingue` flags. */
export function CheckboxField({ id, label, checked, onChange }: CheckboxFieldProps) {
  return (
    <div className={`flex items-center gap-2 ${TOUCH_TARGET}`}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className={`h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 ${FOCUS_RING}`}
      />
      <label htmlFor={id} className="text-fluid-sm font-medium text-gray-700">
        {label}
      </label>
    </div>
  );
}
