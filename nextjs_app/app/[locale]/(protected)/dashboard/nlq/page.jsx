"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import api from "@/lib/apiClient";
import { auth } from "@/lib/firebase";
import { useSelector } from "react-redux";
import { selectActiveProject } from "@/lib/store/features/projectSlice";
import { selectSelectedLayers } from "@/lib/store/features/layersSlice";
import { classify } from "@/lib/nlqClassifier";
import NLQComparisonGeoJSONResult from "@/components/NLQComparisonGeoJSONResult";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";

import {
    Sparkles,
    History,
    Database,
    Search,
    FileText,
    CheckCircle2,
    XCircle,
    Loader2,
    Download,
    Maximize2,
    Layers,
    BarChart3,
    ArrowRightLeft,
    Plus,
    Trash2,
    RefreshCcw,
    Send,
    Map
} from "lucide-react";

import { cn } from "@/lib/utils";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

async function fetchResultImage(jobId) {
    const user = auth.currentUser;
    if (!user) return null;
    const token = await user.getIdToken();
    const res = await fetch(`${API_BASE}/nlq/${jobId}/result`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return null;
    const blob = await res.blob();
    return URL.createObjectURL(blob);
}

const BAGS = {
    comparison: {
        keywords: ["compare", "difference", "vs", "versus", "between", "comparison"],
        color: "text-green-600",
        bg: "bg-green-100",
        border: "border-green-200",
        label: "Comparison Analysis",
        type: "comparison"
    },
    aggregation: {
        keywords: ["aggregate", "total", "sum", "count", "number", "aggregation", "report", "analyze", "group"],
        color: "text-blue-600",
        bg: "bg-blue-100",
        border: "border-blue-200",
        label: "Aggregation Analysis",
        type: "aggregation"
    },
    descriptive: {
        keywords: ["min", "minimum", "max", "maximum", "avg", "average", "mean",
            "median", "std", "deviation", "sum", "count", "summarize",
            "summary", "statistics", "stats", "range", "variance"],
        color: "text-purple-600",
        bg: "bg-purple-100",
        border: "border-purple-200",
        label: "Descriptive Analysis",
        type: "descriptive"
    }
};

function detectType(query) {
    const tokens = query.toLowerCase().split(/\s+/);
    for (const [key, bag] of Object.entries(BAGS)) {
        for (const token of tokens) {
            if (bag.keywords.includes(token)) return bag;
        }
    }
    return null;
}

function HighlightedQuery({ query }) {
    const detected = detectType(query);
    if (!detected) return query;

    const words = query.split(/(\s+)/);
    return (
        <span>
            {words.map((word, i) => {
                const lower = word.toLowerCase().trim();
                if (detected.keywords.includes(lower)) {
                    return (
                        <span key={i} className={cn("font-bold px-1 rounded transition-colors", detected.bg, detected.color)}>
                            {word}
                        </span>
                    );
                }
                return <span key={i}>{word}</span>;
            })}
        </span>
    );
}

export default function NLQPage() {
    const activeProject = useSelector(selectActiveProject);
    const selectedLayers = useSelector(selectSelectedLayers);
    const projectId = activeProject?.id;
    const activeLayer = selectedLayers.length > 0 ? selectedLayers[selectedLayers.length - 1] : null;
    const datasetId = activeLayer ? (activeLayer.pgDatasetId || activeLayer.id) : null;

    const [query, setQuery] = useState("Compare airports in Saudi Arabia");
    const [status, setStatus] = useState(null);
    const [resultImageUrl, setResultImageUrl] = useState(null);
    const [comparisonGeojson, setComparisonGeojson] = useState(null);
    const [jobId, setJobId] = useState(null);
    const [jobType, setJobType] = useState(null);
    const [error, setError] = useState(null);
    const [jobs, setJobs] = useState([]);
    const [loadingJobs, setLoadingJobs] = useState(false);
    const [projectDatasets, setProjectDatasets] = useState([]);
    const [selectedDatasetIds, setSelectedDatasetIds] = useState([]);
    const [loadingDatasets, setLoadingDatasets] = useState(false);
    const [activeTab, setActiveTab] = useState("analyze");

    const detectedBag = useMemo(() => detectType(query), [query]);

    const fetchData = useCallback(async () => {
        if (!projectId) return;
        setLoadingJobs(true);
        setLoadingDatasets(true);
        try {
            const [jobsData, datasetsData] = await Promise.all([
                api.get(`/nlq/project/${projectId}`),
                api.get(`/projects/${projectId}/datasets`)
            ]);
            setJobs(Array.isArray(jobsData) ? jobsData : []);
            setProjectDatasets(Array.isArray(datasetsData) ? datasetsData : []);
        } catch (err) {
            console.error("Fetch error", err);
        } finally {
            setLoadingJobs(false);
            setLoadingDatasets(false);
        }
    }, [projectId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSumbit = async () => {
        if (!projectId) {
            setError("No project selected.");
            return;
        }
        if (selectedDatasetIds.length === 0) {
            setError("Please select at least one dataset (+ button).");
            return;
        }

        const type = detectedBag?.type || "descriptive";
        setStatus("submitting");
        setError(null);
        setResultImageUrl(null);
        setComparisonGeojson(null);
        setJobId(null);
        setJobType(type);

        if (type === "comparison" && !datasetId) {
            setError("Select a dataset from the sidebar first.");
            setStatus(null);
            return;
        }

        try {
            const body = { type, query, projectId, datasets: selectedDatasetIds };
            if (type === "comparison") {
                body.datasetId = datasetId;
            }
            const res = await api.post("/nlq", body);
            if (res?.jobId) {
                setJobId(res.jobId);
                setStatus("processing");
            }
        } catch (err) {
            setError(err.data?.error || err.message);
            setStatus(null);
        }
    };

    // Polling
    useEffect(() => {
        let interval;
        if (status === "processing" && jobId) {
            interval = setInterval(async () => {
                try {
                    const res = await api.get(`/nlq/${jobId}`);
                    if (res.status === "done") {
                        setStatus("done");
                        if (res.resultPath?.endsWith(".png")) {
                            const blobUrl = await fetchResultImage(jobId);
                            setResultImageUrl(blobUrl);
                        }
                        clearInterval(interval);
                        if (jobType === "comparison" || res.resultType === "comparison_geojson") {
                            try {
                                const geojson = await api.get(`/nlq/${jobId}/result`);
                                setComparisonGeojson(geojson);
                            } catch (resultErr) {
                                console.error("Failed to fetch comparison GeoJSON", resultErr);
                                setError(resultErr.data?.error || resultErr.message);
                            }
                        }
                        fetchData();
                    } else if (res.status === "failed") {
                        setStatus("failed");
                        setError(res.error || "Job processing failed on the worker.");
                        clearInterval(interval);
                    }
                } catch (err) {
                    console.error("Polling error", err);
                }
            }, 2000);
        }
        return () => clearInterval(interval);
    }, [status, jobId, jobType, fetchData]);

    const handleViewResult = async (job) => {
        if (job.status === "done" && job.result_path?.endsWith(".png")) {
            const blobUrl = await fetchResultImage(job.job_id || job.id);
            setResultImageUrl(blobUrl);
            setJobId(job.job_id || job.id);
            setStatus("done");
            setActiveTab("analyze");
        }
    };

    return (
        <main className="flex-1 flex flex-col h-full bg-white overflow-hidden">
            {/* Custom Shadcn Tabs (matching datasets page style) */}
            <div className="px-8 pt-6">
                <div className="flex bg-gray-100 p-1 rounded-lg w-full max-w-[300px] mb-6">
                    <button
                        onClick={() => setActiveTab('analyze')}
                        className={cn(
                            "flex-1 py-1.5 text-sm font-medium rounded-md transition-all",
                            activeTab === 'analyze' ? "bg-white text-primary shadow-sm" : "text-gray-500 hover:text-gray-900"
                        )}
                    >
                        Analyze
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={cn(
                            "flex-1 py-1.5 text-sm font-medium rounded-md transition-all",
                            activeTab === 'history' ? "bg-white text-primary shadow-sm" : "text-gray-500 hover:text-gray-900"
                        )}
                    >
                        History
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto relative">
                {activeTab === "analyze" ? (
                    <div className={cn(
                        "flex flex-col w-full h-full p-8 transition-all duration-700",
                        !status || status === "failed" ? "justify-center items-center" : "justify-start"
                    )}>
                        {/* Comparison GeoJSON Result */}
                        {(status === "done" && comparisonGeojson) && (
                            <div className="w-full max-w-4xl mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                <NLQComparisonGeoJSONResult geojson={comparisonGeojson} />
                            </div>
                        )}

                        {/* Image Result */}
                        {(status === "done" && resultImageUrl) && (
                            <div className="w-full max-w-4xl mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                <Card className="border-none shadow-2xl shadow-indigo-100 overflow-hidden rounded-3xl">
                                    <div className="bg-indigo-600 p-4 flex items-center justify-between text-white">
                                        <div className="flex items-center gap-2">
                                            <div className="bg-white/20 p-1.5 rounded-lg">
                                                <Map className="h-4 w-4" />
                                            </div>
                                            <span className="font-semibold">Analysis Result</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-white hover:bg-white/10">
                                                <Download className="h-4 w-4" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-white hover:bg-white/10" onClick={() => { setStatus(null); setResultImageUrl(null); }}>
                                                <XCircle className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-slate-900 flex justify-center items-center min-h-[400px]">
                                        <img src={resultImageUrl} alt="Result" className="max-w-full h-auto rounded-lg shadow-lg" />
                                    </div>
                                </Card>
                            </div>
                        )}

                        {/* Processing State */}
                        {(status === "processing" || status === "submitting") && (
                            <div className="w-full max-w-4xl mb-8 flex flex-col items-center justify-center p-20 space-y-4">
                                <div className="relative">
                                    <div className="h-20 w-20 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <Sparkles className="h-8 w-8 text-indigo-400" />
                                    </div>
                                </div>
                                <p className="text-slate-500 font-medium animate-pulse">Analyzing spatial data patterns...</p>
                            </div>
                        )}

                        {/* Google-style Search Bar */}
                        <div className={cn(
                            "w-full max-w-3xl transition-all duration-700",
                            (status === "done" || status === "processing") ? "mt-4" : "mt-0"
                        )}>
                            <div className="relative group">
                                <div className={cn(
                                    "flex items-center gap-2 p-2 px-4 bg-white border shadow-lg rounded-full transition-all duration-300",
                                    "focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-100",
                                    error ? "border-red-300 ring-red-50" : "border-slate-200"
                                )}>
                                    {/* Dataset Picker (+) */}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 shrink-0">
                                                <Plus className="h-5 w-5" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="start" className="w-64 p-2 rounded-2xl shadow-xl">
                                            <DropdownMenuLabel className="text-xs uppercase text-slate-400 tracking-widest p-2">Select Datasets</DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            <div className="max-h-60 overflow-y-auto py-1">
                                                {projectDatasets.map(ds => {
                                                    const id = ds.id || ds.dataset_id;
                                                    const isChecked = selectedDatasetIds.includes(id);
                                                    return (
                                                        <DropdownMenuCheckboxItem
                                                            key={id}
                                                            checked={isChecked}
                                                            onCheckedChange={() => isChecked ? setSelectedDatasetIds(p => p.filter(i => i !== id)) : setSelectedDatasetIds(p => [...p, id])}
                                                            className="rounded-lg py-2"
                                                        >
                                                            <div className="flex flex-col">
                                                                <span className="font-medium text-sm">{ds.name}</span>
                                                                <span className="text-[9px] uppercase text-slate-400">{ds.file_format || "Data"}</span>
                                                            </div>
                                                        </DropdownMenuCheckboxItem>
                                                    );
                                                })}
                                                {projectDatasets.length === 0 && (
                                                    <div className="p-4 text-center text-xs text-slate-400 italic">No datasets found</div>
                                                )}
                                            </div>
                                        </DropdownMenuContent>
                                    </DropdownMenu>

                                    <div className="flex-1 flex flex-col relative h-10 justify-center">
                                        <input
                                            type="text"
                                            value={query}
                                            onChange={(e) => setQuery(e.target.value)}
                                            className="w-full bg-transparent border-none focus:outline-none text-lg text-slate-700 placeholder-slate-300"
                                            placeholder="Ask anything about your maps..."
                                            onKeyDown={(e) => e.key === 'Enter' && handleSumbit()}
                                        />
                                    </div>

                                    <Button
                                        onClick={handleSumbit}
                                        disabled={status === "processing" || status === "submitting"}
                                        className="h-10 px-6 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-all group"
                                    >
                                        {status === "processing" ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4 mr-2 group-hover:translate-x-1 transition-transform" /> Submit</>}
                                    </Button>
                                </div>

                                {/* Selection Status and Type Label */}
                                <div className="mt-4 flex flex-col items-center gap-2">
                                    <div className="flex items-center gap-4">
                                        {detectedBag && (
                                            <span className="text-sm font-medium text-slate-400 animate-in fade-in">
                                                {detectedBag.label}
                                            </span>
                                        )}
                                        {selectedDatasetIds.length > 0 && (
                                            <div className="flex gap-1">
                                                {selectedDatasetIds.map(id => (
                                                    <div key={id} className="h-1.5 w-4 bg-indigo-200 rounded-full"></div>
                                                ))}
                                                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-tighter ml-1">
                                                    {selectedDatasetIds.length} Files Selected
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Preview Highlighting */}
                                    {query && (
                                        <div className="text-center px-4">
                                            <p className="text-xs text-slate-400 italic">
                                                Preview: <HighlightedQuery query={query} />
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {error && (
                                <div className="mt-4 animate-in slide-in-from-top-2">
                                    <Alert variant="destructive" className="rounded-2xl border-red-100 bg-red-50/50">
                                        <XCircle className="h-4 w-4" />
                                        <AlertTitle>Action Required</AlertTitle>
                                        <AlertDescription>{error}</AlertDescription>
                                    </Alert>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="p-8 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <Card className="border-slate-100 shadow-sm rounded-2xl overflow-hidden">
                            <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-row items-center justify-between py-4">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <History className="h-5 w-5 text-indigo-600" /> Recent Activity
                                </CardTitle>
                                <Button variant="ghost" size="sm" onClick={fetchData} className="h-8 text-xs text-indigo-600 hover:bg-indigo-50">
                                    <RefreshCcw className={cn("h-3 w-3 mr-1", loadingJobs && "animate-spin")} /> Refresh
                                </Button>
                            </CardHeader>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="bg-slate-50/30 text-slate-400 text-[10px] uppercase font-bold tracking-widest border-b border-slate-50">
                                            <th className="px-6 py-4">Job Details</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4 text-right">View</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {jobs.map(job => (
                                            <tr key={job.job_id || job.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold text-slate-700 truncate max-w-[400px]">{job.query}</span>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-[10px] font-mono text-slate-400">#{(job.job_id || job.id || "").slice(0, 8)}</span>
                                                            <Separator orientation="vertical" className="h-2 bg-slate-200" />
                                                            <span className="text-[10px] text-slate-400 uppercase tracking-widest">{job.type}</span>
                                                            <Separator orientation="vertical" className="h-2 bg-slate-200" />
                                                            <span className="text-[10px] text-slate-400">{job.created_at ? new Date(job.created_at).toLocaleDateString() : "—"}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Badge variant={job.status === "done" ? "success" : job.status === "failed" ? "destructive" : "warning"} className="text-[10px] px-2 py-0">
                                                        {job.status}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {job.status === "done" && (
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-600 hover:bg-indigo-50 rounded-lg" onClick={() => handleViewResult(job)}>
                                                            <Maximize2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </div>
                )}
            </div>
        </main>
    );
}
