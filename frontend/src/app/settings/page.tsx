'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { useTour } from '@/contexts/TourContext';
import { UserRole } from '@/types';
import { isTalentRole } from '@/lib/constants';
import { FOCUS_RING, TOUCH_TARGET, TOUCH_TARGET_LG, inputClass, labelClass, errorClass, hintClass, btnPrimary, btnSecondary } from '@/components/ui/classes';
import Select from '@/components/ui/Select';

interface SettingsState {
  notifPostulaciones: boolean;
  notifNuevosRetos: boolean;
  idioma: 'es' | 'en';
  privacidadDatos: boolean;
  nitVisible: boolean;
  canales: string[];
  perfilVisible: boolean;
  intereses: string;
  alertasEspecialidad: boolean;
  especialidades: string;
  paramsSistema: string;
  frecuenciaBackups: string;
  correosAuto: boolean;
}

const DEFAULT_SETTINGS: SettingsState = {
  notifPostulaciones: true,
  notifNuevosRetos: true,
  idioma: 'es',
  privacidadDatos: true,
  nitVisible: false,
  canales: ['email'],
  perfilVisible: true,
  intereses: '',
  alertasEspecialidad: true,
  especialidades: '',
  paramsSistema: '',
  frecuenciaBackups: 'semanal',
  correosAuto: true,
};

const ROLE_LABEL: Record<UserRole, { tab: string; title: string }> = {
  [UserRole.PUBLICADOR]: { tab: 'Organización', title: 'Ajustes de la organización' },
  [UserRole.SOLUCIONADOR]: { tab: 'Perfil académico', title: 'Ajustes de tu perfil académico' },
  [UserRole.EGRESADO]: { tab: 'Perfil profesional', title: 'Ajustes de tu perfil profesional' },
  [UserRole.ADMIN]: { tab: 'Sistema', title: 'Parámetros del sistema' },
};

const CHANNELS = [
  { id: 'email', label: 'Correo electrónico' },
  { id: 'telefono', label: 'Teléfono' },
  { id: 'whatsapp', label: 'WhatsApp' },
];

function settingsKey(role: UserRole): string {
  return `vialibre-settings-${role}`;
}

