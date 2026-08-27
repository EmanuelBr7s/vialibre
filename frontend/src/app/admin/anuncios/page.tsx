'use client';

import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { useRoleGuard } from '@/hooks/useRoleGuard';
import { useAdvertisement } from '@/contexts/AdvertisementContext';
import { currentAd, type AdSlot } from '@/data/ads';
import { FOCUS_RING, TOUCH_TARGET, inputClass } from '@/components/ui/classes';

function toLocalInput(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(value: string): string {
  if (!value) return '';
  return new Date(value).toISOString();
}

interface FormState {
  empresa: string;
  title: string;
  description: string;
  image_url: string;
  link_url: string;
  expiration: string;
}

export default function AdminAnunciosPage() {
  const allowed = useRoleGuard('admin');
  const { ad, updateAd } = useAdvertisement();
  const [form, setForm] = useState<FormState>({
    empresa: ad?.empresa || '',
    title: ad?.title || '',
    description: ad?.description || '',
    image_url: ad?.image_url || '',
    link_url: ad?.link_url || '',
    expiration: toLocalInput(ad?.expiration_date),
  });
  const [saved, setSaved] = useState(false);

  // Sincroniza el formulario cuando el anuncio global cambia (ej. reset).
  useEffect(() => {
    setForm({
      empresa: ad?.empresa || '',
      title: ad?.title || '',
      description: ad?.description || '',
      image_url: ad?.image_url || '',
      link_url: ad?.link_url || '',
      expiration: toLocalInput(ad?.expiration_date),
    });
  }, [ad]);

  if (!allowed) {
    return (
      <div role="status" className="flex min-h-screen items-center justify-center text-gray-500">
        Cargando…
      </div>
    );
  }

  const set = (key: keyof FormState) => (value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  // Actualiza el anuncio en vivo (lo refleja el bloque del Sidebar).
  const applyLive = (next: FormState) => {
    updateAd({
      id: ad?.id || 'ad-001',
      empresa: next.empresa || undefined,
      title: next.title,
      description: next.description,
      image_url: next.image_url || undefined,
      link_url: next.link_url || undefined,
      expiration_date: fromLocalInput(next.expiration),
    });
  };

  const handleSave = () => {
    applyLive(form);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  };

  const handleReset = () => {
    if (currentAd) {
      updateAd(currentAd);
    }
  };

  const preview: AdSlot | null = {
    id: ad?.id || 'ad-001',
    empresa: form.empresa || undefined,
    title: form.title,
    description: form.description,
    image_url: form.image_url || undefined,
    link_url: form.link_url || undefined,
    expiration_date: fromLocalInput(form.expiration),
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar challenges={[]} />

      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 p-4 sm:p-6 lg:p-8 focus:outline-none"
      >
        <header className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Gestión de Anuncios / Pautas
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Espacio publicitario único (Single Paid Ad Slot). Los cambios se aplican en vivo.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Formulario */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
            className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4"
          >
            <div>
              <label htmlFor="empresa" className="block text-sm font-medium text-gray-700 mb-1">
                Empresa anunciante
              </label>
              <input
                id="empresa"
                type="text"
                value={form.empresa}
                onChange={(e) => set('empresa')(e.target.value)}
                placeholder="SoftCaribe S.A.S"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="titulo" className="block text-sm font-medium text-gray-700 mb-1">
                Título del anuncio
              </label>
              <input
                id="titulo"
                type="text"
                value={form.title}
                onChange={(e) => set('title')(e.target.value)}
                placeholder="SoftCaribe"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700 mb-1">
                Descripción
              </label>
              <textarea
                id="descripcion"
                value={form.description}
                onChange={(e) => set('description')(e.target.value)}
                rows={3}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="imagen" className="block text-sm font-medium text-gray-700 mb-1">
                URL de la imagen
              </label>
              <input
                id="imagen"
                type="url"
                value={form.image_url}
                onChange={(e) => set('image_url')(e.target.value)}
                placeholder="https://…/imagen.jpg"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="enlace" className="block text-sm font-medium text-gray-700 mb-1">
                Enlace de destino
              </label>
              <input
                id="enlace"
                type="url"
                value={form.link_url}
                onChange={(e) => set('link_url')(e.target.value)}
                placeholder="https://…"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="vencimiento" className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de vencimiento
              </label>
              <input
                id="vencimiento"
                type="datetime-local"
                value={form.expiration}
                onChange={(e) => set('expiration')(e.target.value)}
                className={inputClass}
              />
            </div>

            <div aria-live="polite">
              {saved && (
                <div role="status" className="text-sm text-green-700 bg-green-50 rounded-lg p-3 border border-green-200">
                  Anuncio guardado y aplicado en vivo.
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="submit"
                className={`flex-1 px-4 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 transition ${TOUCH_TARGET} ${FOCUS_RING}`}
              >
                Guardar anuncio y aplicar
              </button>
              <button
                type="button"
                onClick={handleReset}
                className={`flex-1 px-4 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 ${TOUCH_TARGET} ${FOCUS_RING}`}
              >
                Restablecer ejemplo
              </button>
            </div>
          </form>

          {/* Vista previa en vivo */}
          <section
            aria-label="Vista previa del anuncio"
            className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 self-start"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Vista previa</h2>
            <p className="text-xs text-gray-500 mb-4">
              Así se ve el anuncio en el bloque publicitario del sidebar.
            </p>

            <a
              href={preview.link_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block overflow-hidden rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
            >
              {preview.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview.image_url}
                  alt={preview.title}
                  className="w-full h-32 object-cover bg-gray-100"
                />
              ) : (
                <div
                  className="w-full h-32 bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white"
                  aria-hidden="true"
                >
                  <span className="text-2xl font-bold">
                    {(preview.title || 'A').charAt(0)}
                  </span>
                </div>
              )}
              <div className="p-3">
                {preview.empresa && (
                  <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                    {preview.empresa}
                  </p>
                )}
                <p className="text-sm font-semibold text-gray-900">{preview.title}</p>
                <p className="text-xs text-gray-500 mt-1">{preview.description}</p>
              </div>
            </a>

            <p className="text-xs text-gray-400 mt-4">
              El anuncio se muestra solo si la fecha actual es anterior a la de vencimiento.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
