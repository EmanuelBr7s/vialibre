import SkeletonBlock from '@/components/ui/SkeletonBlock';

/** Skeleton placeholder for FeaturedCard while data loads. */
export default function FeaturedCardSkeleton() {
  return (
    <div
      className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col"
      role="status"
      aria-label="Cargando problemáticas destacadas"
    >
      <div className="h-40 flex items-center justify-center">
        <SkeletonBlock className="w-16 h-16 rounded-full" />
      </div>
      <div className="p-6 flex-1 flex flex-col">
        <SkeletonBlock className="h-3 w-16" />
        <SkeletonBlock className="h-5 w-full mt-3" />
        <SkeletonBlock className="h-4 w-full mt-2" />
        <SkeletonBlock className="h-4 w-5/6 mt-2" />
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
          <div className="flex gap-1.5">
            <SkeletonBlock className="h-4 w-16" />
            <SkeletonBlock className="h-4 w-12" />
          </div>
          <SkeletonBlock className="h-4 w-20" />
        </div>
      </div>
      <span className="sr-only">Cargando tarjeta de problemática destacada</span>
    </div>
  );
}
