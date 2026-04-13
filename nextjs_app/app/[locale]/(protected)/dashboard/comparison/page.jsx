"use client";

import React from 'react';
import dynamic from 'next/dynamic';
import SideBar from '@/components/sidebar';
import BarChartComparison from '@/components/BarChartComparison';
import SearchableSelect from '@/components/SearchableSelect';
import { useDistrictComparison } from '@/hooks/useDistrictComparison';
import {
    ChevronDown,
    Filter,
    MapPin,
    Building2,
    Loader2,
    AlertCircle,
} from 'lucide-react';

const ComparisonMap = dynamic(
    () => import('@/components/ComparisonMap'),
    {
        loading: () => <div className="w-full h-full min-h-[400px] bg-gray-100 animate-pulse flex items-center justify-center text-gray-400">Loading Map...</div>,
        ssr: false
    }
);

// - Color constants for A / B districts
const COLOR_A = '#134565';
const COLOR_B = '#13B38D';

export default function ComparisonPage() {
    const {
        selectedDataset, geojsonData, loading, error,
        allCities, cityA, cityB, districtA, districtB,
        districtsForCityA, districtsForCityB,
        handleCityAChange, handleCityBChange,
        setDistrictA, setDistrictB,
        districtAName, districtBName,
        statsA, statsB, numericFields, stringFields,
        selectedField, setSelectedField,
        boundaryA, boundaryB, featurePointsA, featurePointsB,
        chartDataA, chartDataB,
    } = useDistrictComparison();

    return (
        <div className="min-h-[93vh] bg-gray-50 flex">
            <SideBar />
            <main className="flex-1 overflow-y-auto p-6 flex flex-col items-center">
                <div className="w-full max-w-7xl space-y-6">
                    {/* Header */}
                    <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">District Comparison</h1>
                            <p className="text-sm text-gray-500">
                                {selectedDataset
                                    ? `Comparing: ${selectedDataset.datasetName}`
                                    : 'Select a layer from the sidebar to begin'}
                            </p>
                        </div>
                    </div>

                    {/* Guided onboarding (only shows when no dataset loaded) */}
                    {!loading && !selectedDataset && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
                            <div className="text-center mb-8">
                                <h2 className="text-xl font-bold text-gray-800">Get Started with Comparison</h2>
                                <p className="text-sm text-gray-500 mt-1">Follow these steps to compare districts side by side</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="flex flex-col items-center text-center p-5 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                                    <div className="w-10 h-10 rounded-full bg-[#134565] text-white flex items-center justify-center text-lg font-bold mb-3">1</div>
                                    <h3 className="font-semibold text-gray-800 mb-1">Select a Layer</h3>
                                    <p className="text-xs text-gray-500">Open the sidebar and click on a dataset layer to load its data for comparison.</p>
                                </div>
                                <div className="flex flex-col items-center text-center p-5 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                                    <div className="w-10 h-10 rounded-full bg-[#134565] text-white flex items-center justify-center text-lg font-bold mb-3">2</div>
                                    <h3 className="font-semibold text-gray-800 mb-1">Choose District A</h3>
                                    <p className="text-xs text-gray-500">Pick a city, then select a district from the left panel to see its data on the map.</p>
                                </div>
                                <div className="flex flex-col items-center text-center p-5 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                                    <div className="w-10 h-10 rounded-full bg-[#134565] text-white flex items-center justify-center text-lg font-bold mb-3">3</div>
                                    <h3 className="font-semibold text-gray-800 mb-1">Choose District B</h3>
                                    <p className="text-xs text-gray-500">Pick a second district from the right panel to compare statistics and charts side by side.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Error state */}
                    {error && (
                        <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
                            <AlertCircle className="w-5 h-5" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Maps */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[600px]">
                        {/* Left Panel — District A */}
                        <div className="flex flex-col bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-4 border-b border-gray-100 bg-gray-50/50 space-y-2">
                                <label className="block text-xs font-semibold text-gray-500 uppercase">Select District A</label>
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <SearchableSelect
                                            options={allCities}
                                            value={cityA}
                                            onChange={handleCityAChange}
                                            labelKey="name"
                                            valueKey="name"
                                            placeholder="City..."
                                            icon={<Building2 className="w-4 h-4" />}
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <SearchableSelect
                                            options={districtsForCityA}
                                            value={districtA}
                                            onChange={setDistrictA}
                                            labelKey="name_en"
                                            valueKey="district_id"
                                            placeholder="District..."
                                            icon={<MapPin className="w-4 h-4" />}
                                            disabled={!cityA}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1 relative z-0">
                                <ComparisonMap
                                    mapId="map-a"
                                    center={[24.7136, 46.6753]}
                                    zoom={12}
                                    boundaryGeoJSON={boundaryA}
                                    featurePoints={featurePointsA}
                                />
                            </div>
                        </div>

                        {/* Right Panel — District B */}
                        <div className="flex flex-col bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-4 border-b border-gray-100 bg-gray-50/50 space-y-2">
                                <label className="block text-xs font-semibold text-gray-500 uppercase">Select District B</label>
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <SearchableSelect
                                            options={allCities}
                                            value={cityB}
                                            onChange={handleCityBChange}
                                            labelKey="name"
                                            valueKey="name"
                                            placeholder="City..."
                                            icon={<Building2 className="w-4 h-4" />}
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <SearchableSelect
                                            options={districtsForCityB}
                                            value={districtB}
                                            onChange={setDistrictB}
                                            labelKey="name_en"
                                            valueKey="district_id"
                                            placeholder="District..."
                                            icon={<MapPin className="w-4 h-4" />}
                                            disabled={!cityB}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1 relative z-0">
                                <ComparisonMap
                                    mapId="map-b"
                                    center={[24.7136, 46.6753]}
                                    zoom={12}
                                    boundaryGeoJSON={boundaryB}
                                    featurePoints={featurePointsB}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Loading (shows a loading indicator) */}
                    {loading && (
                        <div className="space-y-6 animate-pulse">
                            <div className="flex items-center gap-2 justify-center py-2">
                                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                                <span className="text-sm text-gray-400">Loading dataset...</span>
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {[0, 1].map(i => (
                                    <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                        <div className="flex items-center justify-between mb-6">
                                            <div className="h-5 w-32 bg-gray-200 rounded" />
                                            <div className="h-6 w-16 bg-gray-200 rounded-full" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            {[0, 1].map(j => (
                                                <div key={j} className="bg-gray-50 p-4 rounded-lg">
                                                    <div className="h-3 w-20 bg-gray-200 rounded mb-2" />
                                                    <div className="h-7 w-12 bg-gray-200 rounded" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {[0, 1].map(i => (
                                    <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                        <div className="h-5 w-40 bg-gray-200 rounded mb-4" />
                                        <div className="space-y-3">
                                            {[0, 1, 2, 3].map(j => (
                                                <div key={j} className="flex items-center gap-3">
                                                    <div className="h-3 w-20 bg-gray-200 rounded" />
                                                    <div className="flex-1 h-6 bg-gray-100 rounded" style={{ width: `${80 - j * 15}%` }} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Statistics Cards */}
                    {geojsonData && (districtA || districtB) && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <DistrictStatsCard
                                name={districtAName}
                                stats={statsA}
                                numericFields={numericFields}
                                hasDataset={!!geojsonData}
                                hasDistrict={!!districtA}
                                color={COLOR_A}
                            />
                            <DistrictStatsCard
                                name={districtBName}
                                stats={statsB}
                                numericFields={numericFields}
                                hasDataset={!!geojsonData}
                                hasDistrict={!!districtB}
                                color={COLOR_B}
                            />
                        </div>
                    )}

                    {/* Bar Charts */}
                    {geojsonData && districtA && districtB && stringFields.length > 0 && (
                        <div className="space-y-4 pb-8">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-bold text-gray-800">Category Breakdown</h2>
                                <div className="w-48">
                                    <div className="relative">
                                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <select
                                            value={selectedField}
                                            onChange={(e) => setSelectedField(e.target.value)}
                                            className="w-full pl-10 pr-8 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none cursor-pointer"
                                        >
                                            {stringFields.map(f => (
                                                <option key={f.name} value={f.name}>{f.name}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                    </div>
                                </div>
                            </div>
                            {selectedField && (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100" style={{ borderTopColor: COLOR_A, borderTopWidth: 3 }}>
                                        <h3 className="text-lg font-bold text-gray-800 mb-4">
                                            {districtAName}
                                        </h3>
                                        <BarChartComparison data={chartDataA} color={COLOR_A} />
                                    </div>
                                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100" style={{ borderTopColor: COLOR_B, borderTopWidth: 3 }}>
                                        <h3 className="text-lg font-bold text-gray-800 mb-4">
                                            {districtBName}
                                        </h3>
                                        <BarChartComparison data={chartDataB} color={COLOR_B} />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

// District stats card

/** Check if a field name looks like an identifier (not meaningful for statistics). */
const isIdField = (name) => /^(id|fid|gid|osm_id|object_id|objectid|feature_id|_id)$/i.test(name)
    || /(_id|Id)$/.test(name);

function DistrictStatsCard({ name, stats, numericFields, hasDataset, hasDistrict, color = '#4F46E5' }) {
    const isEmpty = hasDataset && hasDistrict && stats?.total_count === 0;

    // Filter out identifier fields — they're not meaningful for analysis
    const meaningfulFields = numericFields.filter(f => !isIdField(f.name));

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100" style={{ borderTopColor: color, borderTopWidth: 3 }}>
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-800">{name}</h3>
                <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-medium">Analysis</span>
            </div>

            {!hasDistrict ? (
                <div className="flex items-center gap-2 p-4 bg-gray-50 rounded-lg text-gray-400 text-sm">
                    <MapPin className="w-4 h-4" />
                    <span>Select a district above to see statistics.</span>
                </div>
            ) : isEmpty ? (
                <div className="flex items-center gap-2 p-4 bg-amber-50 rounded-lg text-amber-700 text-sm border border-amber-200">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>No features from the selected dataset were found within this district&apos;s boundaries.</span>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Total features count */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-gray-500 text-xs uppercase font-semibold">Total Features</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">
                            {stats?.total_count ?? '—'}
                        </p>
                    </div>

                    {/* Numeric field stats — avg, min, max */}
                    {meaningfulFields.length > 0 && (
                        <div className="grid grid-cols-1 gap-3">
                            {meaningfulFields.map(field => {
                                const fs = stats?.field_stats?.[field.name];
                                if (!fs || fs.count === 0) return null;
                                const label = field.name.replace(/_/g, ' ');
                                return (
                                    <div key={field.name} className="bg-gray-50 p-4 rounded-lg">
                                        <p className="text-gray-500 text-xs uppercase font-semibold mb-2">{label}</p>
                                        <div className="grid grid-cols-3 gap-2 text-center">
                                            <div>
                                                <p className="text-xs text-gray-400">Min</p>
                                                <p className="text-lg font-bold text-gray-900">{fs.min ?? '—'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-400">Avg</p>
                                                <p className="text-lg font-bold text-gray-900">{fs.avg ?? '—'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-400">Max</p>
                                                <p className="text-lg font-bold text-gray-900">{fs.max ?? '—'}</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* If no meaningful numeric fields, show a hint */}
                    {meaningfulFields.length === 0 && (
                        <p className="text-xs text-gray-400 italic">No numeric attributes to analyze. Use the bar charts below for category comparison.</p>
                    )}
                </div>
            )}
        </div>
    );
}
