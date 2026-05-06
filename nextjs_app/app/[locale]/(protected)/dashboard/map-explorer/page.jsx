"use client";
import MapExplorer from "@/components/MapExplorer";

export default function MapExplorerPage() {
    return (
        <main className="flex-1 relative w-full overflow-hidden">
            <div className="absolute inset-0 z-0 map-explorer-container">
                <MapExplorer className="w-full h-full" />
            </div>
        </main>
    );
}
