"use client";
import SideBar from '@/components/sidebar';
import DashboardHeader from '@/components/DashboardHeader';
import MapArea from '@/components/MapArea';

export default function MapViewPage() {
    return (
        <div className="flex h-screen bg-gray-50">
            <SideBar />

            <div className="flex-1 flex flex-col overflow-hidden">
                <DashboardHeader
                    pageTitle="Map View"
                    breadcrumbs={["Dashboard", "Map"]}
                />

                <MapArea />
            </div>
        </div>
    );
}
