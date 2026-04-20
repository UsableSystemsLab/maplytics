import { LoadingSkeleton, Skeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <div className="p-6 md:p-8 space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>

      <div className="flex items-center gap-4 bg-white p-4 rounded-xl border shadow-xs">
        <Skeleton className="h-9 flex-1 max-w-sm rounded-lg" />
        <Skeleton className="h-3 w-32 ml-auto" />
      </div>

      <LoadingSkeleton variant="card-grid" count={6} />
    </div>
  );
}
