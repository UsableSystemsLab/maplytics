import { LoadingSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <main className="flex-1 relative h-[calc(100vh-10rem)] overflow-hidden p-4">
      <LoadingSkeleton variant="map" />
    </main>
  );
}
