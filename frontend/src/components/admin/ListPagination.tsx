import { FOCUS_RING, TOUCH_TARGET } from '@/components/ui/classes';

interface ListPaginationProps {
  skip: number;
  limit: number;
  total: number;
  onChange: (skip: number) => void;
}

/** skip/limit pagination matching the backend query parameters. */
export default function ListPagination({ skip, limit, total, onChange }: ListPaginationProps) {
  const start = total === 0 ? 0 : skip + 1;
  const end = Math.min(skip + limit, total);
  const canPrev = skip > 0;
  const canNext = skip + limit < total;

  return (
    <nav
      aria-label="Paginación"
      className="flex items-center justify-between border-t border-gray-100 px-6 py-3"
    >
      <p className="text-xs text-gray-500">
        Mostrando {start}–{end} de {total}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={!canPrev}
          onClick={() => onChange(Math.max(0, skip - limit))}
          className={`px-4 rounded-lg text-xs font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 ${TOUCH_TARGET} ${FOCUS_RING}`}
        >
          Anterior
        </button>
        <button
          type="button"
          disabled={!canNext}
          onClick={() => onChange(skip + limit)}
          className={`px-4 rounded-lg text-xs font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 ${TOUCH_TARGET} ${FOCUS_RING}`}
        >
          Siguiente
        </button>
      </div>
    </nav>
  );
}
