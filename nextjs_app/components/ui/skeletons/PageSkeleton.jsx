import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import CardGridSkeleton from "./CardGridSkeleton";


export default function PageSkeleton({ className }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn("p-6 md:p-8 space-y-6", className)}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-10 w-36 rounded-lg" />
      </div>
      <Skeleton className="h-12 w-full rounded-xl" />
      <CardGridSkeleton count={6} />
      <span className="sr-only">Loading page…</span>
    </div>
  );
}
