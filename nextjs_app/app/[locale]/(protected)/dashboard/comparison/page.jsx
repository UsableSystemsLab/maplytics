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
import { useTranslations } from "next-intl";

const COLOR_A = "#0E3147"; // primary
const COLOR_B = "#13B38D"; // cyan

const COMPARISON_KEYWORDS = [
    "compare", "contrast", "difference", "differentiate",
    "vs", "versus", "between", "comparison",
];

const VALIDATION_KEY_MAP = {
    dataset_outside_requested_locations: "datasetOutsideLocations",
    feature_type_not_found: "featureTypeNotFound",
    missing_feature_fields: "missingFeatureFields",
    one_side_empty: "oneSideEmpty",
    both_sides_empty: "bothSidesEmpty",
};

function isComparisonQuery(query) {
    if (!query) return false;
    const tokens = query.toLowerCase().split(/\s+/);
    return tokens.some((t) => COMPARISON_KEYWORDS.includes(t));
}

function HighlightedQuery({ query }) {
    const t = useTranslations("comparison");
    if (!query) return null;
    const words = query.split(/(\s+)/);
    return (
        <span className="text-xs text-muted-foreground">
            {t('preview')}{" "}
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
    const t = useTranslations("comparison");
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
        if (!projectId) return setError(t('errors.selectProjectFirst'));
        if (selectedDatasetIds.length === 0) return setError(t('errors.selectDataset'));
        if (!query.trim()) return setError(t('errors.queryRequired'));

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
            setError(err.data?.error || err.message || t('errors.submitFailed'));
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
                    setError(res.error || t('errors.processingFailed'));
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
            setError(t('errors.couldNotLoadResult'));
        }
    };

    const sideA = resultData?.sideA || null;
    const sideB = resultData?.sideB || null;
    const isProcessing = status === "processing" || status === "submitting";
    const validation = resultData?.metadata?.validation;
    const featureQuery = resultData?.metadata?.featureQuery;
    const featureFilter = resultData?.metadata?.featureFilter;
    const validationKey = validation?.reasonCode && validation.reasonCode !== "ok"
        ? VALIDATION_KEY_MAP[validation.reasonCode]
        : null;
    const validationMessage = validationKey ? t(`validation.${validationKey}`) : null;
    const showFilterSummary = status === "done" && featureQuery && featureFilter?.applied;
    const showFilterMissingWarning = status === "done" && featureQuery && featureFilter?.applied === false;

    return (
        <div className="p-6 md:p-8 space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                            <ArrowRightLeft className="w-5 h-5" />
                        </div>
                        {t('title')}
                    </h1>
                    <p className="text-muted-foreground mt-1.5 ml-[52px]">
                        {t('subtitle')}
                    </p>
                </div>
                {status === "done" && resultData && (
                    <Badge variant="secondary" className="self-start md:self-center text-xs gap-1.5 px-3 py-1.5">
                        <Sparkles className="h-3 w-3" />
                        {t('complete')}
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
                            placeholder={t('queryBar.placeholder')}
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
                        {isProcessing ? t('comparing') : t('compare')}
                    </Button>
                </div>

                {/* Metadata */}
                <div className="px-4 pb-3 flex items-center gap-4">
                    {isDetected && (
                        <Badge variant="outline" className="text-[10px] text-emerald-700 border-emerald-200 bg-emerald-50">
                            {t('detectedBadge')}
                        </Badge>
                    )}
                    {selectedDatasetIds.length > 0 && (
                        <span className="text-[10px] font-bold text-primary/50 uppercase tracking-tight">
                            {t('filesSelected', { count: selectedDatasetIds.length })}
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
                    <AlertTitle>{t('somethingWentWrong')}</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {status === "done" && validationMessage && (
                <Alert className="rounded-xl border-amber-200 bg-amber-50/70 animate-in fade-in slide-in-from-top-2 duration-300">
                    <Sparkles className="h-4 w-4 text-amber-700" />
                    <AlertTitle className="text-amber-900">{t('note')}</AlertTitle>
                    <AlertDescription className="text-amber-800">
                        {validationMessage}
                    </AlertDescription>
                </Alert>
            )}

            {showFilterSummary && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-900">
                    {t('filteredBy')} <span className="font-semibold">{featureQuery}</span>
                    {typeof featureFilter.filteredCount === "number" && typeof featureFilter.inputCount === "number" && (
                        <span className="text-emerald-800">
                            {" "}{t('filterMatched', { filtered: featureFilter.filteredCount, total: featureFilter.inputCount })}
                        </span>
                    )}
                    {featureFilter.matchedFields?.length > 0 && (
                        <span className="text-emerald-800">
                            {" "}{t('filterUsing', { fields: featureFilter.matchedFields.join(", ") })}
                        </span>
                    )}
                </div>
            )}

            {showFilterMissingWarning && (
                <Alert className="rounded-xl border-amber-200 bg-amber-50/70 animate-in fade-in slide-in-from-top-2 duration-300">
                    <Sparkles className="h-4 w-4 text-amber-700" />
                    <AlertTitle className="text-amber-900">{t('filterWarning')}</AlertTitle>
                    <AlertDescription className="text-amber-800">
                        {t('filterWarningDesc')}
                    </AlertDescription>
                </Alert>
            )}

            {/* Processing Banner */}
            {status === "processing" && (
                <div className="flex items-center gap-3 bg-primary/5 border border-primary/10 rounded-xl px-5 py-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="h-5 w-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <span className="text-sm font-medium text-primary/80">{t('processingBanner')}</span>
                    <span className="text-xs text-muted-foreground ml-auto">{t('jobIdLabel', { id: jobId?.slice(0, 8) || '' })}</span>
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
                    <SummaryCard label={t('locationA')} value={sideA.name} color={COLOR_A} />
                    <SummaryCard label={t('featuresA')} value={sideA.featureCount || sideA.geojson?.features?.length || 0} color={COLOR_A} />
                    <SummaryCard label={t('locationB')} value={sideB.name} color={COLOR_B} />
                    <SummaryCard label={t('featuresB')} value={sideB.featureCount || sideB.geojson?.features?.length || 0} color={COLOR_B} />
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
