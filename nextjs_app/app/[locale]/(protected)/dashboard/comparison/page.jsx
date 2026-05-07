"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useSelector } from "react-redux";
import {
    AlertCircle,
    ArrowRightLeft,
    BarChart3,
    CheckCircle2,
    ChevronUp,
    Database,
    Layers,
    Loader2,
    MapPin,
    Search,
    Send,
    Sparkles,
    X,
} from "lucide-react";

import api from "@/lib/apiClient";
import ComparisonAnalysisPanel from "@/components/comparison/ComparisonAnalysisPanel";
import { buildComparisonRequest, splitComparisonGeoJSON } from "@/lib/comparisonPage";
import { classify } from "@/lib/nlqClassifier";
import { selectActiveProject } from "@/lib/store/features/projectSlice";
import { cn } from "@/lib/utils";

const ComparisonMap = dynamic(
    () => import("@/components/ComparisonMap"),
    {
        ssr: false,
        loading: () => <div className="absolute inset-0 bg-gray-100 animate-pulse" />,
    },
);

const SIDE_A_COLOR = "#134565";
const SIDE_B_COLOR = "#13B38D";
const DEFAULT_CENTER = [24.7136, 46.6753];
const EXAMPLE_QUERY = "compare airports between Olaya and Malaz";

function formatCount(value) {
    return Number(value || 0).toLocaleString();
}

function datasetIdOf(dataset) {
    return String(dataset?.id || dataset?.dataset_id || "");
}

function datasetMeta(dataset) {
    if (!dataset) return "Dataset";
    return [
        dataset.file_format || dataset.format,
        dataset.geometry_type || dataset.geometryType,
        dataset.visibility || (dataset.is_public ? "Public" : null),
    ].filter(Boolean).join(" - ") || "Project dataset";
}

function StatusDot({ status }) {
    const active = status === "processing" || status === "submitting";
    const done = status === "done";
    const failed = status === "failed";

    return (
        <span className="relative inline-flex h-2.5 w-2.5 items-center justify-center">
            {active && <span className="absolute h-2.5 w-2.5 rounded-full bg-[#13B38D]/40 animate-ping" />}
            <span
                className={cn(
                    "relative h-2.5 w-2.5 rounded-full",
                    active || done ? "bg-[#13B38D]" : failed ? "bg-red-500" : "bg-gray-300",
                )}
            />
        </span>
    );
}

function parseDistrictPair(query) {
    const match = String(query || "").match(/\bbetween\s+(.+?)\s+and\s+(.+?)(?:\s+(?:by|on|based on)\b|[.?!]?$)/i);
    if (!match) return null;
    const first = match[1].trim();
    const second = match[2].trim();
    if (!first || !second) return null;
    return [first, second];
}

