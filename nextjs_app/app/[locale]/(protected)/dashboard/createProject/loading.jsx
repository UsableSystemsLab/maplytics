import { Skeleton, SkeletonCard } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <div className="min-h-full bg-gray-50/50 p-6 md:p-12 flex flex-col items-center justify-center">
      <div className="w-full max-w-2xl space-y-6">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-28" />
        </div>

        <SkeletonCard className="shadow-lg">
          <div className="px-6 pt-6 pb-8 border-b space-y-3">
            <Skeleton className="size-12 rounded-xl" />
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-4 w-80 max-w-full" />
          </div>

          <div className="px-6 pt-8 pb-6 space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-28 w-full rounded-xl" />
            </div>
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        </SkeletonCard>

        <div className="flex justify-center">
          <Skeleton className="h-3 w-72 max-w-full" />
        </div>
      </div>
    </div>
  );
}
