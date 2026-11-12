'use client';

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { FOCUS_RING, TOUCH_TARGET, TOUCH_TARGET_LG, inputClass, labelClass, errorClass, hintClass, btnPrimary, btnSecondary } from '@/components/ui/classes';
import type { ExtendedProfile, ProfileUpdatePayload } from '@/types';
import {
  AfiliacionAcademica,
  PreferredChannel,
  ProgramaAcademico,
  Semestre,
  Ubicacion,
  UserRole,
} from '@/types';
import Select from '@/components/ui/Select';

const AVATAR_ACCEPT = 'image/jpeg,image/png,image/webp';
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

type Role = UserRole.SOLUCIONADOR | UserRole.PUBLICADOR;
type NoticeTone = 'success' | 'error';

interface FieldError {
  full_name?: string;
  phone?: string;
  second_email?: string;
  bio?: string;
  programa_academico?: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
  anio_egreso?: string;
  cargo?: string;
  departamento?: string;
  enlaces_corporativos?: string;
}

interface FormState {
  full_name: string;
  phone: string;
  second_email: string;
  location: string;
  bio: string;
  programa_academico: string;
  afiliacion_academica: string;
  linkedin: string;
  github: string;
  portfolio: string;
  skills: string[];
  soft_skills: string[];
  semestre: string;
  anio_egreso: string;
  cargo: string;
  departamento: string;
  enlaces_corporativos: string[];
  canal_preferido: PreferredChannel;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0]?.charAt(0) ?? '';
  const last = parts[parts.length - 1]?.charAt(0) ?? '';
  return (first + last).toUpperCase();
}

function isValidUrl(value: string): boolean {
  if (!value.trim()) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

interface FieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  required?: boolean;
  type?: string;
  placeholder?: string;
  maxLength?: number;
  hint?: string;
  inputMode?: 'text' | 'email' | 'tel' | 'url' | 'numeric' | 'decimal' | 'search' | 'none';
  autoComplete?: string;
}

