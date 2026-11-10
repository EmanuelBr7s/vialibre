import SkeletonBlock from '@/components/ui/SkeletonBlock';

interface ListSkeletonProps {
  rows?: number;
  label?: string;
}

/** Skeleton rows shown while the first page of a list loads. */
export default function ListSkeleton({ rows = 4, label = 'Cargando registros' }: ListSkeletonProps) {
  return (
    <div role="status" aria-label={label} className="p-6 space-y-4">
      {Array.from({ length: rows }).map((_, index) => (
        <SkeletonBlock key={index} className="h-10 w-full" />
      ))}
    </div>
  );
}
