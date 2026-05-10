"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSelector } from "react-redux";
import { selectActiveProject } from "@/lib/store/features/projectSlice";
import {
    createComparisonJob,
    getComparisonJobStatus,
    getComparisonJobResult,
    getComparisonHistory,
} from "@/lib/comparisonApi";

import DatasetMultiPicker from "@/components/DatasetMultiPicker";
import ComparisonMapCard from "@/components/ComparisonMapCard";
import ComparisonHistoryStrip from "@/components/ComparisonHistoryStrip";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import {
    ArrowRightLeft,
    Loader2,
    XCircle,
    Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const COLOR_A = "#0E3147"; // primary
const COLOR_B = "#13B38D"; // cyan

const COMPARISON_KEYWORDS = [
    "compare", "contrast", "difference", "differentiate",
    "vs", "versus", "between", "comparison",
];

const VALIDATION_MESSAGES = {
    dataset_outside_requested_locations:
        "The locations were recognized, but the selected dataset does not contain features inside them.",
    feature_type_not_found:
        "The selected dataset does not appear to contain this feature type.",
    missing_feature_fields:
        "The dataset has valid points, but no category/type fields that can identify restaurants, clinics, or similar POIs.",
    one_side_empty:
        "One side has no matching features, so this comparison may be incomplete.",
    both_sides_empty:
        "Both locations were recognized, but no matching features were found in either area.",
};

function isComparisonQuery(query) {
    if (!query) return false;
    const tokens = query.toLowerCase().split(/\s+/);
    return tokens.some((t) => COMPARISON_KEYWORDS.includes(t));
}

function HighlightedQuery({ query }) {
    if (!query) return null;
    const words = query.split(/(\s+)/);
    return (
        <span className="text-xs text-muted-foreground">
            Preview:{" "}
            {words.map((word, i) => {
                const isKw = COMPARISON_KEYWORDS.includes(word.toLowerCase().trim());
                return (
                    <span
                        key={i}
                        className={isKw ? "font-bold px-1 rounded bg-emerald-100 text-emerald-700" : ""}
                    >
                        {word}
                    </span>
                );
            })}
        </span>
    );
}

function SummaryCard({ label, value, color }) {
    return (
        <div
            className="bg-white rounded-xl border p-4 shadow-xs"
            style={{ borderTopColor: color, borderTopWidth: 3 }}
        >
            <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1">
                {label}
            </p>
            <p className="text-lg font-bold text-gray-900 truncate">
                {typeof value === "number" ? value.toLocaleString() : value || "—"}
            </p>
        </div>
    );
}

export default function ComparisonPage() {
    const activeProject = useSelector(selectActiveProject);
    const projectId = activeProject?.id;

    const [query, setQuery] = useState("");
    const [selectedDatasetIds, setSelectedDatasetIds] = useState([]);
    const [status, setStatus] = useState(null);
    const [jobId, setJobId] = useState(null);
    const [error, setError] = useState(null);
    const [resultData, setResultData] = useState(null);

    const [history, setHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const isDetected = useMemo(() => isComparisonQuery(query), [query]);

    const handleToggleDataset = useCallback((id) => {
        setSelectedDatasetIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    }, []);

    // History
    const fetchHistory = useCallback(async () => {
        if (!projectId) return;
        setLoadingHistory(true);
        try {
            const data = await getComparisonHistory(projectId);
            setHistory(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("History fetch error:", err);
        } finally {
            setLoadingHistory(false);
        }
    }, [projectId]);

    useEffect(() => { fetchHistory(); }, [fetchHistory]);

    const handleSubmit = async () => {
        if (!projectId) return setError("Select a project first.");
        if (selectedDatasetIds.length === 0) return setError("Select at least one dataset using the + button.");
        if (!query.trim()) return setError("Enter a comparison query.");

        setStatus("submitting");
        setError(null);
        setResultData(null);

        try {
            const res = await createComparisonJob({
                query: query.trim(),
                projectId,
                datasets: selectedDatasetIds,
            });
            if (res?.jobId) {
                setJobId(res.jobId);
                setStatus("processing");
            }
        } catch (err) {
            setError(err.data?.error || err.message || "Failed to submit job.");
            setStatus(null);
        }
    };

    // Polling
    useEffect(() => {
        if (status !== "processing" || !jobId) return;
        const interval = setInterval(async () => {
            try {
                const res = await getComparisonJobStatus(jobId);
                if (res.status === "done") {
                    clearInterval(interval);
                    setStatus("done");
                    try {
                        const result = await getComparisonJobResult(jobId);
                        setResultData(result);
                    } catch (e) {
                        console.error("Result fetch failed:", e);
                    }
                    fetchHistory();
                } else if (res.status === "failed") {
                    clearInterval(interval);
                    setStatus("failed");
                    setError(res.error || "Processing failed.");
                    fetchHistory();
                }
            } catch (err) {
                console.error("Poll error:", err);
            }
        }, 2000);
        return () => clearInterval(interval);
    }, [status, jobId, fetchHistory]);

    // Load past result
    const handleViewHistory = async (job) => {
        const id = job.job_id || job.id;
        if (job.status !== "done") return;
        setJobId(id);
        setQuery(job.query || "");
        setStatus("done");
        setError(null);
        try {
            const result = await getComparisonJobResult(id);
            setResultData(result);
        } catch (err) {
            setError("Could not load this result.");
        }
    };

    const sideA = resultData?.sideA || null;
    const sideB = resultData?.sideB || null;
    const isProcessing = status === "processing" || status === "submitting";
    const validation = resultData?.metadata?.validation;
    const validationMessage = validation?.reasonCode && validation.reasonCode !== "ok"
        ? VALIDATION_MESSAGES[validation.reasonCode]
        : null;

    return (
        <div className="p-6 md:p-8 space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                            <ArrowRightLeft className="w-5 h-5" />
                        </div>
                        Spatial Comparison
                    </h1>
                    <p className="text-muted-foreground mt-1.5 ml-[52px]">
                        Compare features across locations side by side.
                    </p>
                </div>
                {status === "done" && resultData && (
                    <Badge variant="secondary" className="self-start md:self-center text-xs gap-1.5 px-3 py-1.5">
                        <Sparkles className="h-3 w-3" />
                        Comparison complete
                    </Badge>
                )}
            </div>

            <div className="bg-white rounded-xl border shadow-xs overflow-hidden">
                <div className="flex items-center gap-3 p-4">
                    <DatasetMultiPicker
                        selectedIds={selectedDatasetIds}
                        onToggle={handleToggleDataset}
                        disabled={isProcessing}
                    />
                    <div className="flex-1">
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                            disabled={isProcessing}
                            placeholder="Compare restaurants between Olaya and Malaz..."
                            className={cn(
                                "w-full px-4 py-2.5 bg-gray-50 border-none rounded-lg text-sm",
                                "focus:ring-2 focus:ring-primary/20 transition-all",
                                "placeholder:text-gray-400 disabled:opacity-50 outline-none"
                            )}
                        />
                    </div>
                    <Button
                        onClick={handleSubmit}
                        disabled={isProcessing}
                        className="h-10 px-5 gap-2 font-semibold shadow-md hover:shadow-lg transition-all"
                    >
                        {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRightLeft className="h-4 w-4" />}
                        {isProcessing ? "Comparing…" : "Compare"}
                    </Button>
                </div>

                {/* Metadata */}
                <div className="px-4 pb-3 flex items-center gap-4">
                    {isDetected && (
                        <Badge variant="outline" className="text-[10px] text-emerald-700 border-emerald-200 bg-emerald-50">
                            Comparison Analysis
                        </Badge>
                    )}
                    {selectedDatasetIds.length > 0 && (
                        <span className="text-[10px] font-bold text-primary/50 uppercase tracking-tight">
                            {selectedDatasetIds.length} file{selectedDatasetIds.length !== 1 ? "s" : ""} selected
                        </span>
                    )}
                    {query && (
                        <div className="ml-auto hidden md:block">
                            <HighlightedQuery query={query} />
                        </div>
                    )}
                </div>
            </div>

            {/* Error */}
            {error && (
                <Alert variant="destructive" className="rounded-xl border-red-100 bg-red-50/50 animate-in fade-in slide-in-from-top-2 duration-300">
                    <XCircle className="h-4 w-4" />
                    <AlertTitle>Something went wrong</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {status === "done" && validationMessage && (
                <Alert className="rounded-xl border-amber-200 bg-amber-50/70 animate-in fade-in slide-in-from-top-2 duration-300">
                    <Sparkles className="h-4 w-4 text-amber-700" />
                    <AlertTitle className="text-amber-900">Comparison note</AlertTitle>
                    <AlertDescription className="text-amber-800">
                        {validationMessage}
                    </AlertDescription>
                </Alert>
            )}

            {/* Processing Banner */}
            {status === "processing" && (
                <div className="flex items-center gap-3 bg-primary/5 border border-primary/10 rounded-xl px-5 py-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="h-5 w-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <span className="text-sm font-medium text-primary/80">Comparing spatial data…</span>
                    <span className="text-xs text-muted-foreground ml-auto">Job #{jobId?.slice(0, 8)}</span>
                </div>
            )}

            {/* Maps */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ComparisonMapCard side="a" color={COLOR_A} data={sideA} processing={isProcessing} />
                <ComparisonMapCard side="b" color={COLOR_B} data={sideB} processing={isProcessing} />
            </div>

            {/* Summary Stats */}
            {status === "done" && sideA && sideB && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <SummaryCard label="Location A" value={sideA.name} color={COLOR_A} />
                    <SummaryCard label="Features A" value={sideA.featureCount || sideA.geojson?.features?.length || 0} color={COLOR_A} />
                    <SummaryCard label="Location B" value={sideB.name} color={COLOR_B} />
                    <SummaryCard label="Features B" value={sideB.featureCount || sideB.geojson?.features?.length || 0} color={COLOR_B} />
                </div>
            )}

            {/* History */}
            <ComparisonHistoryStrip
                history={history}
                loading={loadingHistory}
                onRefresh={fetchHistory}
                onSelectJob={handleViewHistory}
                activeJobId={jobId}
            />
        </div>
    );
}