function QuerySignal({ query }) {
    const cls = useMemo(() => classify(query), [query]);
    const districtPair = useMemo(() => parseDistrictPair(query), [query]);

    if (!query.trim()) {
        return (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 font-semibold text-gray-500">
                <Sparkles className="h-3 w-3 text-gray-400" />
                Waiting for comparison intent
            </span>
        );
    }

    if (!cls.ok || cls.type !== "comparison" || !cls.matchedTerms?.length) {
        return (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-700">
                <AlertCircle className="h-3 w-3" />
                Start with compare or contrast
            </span>
        );
    }

    const visibleTerms = cls.matchedTerms.slice(0, 3);

    return (
        <span className="flex min-w-0 flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#13B38D]/10 px-2.5 py-1 font-semibold text-[#0E8A6F]">
                <Sparkles className="h-3 w-3" />
                Comparison detected
            </span>
            {districtPair && (
                <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-[#134565]/8 px-2.5 py-1 font-semibold text-[#134565]">
                    <span className="max-w-24 truncate">{districtPair[0]}</span>
                    <ArrowRightLeft className="h-3 w-3 shrink-0" />
                    <span className="max-w-24 truncate">{districtPair[1]}</span>
                </span>
            )}
            {visibleTerms.map((term) => (
                <span
                    key={term}
                    className="rounded-full border border-gray-200 bg-white px-2.5 py-1 font-semibold text-gray-500"
                >
                    {term}
                </span>
            ))}
        </span>
    );
}

function DatasetPicker({
    datasets,
    selectedDatasetId,
    onSelect,
    disabled,
    loading,
    fetchError,
}) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const containerRef = useRef(null);

    const selectedDataset = datasets.find((dataset) => datasetIdOf(dataset) === String(selectedDatasetId));
    const filteredDatasets = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return datasets;
        return datasets.filter((dataset) => {
            const haystack = `${dataset.name || ""} ${datasetMeta(dataset)}`.toLowerCase();
            return haystack.includes(term);
        });
    }, [datasets, search]);

    useEffect(() => {
        const onPointerDown = (event) => {
            if (!containerRef.current?.contains(event.target)) {
                setOpen(false);
                setSearch("");
            }
        };
        document.addEventListener("mousedown", onPointerDown);
        return () => document.removeEventListener("mousedown", onPointerDown);
    }, []);

    const chooseDataset = (dataset) => {
        onSelect(datasetIdOf(dataset));
        setOpen(false);
        setSearch("");
    };

    const clearDataset = (event) => {
        event.stopPropagation();
        onSelect("");
        setSearch("");
    };

    return (
        <div ref={containerRef} className="relative shrink-0">
            <button
                type="button"
                onClick={() => !disabled && setOpen((value) => !value)}
                disabled={disabled}
                className={cn(
                    "h-11 min-w-11 rounded-full border px-3 text-sm transition-all flex items-center gap-2",
                    "focus:outline-none focus:ring-2 focus:ring-[#134565]/20",
                    selectedDataset
                        ? "border-[#13B38D]/30 bg-[#13B38D]/10 text-[#0E8A6F]"
                        : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50",
                    disabled && "cursor-not-allowed opacity-60",
                )}
                aria-label="Select comparison dataset"
            >
                {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <Database className="h-4 w-4" strokeWidth={2.4} />
                )}
                <span className="hidden max-w-44 truncate font-semibold sm:inline">
                    {selectedDataset?.name || "Dataset"}
                </span>
                {selectedDataset ? (
                    <span
                        role="button"
                        tabIndex={-1}
                        onClick={clearDataset}
                        className="rounded-full p-0.5 text-[#0E8A6F] hover:bg-[#13B38D]/15"
                        aria-label="Clear selected dataset"
                    >
                        <X className="h-3.5 w-3.5" />
                    </span>
                ) : (
                    <ChevronUp className="h-3.5 w-3.5 text-gray-400" />
                )}
            </button>

            {open && (
                <div className="absolute bottom-full left-0 mb-3 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl shadow-slate-900/10 z-[1000]">
                    <div className="border-b border-gray-100 p-3">
                        <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                            <Search className="h-4 w-4 text-gray-400" />
                            <input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                autoFocus
                                placeholder="Search project datasets"
                                className="min-w-0 flex-1 bg-transparent text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none"
                            />
                        </div>
                    </div>

                    <div className="max-h-72 overflow-y-auto p-2">
                        {fetchError && (
                            <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
                                {fetchError}
                            </div>
                        )}

                        {!fetchError && !loading && datasets.length === 0 && (
                            <div className="px-4 py-8 text-center">
                                <Database className="mx-auto h-5 w-5 text-gray-300" />
                                <p className="mt-2 text-sm font-semibold text-gray-700">No datasets in this project</p>
                                <p className="mt-1 text-xs text-gray-400">Add a dataset before running a comparison.</p>
                            </div>
                        )}

                        {!fetchError && loading && (
                            <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-gray-500">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Loading datasets...
                            </div>
                        )}

                        {!fetchError && !loading && filteredDatasets.map((dataset) => {
                            const id = datasetIdOf(dataset);
                            const selected = id === String(selectedDatasetId);
                            return (
                                <button
                                    key={id}
                                    type="button"
                                    onClick={() => chooseDataset(dataset)}
                                    className={cn(
                                        "w-full rounded-xl px-3 py-2.5 text-left transition-colors flex items-center gap-3",
                                        selected ? "bg-[#13B38D]/10" : "hover:bg-gray-50",
                                    )}
                                >
                                    <span
                                        className={cn(
                                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                                            selected ? "bg-[#13B38D] text-white" : "bg-gray-100 text-gray-500",
                                        )}
                                    >
                                        {selected ? <CheckCircle2 className="h-4 w-4" /> : <Layers className="h-4 w-4" />}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-sm font-semibold text-gray-800">
                                            {dataset.name || "Untitled dataset"}
                                        </span>
                                        <span className="mt-0.5 block truncate text-[11px] font-medium uppercase tracking-wide text-gray-400">
                                            {datasetMeta(dataset)}
                                        </span>
                                    </span>
                                </button>
                            );
                        })}

                        {!fetchError && !loading && datasets.length > 0 && filteredDatasets.length === 0 && (
                            <div className="px-4 py-8 text-center text-sm text-gray-400">
                                No matching datasets
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function MapPanel({ side, color, district, count, geojson, isProcessing, elapsedSeconds, highlightedComparisonValue }) {
    const hasResult = Boolean(district);
    const loadingText = elapsedSeconds > 12
        ? "Still building map layers"
        : elapsedSeconds > 5
            ? "Filtering district features"
            : `Plotting district ${side}`;

    return (
        <section className="relative h-full min-h-[24rem] flex-1 overflow-hidden bg-gray-100">
            <div className="absolute inset-0">
                <ComparisonMap
                    mapId={`district-map-${side}`}
                    center={DEFAULT_CENTER}
                    zoom={11}
                    boundaryGeoJSON={geojson?.boundary}
                    featurePoints={geojson?.points}
                    color={color}
                    highlightedComparisonValue={highlightedComparisonValue}
                />
            </div>

            <div className="pointer-events-none absolute left-4 top-4 z-[400]">
                <div className="flex items-center gap-2 rounded-full border border-white/80 bg-white/90 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-gray-600 shadow-sm backdrop-blur">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                    District {side}
                </div>
            </div>

            {hasResult && !isProcessing && (
                <div className="absolute left-4 top-14 z-[400] max-w-[calc(100%-2rem)] animate-in fade-in slide-in-from-top-1 duration-300">
                    <div className="rounded-xl border border-white/80 bg-white/95 px-3.5 py-2.5 shadow-md backdrop-blur">
                        <div className="flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5 shrink-0" style={{ color }} />
                            <span className="truncate text-sm font-bold text-gray-900">{district}</span>
                        </div>
                        <div className="mt-1 flex items-baseline gap-1.5">
                            <span className="font-mono text-lg font-bold tabular-nums text-gray-900">
                                {formatCount(count)}
                            </span>
                            <span className="text-[11px] font-medium text-gray-400">features</span>
                        </div>
                    </div>
                </div>
            )}

            {isProcessing && (
                <div className="absolute inset-0 z-[450] flex flex-col items-center justify-center gap-3 bg-white/45 backdrop-blur-[2px]">
                    <div
                        className="h-10 w-10 rounded-full border-[2.5px] animate-spin"
                        style={{ borderColor: `${color}30`, borderTopColor: color }}
                    />
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500">
                        {loadingText}
                    </p>
                </div>
            )}
        </section>
    );
}

function ProcessingStrip({ elapsedSeconds }) {
    if (elapsedSeconds <= 0) return null;

    const label = elapsedSeconds > 12
        ? "This can take a moment for larger datasets"
        : elapsedSeconds > 5
            ? "Matching districts and preparing GeoJSON"
            : "Submitting comparison job";

    return (
        <div className="absolute left-1/2 top-5 z-[600] w-[min(30rem,calc(100%-2rem))] -translate-x-1/2">
            <div className="overflow-hidden rounded-2xl border border-white/80 bg-white/95 shadow-xl shadow-slate-900/10 backdrop-blur-md">
                <div className="flex items-center gap-3 px-4 py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-[#13B38D]" />
                    <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-gray-900">Running district comparison</div>
                        <div className="mt-0.5 text-xs text-gray-500">{label}</div>
                    </div>
                    <span className="font-mono text-xs font-semibold tabular-nums text-gray-400">
                        {elapsedSeconds}s
                    </span>
                </div>
                <div className="h-1 bg-gray-100">
                    <div
                        className="h-full bg-[#13B38D] transition-all duration-500"
                        style={{ width: `${Math.min(92, 18 + elapsedSeconds * 4)}%` }}
                    />
                </div>
            </div>
        </div>
    );
}

const ANALYSIS_PANEL_WIDTH = 400;

export default function ComparisonPage() {
    const activeProject = useSelector(selectActiveProject);
    const projectId = activeProject?.id;
    const projectName = activeProject?.name;

    const [query, setQuery] = useState("");
    const [selectedDatasetId, setSelectedDatasetId] = useState("");
    const [projectDatasets, setProjectDatasets] = useState([]);
    const [loadingDatasets, setLoadingDatasets] = useState(false);
    const [datasetError, setDatasetError] = useState(null);
    const [status, setStatus] = useState(null);
    const [jobId, setJobId] = useState(null);
    const [comparisonGeojson, setComparisonGeojson] = useState(null);
    const [error, setError] = useState(null);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [panelOpen, setPanelOpen] = useState(true);
    const [highlightedComparisonValue, setHighlightedComparisonValue] = useState(null);
    const intervalRef = useRef(null);

    const clearPollInterval = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, []);

    const resetResultState = useCallback(() => {
        clearPollInterval();
        setStatus(null);
        setJobId(null);
        setComparisonGeojson(null);
        setError(null);
        setElapsedSeconds(0);
    }, [clearPollInterval]);

    const datasets = useMemo(
        () => projectDatasets.map((dataset) => ({ ...dataset, id: datasetIdOf(dataset) })).filter((dataset) => dataset.id),
        [projectDatasets],
    );
    const selectedDataset = useMemo(
        () => datasets.find((dataset) => dataset.id === String(selectedDatasetId)),
        [datasets, selectedDatasetId],
    );

    const split = useMemo(() => splitComparisonGeoJSON(comparisonGeojson), [comparisonGeojson]);
    const meta = comparisonGeojson?.properties || {};
    const districtA = meta.districtA || {};
    const districtB = meta.districtB || {};
    const isProcessing = status === "processing" || status === "submitting";
    const hasResult = status === "done" && Boolean(comparisonGeojson);
    const trimmedQuery = query.trim();
    const submitDisabled = isProcessing || loadingDatasets || !selectedDatasetId || !trimmedQuery;
    const fetchDatasets = useCallback(async () => {
        if (!projectId) {
            setProjectDatasets([]);
            return;
        }

        setLoadingDatasets(true);
        setDatasetError(null);
        try {
            const data = await api.get(`/projects/${projectId}/datasets`);
            setProjectDatasets(Array.isArray(data) ? data : []);
        } catch (fetchError) {
            setProjectDatasets([]);
            setDatasetError(fetchError?.data?.error || fetchError?.message || "Failed to load project datasets.");
        } finally {
            setLoadingDatasets(false);
        }
    }, [projectId]);

    useEffect(() => {
        setSelectedDatasetId("");
        setQuery("");
        setProjectDatasets([]);
        setDatasetError(null);
        resetResultState();
        fetchDatasets();
    }, [projectId, fetchDatasets, resetResultState]);

    useEffect(() => {
        if (!selectedDatasetId) return;
        if (!loadingDatasets && datasets.length > 0 && !selectedDataset) {
            setSelectedDatasetId("");
        }
    }, [datasets, loadingDatasets, selectedDataset, selectedDatasetId]);

    useEffect(() => {
        if (status !== "processing" || !jobId) return undefined;

        clearPollInterval();
        let consecutiveFailures = 0;
        intervalRef.current = setInterval(async () => {
            try {
                const result = await api.get(`/nlq/${jobId}`);
                consecutiveFailures = 0;
                if (result.status === "done") {
                    clearPollInterval();
                    try {
                        const geojson = await api.get(`/nlq/${jobId}/result`);
                        setComparisonGeojson(geojson);
                        setStatus("done");
                    } catch (resultError) {
                        setError(resultError?.data?.error || resultError?.message || "Failed to load comparison result.");
                        setStatus("failed");
                    }
                } else if (result.status === "failed") {
                    clearPollInterval();
                    setError(result.error || "Job failed on the worker.");
                    setStatus("failed");
                }
            } catch (pollError) {
                consecutiveFailures += 1;
                if (consecutiveFailures >= 3) {
                    clearPollInterval();
                    setError(pollError?.data?.error || pollError?.message || "Lost connection while polling job status.");
                    setStatus("failed");
                }
            }
        }, 2000);

        return clearPollInterval;
    }, [clearPollInterval, jobId, status]);

    useEffect(() => clearPollInterval, [clearPollInterval]);

    useEffect(() => {
        if (!isProcessing) {
            setElapsedSeconds(0);
            return undefined;
        }

        setElapsedSeconds(0);
        const timer = setInterval(() => {
            setElapsedSeconds((value) => value + 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [isProcessing]);

    useEffect(() => {
        if (!hasResult) return undefined;
        const t = setTimeout(() => window.dispatchEvent(new Event("resize")), 320);
        return () => clearTimeout(t);
    }, [panelOpen, hasResult]);

    const handleSubmit = async () => {
        if (submitDisabled) return;

        setError(null);
        setComparisonGeojson(null);
        clearPollInterval();

        if (!projectId) {
            setError("No active project. Pick one from the sidebar.");
            return;
        }
        if (!selectedDatasetId) {
            setError("Select a dataset for comparison.");
            return;
        }

        const cls = classify(trimmedQuery);
        if (!cls.ok || cls.type !== "comparison") {
            setError(`Use a comparison query. Try: compare ${selectedDataset?.name || "this dataset"} between District A and District B`);
            return;
        }

        setStatus("submitting");
        setJobId(null);

        try {
            const response = await api.post("/nlq", buildComparisonRequest({
                query: trimmedQuery,
                projectId,
                selectedDatasetId,
            }));

            if (response?.jobId) {
                setJobId(response.jobId);
                setStatus("processing");
            } else {
                setError("The server did not return a job id.");
                setStatus("failed");
            }
        } catch (submitError) {
            setError(submitError?.data?.error || submitError?.message || "Submission failed.");
            setStatus(null);
        }
    };

    const handleReset = () => {
        resetResultState();
    };

    return (
        <main className="flex h-[calc(100vh-4rem)] min-h-[640px] flex-1 flex-col overflow-hidden bg-gray-50">
            <header className="shrink-0 border-b border-gray-200 bg-white">
                <div className="flex items-center justify-between gap-4 px-6 py-4">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#134565] text-white shadow-sm">
                            <ArrowRightLeft className="h-4 w-4" strokeWidth={2.4} />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <h1 className="truncate text-[15px] font-bold text-gray-900">District Comparison</h1>
                                <StatusDot status={status} />
                            </div>
                            <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
                                {projectName && (
                                    <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-700">
                                        {projectName}
                                    </span>
                                )}
                                <span>Compare one dataset across two districts</span>
                            </p>
                        </div>
                    </div>

                </div>
            </header>

            <div className="relative flex min-h-0 flex-1">
                <div
                    className="relative flex min-w-0 flex-1 flex-col transition-[margin] duration-300 ease-in-out lg:flex-row"
                    style={{ marginRight: hasResult && panelOpen ? ANALYSIS_PANEL_WIDTH : 0 }}
                >
                    {isProcessing && <ProcessingStrip elapsedSeconds={elapsedSeconds} />}

                    {hasResult && !panelOpen && (
                        <button
                            type="button"
                            onClick={() => setPanelOpen(true)}
                            className="absolute right-4 top-5 z-[600] flex items-center gap-2 rounded-full bg-[#134565] px-3.5 py-2 text-xs font-semibold text-white shadow-lg transition-colors hover:bg-[#0E3147]"
                        >
                            <BarChart3 className="h-3.5 w-3.5" />
                            Show analysis
                        </button>
                    )}

                    <MapPanel
                        side="A"
                        color={districtA.color || SIDE_A_COLOR}
                        district={districtA.name}
                        count={districtA.count}
                        geojson={split.A}
                        isProcessing={isProcessing}
                        elapsedSeconds={elapsedSeconds}
                        highlightedComparisonValue={highlightedComparisonValue}
                    />
                    <div className="hidden w-px shrink-0 bg-white lg:block" />
                    <div className="h-px shrink-0 bg-white lg:hidden" />
                    <MapPanel
                        side="B"
                        color={districtB.color || SIDE_B_COLOR}
                        district={districtB.name}
                        count={districtB.count}
                        geojson={split.B}
                        isProcessing={isProcessing}
                        elapsedSeconds={elapsedSeconds}
                        highlightedComparisonValue={highlightedComparisonValue}
                    />
                </div>

                <ComparisonAnalysisPanel
                    meta={hasResult ? meta : null}
                    isOpen={hasResult && panelOpen}
                    onClose={() => setPanelOpen(false)}
                    onHighlight={setHighlightedComparisonValue}
                    width={ANALYSIS_PANEL_WIDTH}
                />
            </div>

            {(error || datasetError) && (
                <div className="shrink-0 border-t border-red-100 bg-red-50 px-6 py-3">
                    <div className="mx-auto flex max-w-6xl items-center gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                        <span className="flex-1 text-sm text-red-700">{error || datasetError}</span>
                        {error && (
                            <button
                                type="button"
                                onClick={handleReset}
                                className="rounded-md px-2 py-1 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>
            )}

            <div className="shrink-0 border-t border-gray-200 bg-white px-4 py-4 shadow-[0_-6px_24px_-18px_rgba(15,23,42,0.45)] sm:px-6">
                <div className="mx-auto max-w-6xl">
                    <div className="rounded-2xl border border-gray-200 bg-white p-2 shadow-sm">
                        <div className="flex items-center gap-2">
                            <DatasetPicker
                                datasets={datasets}
                                selectedDatasetId={selectedDatasetId}
                                onSelect={(id) => {
                                    setSelectedDatasetId(id);
                                    setError(null);
                                }}
                                disabled={loadingDatasets || isProcessing}
                                loading={loadingDatasets}
                                fetchError={datasetError}
                            />

                            <input
                                type="text"
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                        event.preventDefault();
                                        if (!submitDisabled) handleSubmit();
                                    }
                                }}
                                disabled={isProcessing}
                                placeholder={EXAMPLE_QUERY}
                                className="min-w-0 flex-1 bg-transparent px-2 py-3 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none disabled:opacity-60"
                            />

                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={submitDisabled}
                                className={cn(
                                    "flex h-11 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-all active:scale-[0.98]",
                                    submitDisabled
                                        ? "cursor-not-allowed bg-gray-100 text-gray-400"
                                        : "bg-[#134565] text-white hover:bg-[#0E3147]",
                                )}
                            >
                                {isProcessing ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span className="hidden sm:inline">Comparing</span>
                                    </>
                                ) : (
                                    <>
                                        <Send className="h-4 w-4" strokeWidth={2.4} />
                                        <span className="hidden sm:inline">Compare</span>
                                    </>
                                )}
                            </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 px-2 pb-1 pt-2 text-xs">
                            {selectedDataset ? (
                                <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-[#13B38D]/10 px-2.5 py-1 font-semibold text-[#0E8A6F]">
                                    <Database className="h-3 w-3 shrink-0" />
                                    <span className="max-w-52 truncate">{selectedDataset.name}</span>
                                </span>
                            ) : (
                                <span className="text-gray-400">
                                    {loadingDatasets ? "Loading project datasets..." : "Choose one project dataset"}
                                </span>
                            )}

                            <span className="hidden h-1 w-1 rounded-full bg-gray-300 sm:inline-block" />

                            <span className="min-w-0 flex-1 text-gray-500">
                                <QuerySignal query={query} />
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
