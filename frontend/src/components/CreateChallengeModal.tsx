'use client';

import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import api from '@/lib/api';
import type { Challenge } from '@/types';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { FOCUS_RING, TOUCH_TARGET, TOUCH_TARGET_LG, inputClass, labelClass, errorClass, btnPrimary, btnSecondary } from '@/components/ui/classes';

interface CreateChallengeModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (challenge: Challenge) => void;
}

interface FieldErrors {
  title?: string;
  shortDescription?: string;
  longDescription?: string;
}

export default function CreateChallengeModal({
  open,
  onClose,
  onCreated,
}: CreateChallengeModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  const [title, setTitle] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [longDescription, setLongDescription] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [tags, setTags] = useState('');

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
    const all = ['title', 'shortDescription', 'longDescription'];
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
        difficulty,
        ...(parsedTags.length ? { tags: parsedTags } : {}),
      });
      onCreated(challenge);
      setSuccess('Problemática publicada con éxito.');
      setTitle('');
      setShortDescription('');
      setLongDescription('');
      setDifficulty('medium');
      setTags('');
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
    <div className="fixed inset-0 z-50 flex lg:items-center lg:justify-center bg-black/50 p-4" role="presentation">
      <div
        id="create-challenge-dialog"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-challenge-title"
        aria-describedby="create-challenge-desc"
        className="w-full max-w-lg max-h-[95vh] lg:max-h-[90vh] bg-white rounded-t-2xl lg:rounded-xl shadow-xl flex flex-col overflow-hidden animate-slide-up"
      >
        {/* Handle para bottom sheet */}
        <div className="bottom-sheet-handle lg:hidden" aria-hidden="true" />
        
        {/* Header sticky */}
        <header className="sticky top-0 bg-white border-b border-gray-200 p-4 lg:p-6 flex items-center justify-between">
          <h2 id="create-challenge-title" className="text-fluid-lg font-bold text-gray-900">
            Publicar Problemática
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className={`inline-flex items-center justify-center w-10 h-10 text-gray-400 hover:text-gray-600 text-2xl leading-none rounded-lg hover:bg-gray-100 ${TOUCH_TARGET_LG} ${FOCUS_RING} lg:w-8 lg:h-8 lg:text-xl`}
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <div id="create-challenge-desc" className="sr-only">
          Formulario para publicar una nueva problemática empresarial o de fundación.
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-5 pb-safe-bottom" noValidate>
          <div>
            <label htmlFor="title" className={labelClass}>
              Título de la problemática <span aria-hidden="true">*</span>
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
              placeholder="Ej: Modelo predictivo para rendimiento de cosechas"
              className={inputClass}
              inputMode="text"
            />
            {showError('title') && (
              <p id="title-error" className={errorClass} role="alert">
                {errors.title}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="shortDescription" className={labelClass}>
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
              placeholder="Resumen breve de la problemática"
              className={inputClass}
              inputMode="text"
            />
            {showError('shortDescription') && (
              <p id="shortDescription-error" className={errorClass} role="alert">
                {errors.shortDescription}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="longDescription" className={labelClass}>
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
              placeholder="Descripción detallada de la problemática…"
              className={`${inputClass} min-h-[140px]`}
              inputMode="text"
            />
            {showError('longDescription') && (
              <p id="longDescription-error" className={errorClass} role="alert">
                {errors.longDescription}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="difficulty" className={labelClass}>
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

          <div>
            <label htmlFor="tags" className={labelClass}>
              Etiquetas (separadas por coma)
            </label>
            <input
              id="tags"
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Python, ML, Agro"
              className={inputClass}
              inputMode="text"
            />
          </div>

          <div aria-live="polite" className="space-y-2">
            {error && (
              <div role="alert" className="text-fluid-sm text-red-600 bg-red-50 rounded-lg p-3 border border-red-200">
                {error}
              </div>
            )}
            {success && (
              <div role="status" className="text-fluid-sm text-green-700 bg-green-50 rounded-lg p-3 border border-green-200">
                {success}
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className={`${btnSecondary} w-full sm:w-auto`}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`${btnPrimary} w-full sm:w-auto`}
            >
              {submitting ? 'Publicando…' : 'Publicar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}