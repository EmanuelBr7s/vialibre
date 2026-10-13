import Link from 'next/link';
import type { Challenge } from '@/types';
import { FOCUS_RING } from '@/components/ui/classes';
import { MODALIDAD_LABEL, MODULE_BY_ID } from '@/data/modules';

interface FeaturedCardProps {
  challenge: Challenge;
}

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

export default function FeaturedCard({ challenge }: FeaturedCardProps) {
  const difficulty = challenge.difficulty ?? '';
  const mod = MODULE_BY_ID[challenge.tipo];
  const empresa = challenge.empresa_nombre || challenge.author_name || 'Empresa';

  return (
    <Link href={`/feed/${challenge.id}`} className={`block h-full rounded-xl ${FOCUS_RING}`}>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow cursor-pointer h-full flex flex-col">
        {/* Portada: imagen de la publicación o gradiente de respaldo */}
        {challenge.image_url ? (
          <div className="relative h-40 bg-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={challenge.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
            <p className="absolute bottom-0 inset-x-0 px-4 py-2 text-sm font-medium text-white bg-gradient-to-t from-black/70 to-transparent truncate">
              {empresa}
            </p>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-primary-100 to-primary-200 h-40 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-white/80 rounded-full flex items-center justify-center mx-auto mb-2">
                <svg
                  className="w-8 h-8 text-primary-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>
              <p className="text-sm font-medium text-primary-700">{empresa}</p>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-6 flex-1 flex flex-col">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {mod && (
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${mod.badgeClass}`}>
                {mod.singular}
              </span>
            )}
            {challenge.modalidad && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                {MODALIDAD_LABEL[challenge.modalidad]}
                {challenge.ubicacion ? ` · ${challenge.ubicacion}` : ''}
              </span>
            )}
            {difficulty && (
              <span
                className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                  DIFFICULTY_COLOR[difficulty] || 'bg-gray-100 text-gray-700'
                }`}
              >
                {DIFFICULTY_LABEL[difficulty] || difficulty}
              </span>
            )}
          </div>

          <h3 className="text-lg font-semibold text-gray-900 mt-2 line-clamp-2">
            {challenge.title}
          </h3>

          <p className="text-sm text-gray-600 mt-3 line-clamp-3 flex-1">
            {challenge.short_description}
          </p>

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
            <div className="flex flex-wrap gap-1.5">
              {challenge.tags &&
                challenge.tags.slice(0, 2).map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] font-medium px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
            </div>
            <span className="text-sm font-medium text-primary-600 hover:text-primary-700">
              Ver Detalle →
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
