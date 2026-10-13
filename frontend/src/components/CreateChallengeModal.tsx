'use client';

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import api from '@/lib/api';
import type { Challenge, ChallengeTipo, Modalidad } from '@/types';
import { MODALIDAD_LABEL, MODULES, MODULE_BY_ID } from '@/data/modules';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { FOCUS_RING, TOUCH_TARGET } from '@/components/ui/classes';

interface CreateChallengeModalProps {
  open: boolean;
  /** Módulo preseleccionado (la pestaña activa del feed). */
  defaultTipo?: ChallengeTipo;
  onClose: () => void;
  onCreated: (challenge: Challenge) => void;
}

interface FieldErrors {
  title?: string;
  shortDescription?: string;
  longDescription?: string;
  imageUrl?: string;
}

const inputClass =
  'w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white text-gray-900';

export default function CreateChallengeModal({
  open,
  defaultTipo = 'reto',
  onClose,
  onCreated,
}: CreateChallengeModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  const [title, setTitle] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [longDescription, setLongDescription] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [tags, setTags] = useState('');
  const [tipo, setTipo] = useState<ChallengeTipo>(defaultTipo);
  const [modalidad, setModalidad] = useState<Modalidad | ''>('');
  const [ubicacion, setUbicacion] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  // Cada apertura parte del módulo de la pestaña activa.
  useEffect(() => {
    if (open) setTipo(defaultTipo);
  }, [open, defaultTipo]);

  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Esc + foco contenido en el modal + restauración del foco al cerrar.
  useFocusTrap(dialogRef, open, onClose);

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    if (title.trim().length < 5) {
      next.title = 'El título debe tener al menos 5 caracteres';
    }
    if (shortDescription.trim().length < 10) {
      next.shortDescription = 'La descripción corta debe tener al menos 10 caracteres';
    }
    if (longDescription.trim().length < 20) {
      next.longDescription = 'La descripción larga debe tener al menos 20 caracteres';
    }
    if (imageUrl.trim() && !/^(https?:\/\/|\/)\S+$/.test(imageUrl.trim())) {
      next.imageUrl = 'Ingresa una URL válida (https://…)';
    }
    return next;
  };

  const isTouched = (name: string) => touched.includes(name);
  const showError = (name: keyof FieldErrors): string | undefined =>
    isTouched(name) ? errors[name] : undefined;

  const handleBlur = (name: string) => {
    setTouched((prev) => (prev.includes(name) ? prev : [...prev, name]));
    setErrors(validate());
  };

  const handleTextChange =
    (setter: (v: string) => void) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setter(e.target.value);
    };

  const markAllTouched = () => {
    const all = ['title', 'shortDescription', 'longDescription', 'imageUrl'];
    setTouched((prev) => Array.from(new Set([...prev, ...all])));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const validation = validate();
    setErrors(validation);
    markAllTouched();

    if (Object.keys(validation).length > 0) return;

    const parsedTags = tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    setSubmitting(true);
    try {
      const challenge = await api.createChallenge({
        title: title.trim(),
        short_description: shortDescription.trim(),
        long_description: longDescription.trim(),
        tipo,
        ...(tipo === 'reto' ? { difficulty } : {}),
        ...(parsedTags.length ? { tags: parsedTags } : {}),
        ...(modalidad ? { modalidad } : {}),
        ...(ubicacion.trim() ? { ubicacion: ubicacion.trim() } : {}),
        ...(imageUrl.trim() ? { image_url: imageUrl.trim() } : {}),
      });
      onCreated(challenge);
      setSuccess(`${MODULE_BY_ID[tipo].singular} publicado con éxito.`);
      setTitle('');
      setShortDescription('');
      setLongDescription('');
      setDifficulty('medium');
      setTags('');
      setModalidad('');
      setUbicacion('');
      setImageUrl('');
      setTouched([]);
      setErrors({});
      // Cerrar tras un breve instante para que se vea el mensaje de éxito.
      window.setTimeout(() => {
        onClose();
        setSuccess(null);
      }, 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al publicar');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="presentation">
      <div
        id="create-challenge-dialog"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-challenge-title"
        aria-describedby="create-challenge-desc"
        className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 id="create-challenge-title" className="text-lg font-bold text-gray-900">
            Nueva publicación
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className={`inline-flex items-center justify-center w-10 h-10 text-gray-400 hover:text-gray-600 text-2xl leading-none rounded-lg hover:bg-gray-100 ${FOCUS_RING}`}
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <div id="create-challenge-desc" className="sr-only">
          Formulario para publicar un reto empresarial, una práctica o una oferta laboral.
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4" noValidate>
          <fieldset>
            <legend className="block text-sm font-medium text-gray-700 mb-2">
              ¿Qué quieres publicar?
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {MODULES.map((m) => (
                <label
                  key={m.id}
                  className={`flex items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium cursor-pointer text-center ${TOUCH_TARGET} ${
                    tipo === m.id
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  } has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary-600`}
                >
                  <input
                    type="radio"
                    name="tipo"
                    value={m.id}
                    checked={tipo === m.id}
                    onChange={() => setTipo(m.id)}
                    className="sr-only"
                  />
                  {m.label}
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Título <span aria-hidden="true">*</span>
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={handleTextChange(setTitle)}
              onBlur={() => handleBlur('title')}
              required
              aria-invalid={!!errors.title}
              aria-describedby={showError('title') ? 'title-error' : undefined}
              placeholder={
                tipo === 'empleo'
                  ? 'Ej: Analista contable junior'
                  : tipo === 'practica'
                    ? 'Ej: Practicante de desarrollo web'
                    : 'Ej: Modelo predictivo para rendimiento de cosechas'
              }
              className={inputClass}
            />
            {showError('title') && (
              <p id="title-error" className="mt-1 text-xs text-red-600" role="alert">
                {errors.title}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="shortDescription" className="block text-sm font-medium text-gray-700 mb-1">
              Descripción corta <span aria-hidden="true">*</span>
            </label>
            <input
              id="shortDescription"
              type="text"
              value={shortDescription}
              onChange={handleTextChange(setShortDescription)}
              onBlur={() => handleBlur('shortDescription')}
              required
              aria-invalid={!!errors.shortDescription}
              aria-describedby={showError('shortDescription') ? 'shortDescription-error' : undefined}
              placeholder="Resumen breve en una línea"
              className={inputClass}
            />
            {showError('shortDescription') && (
              <p id="shortDescription-error" className="mt-1 text-xs text-red-600" role="alert">
                {errors.shortDescription}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="longDescription" className="block text-sm font-medium text-gray-700 mb-1">
              Descripción larga <span aria-hidden="true">*</span>
            </label>
            <textarea
              id="longDescription"
              value={longDescription}
              onChange={handleTextChange(setLongDescription)}
              onBlur={() => handleBlur('longDescription')}
              required
              rows={5}
              aria-invalid={!!errors.longDescription}
              aria-describedby={showError('longDescription') ? 'longDescription-error' : undefined}
              placeholder="Responsabilidades, requisitos, beneficios o alcance del reto…"
              className={inputClass}
            />
            {showError('longDescription') && (
              <p id="longDescription-error" className="mt-1 text-xs text-red-600" role="alert">
                {errors.longDescription}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="modalidad" className="block text-sm font-medium text-gray-700 mb-1">
                Modalidad
              </label>
              <select
                id="modalidad"
                value={modalidad}
                onChange={(e) => setModalidad(e.target.value as Modalidad | '')}
                className={inputClass}
              >
                <option value="">Sin especificar</option>
                {(Object.keys(MODALIDAD_LABEL) as Modalidad[]).map((m) => (
                  <option key={m} value={m}>
                    {MODALIDAD_LABEL[m]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="ubicacion" className="block text-sm font-medium text-gray-700 mb-1">
                Ubicación
              </label>
              <input
                id="ubicacion"
                type="text"
                value={ubicacion}
                onChange={(e) => setUbicacion(e.target.value)}
                maxLength={120}
                placeholder="Barranquilla, Atlántico"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700 mb-1">
              Imagen de portada (URL, opcional)
            </label>
            <input
              id="imageUrl"
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              onBlur={() => handleBlur('imageUrl')}
              aria-invalid={!!errors.imageUrl}
              aria-describedby={showError('imageUrl') ? 'imageUrl-error' : undefined}
              placeholder="https://…"
              className={inputClass}
            />
            {showError('imageUrl') && (
              <p id="imageUrl-error" className="mt-1 text-xs text-red-600" role="alert">
                {errors.imageUrl}
              </p>
            )}
          </div>

          {tipo === 'reto' && (
          <div>
            <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700 mb-1">
              Dificultad
            </label>
            <select
              id="difficulty"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className={inputClass}
            >
              <option value="easy">Fácil</option>
              <option value="medium">Medio</option>
              <option value="hard">Difícil</option>
            </select>
          </div>
          )}

          <div>
            <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
              Etiquetas (separadas por coma)
            </label>
            <input
              id="tags"
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Python, ML, Agro"
              className={inputClass}
            />
          </div>

          <div aria-live="polite">
            {error && (
              <div role="alert" className="text-sm text-red-600 bg-red-50 rounded-lg p-3 border border-red-200">
                {error}
              </div>
            )}
            {success && (
              <div role="status" className="text-sm text-green-700 bg-green-50 rounded-lg p-3 border border-green-200">
                {success}
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 px-4 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 ${TOUCH_TARGET} ${FOCUS_RING}`}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`flex-1 px-4 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 disabled:opacity-60 ${TOUCH_TARGET} ${FOCUS_RING}`}
            >
              {submitting ? 'Publicando…' : 'Publicar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
