import type { Challenge } from '@/types';
import { DifficultyLevel } from '@/types';
import { FOCUS_RING } from '@/components/ui/classes';
import { MODALIDAD_LABEL, MODULE_BY_ID } from '@/data/modules';

interface ChallengeCardProps {
  challenge: Challenge;
}

const DIFFICULTY_COLOR: Record<string, string> = {
  [DifficultyLevel.EASY]: 'bg-green-100 text-green-700',
  [DifficultyLevel.MEDIUM]: 'bg-yellow-100 text-yellow-700',
  [DifficultyLevel.HARD]: 'bg-red-100 text-red-700',
};

const DIFFICULTY_LABEL: Record<string, string> = {
  [DifficultyLevel.EASY]: 'Fácil',
  [DifficultyLevel.MEDIUM]: 'Medio',
  [DifficultyLevel.HARD]: 'Difícil',
};

export default function ChallengeCard({ challenge }: ChallengeCardProps) {
  const difficulty = challenge.difficulty ?? '';
  const mod = MODULE_BY_ID[challenge.tipo];

  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-4 sm:p-5 hover:shadow-md transition-shadow cursor-pointer ${FOCUS_RING}`}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
        <p className="text-fluid-xs font-medium text-gray-500 uppercase tracking-wider truncate">
          {challenge.empresa_nombre || challenge.author_name || 'Empresa'}
        </p>
        {difficulty && (
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-fluid-xs font-medium self-start ${DIFFICULTY_COLOR[difficulty] || 'bg-gray-100 text-gray-700'}`}>
            {DIFFICULTY_LABEL[difficulty] || difficulty}
          </span>
        )}
      </div>
      <h3 className="text-fluid-base font-semibold text-gray-900 mt-2 line-clamp-2">
        {challenge.title}
      </h3>
      <p className="mt-1 flex flex-wrap items-center gap-x-2 text-fluid-xs text-gray-500">
        {mod && <span className={`font-medium px-1.5 rounded ${mod.badgeClass}`}>{mod.singular}</span>}
        {challenge.modalidad && <span>{MODALIDAD_LABEL[challenge.modalidad]}</span>}
        {challenge.ubicacion && <span>· {challenge.ubicacion}</span>}
      </p>
      <p className="text-fluid-sm text-gray-600 mt-2 line-clamp-2">
        {challenge.short_description}
      </p>
      {challenge.tags && challenge.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3" role="list" aria-label="Etiquetas">
          {challenge.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="inline-flex items-center px-2.5 py-1 rounded-full text-fluid-xs font-medium bg-gray-100 text-gray-600" role="listitem">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}