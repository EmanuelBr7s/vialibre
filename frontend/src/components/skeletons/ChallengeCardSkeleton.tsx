import SkeletonBlock from '@/components/ui/SkeletonBlock';

/** Skeleton placeholder for ChallengeCard while data loads. */
export default function ChallengeCardSkeleton() {
  return (
    <div
      className="bg-white rounded-lg border border-gray-200 p-4"
      role="status"
      aria-label="Cargando problemáticas"
    >
      <div className="flex items-center justify-between">
        <SkeletonBlock className="h-3 w-24" />
        <SkeletonBlock className="h-4 w-14" />
      </div>
      <SkeletonBlock className="h-4 w-full mt-3" />
      <SkeletonBlock className="h-3 w-full mt-2" />
      <SkeletonBlock className="h-3 w-3/4 mt-2" />
      <div className="flex gap-1.5 mt-3">
        <SkeletonBlock className="h-4 w-16" />
        <SkeletonBlock className="h-4 w-12" />
      </div>
      <span className="sr-only">Cargando tarjeta de problemática</span>
    </div>
  );
}
