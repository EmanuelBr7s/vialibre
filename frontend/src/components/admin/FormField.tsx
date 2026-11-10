import { inputClass, labelClass, errorClass, FOCUS_RING, TOUCH_TARGET } from '@/components/ui/classes';

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
}: TextFieldProps) {
  const errorId = `${id}-error`;
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

interface TextAreaFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  rows?: number;
}

/** Labeled multiline input used for free-text notes. */
export function TextAreaField({
  id,
  label,
  value,
  onChange,
  error = null,
  rows = 3,
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
