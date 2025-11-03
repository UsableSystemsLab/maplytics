"use client";
import SideBar from '@/components/sidebar';
import DashboardHeader from '@/components/DashboardHeader';
import AnalysisFlipCard from '@/components/AnalysisFlipCard';

export default function DashboardPage() {
    return (
        <div className="flex h-screen bg-gray-50">
            <SideBar />


            <div className="flex-1 flex flex-col overflow-hidden">
                <DashboardHeader
                    pageTitle="Dashboard Overview"
                    breadcrumbs={["Dashboard", "Overview"]}
                />

            </div>
        </div>
    );
}