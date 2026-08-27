import SkeletonBlock from '@/components/ui/SkeletonBlock';

export default function Loading() {
  return (
    <div className="flex min-h-screen" role="status" aria-label="Cargando postulaciones">
      <aside
        className="hidden lg:flex w-[30%] min-w-[320px] h-screen sticky top-0 bg-gray-50 border-r border-gray-200 flex-col"
        aria-hidden="true"
      >
        <div className="p-6 border-b border-gray-200 flex items-center gap-3">
          <SkeletonBlock className="w-10 h-10 rounded-lg" />
          <div className="space-y-2">
            <SkeletonBlock className="h-4 w-24" />
            <SkeletonBlock className="h-3 w-20" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-20 w-full" />
          ))}
        </div>
      </aside>
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <SkeletonBlock className="h-9 w-56" />
        <SkeletonBlock className="h-4 w-80 mt-3" />
        <div className="space-y-4 mt-6">
          <SkeletonBlock className="h-28 w-full" />
          <SkeletonBlock className="h-28 w-full" />
          <SkeletonBlock className="h-28 w-full" />
        </div>
      </main>
    </div>
  );
}
