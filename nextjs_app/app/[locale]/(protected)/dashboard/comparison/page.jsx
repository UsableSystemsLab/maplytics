"use client";

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import SideBar from '@/components/sidebar';
import {
    ChevronDown,
    Filter,
    MapPin,
} from 'lucide-react';

// Dynamically import the map component to avoid SSR issues
const ComparisonMap = dynamic(
    () => import('@/components/ComparisonMap'),
    {
        loading: () => <div className="w-full h-full min-h-[400px] bg-gray-100 animate-pulse flex items-center justify-center text-gray-400">Loading Map...</div>,
        ssr: false
    }
);

export default function ComparisonPage() {
    const [attributes, setAttributes] = useState([]);
    const [selectedAttribute, setSelectedAttribute] = useState('');

    const [districtA, setDistrictA] = useState('AlNasseem');
    const [districtB, setDistrictB] = useState('AlSulaimania');

    const [districts, setDistricts] = useState([]);
    const [loading, setLoading] = useState(true);

    // Mock fetching available attributes and districts
    useEffect(() => {
        // Simulate API call to fetch attributes and districts
        const fetchData = async () => {
            setLoading(true);
            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 800));

            setAttributes([
                'Category',
                'Rating',
                'Price Range',
                'Status',
                'Cuisine Type'
            ]);
            setSelectedAttribute('Category');

            setDistricts([
                'AlNasseem',
                'AlSulaimania',
                'Olaya',
                'Malaz',
                'Diplomatic Quarter'
            ]);

            setLoading(false);
        };

        fetchData();
    }, []);

    const markersA = districtA ? [{ position: [24.7236, 46.7053], title: `${districtA} Center` }] : [];
    const markersB = districtB ? [{ position: [24.7136, 46.6753], title: `${districtB} Center` }] : [];

    return (
        <div className="min-h-[93vh] bg-gray-50 flex">
            <SideBar
                name1="Overview" href1="/dashboard"
                name2="Map view" href2="/dashboard/map"
                name3="Comparison" href3="/dashboard/comparison"
                name4="Chat" href4="/dashboard/chat"
            />
            <main className="flex-1 overflow-y-auto p-6 flex flex-col items-center">
                <div className="w-full max-w-7xl space-y-6">
                    {/* Header */}
                    <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">District Comparison</h1>
                            <p className="text-sm text-gray-500">Compare metrics across different districts</p>
                        </div>

                        <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-gray-700">Comparison Mode</span>
                            <div className="w-12 h-6 bg-blue-600 rounded-full relative cursor-pointer shadow-inner">
                                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform"></div>
                            </div>
                        </div>
                    </div>

                    {/* Main Comparison Area */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[600px]">
                        {/* Left Panel */}
                        <div className="flex flex-col bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Select District A</label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <select
                                        value={districtA}
                                        onChange={(e) => setDistrictA(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none cursor-pointer"
                                    >
                                        <option value="">Select a district...</option>
                                        {districts.map(d => (
                                            <option key={d} value={d}>{d}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                </div>
                            </div>

                            <div className="flex-1 relative z-0">
                                <ComparisonMap
                                    mapId="map-1"
                                    center={[24.7236, 46.7153]}
                                    zoom={13}
                                    markers={markersA}
                                />
                            </div>
                        </div>

                        {/* Right Panel */}
                        <div className="flex flex-col bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row gap-3">
                                <div className="flex-1">
                                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Select District B</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <select
                                            value={districtB}
                                            onChange={(e) => setDistrictB(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none cursor-pointer"
                                        >
                                            <option value="">Select a district...</option>
                                            {districts.map(d => (
                                                <option key={d} value={d}>{d}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                    </div>
                                </div>

                                <div className="w-full sm:w-48">
                                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Compare Attribute</label>
                                    <div className="relative">
                                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <select
                                            value={selectedAttribute}
                                            onChange={(e) => setSelectedAttribute(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none cursor-pointer"
                                        >
                                            {attributes.map(attr => (
                                                <option key={attr} value={attr}>{attr}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 relative z-0">
                                <ComparisonMap
                                    mapId="map-2"
                                    center={[24.7136, 46.6753]}
                                    zoom={13}
                                    markers={markersB}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Dashboard Stats (Graphs removed) */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-8">
                        {/* Stats for District A */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold text-gray-800">{districtA || 'Select District A'}</h3>
                                <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-medium">Analysis</span>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <p className="text-gray-500 text-xs uppercase font-semibold">Total Restaurants</p>
                                    <p className="text-2xl font-bold text-gray-900 mt-1">24</p>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <p className="text-gray-500 text-xs uppercase font-semibold">Avg Rating</p>
                                    <p className="text-2xl font-bold text-gray-900 mt-1">4.2</p>
                                </div>
                            </div>
                        </div>

                        {/* Stats for District B */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold text-gray-800">{districtB || 'Select District B'}</h3>
                                <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-medium">Analysis</span>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <p className="text-gray-500 text-xs uppercase font-semibold">Total Restaurants</p>
                                    <p className="text-2xl font-bold text-gray-900 mt-1">30</p>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <p className="text-gray-500 text-xs uppercase font-semibold">Avg Rating</p>
                                    <p className="text-2xl font-bold text-gray-900 mt-1">3.9</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