function Field({
  id,
  label,
  value,
  onChange,
  onBlur,
  error,
  required,
  type = 'text',
  placeholder,
  maxLength,
  hint,
  inputMode,
  autoComplete,
}: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        required={required}
        maxLength={maxLength}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={inputClass}
        inputMode={inputMode}
        autoComplete={autoComplete}
      />
      {maxLength && value.length > 0 && (
        <p id={`${id}-count`} className="mt-1 text-right text-fluid-xs text-gray-400" aria-hidden="true">
          {value.length}/{maxLength}
        </p>
      )}
      {hint && !error && (
        <p id={`${id}-hint`} className={hintClass}>
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className={errorClass} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

interface ChipInputProps {
  id: string;
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  tone?: 'primary' | 'secondary';
}

const CHIP_TONE = {
  primary: 'bg-primary-50 text-primary-700',
  secondary: 'bg-secondary-50 text-secondary-700',
};

/** Lista de etiquetas editable: Enter o coma agrega, Retroceso quita la última. */
function ChipInput({ id, label, values, onChange, placeholder, tone = 'primary' }: ChipInputProps) {
  const [input, setInput] = useState('');

  const add = () => {
    const value = input.trim().replace(/,+$/, '').replace(/^,/, '');
    if (value && !values.includes(value)) onChange([...values, value]);
    setInput('');
  };

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add();
      return;
    }
    if (e.key === 'Backspace' && input === '' && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  };

  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={add}
        placeholder={placeholder}
        aria-describedby={`${id}-hint`}
        className={inputClass}
        inputMode="text"
      />
      <p id={`${id}-hint`} className={hintClass}>
        Presiona Enter o coma para agregar. Borra con Retroceso para quitar la última.
      </p>
      {values.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0" aria-label={`${label} agregadas`}>
          {values.map((value) => (
            <li key={value}>
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-fluid-xs font-medium whitespace-nowrap ${CHIP_TONE[tone]}`}>
                {value}
                <button
                  type="button"
                  onClick={() => onChange(values.filter((v) => v !== value))}
                  aria-label={`Quitar ${value}`}
                  className={`p-0.5 rounded-full opacity-70 hover:opacity-100 ${TOUCH_TARGET} ${FOCUS_RING}`}
                >
                  ×
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface SectionProps {
  title: string;
  children: ReactNode;
}

function Section({ title, children }: SectionProps) {
  return (
    <fieldset className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6">
      <legend className="sr-only">{title}</legend>
      <h3 className="text-fluid-base font-semibold text-gray-900 mb-1">{title}</h3>
      <div className="mt-4 sm:mt-5 space-y-4 sm:space-y-5">{children}</div>
    </fieldset>
  );
}

interface NoticeProps {
  tone: NoticeTone;
  text: string;
}

function Notice({ tone, text }: NoticeProps) {
  return tone === 'success' ? (
    <div role="status" className="text-fluid-sm text-green-700 bg-green-50 rounded-lg p-3 border border-green-200">
      {text}
    </div>
  ) : (
    <div role="alert" className="text-fluid-sm text-red-600 bg-red-50 rounded-lg p-3 border border-red-200">
      {text}
    </div>
  );
}

interface ProfileEditorProps {
  role: Role;
}

export default function ProfileEditor({ role }: ProfileEditorProps) {
  const { user, updateUser } = useAuth();
  const {
    loading: profileLoading,
    extended,
    avatarUrl,
    saveExtended,
    saveAvatarBlob,
    removeAvatar,
  } = useProfile();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialForm = (): FormState => ({
    full_name: user?.full_name || '',
    phone: user?.phone || '',
    second_email: '',
    location: user?.ubicacion || '',
    bio: user?.bio || '',
    programa_academico: user?.programa_academico || '',
    afiliacion_academica: user?.afiliacion_academica || '',
    linkedin: user?.linkedin_url || '',
    github: user?.github_url || '',
    portfolio: user?.portfolio_url || '',
    skills: user?.skills ?? [],
    soft_skills: user?.soft_skills ?? [],
    semestre: user?.semestre || '',
    anio_egreso: user?.anio_egreso ? String(user.anio_egreso) : '',
    cargo: '',
    departamento: '',
    enlaces_corporativos: [],
    canal_preferido: PreferredChannel.CORREO,
  });

  const [form, setForm] = useState<FormState>(initialForm);
  const [touched, setTouched] = useState<string[]>([]);
  const [errors, setErrors] = useState<FieldError>({});
  const [notice, setNotice] = useState<{ tone: NoticeTone; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [enlaceInput, setEnlaceInput] = useState('');
  const isGraduate = user?.role === UserRole.EGRESADO;

  // Hidrata los campos extendidos persistidos en el navegador.
  useEffect(() => {
    if (!extended) return;
    setForm((prev) => ({
      ...prev,
      second_email: extended.second_email || '',
      cargo: extended.cargo || '',
      departamento: extended.departamento || '',
      enlaces_corporativos: extended.enlaces_corporativos || [],
      canal_preferido: extended.canal_preferido || PreferredChannel.CORREO,
    }));
  }, [extended]);

  const touch = (name: string) => {
    setTouched((prev) => (prev.includes(name) ? prev : [...prev, name]));
  };

  const isTouched = (name: string) => touched.includes(name);
  const showError = (name: keyof FieldError): string | undefined =>
    isTouched(name) ? errors[name] : undefined;

  const setField = (name: keyof FormState) => (value: string) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const validate = (): FieldError => {
    const next: FieldError = {};
    if (form.full_name.trim().length < 3) {
      next.full_name = 'El nombre debe tener al menos 3 caracteres';
    }
    if (form.phone.trim() && !/^\+?[0-9()\-\s]{7,15}$/.test(form.phone.trim())) {
      next.phone = 'Ingresa un número de teléfono válido (7 a 15 dígitos).';
    }
    if (form.second_email.trim() && !isValidEmail(form.second_email)) {
      next.second_email = 'Ingresa un correo electrónico válido.';
    }
    if (form.bio.length > 500) {
      next.bio = 'La biografía no puede superar los 500 caracteres.';
    }
    if (role === UserRole.SOLUCIONADOR && !form.programa_academico) {
      next.programa_academico = 'Selecciona tu programa académico.';
    }
    if (form.linkedin.trim() && !isValidUrl(form.linkedin)) {
      next.linkedin = 'Ingresa una URL válida (https://…).';
    }
    if (form.github.trim() && !isValidUrl(form.github)) {
      next.github = 'Ingresa una URL válida (https://…).';
    }
    if (form.portfolio.trim() && !isValidUrl(form.portfolio)) {
      next.portfolio = 'Ingresa una URL válida (https://…).';
    }
    const year = Number(form.anio_egreso);
    if (form.anio_egreso.trim() && (!Number.isInteger(year) || year < 1960 || year > 2100)) {
      next.anio_egreso = 'Ingresa un año válido (p. ej. 2024).';
    }
    if (role === UserRole.PUBLICADOR && form.cargo.trim().length < 2) {
      next.cargo = 'Indica tu cargo dentro de la organización.';
    }
    const invalidLinks = form.enlaces_corporativos.filter((link) => !isValidUrl(link));
    if (invalidLinks.length > 0) {
      next.enlaces_corporativos =
        'Uno o más enlaces no son URL válidas (https://…). Revísalos.';
    }
    return next;
  };

  const markAllTouched = () => {
    setTouched((prev) =>
      Array.from(
        new Set([
          ...prev,
          'full_name',
          'phone',
          'second_email',
          'bio',
          'programa_academico',
          'linkedin',
          'github',
          'portfolio',
          'anio_egreso',
          'cargo',
          'departamento',
          'enlaces_corporativos',
        ])
      )
    );
  };

  const showSuccess = () => {
    setNotice({ tone: 'success', text: 'Cambios guardados correctamente.' });
    window.setTimeout(() => setNotice(null), 4000);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setNotice(null);
    const validation = validate();
    setErrors(validation);
    markAllTouched();

    if (Object.keys(validation).length > 0) {
      return;
    }

    setSaving(true);
    try {
      const payload: ProfileUpdatePayload = {
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || null,
        bio: form.bio.trim() || null,
        ubicacion: (form.location as Ubicacion) || null,
      };
      if (role === UserRole.SOLUCIONADOR) {
        payload.programa_academico = form.programa_academico as ProgramaAcademico;
        if (form.afiliacion_academica) {
          payload.afiliacion_academica = form.afiliacion_academica as AfiliacionAcademica;
        }
        payload.skills = form.skills;
        payload.soft_skills = form.soft_skills;
        payload.linkedin_url = form.linkedin.trim() || null;
        payload.github_url = form.github.trim() || null;
        payload.portfolio_url = form.portfolio.trim() || null;
        if (isGraduate) {
          payload.anio_egreso = form.anio_egreso.trim() ? Number(form.anio_egreso) : null;
        } else {
          payload.semestre = (form.semestre as Semestre) || null;
        }
      }
      if (role === UserRole.PUBLICADOR && form.full_name.trim()) {
        payload.empresa_nombre = form.full_name.trim();
      }

      await updateUser(payload);

      const extendedProfile: ExtendedProfile = {
        second_email: form.second_email.trim() || undefined,
        cargo: role === UserRole.PUBLICADOR ? form.cargo.trim() || undefined : undefined,
        departamento: role === UserRole.PUBLICADOR ? form.departamento.trim() || undefined : undefined,
        enlaces_corporativos:
          role === UserRole.PUBLICADOR ? form.enlaces_corporativos : [],
        canal_preferido: form.canal_preferido,
      };
      saveExtended(extendedProfile);
      showSuccess();
    } catch (err) {
      setNotice({
        tone: 'error',
        text: err instanceof Error ? err.message : 'No se pudieron guardar los cambios.',
      });
    } finally {
      setSaving(false);
    }
  };

  // ── Avatar ──
  const handleAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setAvatarError(null);

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setAvatarError('Formato no soportado. Usa JPEG, PNG o WebP.');
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      setAvatarError('La imagen supera el límite de 2 MB.');
      return;
    }

    setAvatarBusy(true);
    try {
      await saveAvatarBlob(file);
      setNotice({ tone: 'success', text: 'Foto de perfil actualizada.' });
      window.setTimeout(() => setNotice(null), 4000);
    } catch {
      setAvatarError('No se pudo guardar la foto. Inténtalo de nuevo.');
    } finally {
      setAvatarBusy(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setAvatarError(null);
    setAvatarBusy(true);
    try {
      await removeAvatar(false);
      setNotice({ tone: 'success', text: 'Foto de perfil eliminada.' });
      window.setTimeout(() => setNotice(null), 4000);
    } catch {
      setAvatarError('No se pudo eliminar la foto. Inténtalo de nuevo.');
    } finally {
      setAvatarBusy(false);
    }
  };

  // ── Chips (enlaces corporativos) ──
  const addEnlace = () => {
    const value = enlaceInput.trim().replace(/,+$/, '').replace(/^,/, '');
    if (!value) return;
    if (form.enlaces_corporativos.includes(value)) {
      setEnlaceInput('');
      return;
    }
    setForm((prev) => ({
      ...prev,
      enlaces_corporativos: [...prev.enlaces_corporativos, value],
    }));
    setEnlaceInput('');
  };

  const handleEnlaceKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addEnlace();
    }
  };

  const removeEnlace = (link: string) => {
    setForm((prev) => ({
      ...prev,
      enlaces_corporativos: prev.enlaces_corporativos.filter((l) => l !== link),
    }));
  };

  if (profileLoading) {
    return (
      <div
        role="status"
        aria-label="Cargando perfil"
        className="flex items-center justify-center p-10 text-gray-500"
      >
        Cargando perfil…
      </div>
    );
  }

  const avatarSrc = avatarUrl || user?.avatar_url || null;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {/* Región de anuncios accesibles */}
      <div aria-live="polite" className="space-y-2">
        {notice && <Notice tone={notice.tone} text={notice.text} />}
        {avatarError && <Notice tone="error" text={avatarError} />}
      </div>

      {/* ── Avatar / foto de perfil ── */}
      <fieldset className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6">
        <legend className="sr-only">Foto de perfil</legend>
        <h3 className="text-fluid-base font-semibold text-gray-900 mb-1">Foto de perfil</h3>
        <p className="text-fluid-xs text-gray-500">JPEG, PNG o WebP · máx. 2 MB</p>

        <div className="mt-5 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
          <div className="relative shrink-0">
            <div
              className="w-24 h-24 rounded-full bg-primary-100 border border-primary-200 flex items-center justify-center overflow-hidden"
              aria-hidden="true"
            >
              {avatarSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarSrc} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-primary-700 font-semibold text-2xl">
                  {getInitials(user?.full_name || '')}
                </span>
              )}
            </div>
            {avatarBusy && (
              <span
                className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center"
                aria-hidden="true"
              >
                <span className="animate-spin h-6 w-6 border-2 border-white border-t-transparent rounded-full" />
              </span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <input
              ref={fileInputRef}
              id="avatar-file"
              type="file"
              accept={AVATAR_ACCEPT}
              onChange={handleAvatarChange}
              className="sr-only"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarBusy}
              aria-busy={avatarBusy}
              className={`${btnPrimary} w-full sm:w-auto`}
            >
              {avatarBusy && (
                <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" aria-hidden="true" />
              )}
              {avatarBusy ? 'Guardando foto…' : 'Cambiar foto'}
            </button>
            {avatarSrc && (
              <button
                type="button"
                onClick={handleRemoveAvatar}
                disabled={avatarBusy}
                className={`${btnSecondary} w-full sm:w-auto border-red-300 text-red-600 hover:bg-red-50`}
              >
                Eliminar foto
              </button>
            )}
          </div>
        </div>
      </fieldset>

      {/* ── Datos Generales ── */}
      <Section title="Datos Generales">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          <Field
            id="full_name"
            label={role === UserRole.PUBLICADOR ? 'Nombre de la organización' : 'Nombre completo'}
            value={form.full_name}
            onChange={setField('full_name')}
            onBlur={() => {
              touch('full_name');
              setErrors(validate());
            }}
            error={showError('full_name')}
            required
            inputMode="text"
            autoComplete={role === UserRole.PUBLICADOR ? 'organization' : 'name'}
          />
          <Field
            id="phone"
            label="Teléfono"
            value={form.phone}
            onChange={setField('phone')}
            onBlur={() => {
              touch('phone');
              setErrors(validate());
            }}
            error={showError('phone')}
            placeholder="+57 300 000 0000"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          <Field
            id="second_email"
            label="Correo de contacto alternativo"
            value={form.second_email}
            onChange={setField('second_email')}
            onBlur={() => {
              touch('second_email');
              setErrors(validate());
            }}
            error={showError('second_email')}
            type="email"
            inputMode="email"
            autoComplete="email"
          />
          <div>
            <label htmlFor="location" className={labelClass}>
              Ubicación
            </label>
            <Select
              icon="ubicacion"
              id="location"
              value={form.location}
              onChange={(e) => setField('location')(e.target.value)}
            >
              <option value="">Sin especificar</option>
              {Object.values(Ubicacion).map((opcion) => (
                <option key={opcion} value={opcion}>
                  {opcion}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div>
          <label htmlFor="bio" className={labelClass}>
            Biografía corta
          </label>
          <textarea
            id="bio"
            value={form.bio}
            onChange={(e) => {
              const value = e.target.value.slice(0, 500);
              setForm((prev) => ({ ...prev, bio: value }));
            }}
            onBlur={() => {
              touch('bio');
              setErrors(validate());
            }}
            rows={4}
            maxLength={500}
            aria-invalid={showError('bio') ? true : undefined}
            aria-describedby={showError('bio') ? 'bio-error' : 'bio-hint'}
            placeholder="Cuéntanos brevemente quién eres…"
            className={`${inputClass} min-h-[120px]`}
            inputMode="text"
          />
          <div className="mt-1 flex items-center justify-between gap-4">
            <p id="bio-hint" className={hintClass}>
              Máximo 500 caracteres.
            </p>
            <p className="text-fluid-xs text-gray-400" aria-hidden="true">
              {form.bio.length}/500
            </p>
          </div>
          {showError('bio') && (
            <p id="bio-error" className={errorClass} role="alert">
              {errors.bio}
            </p>
          )}
        </div>
      </Section>

      {/* ── Bloque Solucionador ── */}
      {role === UserRole.SOLUCIONADOR && (
        <Section title={isGraduate ? 'Información Profesional' : 'Información Académica'}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            <div>
              <label htmlFor="programa_academico" className={labelClass}>
                Programa académico
                <span aria-hidden="true"> *</span>
              </label>
              <Select
                icon="academico"
                id="programa_academico"
                value={form.programa_academico}
                onChange={(e) => setField('programa_academico')(e.target.value)}
                onBlur={() => {
                  touch('programa_academico');
                  setErrors(validate());
                }}
                required
                aria-invalid={showError('programa_academico') ? true : undefined}
                aria-describedby={showError('programa_academico') ? 'programa_academico-error' : undefined}
              >
                <option value="" disabled>
                  Selecciona tu programa
                </option>
                {Object.values(ProgramaAcademico).map((opcion) => (
                  <option key={opcion} value={opcion}>
                    {opcion}
                  </option>
                ))}
              </Select>
              {showError('programa_academico') && (
                <p id="programa_academico-error" className={errorClass} role="alert">
                  {errors.programa_academico}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="afiliacion_academica" className={labelClass}>
                Semillero / Rama estudiantil
              </label>
              <Select
                icon="grupo"
                id="afiliacion_academica"
                value={form.afiliacion_academica}
                onChange={(e) => setField('afiliacion_academica')(e.target.value)}
              >
                <option value="">Sin especificar</option>
                {Object.values(AfiliacionAcademica).map((opcion) => (
                  <option key={opcion} value={opcion}>
                    {opcion}
                  </option>
                ))}
              </Select>
            </div>
            {isGraduate ? (
              <Field
                id="anio_egreso"
                label="Año de egreso"
                value={form.anio_egreso}
                onChange={setField('anio_egreso')}
                onBlur={() => {
                  touch('anio_egreso');
                  setErrors(validate());
                }}
                error={showError('anio_egreso')}
                placeholder="2024"
              />
            ) : (
              <div>
                <label htmlFor="semestre" className={labelClass}>
                  Semestre
                </label>
                <Select
                  icon="calendario"
                  id="semestre"
                  value={form.semestre}
                  onChange={(e) => setField('semestre')(e.target.value)}
                >
                  <option value="">Sin especificar</option>
                  {Object.values(Semestre).map((opcion) => (
                    <option key={opcion} value={opcion}>
                      {opcion}
                    </option>
                  ))}
                </Select>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
            <Field
              id="linkedin"
              label="LinkedIn"
              value={form.linkedin}
              onChange={setField('linkedin')}
              onBlur={() => {
                touch('linkedin');
                setErrors(validate());
              }}
              error={showError('linkedin')}
              placeholder="https://linkedin.com/in/usuario"
              type="url"
              inputMode="url"
            />
            <Field
              id="github"
              label="GitHub"
              value={form.github}
              onChange={setField('github')}
              onBlur={() => {
                touch('github');
                setErrors(validate());
              }}
              error={showError('github')}
              placeholder="https://github.com/usuario"
              type="url"
              inputMode="url"
            />
            <Field
              id="portfolio"
              label="Portafolio personal"
              value={form.portfolio}
              onChange={setField('portfolio')}
              onBlur={() => {
                touch('portfolio');
                setErrors(validate());
              }}
              error={showError('portfolio')}
              placeholder="https://mi-portafolio.com"
              type="url"
              inputMode="url"
            />
          </div>

          <ChipInput
            id="skills"
            label="Habilidades técnicas"
            values={form.skills}
            onChange={(skills) => setForm((prev) => ({ ...prev, skills }))}
            placeholder="Python, Excel avanzado, AutoCAD… y presiona Enter"
          />
          <ChipInput
            id="soft_skills"
            label="Habilidades blandas"
            values={form.soft_skills}
            onChange={(soft_skills) => setForm((prev) => ({ ...prev, soft_skills }))}
            placeholder="Liderazgo, comunicación asertiva… y presiona Enter"
            tone="secondary"
          />
        </Section>
      )}

      {/* ── Bloque Publicador ── */}
      {role === UserRole.PUBLICADOR && (
        <Section title="Información de la Organización">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            <Field
              id="cargo"
              label="Cargo dentro de la organización"
              value={form.cargo}
              onChange={setField('cargo')}
              onBlur={() => {
                touch('cargo');
                setErrors(validate());
              }}
              error={showError('cargo')}
              required
              placeholder="Director de Innovación"
              inputMode="text"
            />
            <Field
              id="departamento"
              label="Área / Departamento"
              value={form.departamento}
              onChange={setField('departamento')}
              onBlur={() => {
                touch('departamento');
                setErrors(validate());
              }}
              error={showError('departamento')}
              placeholder="Innovación y Tecnología"
              inputMode="text"
            />
          </div>

          <div>
            <label htmlFor="canal_preferido" className={labelClass}>
              Canal de comunicación preferido
            </label>
            <Select
              icon="mensaje"
              id="canal_preferido"
              value={form.canal_preferido}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, canal_preferido: e.target.value as PreferredChannel }))
              }
            >
              <option value={PreferredChannel.CORREO}>Correo electrónico</option>
              <option value={PreferredChannel.TELEFONO}>Teléfono</option>
              <option value={PreferredChannel.WHATSAPP}>WhatsApp</option>
            </Select>
          </div>

          <div>
            <label htmlFor="enlaces_corporativos" className={labelClass}>
              Enlaces corporativos
            </label>
            <input
              id="enlaces_corporativos"
              type="text"
              value={enlaceInput}
              onChange={(e) => setEnlaceInput(e.target.value)}
              onKeyDown={handleEnlaceKeyDown}
              placeholder="https://empresa.com — presiona Enter"
              aria-invalid={showError('enlaces_corporativos') ? true : undefined}
              aria-describedby={
                showError('enlaces_corporativos')
                  ? 'enlaces_corporativos-error'
                  : 'enlaces_corporativos-hint'
              }
              className={inputClass}
              inputMode="url"
            />
            <p id="enlaces_corporativos-hint" className={hintClass}>
              Presiona Enter para agregar cada enlace.
            </p>
            {showError('enlaces_corporativos') && (
              <p id="enlaces_corporativos-error" className={errorClass} role="alert">
                {errors.enlaces_corporativos}
              </p>
            )}
            {form.enlaces_corporativos.length > 0 && (
              <ul className="mt-3 space-y-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0" aria-label="Enlaces corporativos agregados">
                {form.enlaces_corporativos.map((link) => (
                  <li
                    key={link}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 rounded-lg border border-gray-200 px-3 py-2 text-fluid-sm text-gray-700 whitespace-nowrap"
                  >
                    <span className="truncate">{link}</span>
                    <button
                      type="button"
                      onClick={() => removeEnlace(link)}
                      aria-label={`Quitar enlace ${link}`}
                      className={`shrink-0 px-3 py-1.5 rounded-lg text-fluid-xs font-medium text-gray-400 hover:text-red-600 hover:bg-red-50 ${TOUCH_TARGET} ${FOCUS_RING}`}
                    >
                      Quitar
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Section>
      )}

      {/* Acciones */}
      <div className="flex flex-col sm:flex-row sm:justify-end gap-3 bg-gray-50 rounded-xl border border-gray-200 p-4">
        <button
          type="submit"
          disabled={saving || avatarBusy}
          aria-busy={saving}
          className={`${btnPrimary} w-full sm:w-auto`}
        >
          {saving && (
            <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" aria-hidden="true" />
          )}
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  );
}