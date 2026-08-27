import SkeletonBlock from '@/components/ui/SkeletonBlock';

/** Route-level loading skeleton for the challenge detail page. */
export default function ChallengeDetailLoading() {
  return (
    <div className="flex min-h-screen" aria-busy="true">
      {/* Sidebar skeleton (desktop) */}
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
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-24 w-full" />
          ))}
        </div>
      </aside>

      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-4xl" role="status" aria-label="Cargando problemática">
        <div className="flex items-center gap-3 mb-6">
          <SkeletonBlock className="w-10 h-10 rounded-full" />
          <SkeletonBlock className="h-4 w-40" />
        </div>
        <SkeletonBlock className="h-9 w-3/4" />
        <div className="flex flex-wrap gap-3 mt-4 mb-6">
          <SkeletonBlock className="h-6 w-20 rounded-full" />
          <SkeletonBlock className="h-6 w-16 rounded-full" />
          <SkeletonBlock className="h-6 w-14 rounded-full" />
        </div>
        <div className="space-y-3 mb-8">
          <SkeletonBlock className="h-4 w-full" />
          <SkeletonBlock className="h-4 w-11/12" />
          <SkeletonBlock className="h-4 w-full" />
          <SkeletonBlock className="h-4 w-4/5" />
        </div>
        <SkeletonBlock className="h-40 w-full" />
        <span className="sr-only">Cargando problemática</span>
      </main>
    </div>
  );
}
