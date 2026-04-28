"use client";

import React from 'react';
import dynamic from 'next/dynamic';

import BarChartComparison from '@/components/BarChartComparison';
import SearchableSelect from '@/components/SearchableSelect';
import { useDatasetComparison } from '@/hooks/useDatasetComparison';
import {
    ChevronDown,
    Filter,
    Database,
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

// - Color constants for A / B datasets
const COLOR_A = '#134565';
const COLOR_B = '#13B38D';

export default function ComparisonPage() {
    const {
        allDatasets,
        datasetIdA, datasetIdB,
        setDatasetIdA, setDatasetIdB,
        datasetAName, datasetBName,
        statsA, statsB,
        loadingA, loadingB, loadingDatasets, error,
        numericFields, stringFields,
        selectedField, setSelectedField,
        featurePointsA, featurePointsB,
        chartDataA, chartDataB,
    } = useDatasetComparison();

    const isDatasetALoaded = !!statsA;
    const isDatasetBLoaded = !!statsB;

    return (
        <main className="flex-1 overflow-y-auto p-6 flex flex-col items-center">
            <div className="w-full max-w-7xl space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Dataset Comparison</h1>
                        <p className="text-sm text-gray-500">
                            Select two datasets below to compare their features and statistics side by side.
                        </p>
                    </div>
                </div>

                {/* Guided onboarding */}
                {!loadingDatasets && !datasetIdA && !datasetIdB && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
                        <div className="text-center mb-8">
                            <h2 className="text-xl font-bold text-gray-800">Get Started with Comparison</h2>
                            <p className="text-sm text-gray-500 mt-1">Follow these steps to compare datasets side by side</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex flex-col items-center text-center p-5 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                                <div className="w-10 h-10 rounded-full bg-[#134565] text-white flex items-center justify-center text-lg font-bold mb-3">1</div>
                                <h3 className="font-semibold text-gray-800 mb-1">Choose Dataset A</h3>
                                <p className="text-xs text-gray-500">Pick a dataset from the left panel to see its data on the map.</p>
                            </div>
                            <div className="flex flex-col items-center text-center p-5 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                                <div className="w-10 h-10 rounded-full bg-[#134565] text-white flex items-center justify-center text-lg font-bold mb-3">2</div>
                                <h3 className="font-semibold text-gray-800 mb-1">Choose Dataset B</h3>
                                <p className="text-xs text-gray-500">Pick a second dataset from the right panel to compare statistics and charts side by side.</p>
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
                    {/* Left Panel — Dataset A */}
                    <div className="flex flex-col bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 bg-gray-50/50 space-y-2">
                            <label className="block text-xs font-semibold text-gray-500 uppercase">Select Dataset A</label>
                            <SearchableSelect
                                options={allDatasets}
                                value={datasetIdA}
                                onChange={setDatasetIdA}
                                labelKey="name"
                                valueKey="uniqueId"
                                placeholder="Search datasets..."
                                icon={<Database className="w-4 h-4" />}
                                disabled={loadingDatasets}
                            />
                        </div>
                        <div className="flex-1 relative z-0 flex items-center justify-center bg-gray-50">
                            {loadingA ? (
                                <div className="flex flex-col items-center gap-2 text-gray-400">
                                    <Loader2 className="w-8 h-8 animate-spin" />
                                    <span className="text-sm">Loading dataset...</span>
                                </div>
                            ) : (
                                <ComparisonMap
                                    mapId="map-a"
                                    center={[24.7136, 46.6753]}
                                    zoom={12}
                                    featurePoints={featurePointsA}
                                    color={COLOR_A}
                                />
                            )}
                        </div>
                    </div>

                    {/* Right Panel — Dataset B */}
                    <div className="flex flex-col bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 bg-gray-50/50 space-y-2">
                            <label className="block text-xs font-semibold text-gray-500 uppercase">Select Dataset B</label>
                            <SearchableSelect
                                options={allDatasets}
                                value={datasetIdB}
                                onChange={setDatasetIdB}
                                labelKey="name"
                                valueKey="uniqueId"
                                placeholder="Search datasets..."
                                icon={<Database className="w-4 h-4" />}
                                disabled={loadingDatasets}
                            />
                        </div>
                        <div className="flex-1 relative z-0 flex items-center justify-center bg-gray-50">
                            {loadingB ? (
                                <div className="flex flex-col items-center gap-2 text-gray-400">
                                    <Loader2 className="w-8 h-8 animate-spin" />
                                    <span className="text-sm">Loading dataset...</span>
                                </div>
                            ) : (
                                <ComparisonMap
                                    mapId="map-b"
                                    center={[24.7136, 46.6753]}
                                    zoom={12}
                                    featurePoints={featurePointsB}
                                    color={COLOR_B}
                                />
                            )}
                        </div>
                    </div>
                </div>

                {/* Statistics Cards */}
                {(isDatasetALoaded || isDatasetBLoaded) && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <DatasetStatsCard
                            name={datasetIdA ? datasetAName : "No dataset selected"}
                            stats={statsA}
                            numericFields={numericFields}
                            isLoaded={isDatasetALoaded}
                            color={COLOR_A}
                        />
                        <DatasetStatsCard
                            name={datasetIdB ? datasetBName : "No dataset selected"}
                            stats={statsB}
                            numericFields={numericFields}
                            isLoaded={isDatasetBLoaded}
                            color={COLOR_B}
                        />
                    </div>
                )}

                {/* Bar Charts */}
                {isDatasetALoaded && isDatasetBLoaded && stringFields.length > 0 && (
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
                                        {datasetAName}
                                    </h3>
                                    <BarChartComparison data={chartDataA} color={COLOR_A} />
                                </div>
                                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100" style={{ borderTopColor: COLOR_B, borderTopWidth: 3 }}>
                                    <h3 className="text-lg font-bold text-gray-800 mb-4">
                                        {datasetBName}
                                    </h3>
                                    <BarChartComparison data={chartDataB} color={COLOR_B} />
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </main>
    );
}

/** Check if a field name looks like an identifier (not meaningful for statistics). */
const isIdField = (name) => /^(id|fid|gid|osm_id|object_id|objectid|feature_id|_id)$/i.test(name)
    || /(_id|Id)$/.test(name);

function DatasetStatsCard({ name, stats, numericFields, isLoaded, color = '#4F46E5' }) {
    const isEmpty = isLoaded && stats?.total_count === 0;

    // Filter out identifier fields — they're not meaningful for analysis
    const meaningfulFields = numericFields.filter(f => !isIdField(f.name));

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100" style={{ borderTopColor: color, borderTopWidth: 3 }}>
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-800">{name}</h3>
                <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-medium">Analysis</span>
            </div>

            {!isLoaded ? (
                <div className="flex items-center gap-2 p-4 bg-gray-50 rounded-lg text-gray-400 text-sm">
                    <Database className="w-4 h-4" />
                    <span>Select a dataset above to see statistics.</span>
                </div>
            ) : isEmpty ? (
                <div className="flex items-center gap-2 p-4 bg-amber-50 rounded-lg text-amber-700 text-sm border border-amber-200">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>This dataset has no features to analyze.</span>
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
