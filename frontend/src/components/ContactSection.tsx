'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import type { ChallengeTipo, ContactInfo, Interaction } from '@/types';
import { FOCUS_RING, TOUCH_TARGET, inputClass } from '@/components/ui/classes';
import SkeletonBlock from '@/components/ui/SkeletonBlock';

interface ContactSectionProps {
  challengeId: string;
  tipo: ChallengeTipo;
}

const APPLY_COPY: Record<ChallengeTipo, { intro: string; button: string }> = {
  reto: {
    intro: '¿Te interesa este reto? Postúlate con tu semillero o de forma individual; la empresa y el Laboratorio de Innovación revisarán tu propuesta.',
    button: 'Postularme a este reto',
  },
  practica: {
    intro: '¿Te interesa esta práctica? Postúlate y, si la empresa te selecciona, podrás cargar tus documentos y descargar tu carta de aval.',
    button: 'Postularme a esta práctica',
  },
  empleo: {
    intro: '¿Te interesa esta vacante? Postúlate; la empresa revisará tu perfil y tu hoja de vida.',
    button: 'Postularme a esta oferta',
  },
};

export default function ContactSection({ challengeId, tipo }: ContactSectionProps) {
  const [interaction, setInteraction] = useState<Interaction | null>(null);
  const [contactInfo, setContactInfo] = useState<ContactInfo | null>(null);
  const [message, setMessage] = useState('');
  const [applying, setApplying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Cargar interacciones del usuario para esta problemática
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { interactions } = await api.getMyInteractions({});
        const mine = interactions.find((i) => i.challenge_id === challengeId);
        if (!active) return;
        if (mine) {
          setInteraction(mine);
          if (mine.contact_unlocked) {
            const info = await api.getInteractionContactInfo(mine.id);
            if (active) setContactInfo(info);
          }
        }
      } catch {
        // no interactions or not authenticated
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [challengeId]);

  const handleApply = useCallback(async () => {
    setApplying(true);
    setError(null);
    setSuccess(null);
    try {
      const created = await api.applyToChallenge({
        challenge_id: challengeId,
        message: message || undefined,
      });
      setInteraction(created);
      setSuccess('Te postulaste correctamente. La empresa revisará tu perfil.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo postular');
    } finally {
      setApplying(false);
    }
  }, [challengeId, message]);

  if (loading) {
    return (
      <div
        className="bg-gray-50 rounded-xl border border-gray-200 p-6 mt-8"
        role="status"
        aria-label="Cargando estado de postulación"
      >
        <SkeletonBlock className="h-5 w-32 mb-4" />
        <SkeletonBlock className="h-4 w-full" />
        <SkeletonBlock className="h-4 w-4/5 mt-2" />
        <SkeletonBlock className="h-12 w-full mt-4" />
      </div>
    );
  }

  return (
    <section aria-label="Postulación" className="bg-gray-50 rounded-xl border border-gray-200 p-6 mt-8">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Postulación
      </h3>

      {interaction ? (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                interaction.status === 'aprobado'
                  ? 'bg-green-100 text-green-700'
                  : interaction.status === 'rechazado'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-yellow-100 text-yellow-700'
              }`}
            >
              {interaction.status === 'aprobado'
                ? 'Postulación Aprobada'
                : interaction.status === 'rechazado'
                ? 'Postulación Rechazada'
                : 'Postulación Pendiente'}
            </span>
          </div>

          <p className="text-sm text-gray-600">
            {interaction.status === 'pendiente'
              ? 'Tu postulación está en revisión. La empresa la evaluará y, si eres seleccionado, se desbloqueará su contacto.'
              : interaction.status === 'rechazado'
              ? 'Tu postulación no fue seleccionada esta vez.'
              : tipo === 'practica'
              ? '¡Felicidades! Fuiste seleccionado. Carga tus documentos en Mis Postulaciones y descarga tu carta de aval.'
              : '¡Felicidades! Tu postulación fue aprobada. Ya puedes contactar a la empresa.'}
          </p>

          {contactInfo && (
            <div className="mt-4 border-t border-gray-100 pt-4 space-y-3">
              <p className="text-sm font-medium text-green-700">
                Contacto Desbloqueado
              </p>
              <dl className="space-y-3">
                <div>
                  <dt className="text-xs text-gray-500 uppercase tracking-wider">
                    {contactInfo.empresa_nombre ? 'Empresa' : 'Nombre'}
                  </dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {contactInfo.empresa_nombre || contactInfo.full_name}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500 uppercase tracking-wider">Email</dt>
                  <dd className="text-sm font-medium text-gray-900">{contactInfo.email}</dd>
                </div>
                {contactInfo.phone && (
                  <div>
                    <dt className="text-xs text-gray-500 uppercase tracking-wider">Teléfono</dt>
                    <dd className="text-sm font-medium text-gray-900">{contactInfo.phone}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}
        </div>
      ) : (
        <div>
          <p className="text-sm text-gray-600 mb-4">{APPLY_COPY[tipo].intro}</p>
          <label htmlFor="apply-message" className="sr-only">
            Mensaje de postulación (opcional)
          </label>
          <textarea
            id="apply-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            placeholder="Cuéntanos brevemente por qué eres un buen perfil (opcional)"
            className={inputClass}
          />
          <div aria-live="polite" className="mt-3">
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
          <button
            onClick={handleApply}
            disabled={applying}
            aria-busy={applying}
            className={`mt-4 w-full bg-primary-600 text-white px-6 rounded-lg font-medium hover:bg-primary-700 transition disabled:opacity-60 ${TOUCH_TARGET} ${FOCUS_RING}`}
          >
            {applying ? 'Postulando…' : APPLY_COPY[tipo].button}
          </button>
        </div>
      )}
    </section>
  );
}
