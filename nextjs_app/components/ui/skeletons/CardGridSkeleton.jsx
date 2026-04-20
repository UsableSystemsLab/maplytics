import { Skeleton } from "@/components/ui/skeleton";
import SkeletonCard from "./SkeletonCard";
import { cn } from "@/lib/utils";


export default function CardGridSkeleton({ count = 6, withImage = false, className }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn(
        "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full",
        className
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} className="flex flex-col">
          {withImage && <Skeleton className="h-40 w-full rounded-none" />}
          <div className="p-5 flex-1 flex flex-col space-y-4">
            {!withImage && <Skeleton className="size-12 rounded-xl" />}
            <div className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-5/6" />
            </div>
            <div className="mt-auto border-t border-gray-100 pt-4 flex items-center justify-between">
              {withImage ? (
                <>
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-8 w-20 rounded-lg" />
                </>
              ) : (
                <Skeleton className="h-3 w-24" />
              )}
            </div>
          </div>
        </SkeletonCard>
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  );
}
