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
    <div className={`bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer ${FOCUS_RING}`}>
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider truncate">
          {challenge.empresa_nombre || challenge.author_name || 'Empresa'}
        </p>
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
      <h3 className="text-sm font-semibold text-gray-900 mt-2 line-clamp-2">
        {challenge.title}
      </h3>
      <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px] text-gray-500">
        {mod && <span className={`font-medium px-1.5 rounded ${mod.badgeClass}`}>{mod.singular}</span>}
        {challenge.modalidad && <span>{MODALIDAD_LABEL[challenge.modalidad]}</span>}
        {challenge.ubicacion && <span>· {challenge.ubicacion}</span>}
      </p>
      <p className="text-xs text-gray-600 mt-2 line-clamp-2">
        {challenge.short_description}
      </p>
      {challenge.tags && challenge.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {challenge.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-[10px] font-medium px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
