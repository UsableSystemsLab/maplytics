import { Skeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <main className="flex-1 overflow-hidden w-full flex">
      <div className="flex flex-col h-screen w-full bg-white">
        <div className="flex-1 p-4 space-y-4 bg-gray-50/50 pt-10 overflow-hidden">
          <div className="flex gap-3">
            <Skeleton className="w-8 h-8 rounded-full shrink-0" />
            <Skeleton className="h-10 w-3/5 max-w-md rounded-2xl rounded-tl-sm" />
          </div>
          <div className="flex gap-3 flex-row-reverse">
            <Skeleton className="w-8 h-8 rounded-full shrink-0" />
            <Skeleton className="h-16 w-1/2 max-w-md rounded-2xl rounded-tr-sm" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="w-8 h-8 rounded-full shrink-0" />
            <Skeleton className="h-20 w-2/3 max-w-lg rounded-2xl rounded-tl-sm" />
          </div>
          <div className="flex gap-3 flex-row-reverse">
            <Skeleton className="w-8 h-8 rounded-full shrink-0" />
            <Skeleton className="h-12 w-2/5 max-w-md rounded-2xl rounded-tr-sm" />
          </div>
        </div>

        <div className="p-3 bg-white border-t border-gray-200">
          <div className="flex gap-2 items-end">
            <Skeleton className="h-11 flex-1 rounded-2xl" />
            <Skeleton className="w-10 h-10 mb-0.5 rounded-full shrink-0" />
          </div>
        </div>
      </div>
    </main>
  );
}
