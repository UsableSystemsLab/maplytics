"use client";
import MapArea from '@/components/MapArea';
import SideBar from '@/components/sidebar';

export default function MapViewPage() {
    return (
        <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
            <SideBar />
            <main className="flex-1 relative overflow-hidden">
                <MapArea />
            </main>
        </div>
    );
}