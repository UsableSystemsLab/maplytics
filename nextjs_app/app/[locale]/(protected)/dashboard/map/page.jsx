"use client";
import MapArea from '@/components/MapArea';


export default function MapViewPage() {
    return (
        <main className="flex-1 relative h-[calc(100vh-10rem)] overflow-hidden">
            <MapArea />
        </main>
    );
}