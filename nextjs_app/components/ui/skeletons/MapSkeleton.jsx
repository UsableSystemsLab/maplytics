import { Skeleton } from "@/components/ui/skeleton";
import SkeletonCard from "./SkeletonCard";
import { cn } from "@/lib/utils";


export default function MapSkeleton({ className }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn(
        "relative w-full h-full min-h-[600px] overflow-hidden rounded-xl border border-gray-200 bg-gray-100",
        className
      )}
    >
      <Skeleton className="absolute inset-0 rounded-none" />

      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 w-full max-w-2xl px-4">
        <Skeleton className="h-12 w-full rounded-full" />
      </div>

      <div className="absolute top-24 right-6 z-30 flex flex-col items-end gap-2">
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
          <Skeleton className="h-11 w-11 rounded-none border-b border-gray-200" />
          <Skeleton className="h-9 w-11 rounded-none border-b border-gray-200" />
          <Skeleton className="h-11 w-11 rounded-none" />
        </div>
        <Skeleton className="h-11 w-11 rounded-lg" />
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 w-[95%] max-w-4xl">
        <SkeletonCard className="shadow-2xl">
          <div className="bg-cyan px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-5 rounded-full bg-white/30" />
              <Skeleton className="h-5 w-40 bg-white/30" />
            </div>
            <Skeleton className="h-5 w-5 bg-white/30" />
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="bg-gray-50 rounded-lg p-4 border border-gray-100 space-y-2"
                >
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-7 w-28" />
                  <Skeleton className="h-3 w-24" />
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <Skeleton className="h-11 flex-1 rounded-lg" />
              <Skeleton className="h-11 flex-1 rounded-lg" />
              <Skeleton className="h-11 w-24 rounded-lg" />
            </div>
          </div>
        </SkeletonCard>
      </div>

      <span className="sr-only">Loading map…</span>
    </div>
  );
}
