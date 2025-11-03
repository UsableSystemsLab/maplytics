"use client";
import AnalysisFlipCard from '@/components/AnalysisFlipCard';

export default function DashboardPage() {
    return (
        <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                <AnalysisFlipCard />

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Projects</h3>
                        <p className="text-3xl font-bold text-primary">12</p>
                        <p className="text-sm text-gray-500 mt-2">+2 from last month</p>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Active Layers</h3>
                        <p className="text-3xl font-bold text-cyan">24</p>
                        <p className="text-sm text-gray-500 mt-2">Across all projects</p>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Team Members</h3>
                        <p className="text-3xl font-bold text-primary">8</p>
                        <p className="text-sm text-gray-500 mt-2">4 active now</p>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
                    <p className="text-gray-600">Your recent dashboard activity will appear here.</p>
                </div>
            </div>
        </main>
    );
}