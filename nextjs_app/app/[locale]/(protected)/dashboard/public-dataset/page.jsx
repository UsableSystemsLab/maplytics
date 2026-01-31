"use client";
import React, { useState } from 'react';
import SideBar from '@/components/sidebar';
import { Eye, FileJson, Clock, HardDrive, User, X, Loader2 } from 'lucide-react';

export default function PublicDatasetPage() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [previewContent, setPreviewContent] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [modalTitle, setModalTitle] = useState("");

    const datasets = [
        {
            id: 1,
            title: "Restaurants Detailed Data",
            author: "Maplytics Team",
            description: "A comprehensive dataset containing detailed information about restaurants, including locations, ratings, and cuisines.",
            type: "JSON",
            size: "5.2 KB",
            lastUpdated: "2024-01-20",
            path: "/dataset/restaurants_detailed_data.json"
        }
    ];

    const handlePreview = async (dataset) => {
        setModalTitle(dataset.title);
        setIsModalOpen(true);
        setIsLoading(true);
        setPreviewContent(null);

        try {
            const response = await fetch(dataset.path);
            if (!response.ok) {
                throw new Error(`Failed to fetch dataset: ${response.statusText}`);
            }
            const data = await response.json();
            setPreviewContent(JSON.stringify(data, null, 2));
        } catch (error) {
            console.error("Error loading preview:", error);
            setPreviewContent(`Error loading preview: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setPreviewContent(null);
    };

    return (
        <div className="flex h-screen bg-gray-50">
            <SideBar
                name1="Overview" href1="/dashboard"
                name2="Map view" href2="/dashboard/map"
                name3="Comparison" href3="/dashboard/visualizeDataset"
                name4="Public Dataset" href4="/dashboard/public-dataset"
            />

            <main className="flex-1 overflow-y-auto p-6 relative">
                <div className="max-w-7xl mx-auto space-y-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Public Datasets</h1>
                        <p className="text-gray-500 mt-1">Explore and download curated datasets for your spatial analysis.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {datasets.map((dataset) => (
                            <div key={dataset.id} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden flex flex-col">
                                <div className="h-40 bg-gray-100 relative group flex items-center justify-center">
                                    <FileJson className="w-12 h-12 text-gray-400 opacity-60" />
                                    <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-md text-white text-xs px-2 py-1 rounded-full uppercase font-medium">
                                        {dataset.type}
                                    </div>
                                </div>

                                <div className="p-5 flex-1 flex flex-col">
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <h3 className="font-semibold text-gray-900 line-clamp-1" title={dataset.title}>
                                                {dataset.title}
                                            </h3>
                                            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                                <User className="w-3 h-3" />
                                                <span>{dataset.author}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <p className="text-sm text-gray-600 mb-4 line-clamp-2" title={dataset.description}>
                                        {dataset.description}
                                    </p>

                                    <div className="mt-auto border-t border-gray-100 pt-4 flex items-center justify-between">
                                        <div className="flex items-center gap-4 text-xs text-gray-500">
                                            <div className="flex items-center gap-1.5">
                                                <HardDrive className="w-3.5 h-3.5" />
                                                {dataset.size}
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Clock className="w-3.5 h-3.5" />
                                                {dataset.lastUpdated}
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => handlePreview(dataset)}
                                            className="p-2 text-primary hover:bg-primary/5 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                                            title="Preview"
                                        >
                                            <Eye className="w-4 h-4" />
                                            Preview
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Preview Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 rounded-lg">
                                        <FileJson className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900">{modalTitle}</h3>
                                        <p className="text-xs text-gray-500">JSON Preview</p>
                                    </div>
                                </div>
                                <button
                                    onClick={closeModal}
                                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-auto p-4 bg-gray-50">
                                {isLoading ? (
                                    <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                                        <Loader2 className="w-8 h-8 animate-spin mb-2" />
                                        <p>Loading dataset...</p>
                                    </div>
                                ) : (
                                    <pre className="bg-white p-4 rounded-lg border border-gray-200 text-sm font-mono text-gray-700 overflow-auto shadow-sm">
                                        <code>{previewContent}</code>
                                    </pre>
                                )}
                            </div>

                            <div className="p-4 border-t border-gray-100 bg-white flex justify-end">
                                <button
                                    onClick={closeModal}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