function loadSettings(role: UserRole): SettingsState {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(settingsKey(role));
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<SettingsState>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function Switch({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
}) {
  const id = `switch-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <div className="min-w-0">
        <span className="block text-fluid-sm text-gray-700">{label}</span>
        {description && <span className="block text-fluid-xs text-gray-500">{description}</span>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors ${
          checked ? 'bg-primary-600 border-primary-600' : 'bg-gray-200 border-gray-300'
        } ${FOCUS_RING}`}
      >
        <span
          aria-hidden="true"
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

type TabId = 'general' | 'role';

export default function SettingsPage() {
  const { user, isAuthenticated, loading } = useAuth();
  const { setPanelOpen } = useAccessibility();
  const { start: startTour } = useTour();
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [activeTab, setActiveTab] = useState<TabId>('general');
  const [saved, setSaved] = useState(false);
  const [passFields, setPassFields] = useState({ current: '', next: '', confirm: '' });
  const [passError, setPassError] = useState<string | null>(null);

  const role = user?.role;

  useEffect(() => {
    if (role) setSettings(loadSettings(role));
  }, [role]);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      window.location.href = '/login';
    }
  }, [loading, isAuthenticated]);

  if (loading || !isAuthenticated || !user || !role) {
    return (
      <div role="status" className="flex min-h-screen items-center justify-center text-gray-500">
        Cargando…
      </div>
    );
  }

  const update = (patch: Partial<SettingsState>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
    setSaved(false);
  };

  const toggleChannel = (id: string) => {
    const has = settings.canales.includes(id);
    update({
      canales: has ? settings.canales.filter((c) => c !== id) : [...settings.canales, id],
    });
  };

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    try {
      window.localStorage.setItem(settingsKey(role), JSON.stringify(settings));
    } catch {
      // almacenamiento no disponible
    }
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  };

  const handlePassword = (e: FormEvent) => {
    e.preventDefault();
    setPassError(null);
    if (!passFields.next || !passFields.confirm) {
      setPassError('Completa ambos campos para actualizar la contraseña.');
      return;
    }
    if (passFields.next !== passFields.confirm) {
      setPassError('Las contraseñas no coinciden.');
      return;
    }
    setSaved(true);
    setPassFields({ current: '', next: '', confirm: '' });
    window.setTimeout(() => setSaved(false), 2500);
  };

  const updatePass = (field: keyof typeof passFields) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setPassError(null);
    setPassFields((p) => ({ ...p, [field]: e.target.value }));
  };

  const tabs: { id: TabId; label: string }[] = [{ id: 'general', label: 'Generales' }];
  tabs.push({ id: 'role', label: ROLE_LABEL[role].tab });

  return (
    <div className="flex min-h-screen">
      <Sidebar challenges={[]} />

      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 p-4 sm:p-6 lg:p-8 max-w-4xl focus:outline-none"
      >
        <header className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-fluid-2xl font-bold text-gray-900">Configuración</h1>
            <p className="text-fluid-sm text-gray-500 mt-1">
              Ajustes de tu cuenta, seguridad y preferencias según tu rol.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPanelOpen(true)}
            className={`inline-flex items-center gap-2 px-4 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 ${TOUCH_TARGET} ${FOCUS_RING} w-full sm:w-auto`}
          >
            <svg className="w-5 h-5 text-secondary-600" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 2a3 3 0 100 6 3 3 0 000-6zM12 9c-2.2 0-4.4 1-6.1 2.9l2.3 2.3c1.8-1.9 4.1-2.9 3.8-2.9.3 0 2 .6 3.8 1.9l2.3-2.3A8.1 8.1 0 0012 9z" />
            </svg>
            Accesibilidad
          </button>
        </header>

        {/* Pestañas - scrollable en móvil */}
        <div role="tablist" aria-label="Secciones de configuración" className="flex gap-1 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 border-b border-gray-200 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={activeTab === tab.id}
              aria-controls={`panel-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap px-4 py-2.5 text-fluid-sm font-medium rounded-t-lg border-b-2 -mb-px ${TOUCH_TARGET} ${
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              } ${FOCUS_RING}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div id="panel-general" role="tabpanel" aria-labelledby="tab-general" hidden={activeTab !== 'general'}>
          <form onSubmit={handlePassword} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6 space-y-4">
            <h2 className="text-fluid-lg font-semibold text-gray-900">Seguridad</h2>
            <div>
              <label htmlFor="pass-current" className={labelClass}>
                Contraseña actual
              </label>
              <input
                id="pass-current"
                type="password"
                autoComplete="current-password"
                value={passFields.current}
                onChange={updatePass('current')}
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="pass-next" className={labelClass}>
                  Nueva contraseña
                </label>
                <input
                  id="pass-next"
                  type="password"
                  autoComplete="new-password"
                  value={passFields.next}
                  onChange={updatePass('next')}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="pass-confirm" className={labelClass}>
                  Confirmar nueva contraseña
                </label>
                <input
                  id="pass-confirm"
                  type="password"
                  autoComplete="new-password"
                  value={passFields.confirm}
                  onChange={updatePass('confirm')}
                  className={inputClass}
                />
              </div>
            </div>
            {passError && (
              <p role="alert" className="text-fluid-sm text-red-600">
                {passError}
              </p>
            )}
            <button
              type="submit"
              className={`${btnPrimary} w-full sm:w-auto`}
            >
              Actualizar contraseña
            </button>
          </form>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6 space-y-2 mt-4">
            <h2 className="text-fluid-lg font-semibold text-gray-900">Notificaciones por correo</h2>
            <Switch
              checked={settings.notifPostulaciones}
              onChange={(v) => update({ notifPostulaciones: v })}
              label="Alertas de postulaciones"
              description="Recibe un correo cuando alguien se postula o tu postulación cambia de estado."
            />
            <Switch
              checked={settings.notifNuevosRetos}
              onChange={(v) => update({ notifNuevosRetos: v })}
              label="Nuevos retos"
              description="Recibe un correo cuando se publica una nueva problemática."
            />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6 space-y-2 mt-4">
            <h2 className="text-fluid-lg font-semibold text-gray-900">Idioma de la interfaz</h2>
            <fieldset>
              <legend className="sr-only">Idioma de la interfaz</legend>
              <div className="flex flex-wrap gap-4">
                {(['es', 'en'] as const).map((lang) => (
                  <label key={lang} className="inline-flex items-center gap-2 text-fluid-sm text-gray-700">
                    <input
                      type="radio"
                      name="idioma"
                      value={lang}
                      checked={settings.idioma === lang}
                      onChange={() => update({ idioma: lang })}
                      className="accent-primary-600"
                    />
                    {lang === 'es' ? 'Español' : 'English'}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6 space-y-3 mt-4">
            <h2 className="text-fluid-lg font-semibold text-gray-900">Recorrido guiado</h2>
            <p className="text-fluid-sm text-gray-500">
              Vuelve a la bienvenida y revisa de nuevo los tooltips del recorrido interactivo.
            </p>
            <button
              type="button"
              onClick={startTour}
              className={`${btnPrimary} w-full sm:w-auto`}
            >
              Reiniciar recorrido de bienvenida
            </button>
          </div>
        </div>

        <div id="panel-role" role="tabpanel" aria-labelledby="tab-role" hidden={activeTab !== 'role'}>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6 space-y-2">
            <h2 className="text-fluid-lg font-semibold text-gray-900">{ROLE_LABEL[role].title}</h2>

            {role === UserRole.PUBLICADOR && (
              <div className="space-y-2">
                <Switch
                  checked={settings.privacidadDatos}
                  onChange={(v) => update({ privacidadDatos: v })}
                  label="Privacidad de datos de la organización"
                  description="Oculta información sensible de tu organización a los solucionadores."
                />
                <Switch
                  checked={settings.nitVisible}
                  onChange={(v) => update({ nitVisible: v })}
                  label="Visibilidad del NIT en propuestas"
                  description="Muestra el NIT junto a tus propuestas y contactos."
                />
                <fieldset className="pt-2">
                  <legend className="text-fluid-sm font-medium text-gray-700 mb-1">
                    Canales de contacto preferidos
                  </legend>
                  <div className="flex flex-col gap-2">
                    {CHANNELS.map((ch) => (
                      <label key={ch.id} className="inline-flex items-center gap-2 text-fluid-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={settings.canales.includes(ch.id)}
                          onChange={() => toggleChannel(ch.id)}
                          className="accent-primary-600"
                        />
                        {ch.label}
                      </label>
                    ))}
                  </div>
                </fieldset>
              </div>
            )}

            {isTalentRole(role) && (
              <div className="space-y-2">
                <Switch
                  checked={settings.perfilVisible}
                  onChange={(v) => update({ perfilVisible: v })}
                  label="Visibilidad del perfil académico ante empresas"
                  description="Permite que los publicadores consulten tu perfil al evaluar postulaciones."
                />
                <div className="pt-2">
                  <label htmlFor="intereses" className={labelClass}>
                    Etiquetas de intereses / habilidades
                  </label>
                  <input
                    id="intereses"
                    type="text"
                    value={settings.intereses}
                    onChange={(e) => update({ intereses: e.target.value })}
                    placeholder="Python, Ciencia de datos, Agro"
                    className={inputClass}
                  />
                </div>
                <Switch
                  checked={settings.alertasEspecialidad}
                  onChange={(v) => update({ alertasEspecialidad: v })}
                  label="Alertas de problemáticas de tu especialidad"
                  description="Recibe avisos de retos afines a tus intereses."
                />
                <div>
                  <label htmlFor="especialidades" className={labelClass}>
                    Especialidades de interés
                  </label>
                  <input
                    id="especialidades"
                    type="text"
                    value={settings.especialidades}
                    onChange={(e) => update({ especialidades: e.target.value })}
                    placeholder="Agricultura, TI, Manufactura"
                    className={inputClass}
                  />
                </div>
              </div>
            )}

            {role === UserRole.ADMIN && (
              <div className="space-y-2">
                <div>
                  <label htmlFor="params" className={labelClass}>
                    Parámetros del sistema
                  </label>
                  <textarea
                    id="params"
                    rows={3}
                    value={settings.paramsSistema}
                    onChange={(e) => update({ paramsSistema: e.target.value })}
                    placeholder="Configuración global de la plataforma…"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="backups" className={labelClass}>
                    Frecuencia de respaldos
                  </label>
                  <Select
                    icon="respaldo"
                    id="backups"
                    value={settings.frecuenciaBackups}
                    onChange={(e) => update({ frecuenciaBackups: e.target.value })}
                  >
                    <option value="diaria">Diaria</option>
                    <option value="semanal">Semanal</option>
                    <option value="mensual">Mensual</option>
                  </Select>
                </div>
                <Switch
                  checked={settings.correosAuto}
                  onChange={(v) => update({ correosAuto: v })}
                  label="Correos automáticos de plataforma"
                  description="Emails transaccionales y notificaciones del sistema."
                />
              </div>
            )}
          </div>
        </div>

        <form onSubmit={handleSave} className="mt-6 flex flex-col sm:flex-row items-center gap-3">
          <button
            type="submit"
            className={`${btnPrimary} w-full sm:w-auto`}
          >
            Guardar cambios
          </button>
          <div aria-live="polite">
            {saved && (
              <span role="status" className="text-fluid-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                Cambios guardados.
              </span>
            )}
          </div>
        </form>
      </main>
    </div>
  );
}