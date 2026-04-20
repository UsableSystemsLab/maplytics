import { Skeleton, SkeletonCard } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <main className="flex-1 overflow-y-auto p-6 flex flex-col items-center">
      <div className="w-full max-w-7xl space-y-6">
        {/* Header card */}
        <SkeletonCard className="p-4 space-y-2 shadow-sm">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </SkeletonCard>

        {/* 2-col map grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[600px]">
          {[0, 1].map((i) => (
            <SkeletonCard key={i} className="flex flex-col shadow-sm">
              <div className="p-4 border-b border-gray-100 bg-gray-50/50 space-y-2">
                <Skeleton className="h-3 w-24" />
                <div className="flex gap-2">
                  <Skeleton className="h-10 flex-1 rounded-lg" />
                  <Skeleton className="h-10 flex-1 rounded-lg" />
                </div>
              </div>
              <Skeleton className="flex-1 rounded-none" />
            </SkeletonCard>
          ))}
        </div>

        {/* 2-col stat cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[0, 1].map((i) => (
            <SkeletonCard key={i} className="p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
              <div className="space-y-3">
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-7 w-20" />
                </div>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-7 w-24" />
                </div>
              </div>
            </SkeletonCard>
          ))}
        </div>
      </div>
    </main>
  );
}
