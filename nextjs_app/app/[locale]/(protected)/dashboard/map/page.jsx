"use client";
import MapArea from '@/components/MapArea';
import SideBar from '@/components/sidebar';

export default function MapViewPage() {
    return (
        <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
            <SideBar
                name1="Overview" href1="/dashboard"
                name2="Map view" href2="/dashboard/map"
                name3="Analysis" href3="/dashboard/analysis"
            />
            <main className="flex-1 relative overflow-hidden">
                <MapArea />
            </main>
        </div>
    );
}