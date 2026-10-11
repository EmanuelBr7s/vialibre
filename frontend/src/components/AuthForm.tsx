'use client';

import { useState, type ChangeEvent, type FormEvent } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { PROMO_CONFIG } from '@/config/promo';
import { DEMO_ACCOUNTS } from '@/data/mock';
import { FOCUS_RING, TOUCH_TARGET, TOUCH_TARGET_LG, inputClass, labelClass, errorClass, hintClass, btnPrimary, navLinkClass, roleButtonClass } from '@/components/ui/classes';

type AuthMode = 'login' | 'register';
type RegisterRole = 'publicador' | 'solucionador';

interface FieldErrors {
  email?: string;
  password?: string;
  fullName?: string;
  empresaNombre?: string;
  nitEmpresa?: string;
  programaAcademico?: string;
}

interface AuthFormProps {
  mode: AuthMode;
}

export default function AuthForm({ mode }: AuthFormProps) {
  const { login, register, loading: authLoading } = useAuth();
  const [role, setRole] = useState<RegisterRole>('solucionador');

  // Auth fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register fields
  const [fullName, setFullName] = useState('');
  const [nitEmpresa, setNitEmpresa] = useState('');
  const [empresaNombre, setEmpresaNombre] = useState('');
  const [programaAcademico, setProgramaAcademico] = useState('');
  const [afiliacionAcademica, setAfiliacionAcademica] = useState('');

  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [demoBusy, setDemoBusy] = useState<string | null>(null);

  const isRegister = mode === 'register';

  // Los botones de acceso rápido solo aplican cuando el mockup está activo.
  const showDemo = process.env.NEXT_PUBLIC_API_MOCK === 'true';

  const handleDemoLogin = async (email: string) => {
    if (submitting || authLoading || demoBusy) return;
    setError(null);
    setDemoBusy(email);
    try {
      await login(email, 'demo');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setDemoBusy(null);
    }
  };

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};

    if (!email.trim()) {
      next.email = 'El email es obligatorio';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      next.email = 'Ingresa un email válido';
    }

    if (!password) {
      next.password = 'La contraseña es obligatoria';
    } else if (password.length < 8) {
      next.password = 'La contraseña debe tener al menos 8 caracteres';
    }

    if (isRegister) {
      if (!fullName.trim()) {
        next.fullName = 'Este campo es obligatorio';
      }
      if (role === 'publicador') {
        if (!empresaNombre.trim()) {
          next.empresaNombre = 'Este campo es obligatorio';
        }
        if (!nitEmpresa.trim()) {
          next.nitEmpresa = 'Este campo es obligatorio';
        }
      } else {
        if (!programaAcademico.trim()) {
          next.programaAcademico = 'Este campo es obligatorio';
        }
      }
    }

    return next;
  };

  const isFieldTouched = (name: string) => touched.includes(name);
  const showError = (name: keyof FieldErrors): boolean =>
    isFieldTouched(name) && !!errors[name];

  const handleBlur = (name: keyof FieldErrors) => {
    const newTouched = touched.includes(name) ? touched : [...touched, name];
    setTouched(newTouched);
    setErrors(validate());
  };

  const handleChange =
    (name: string, setter: (v: string) => void) => (e: ChangeEvent<HTMLInputElement>) => {
      setter(e.target.value);
      if (isFieldTouched(name)) setErrors(validate());
    };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const validation = validate();
    setErrors(validation);

    // Mark all fields as touched on submit so errors show immediately
    const allFields: string[] = ['email', 'password'];
    if (isRegister) allFields.push('fullName');
    if (isRegister && role === 'publicador') allFields.push('empresaNombre', 'nitEmpresa');
    if (isRegister && role === 'solucionador') allFields.push('programaAcademico');
    setTouched(Array.from(new Set([...touched, ...allFields])));

    if (Object.keys(validation).length > 0) return;
    if (authLoading) return;

    setError(null);
    setSubmitting(true);

    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register({
          email,
          password,
          full_name: fullName,
          role,
          ...(role === 'publicador'
            ? { nit_empresa: nitEmpresa, empresa_nombre: empresaNombre }
            : {
                programa_academico: programaAcademico,
                afiliacion_academica: afiliacionAcademica || undefined,
              }),
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setSubmitting(false);
    }
  };

  const fieldError = (name: keyof FieldErrors, id: string) =>
    showError(name) ? (
      <p id={id} className={errorClass} role="alert">
        {errors[name]}
      </p>
    ) : null;

  return (
    <div className="flex min-h-screen">
      {/* ── Lado A: Formulario ── */}
      <main id="main-content" tabIndex={-1} className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-white focus:outline-none safe-area-inset">
        <div className="w-full max-w-md">
          {/* Logo */}
          <header className="flex items-center gap-3 mb-8">
            <div className="w-11 h-11 bg-primary-600 rounded-lg flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-2xl">V</span>
            </div>
            <div>
              <h1 className="text-fluid-2xl font-bold text-gray-900">ViaLibre</h1>
              <p className="text-fluid-xs text-gray-500">Innovación Abierta</p>
            </div>
          </header>

          <h2 className="text-fluid-2xl font-bold text-gray-900 mb-1">
            {mode === 'login' ? 'Bienvenido de nuevo' : 'Crea tu cuenta'}
          </h2>
          <p className="text-fluid-sm text-gray-500 mb-6">
            {mode === 'login'
              ? 'Ingresa para explorar problemáticas y postularte.'
              : 'Únete a la red que conecta empresas con talento universitario.'}
          </p>

          {/* Navegación entre Login / Registro */}
          <nav aria-label="Modo de acceso" className="flex rounded-lg bg-gray-100 p-1 mb-6">
            <Link
              href="/login"
              aria-current={mode === 'login' ? 'page' : undefined}
              className={navLinkClass(mode === 'login')}
            >
              Iniciar Sesión
            </Link>
            <Link
              href="/register"
              aria-current={mode === 'register' ? 'page' : undefined}
              className={navLinkClass(mode === 'register')}
            >
              Registrarse
            </Link>
          </nav>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Role selection (register only) */}
            {isRegister && (
              <fieldset className="space-y-3">
                <legend className={labelClass}>Tipo de cuenta</legend>
                <div className="flex flex-col sm:flex-row gap-3" role="radiogroup" aria-label="Tipo de usuario">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={role === 'solucionador'}
                    onClick={() => setRole('solucionador')}
                    className={roleButtonClass(role === 'solucionador')}
                  >
                    <span className="font-medium">Solucionador</span>
                    <span className="block text-fluid-xs font-normal text-gray-400 hidden sm:block">
                      Estudiante / Semillero
                    </span>
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={role === 'publicador'}
                    onClick={() => setRole('publicador')}
                    className={roleButtonClass(role === 'publicador')}
                  >
                    <span className="font-medium">Publicador</span>
                    <span className="block text-fluid-xs font-normal text-gray-400 hidden sm:block">
                      Empresa / Fundación
                    </span>
                  </button>
                </div>
              </fieldset>
            )}

            {isRegister && (
              <div>
                <label htmlFor="fullName" className={labelClass}>
                  {role === 'publicador' ? 'Nombre de la empresa o fundación' : 'Nombre completo'}
                </label>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={handleChange('fullName', setFullName)}
                  onBlur={() => handleBlur('fullName')}
                  required
                  aria-invalid={!!errors.fullName}
                  aria-describedby={errors.fullName ? 'fullName-error' : undefined}
                  placeholder={role === 'publicador' ? 'Empresa Ejemplo S.A.S' : 'Juan Pérez'}
                  className={inputClass}
                  inputMode="text"
                  autoComplete="name"
                />
                {fieldError('fullName', 'fullName-error')}
              </div>
            )}

            {isRegister && role === 'publicador' && (
              <div className="space-y-5">
                <div>
                  <label htmlFor="empresaNombre" className={labelClass}>
                    Nombre comercial
                  </label>
                  <input
                    id="empresaNombre"
                    type="text"
                    value={empresaNombre}
                    onChange={handleChange('empresaNombre', setEmpresaNombre)}
                    onBlur={() => handleBlur('empresaNombre')}
                    required
                    aria-invalid={!!errors.empresaNombre}
                    aria-describedby={errors.empresaNombre ? 'empresaNombre-error' : undefined}
                    placeholder="Nombre comercial de la empresa"
                    className={inputClass}
                    inputMode="text"
                    autoComplete="organization"
                  />
                  {fieldError('empresaNombre', 'empresaNombre-error')}
                </div>
                <div>
                  <label htmlFor="nitEmpresa" className={labelClass}>
                    NIT
                  </label>
                  <input
                    id="nitEmpresa"
                    type="text"
                    value={nitEmpresa}
                    onChange={handleChange('nitEmpresa', setNitEmpresa)}
                    onBlur={() => handleBlur('nitEmpresa')}
                    required
                    aria-invalid={!!errors.nitEmpresa}
                    aria-describedby={errors.nitEmpresa ? 'nitEmpresa-error' : undefined}
                    placeholder="900.123.456-7"
                    className={inputClass}
                    inputMode="text"
                  />
                  {fieldError('nitEmpresa', 'nitEmpresa-error')}
                </div>
              </div>
            )}

            {isRegister && role === 'solucionador' && (
              <div className="space-y-5">
                <div>
                  <label htmlFor="programaAcademico" className={labelClass}>
                    Programa académico
                  </label>
                  <input
                    id="programaAcademico"
                    type="text"
                    value={programaAcademico}
                    onChange={handleChange('programaAcademico', setProgramaAcademico)}
                    onBlur={() => handleBlur('programaAcademico')}
                    required
                    aria-invalid={!!errors.programaAcademico}
                    aria-describedby={errors.programaAcademico ? 'programaAcademico-error' : undefined}
                    placeholder="Ingeniería de Sistemas"
                    className={inputClass}
                    inputMode="text"
                  />
                  {fieldError('programaAcademico', 'programaAcademico-error')}
                </div>
                <div>
                  <label htmlFor="afiliacionAcademica" className={labelClass}>
                    Afiliación académica (opcional)
                  </label>
                  <input
                    id="afiliacionAcademica"
                    type="text"
                    value={afiliacionAcademica}
                    onChange={(e) => setAfiliacionAcademica(e.target.value)}
                    placeholder="Rama estudiantil IEEE, semillero…"
                    className={inputClass}
                    inputMode="text"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className={labelClass}>Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={handleChange('email', setEmail)}
                onBlur={() => handleBlur('email')}
                required
                autoComplete="email"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'email-error' : undefined}
                placeholder="tu@correo.com"
                className={inputClass}
                inputMode="email"
              />
              {fieldError('email', 'email-error')}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="password" className={labelClass}>Contraseña</label>
                {mode === 'login' && (
                  <span className={hintClass}>Mínimo 8 caracteres</span>
                )}
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={handleChange('password', setPassword)}
                onBlur={() => handleBlur('password')}
                required
                minLength={8}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? 'password-error' : undefined}
                placeholder="••••••••"
                className={inputClass}
                inputMode="text"
              />
              {fieldError('password', 'password-error')}
            </div>

            <div aria-live="polite">
              {error && (
                <div role="alert" className="text-fluid-sm text-red-600 bg-red-50 rounded-lg p-3 border border-red-200">
                  {error}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting || authLoading}
              className={`${btnPrimary} w-full`}
            >
              {submitting
                ? 'Procesando…'
                : mode === 'login'
                ? 'Entrar'
                : 'Crear cuenta'}
            </button>
          </form>

          {/* Acceso rápido demo (solo visible en modo mockup) */}
          {showDemo && mode === 'login' && (
            <section aria-label="Acceso rápido de demostración" className="mt-8">
              <div className="flex items-center gap-3 mb-4">
                <span className="h-px flex-1 bg-gray-200" aria-hidden="true" />
                <span className="text-fluid-xs text-gray-400 uppercase tracking-wider">
                  Acceso rápido (demo)
                </span>
                <span className="h-px flex-1 bg-gray-200" aria-hidden="true" />
              </div>

              <div className="space-y-2">
                {DEMO_ACCOUNTS.map((account) => (
                  <button
                    key={account.email}
                    type="button"
                    onClick={() => handleDemoLogin(account.email)}
                    disabled={demoBusy !== null || submitting || authLoading}
                    aria-busy={demoBusy === account.email}
                    className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg border border-gray-200 hover:border-primary-500 hover:bg-primary-50 text-left transition disabled:opacity-60 ${TOUCH_TARGET} ${FOCUS_RING}`}
                  >
                    <span className="min-w-0">
                      <span className="block text-fluid-sm font-medium text-gray-900">
                        {account.label}
                      </span>
                      <span className="block text-fluid-xs text-gray-500 truncate">
                        {account.description}
                      </span>
                    </span>
                    <span className="shrink-0 text-fluid-xs font-medium text-gray-400">
                      {demoBusy === account.email ? 'Entrando…' : 'Entrar →'}
                    </span>
                  </button>
                ))}
              </div>

              <p className="mt-3 text-fluid-xs text-gray-400">
                Con el modo mock activo no se requiere backend: entra como cada rol y prueba el
                flujo completo.
              </p>
            </section>
          )}
        </div>
      </main>

      {/* ── Lado B: Panel Promocional (solo desktop) ── */}
      <aside aria-label="Información institucional" className="flex-1 hidden lg:flex items-center justify-center p-12 bg-gradient-to-br from-primary-700 via-primary-600 to-secondary-600 text-white">
        {PROMO_CONFIG.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={PROMO_CONFIG.image_url}
            alt={PROMO_CONFIG.title}
            className="w-full h-full object-cover rounded-2xl"
          />
        ) : (
          <div className="max-w-lg">
            <div className="mb-8">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-4" aria-hidden="true">
                <span className="text-white font-bold text-2xl">V</span>
              </div>
              <p className="text-sm uppercase tracking-widest text-primary-200">
                {PROMO_CONFIG.institution}
              </p>
            </div>

            <h2 className="text-fluid-3xl font-bold mb-4 leading-tight">
              {PROMO_CONFIG.title}
            </h2>
            <p className="text-fluid-lg text-primary-100 mb-8">{PROMO_CONFIG.subtitle}</p>

            <ul className="space-y-4">
              {PROMO_CONFIG.features.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <span className="mt-1 w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0" aria-hidden="true">
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </span>
                  <span className="text-primary-50">{feature}</span>
                </li>
              ))}
            </ul>

            <p className="mt-10 text-fluid-sm text-primary-200 border-t border-white/20 pt-6">
              {PROMO_CONFIG.footer}
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}