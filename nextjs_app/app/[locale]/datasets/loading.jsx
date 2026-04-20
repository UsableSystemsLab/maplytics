import { LoadingSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <main className="flex-1 w-full pt-20">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <LoadingSkeleton variant="card-grid" count={6} withImage />
        </div>
      </main>
    </div>
  );
}
