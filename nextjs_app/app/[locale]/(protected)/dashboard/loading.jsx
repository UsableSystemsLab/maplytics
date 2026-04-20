import { Skeleton, SkeletonCard } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <main className="flex-1 overflow-y-auto p-6 flex flex-col items-center">
      <div className="w-full max-w-7xl space-y-6">
        <div className="w-full max-w-4xl mx-auto px-4">
          <SkeletonCard className="shadow-xl">
            <div className="bg-cyan px-6 py-4 flex items-center gap-3">
              <Skeleton className="h-6 w-6 rounded-full bg-white/30" />
              <Skeleton className="h-6 w-56 bg-white/30" />
            </div>
            <div className="p-6 space-y-6">
              <div className="p-4 bg-gray-50 rounded-lg border-l-4 border-gray-300 flex items-start gap-3">
                <Skeleton className="h-5 w-5 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-64 max-w-full" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="bg-gray-50 rounded-lg p-4 border border-gray-100 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-5 w-5 rounded" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                    <Skeleton className="h-8 w-24" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                ))}
              </div>
              <Skeleton className="h-14 w-full rounded-lg" />
            </div>
          </SkeletonCard>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[0, 1, 2].map((i) => (
            <SkeletonCard key={i} className="p-6 space-y-3 shadow-sm">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-8 w-1/3" />
              <Skeleton className="h-3 w-2/5" />
            </SkeletonCard>
          ))}
        </div>

        {/* Recent activity card */}
        <SkeletonCard className="p-6 space-y-3 shadow-sm">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </SkeletonCard>
      </div>
    </main>
  );
}
