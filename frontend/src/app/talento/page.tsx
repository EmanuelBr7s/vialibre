'use client';

import { useEffect, useState, type KeyboardEvent } from 'react';
import Sidebar from '@/components/Sidebar';
import CvPreviewModal from '@/components/CvPreviewModal';
import SkeletonBlock from '@/components/ui/SkeletonBlock';
import { useRoleGuard } from '@/hooks/useRoleGuard';
import api from '@/lib/api';
import { TALENT_TABS } from '@/data/modules';
import type { ChallengeTipo, User } from '@/types';
import { FOCUS_RING, TOUCH_TARGET, inputClass } from '@/components/ui/classes';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase() || '?';
}

function TalentCard({ person, onOpenCv, cvLoading }: { person: User; onOpenCv: () => void; cvLoading: boolean }) {
  const nivel =
    person.role === 'egresado'
      ? person.anio_egreso
        ? `Egresado ${person.anio_egreso}`
        : 'Egresado'
      : person.semestre || 'Estudiante';
  const links = [
    { label: 'LinkedIn', href: person.linkedin_url },
    { label: 'GitHub', href: person.github_url },
    { label: 'Portafolio', href: person.portfolio_url },
  ].filter((l): l is { label: string; href: string } => !!l.href);

  return (
    <article className="w-full bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col">
      <header className="flex items-start gap-3">
        <div
          className="w-14 h-14 shrink-0 rounded-full bg-primary-100 border border-primary-200 overflow-hidden flex items-center justify-center"
          aria-hidden="true"
        >
          {person.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={person.avatar_url} alt="" className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <span className="text-primary-700 font-semibold">{initials(person.full_name)}</span>
          )}
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-gray-900 truncate">{person.full_name}</h2>
          <p className="text-xs text-gray-600">
            {person.programa_academico} · {nivel}
          </p>
          {(person.ubicacion || person.afiliacion_academica) && (
            <p className="text-xs text-gray-500 mt-0.5">
              {[person.afiliacion_academica, person.ubicacion].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
      </header>

      {person.bio && <p className="text-sm text-gray-600 mt-3 line-clamp-3">{person.bio}</p>}

      {person.skills.length > 0 && (
        <ul className="flex flex-wrap gap-1.5 mt-3" aria-label="Habilidades técnicas">
          {person.skills.slice(0, 6).map((s) => (
            <li key={s} className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-primary-50 text-primary-700">
              {s}
            </li>
          ))}
        </ul>
      )}
      {person.soft_skills.length > 0 && (
        <ul className="flex flex-wrap gap-1.5 mt-2" aria-label="Habilidades blandas">
          {person.soft_skills.slice(0, 4).map((s) => (
            <li key={s} className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-secondary-50 text-secondary-700">
              {s}
            </li>
          ))}
        </ul>
      )}

      {links.length > 0 && (
        <p className="flex flex-wrap gap-x-3 mt-3 text-xs">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`font-medium text-primary-600 hover:text-primary-700 underline rounded ${FOCUS_RING}`}
            >
              {l.label}
              <span className="sr-only"> de {person.full_name} (abre en otra pestaña)</span>
            </a>
          ))}
        </p>
      )}

      <div className="mt-auto pt-4 flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={onOpenCv}
          disabled={!person.cv_filename || cvLoading}
          aria-busy={cvLoading}
          className={`flex-1 inline-flex items-center justify-center px-3 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed ${TOUCH_TARGET} ${FOCUS_RING}`}
        >
          {cvLoading ? 'Cargando CV…' : person.cv_filename ? 'Ver hoja de vida' : 'Sin hoja de vida'}
        </button>
        <a
          href={`mailto:${person.email}`}
          className={`flex-1 inline-flex items-center justify-center px-3 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 ${TOUCH_TARGET} ${FOCUS_RING}`}
        >
          Contactar
        </a>
      </div>
    </article>
  );
}

