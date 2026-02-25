"use client";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
    Activity,
    MapPin,
    ArrowLeft,
    BarChart3,
    Tag,
    TrendingUp,
    X,
    Database,
} from "lucide-react";
import BarChartComparison from "@/components/BarChartComparison";
import { aggregateByField } from "@/lib/aggregateData";

export default function AnalysisFlipCard({
    features,
    fieldsMetadata = [],
    datasetName,
    featureCount,
    onClose,
}) {
    const [isFlipped, setIsFlipped] = useState(false);

    // Refs for measuring side heights
    const frontRef = useRef(null);
    const backRef = useRef(null);
    const [frontHeight, setFrontHeight] = useState(0);
    const [backHeight, setBackHeight] = useState(0);

    // Measure heights with ResizeObserver
    const observeHeight = useCallback((ref, setter) => {
        if (!ref.current) return;
        const el = ref.current;
        setter(el.scrollHeight);

        const observer = new ResizeObserver(() => {
            setter(el.scrollHeight);
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    useEffect(() => observeHeight(frontRef, setFrontHeight), [observeHeight, features]);
    useEffect(() => observeHeight(backRef, setBackHeight), [observeHeight, features, isFlipped]);

    // Categorical fields the user can pick from
    // Include all string fields — the bar chart limits to top 10 regardless
    const categoricalFields = useMemo(
        () =>
            fieldsMetadata.filter(
                (f) => f.type === "string"
            ),
        [fieldsMetadata]
    );

    const [selectedField, setSelectedField] = useState(
        categoricalFields[0]?.name ?? ""
    );

    // Sync selectedField when categoricalFields change (e.g. async data load)
    useEffect(() => {
        if (categoricalFields.length > 0 && !categoricalFields.some((f) => f.name === selectedField)) {
            setSelectedField(categoricalFields[0].name);
        }
    }, [categoricalFields, selectedField]);

    // Aggregate features by the chosen field
    const chartData = useMemo(() => {
        if (!features || !selectedField) return [];
        return aggregateByField(features, selectedField);
    }, [features, selectedField]);

    // Summary stats for the front card
    const hasData = features && features.length > 0;
    const topCategory = chartData[0];

    const handleFlip = () => setIsFlipped(!isFlipped);

    const containerHeight = isFlipped ? backHeight : frontHeight;

    /* ------------------------------------------------------------------ */
    /*  EMPTY STATE — no dataset loaded                                    */
    /* ------------------------------------------------------------------ */
    if (!hasData) {
        return (
            <div className="w-full max-w-4xl mx-auto px-4 mb-6">
                <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
                    {/* Header */}
                    <div className="bg-cyan px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Activity className="w-6 h-6 text-white" />
                            <h3 className="text-xl font-bold text-white">
                                Quick Analysis Summary
                            </h3>
                        </div>
                        {onClose && (
                            <button
                                onClick={onClose}
                                className="text-white/80 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}
                    </div>

                    <div className="p-6">
                        {/* No data message */}
                        <div className="mb-6 p-5 bg-gray-50 rounded-lg border-l-4 border-gray-300">
                            <div className="flex items-start gap-3">
                                <Database className="w-6 h-6 text-gray-400 mt-1 shrink-0" />
                                <div>
                                    <h4 className="text-lg font-bold text-gray-700 mb-1">
                                        No Dataset Loaded
                                    </h4>
                                    <p className="text-gray-500">
                                        Select a layer on the map to see analysis results.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Placeholder stat cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <div className="bg-linear-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                                <div className="flex items-center gap-2 mb-2">
                                    <MapPin className="w-5 h-5 text-[#2C3580]" />
                                    <span className="text-sm font-semibold text-gray-700">
                                        Features
                                    </span>
                                </div>
                                <p className="text-3xl font-bold text-[#2C3580]">&mdash;</p>
                                <p className="text-xs text-gray-600 mt-1">Data points loaded</p>
                            </div>

                            <div className="bg-linear-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                                <div className="flex items-center gap-2 mb-2">
                                    <Tag className="w-5 h-5 text-earthy-green" />
                                    <span className="text-sm font-semibold text-gray-700">
                                        Categories
                                    </span>
                                </div>
                                <p className="text-3xl font-bold text-earthy-green">&mdash;</p>
                                <p className="text-xs text-gray-600 mt-1">Categorical fields</p>
                            </div>

                            <div className="bg-linear-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                                <div className="flex items-center gap-2 mb-2">
                                    <TrendingUp className="w-5 h-5 text-purple-600" />
                                    <span className="text-sm font-semibold text-gray-700">
                                        Top Field
                                    </span>
                                </div>
                                <p className="text-3xl font-bold text-purple-600">&mdash;</p>
                                <p className="text-xs text-gray-600 mt-1">No categorical fields</p>
                            </div>
                        </div>

                        <button
                            disabled
                            className="w-full bg-gray-300 text-white py-4 rounded-lg font-semibold text-lg flex items-center justify-center gap-2 cursor-not-allowed"
                        >
                            <BarChart3 className="w-5 h-5" />
                            Load data to analyze
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    /* ------------------------------------------------------------------ */
    /*  DATA LOADED — flip card with summary (front) + chart (back)        */
    /* ------------------------------------------------------------------ */
    return (
        <div className="w-full max-w-4xl mx-auto px-4 mb-6" style={{ perspective: "1000px" }}>
            <div
                className="relative w-full transition-all duration-700 ease-in-out"
                style={{
                    height: containerHeight > 0 ? containerHeight : "auto",
                    transformStyle: "preserve-3d",
                    transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                }}
            >
                {/* ============ FRONT SIDE ============ */}
                <div
                    ref={frontRef}
                    className="absolute inset-x-0 top-0 w-full"
                    style={{ backfaceVisibility: "hidden" }}
                >
                    <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden flex flex-col">
                        {/* Header */}
                        <div className="bg-cyan px-6 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Activity className="w-6 h-6 text-white" />
                                <h3 className="text-xl font-bold text-white">
                                    Quick Analysis Summary
                                </h3>
                            </div>
                            {onClose && (
                                <button
                                    onClick={onClose}
                                    className="text-white/80 hover:text-white transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            )}
                        </div>

                        <div className="p-6 flex-1 flex flex-col">
                            {/* Dataset info */}
                            <div className="mb-5 p-4 bg-linear-to-br from-cyan/5 to-cyan/10 rounded-lg border-l-4 border-cyan">
                                <div className="flex items-start gap-3">
                                    <Database className="w-5 h-5 text-cyan mt-0.5 shrink-0" />
                                    <div>
                                        <h4 className="text-base font-bold text-gray-900">
                                            {datasetName || "Dataset"}
                                        </h4>
                                        <p className="text-sm text-gray-600">
                                            {featureCount?.toLocaleString() ?? features.length.toLocaleString()}{" "}
                                            features loaded
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Stat cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                <div className="bg-linear-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                                    <div className="flex items-center gap-2 mb-2">
                                        <MapPin className="w-5 h-5 text-[#2C3580]" />
                                        <span className="text-sm font-semibold text-gray-700">
                                            Features
                                        </span>
                                    </div>
                                    <p className="text-3xl font-bold text-[#2C3580]">
                                        {featureCount?.toLocaleString() ?? features.length.toLocaleString()}
                                    </p>
                                    <p className="text-xs text-gray-600 mt-1">Data points loaded</p>
                                </div>

                                <div className="bg-linear-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Tag className="w-5 h-5 text-earthy-green" />
                                        <span className="text-sm font-semibold text-gray-700">
                                            Categories
                                        </span>
                                    </div>
                                    <p className="text-3xl font-bold text-earthy-green">
                                        {categoricalFields.length}
                                    </p>
                                    <p className="text-xs text-gray-600 mt-1">Categorical fields</p>
                                </div>

                                <div className="bg-linear-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                                    <div className="flex items-center gap-2 mb-2">
                                        <TrendingUp className="w-5 h-5 text-purple-600" />
                                        <span className="text-sm font-semibold text-gray-700">
                                            Top Field
                                        </span>
                                    </div>
                                    <p className="text-xl font-bold text-purple-600 truncate">
                                        {topCategory?.category ?? "—"}
                                    </p>
                                    <p className="text-xs text-gray-600 mt-1">
                                        {topCategory
                                            ? `${topCategory.count} occurrences`
                                            : "No categorical fields"}
                                    </p>
                                </div>
                            </div>

                            {/* Flip button */}
                            <button
                                onClick={handleFlip}
                                disabled={categoricalFields.length === 0}
                                className="w-full bg-cyan text-white py-4 rounded-lg font-semibold text-lg hover:opacity-90 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-auto"
                            >
                                <BarChart3 className="w-5 h-5" />
                                Show Bar Chart
                            </button>
                        </div>
                    </div>
                </div>

                {/* ============ BACK SIDE ============ */}
                <div
                    ref={backRef}
                    className="absolute inset-x-0 top-0 w-full"
                    style={{
                        backfaceVisibility: "hidden",
                        transform: "rotateY(180deg)",
                    }}
                >
                    <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden flex flex-col">
                        {/* Header */}
                        <div className="bg-cyan px-6 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <BarChart3 className="w-6 h-6 text-white" />
                                <h3 className="text-xl font-bold text-white">
                                    Bar Chart Comparison
                                </h3>
                            </div>
                            <button
                                onClick={handleFlip}
                                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors font-medium"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Back
                            </button>
                        </div>

                        <div className="p-6 flex-1 overflow-y-auto">
                            {/* Field selector + total */}
                            <div className="mb-4 flex items-end gap-4">
                                <div className="flex-1">
                                    <label className="text-sm font-semibold text-gray-700 block mb-1.5">
                                        Group by
                                    </label>
                                    <select
                                        value={selectedField}
                                        onChange={(e) => setSelectedField(e.target.value)}
                                        className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan focus:border-cyan"
                                    >
                                        {categoricalFields.map((f) => (
                                            <option key={f.name} value={f.name}>
                                                {f.name
                                                    .replace(/_/g, " ")
                                                    .replace(/\b\w/g, (l) => l.toUpperCase())}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="text-right pb-0.5">
                                    <span className="text-xs text-gray-500">Total</span>
                                    <p className="text-lg font-bold text-gray-800">
                                        {chartData.reduce((s, d) => s + d.count, 0).toLocaleString()}
                                    </p>
                                </div>
                            </div>

                            {/* Bar chart */}
                            <BarChartComparison data={chartData} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
