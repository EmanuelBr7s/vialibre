'use client';

import { useCallback, useEffect, useState } from 'react';
import { notFound, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import ContactSection from '@/components/ContactSection';
import ApplicantsSection from '@/components/ApplicantsSection';
import ChallengeDetailLoading from './loading';
import api from '@/lib/api';
import type { Challenge } from '@/types';
import { LAB_CONTACT, MODALIDAD_LABEL, MODULE_BY_ID } from '@/data/modules';

const DIFFICULTY_COLOR: Record<string, string> = {
  easy: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  hard: 'bg-red-100 text-red-700',
};

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: 'Fácil',
  medium: 'Medio',
  hard: 'Difícil',
};

export default function ChallengeDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const { isAuthenticated, loading, user } = useAuth();
  const router = useRouter();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [detail, all] = await Promise.all([
        api.getChallenge(id),
        api.getChallenges({ limit: 5 }),
      ]);
      setChallenge(detail);
      setChallenges(all.challenges);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Problemática no encontrada');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    load();
  }, [id, loading, isAuthenticated, router, load]);

  const isOwner =
    !!user && !!challenge && String(user.id) === String(challenge.author_id);

  if (loading) {
    return (
      <div role="status" className="flex min-h-screen items-center justify-center text-gray-500">
        Cargando…
      </div>
    );
  }

  if (!isAuthenticated) return null;

  if (isLoading) {
    return <ChallengeDetailLoading />;
  }

  if (error || !challenge) {
    notFound();
  }

  const difficulty = challenge.difficulty ?? '';
  const mod = MODULE_BY_ID[challenge.tipo];
  const compensation =
    challenge.budget != null
      ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(
          Number(challenge.budget)
        )
      : null;
  const details = [
    challenge.modalidad && { label: 'Modalidad', value: MODALIDAD_LABEL[challenge.modalidad] },
    challenge.ubicacion && { label: 'Ubicación', value: challenge.ubicacion },
    compensation && {
      label: challenge.tipo === 'empleo' ? 'Salario' : challenge.tipo === 'practica' ? 'Apoyo de sostenimiento' : 'Presupuesto',
      value: compensation,
    },
    challenge.deadline && {
      label: 'Cierre',
      value: new Date(challenge.deadline).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' }),
    },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div className="flex min-h-screen">
      <Sidebar challenges={challenges} />

      <main id="main-content" tabIndex={-1} className="flex-1 p-4 sm:p-6 lg:p-8 max-w-4xl focus:outline-none">
        <article aria-label={challenge.title}>
          {challenge.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={challenge.image_url}
              alt=""
              className="w-full h-48 sm:h-64 object-cover rounded-xl mb-6 bg-gray-100"
            />
          )}
          <header className="flex items-center gap-3 mb-6">
            <div
              className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center"
              aria-hidden="true"
            >
              <span className="text-primary-600 font-semibold text-sm">
                {(challenge.empresa_nombre || challenge.author_name || 'E').charAt(0)}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                {challenge.empresa_nombre || challenge.author_name || 'Empresa'}
              </p>
              <p className="text-xs text-gray-500">Empresa</p>
            </div>
          </header>

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
            {challenge.title}
          </h1>

          {/* Meta */}
          <ul className="flex flex-wrap items-center gap-3 mb-6">
            {mod && (
              <li>
                <span className={`inline-block text-xs font-medium px-3 py-1 rounded-full ${mod.badgeClass}`}>
                  {mod.label}
                </span>
              </li>
            )}
            {difficulty && (
              <li>
                <span
                  className={`inline-block text-xs font-medium px-3 py-1 rounded-full ${
                    DIFFICULTY_COLOR[difficulty] || 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {DIFFICULTY_LABEL[difficulty] || difficulty}
                </span>
              </li>
            )}
            {challenge.tags?.map((tag) => (
              <li key={tag}>
                <span className="inline-block text-xs font-medium px-3 py-1 bg-gray-100 text-gray-600 rounded-full">
                  {tag}
                </span>
              </li>
            ))}
          </ul>

          {details.length > 0 && (
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8 rounded-xl border border-gray-200 bg-white p-4">
              {details.map((d) => (
                <div key={d.label}>
                  <dt className="text-xs text-gray-500 uppercase tracking-wider">{d.label}</dt>
                  <dd className="text-sm font-medium text-gray-900 mt-1">{d.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {/* Description */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {challenge.tipo === 'reto' ? 'Descripción del reto' : 'Descripción de la oferta'}
            </h2>
            <div className="text-gray-700 leading-relaxed whitespace-pre-line">
              {challenge.long_description}
            </div>
          </div>

          {challenge.tipo === 'reto' && (
            <p className="mb-8 text-sm text-gray-600 rounded-lg bg-violet-50 border border-violet-200 p-4">
              Este reto se gestiona con el Laboratorio de Innovación. Dudas:{' '}
              <a href={`mailto:${LAB_CONTACT.email}`} className="font-medium text-violet-700 underline">
                {LAB_CONTACT.nombre} ({LAB_CONTACT.email})
              </a>
              .
            </p>
          )}

          {error && (
            <div role="alert" className="mb-6 text-sm text-red-600 bg-red-50 rounded-lg p-4 border border-red-200">
              {error}
            </div>
          )}
        </article>

        {/* Condicional: dueño → listar postulados; solucionador → postularse */}
        {isOwner ? (
          <ApplicantsSection
            challengeId={challenge.id}
            currentUserId={String(user?.id)}
          />
        ) : (
          <ContactSection challengeId={challenge.id} />
        )}
      </main>
    </div>
  );
}