export default function BancoTalentoPage() {
  const allowed = useRoleGuard(['publicador', 'admin']);
  const [tab, setTab] = useState<ChallengeTipo>('practica');
  const [q, setQ] = useState('');
  const [programa, setPrograma] = useState('');
  const [conCv, setConCv] = useState(false);
  const [people, setPeople] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cvOpen, setCvOpen] = useState<{ url: string; fileName: string; name: string } | null>(null);
  const [cvLoadingId, setCvLoadingId] = useState<string | null>(null);

  const current = TALENT_TABS.find((t) => t.id === tab) ?? TALENT_TABS[0];

  // Búsqueda con espera corta para no consultar en cada tecla.
  useEffect(() => {
    if (!allowed) return;
    let active = true;
    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const res = await api.searchTalent({ ...current.params, q: q.trim(), programa: programa.trim(), con_cv: conCv, limit: 48 });
        if (!active) return;
        setPeople(res.users);
        setTotal(res.total);
        setError(null);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'No se pudo cargar el banco de hojas de vida');
      } finally {
        if (active) setLoading(false);
      }
    }, 300);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [allowed, current, q, programa, conCv]);

  const openCv = async (person: User) => {
    if (!person.cv_filename) return;
    setCvLoadingId(person.id);
    try {
      const url = await api.getUserCvBlobUrl(person.id);
      setCvOpen({ url, fileName: person.cv_filename, name: person.full_name });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo abrir la hoja de vida');
    } finally {
      setCvLoadingId(null);
    }
  };

  const handleTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const index = TALENT_TABS.findIndex((t) => t.id === tab);
    const step = e.key === 'ArrowRight' ? 1 : TALENT_TABS.length - 1;
    const next = TALENT_TABS[(index + step) % TALENT_TABS.length];
    setTab(next.id);
    document.getElementById(`talent-tab-${next.id}`)?.focus();
  };

  if (!allowed) {
    return (
      <div role="status" className="flex min-h-screen items-center justify-center text-gray-500">
        Cargando…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar challenges={[]} />

      <main id="main-content" tabIndex={-1} className="flex-1 p-4 sm:p-6 lg:p-8 focus:outline-none">
        <header className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Banco de Hojas de Vida</h1>
          <p className="text-sm text-gray-500 mt-1 max-w-3xl">
            Perfiles de estudiantes, egresados y pupilos del Laboratorio de Innovación de la
            Universidad Libre. Filtra por habilidades o programa y revisa su hoja de vida.
          </p>
        </header>

        <div role="tablist" aria-label="Tipo de perfil" className="flex gap-1 overflow-x-auto border-b border-gray-200 mb-4">
          {TALENT_TABS.map((t) => {
            const selected = t.id === tab;
            return (
              <button
                key={t.id}
                id={`talent-tab-${t.id}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls="talent-panel"
                tabIndex={selected ? 0 : -1}
                onClick={() => setTab(t.id)}
                onKeyDown={handleTabKeyDown}
                className={`shrink-0 px-4 -mb-px border-b-2 text-sm font-medium transition-colors ${TOUCH_TARGET} ${FOCUS_RING} ${
                  selected ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
        <p className="text-sm text-gray-600 mb-4">{current.description}</p>

        <form
          role="search"
          onSubmit={(e) => e.preventDefault()}
          className="grid grid-cols-1 md:grid-cols-[2fr_1fr_auto] gap-3 items-end mb-6"
        >
          <div>
            <label htmlFor="talent-q" className="block text-sm font-medium text-gray-700 mb-1">
              Buscar por habilidad, nombre o perfil
            </label>
            <input
              id="talent-q"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Python, contabilidad, liderazgo…"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="talent-programa" className="block text-sm font-medium text-gray-700 mb-1">
              Programa académico
            </label>
            <input
              id="talent-programa"
              type="search"
              value={programa}
              onChange={(e) => setPrograma(e.target.value)}
              placeholder="Ingeniería, Derecho…"
              className={inputClass}
            />
          </div>
          <label className={`inline-flex items-center gap-2 text-sm text-gray-700 ${TOUCH_TARGET}`}>
            <input
              type="checkbox"
              checked={conCv}
              onChange={(e) => setConCv(e.target.checked)}
              className="w-4 h-4 accent-primary-600"
            />
            Solo con hoja de vida
          </label>
        </form>

        {error && (
          <div role="alert" className="mb-6 text-sm text-red-600 bg-red-50 rounded-lg p-4 border border-red-200">
            {error}
          </div>
        )}

        <section id="talent-panel" role="tabpanel" aria-labelledby={`talent-tab-${tab}`} aria-busy={loading}>
          <p className="text-sm text-gray-500 mb-3" aria-live="polite">
            {loading ? 'Buscando…' : `${total} ${total === 1 ? 'perfil encontrado' : 'perfiles encontrados'}`}
          </p>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonBlock key={i} className="h-64 w-full" />
              ))}
            </div>
          ) : people.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-gray-300 p-8 text-center text-sm text-gray-600">
              No hay perfiles que coincidan con la búsqueda.
            </div>
          ) : (
            <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {people.map((person) => (
                <li key={person.id} className="flex">
                  <TalentCard
                    person={person}
                    onOpenCv={() => openCv(person)}
                    cvLoading={cvLoadingId === person.id}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      {cvOpen && (
        <CvPreviewModal
          url={cvOpen.url}
          fileName={cvOpen.fileName}
          title={`Hoja de vida de ${cvOpen.name}`}
          onClose={() => {
            URL.revokeObjectURL(cvOpen.url);
            setCvOpen(null);
          }}
        />
      )}
    </div>
  );
}
