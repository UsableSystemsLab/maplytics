"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import api from "@/lib/apiClient";
import { auth } from "@/lib/firebase";
import { useSelector } from "react-redux";
import { selectActiveProject } from "@/lib/store/features/projectSlice";

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

// Bag of words for descriptive statistics detection
const DESCRIPTIVE_BAG_OF_WORDS = [
    "min", "minimum", "max", "maximum", "avg", "average", "mean",
    "median", "std", "deviation", "sum", "count", "summarize",
    "summary", "statistics", "stats", "range", "variance"
];

function detectDescriptiveKeyword(query) {
    const tokens = query.toLowerCase().split(/\s+/);
    for (const token of tokens) {
        if (DESCRIPTIVE_BAG_OF_WORDS.includes(token)) return token;
    }
    return null;
}

function HighlightedQuery({ query }) {
    const words = query.split(/(\s+)/);
    return (
        <span>
            {words.map((word, i) => {
                const lower = word.toLowerCase().trim();
                if (DESCRIPTIVE_BAG_OF_WORDS.includes(lower)) {
                    return <span key={i} className="bg-purple-200 text-purple-900 font-semibold px-1 rounded">{word}</span>;
                }
                return <span key={i}>{word}</span>;
            })}
        </span>
    );
}

export default function NLQPage() {
    const { user, token } = useAuth();
    const activeProject = useSelector(selectActiveProject);
    const projectId = activeProject?.id;
    const [query, setQuery] = useState("compare dataset 1 and dataset 2");
    const [status, setStatus] = useState(null);
    const [resultPath, setResultPath] = useState(null);
    const [resultImageUrl, setResultImageUrl] = useState(null);
    const [jobId, setJobId] = useState(null);
    const [error, setError] = useState(null);
    const [jobs, setJobs] = useState([]);
    const [loadingJobs, setLoadingJobs] = useState(false);
    const [projectDatasets, setProjectDatasets] = useState([]);
    const [selectedDatasetIds, setSelectedDatasetIds] = useState([]);
    const [loadingDatasets, setLoadingDatasets] = useState(false);

    const detectedDescriptiveKeyword = useMemo(() => detectDescriptiveKeyword(query), [query]);

    // Fetch all NLQ jobs for the active project
    const fetchJobs = useCallback(async () => {
        if (!projectId) return;
        setLoadingJobs(true);
        try {
            const data = await api.get(`/nlq/project/${projectId}`);
            setJobs(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Failed to fetch NLQ jobs", err);
        } finally {
            setLoadingJobs(false);
        }
    }, [projectId]);

    // Fetch all available datasets for the project
    const fetchDatasets = useCallback(async () => {
        if (!projectId) return;
        setLoadingDatasets(true);
        try {
            const data = await api.get(`/projects/${projectId}/datasets`);
            setProjectDatasets(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Failed to fetch project datasets", err);
        } finally {
            setLoadingDatasets(false);
        }
    }, [projectId]);

    useEffect(() => {
        fetchJobs();
        fetchDatasets();
    }, [fetchJobs, fetchDatasets]);

    const handleTest = async (type) => {
        if (!projectId) {
            setError("No project found. Please create a project first.");
            return;
        }

        setStatus("submitting");
        setError(null);
        setResultPath(null);
        setResultImageUrl(null);
        setJobId(null);

        try {
            const res = await api.post("/nlq", {
                type,
                query,
                projectId,
                datasets: selectedDatasetIds
            });

            if (res && res.jobId) {
                setJobId(res.jobId);
                setStatus("processing");
            }
        } catch (err) {
            setError(err.data?.error || err.message);
            setStatus(null);
        }
    };

    // Poll for job status
    useEffect(() => {
        let interval;
        if (status === "processing" && jobId) {
            interval = setInterval(async () => {
                try {
                    const res = await api.get(`/nlq/${jobId}`);

                    if (res.status === "done") {
                        setStatus("done");
                        setResultPath(res.resultPath);
                        if (res.resultPath && res.resultPath.endsWith(".png")) {
                            const blobUrl = await fetchResultImage(jobId);
                            setResultImageUrl(blobUrl);
                        }
                        clearInterval(interval);
                        fetchJobs();
                    } else if (res.status === "failed") {
                        setStatus("failed");
                        setError("Job processing failed on the worker.");
                        clearInterval(interval);
                        fetchJobs();
                    }
                } catch (err) {
                    console.error("Polling error", err);
                }
            }, 2000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [status, jobId, fetchJobs]);

    const handleViewResult = async (job) => {
        if (job.status === "done" && job.result_path && job.result_path.endsWith(".png")) {
            const blobUrl = await fetchResultImage(job.job_id || job.id);
            setResultImageUrl(blobUrl);
            setResultPath(job.result_path);
            setJobId(job.job_id || job.id);
            setStatus("done");
        }
    };

    const statusBadge = (s) => {
        const colors = {
            processing: "bg-yellow-100 text-yellow-800",
            done: "bg-green-100 text-green-800",
            failed: "bg-red-100 text-red-800",
        };
        return (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[s] || "bg-gray-100 text-gray-800"}`}>
                {s}
            </span>
        );
    };

    const typeBadge = (t) => {
        const colors = {
            aggregation: "bg-blue-100 text-blue-800",
            comparison: "bg-green-100 text-green-800",
            descriptive: "bg-purple-100 text-purple-800",
        };
        return (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[t] || "bg-gray-100 text-gray-800"}`}>
                {t}
            </span>
        );
    };

    return (
        <main className="flex-1 p-6 overflow-y-auto">
            <h1 className="text-2xl font-bold mb-6">NLQ Queries</h1>

            {/* Submit Form */}
            <div className="bg-white p-6 rounded-lg shadow-sm border mb-8 max-w-2xl">
                <h2 className="text-lg font-semibold mb-4">Submit New Query</h2>
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Query</label>
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="w-full border p-2 rounded"
                        placeholder="Enter your natural language query..."
                    />
                </div>

                {/* Dataset Selection */}
                <div className="mb-6 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <label className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                            </svg>
                            Selected Datasets
                        </label>
                        <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded">
                            {selectedDatasetIds.length} Selected
                        </span>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mb-4 min-h-[40px]">
                        {selectedDatasetIds.map(id => {
                            const ds = projectDatasets.find(d => (d.id || d.dataset_id) === id);
                            return (
                                <div key={id} className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-sm font-medium border border-blue-100 animate-in fade-in slide-in-from-top-1 duration-200">
                                    <span className="truncate max-w-[150px]">{ds?.name || "Loading..."}</span>
                                    <button 
                                        onClick={() => setSelectedDatasetIds(prev => prev.filter(i => i !== id))}
                                        className="hover:bg-blue-200 p-0.5 rounded-md transition-colors"
                                        title="Remove dataset"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </div>
                            );
                        })}
                        {selectedDatasetIds.length === 0 && (
                            <div className="flex items-center gap-2 text-gray-400 text-xs italic py-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Please select at least one dataset from the list below to begin analysis.
                            </div>
                        )}
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1 custom-scrollbar">
                        {loadingDatasets ? (
                            <div className="col-span-full py-8 text-center">
                                <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent mb-2"></div>
                                <div className="text-gray-400 text-xs">Fetching datasets...</div>
                            </div>
                        ) : projectDatasets.length === 0 ? (
                            <div className="col-span-full py-8 text-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                <div className="text-gray-400 text-sm">No datasets found in this project.</div>
                                <div className="text-gray-300 text-[10px] mt-1">Upload files in the project settings first.</div>
                            </div>
                        ) : (
                            projectDatasets.map(ds => {
                                const id = ds.id || ds.dataset_id;
                                const isSelected = selectedDatasetIds.includes(id);
                                return (
                                    <button
                                        key={id}
                                        onClick={() => {
                                            if (isSelected) {
                                                setSelectedDatasetIds(prev => prev.filter(i => i !== id));
                                            } else {
                                                setSelectedDatasetIds(prev => [...prev, id]);
                                            }
                                        }}
                                        className={`group relative text-left p-3 rounded-xl border transition-all duration-200 ${
                                            isSelected 
                                                ? 'bg-blue-600 border-blue-600 text-white shadow-md ring-2 ring-blue-100 ring-offset-1' 
                                                : 'bg-white border-gray-100 text-gray-700 hover:border-blue-300 hover:bg-blue-50/50 hover:shadow-sm'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex flex-col min-w-0">
                                                <span className="font-semibold text-sm truncate">{ds.name}</span>
                                                <span className={`text-[10px] font-bold uppercase tracking-widest ${isSelected ? 'text-blue-100' : 'text-gray-400 group-hover:text-blue-400'}`}>
                                                    {ds.file_format || ds.geometry_type || 'DATASET'}
                                                </span>
                                            </div>
                                            <div className={`shrink-0 h-5 w-5 rounded-full flex items-center justify-center border transition-colors ${
                                                isSelected ? 'bg-white text-blue-600 border-white' : 'bg-gray-50 text-transparent border-gray-100 group-hover:border-blue-200'
                                            }`}>
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Descriptive keyword highlight */}
                {detectedDescriptiveKeyword && (
                    <div className="mb-4 p-2 bg-purple-50 rounded border border-purple-200 text-sm flex items-center gap-2">
                        <span className="text-purple-700">Detected descriptive keyword:</span>
                        <HighlightedQuery query={query} />
                    </div>
                )}

                <div className="flex gap-2 mb-4">
                    <button
                        onClick={() => handleTest("aggregation")}
                        disabled={status === "processing" || status === "submitting"}
                        className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50 hover:bg-blue-700 transition-colors"
                    >
                        Test Aggregation
                    </button>
                    <button
                        onClick={() => handleTest("comparison")}
                        disabled={status === "processing" || status === "submitting"}
                        className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50 hover:bg-green-700 transition-colors"
                    >
                        Test Comparison
                    </button>
                    <button
                        onClick={() => handleTest("descriptive")}
                        disabled={status === "processing" || status === "submitting"}
                        className="bg-purple-600 text-white px-4 py-2 rounded disabled:opacity-50 hover:bg-purple-700 transition-colors"
                    >
                        Test Descriptive
                    </button>
                </div>

                {error && (
                    <div className="text-red-600 mb-4 p-2 bg-red-50 rounded text-sm">
                        Error: {error}
                    </div>
                )}

                {status && (
                    <div className="p-3 bg-gray-50 rounded border text-sm">
                        <p>Job ID: <span className="font-mono text-xs">{jobId || "—"}</span></p>
                        <p>Status: {statusBadge(status)}</p>
                        {resultPath && (
                            <p className="text-green-600 mt-1">Result: {resultPath}</p>
                        )}
                    </div>
                )}
            </div>

            {/* Result Image (for descriptive stats) */}
            {status === "done" && resultImageUrl && (
                <div className="bg-white p-6 rounded-lg shadow-sm border mb-8 max-w-2xl">
                    <h2 className="text-lg font-semibold mb-4">Result</h2>
                    <div className="border rounded-lg overflow-hidden bg-gray-50 p-2">
                        <img
                            src={resultImageUrl}
                            alt="Descriptive statistics result"
                            className="w-full h-auto"
                            onError={() => setError("Failed to load result image")}
                        />
                    </div>
                </div>
            )}

            {/* Jobs Table */}
            <div className="bg-white rounded-lg shadow-sm border">
                <div className="px-6 py-4 border-b flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Job History</h2>
                    <button
                        onClick={fetchJobs}
                        className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                    >
                        Refresh
                    </button>
                </div>

                {loadingJobs ? (
                    <div className="px-6 py-8 text-center text-gray-500">Loading jobs...</div>
                ) : jobs.length === 0 ? (
                    <div className="px-6 py-8 text-center text-gray-400">
                        No NLQ jobs found for this project.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-gray-50">
                                    <th className="text-left px-6 py-3 font-medium text-gray-600">Job ID</th>
                                    <th className="text-left px-6 py-3 font-medium text-gray-600">Type</th>
                                    <th className="text-left px-6 py-3 font-medium text-gray-600">Query</th>
                                    <th className="text-left px-6 py-3 font-medium text-gray-600">Status</th>
                                    <th className="text-left px-6 py-3 font-medium text-gray-600">Result</th>
                                    <th className="text-left px-6 py-3 font-medium text-gray-600">Created</th>
                                </tr>
                            </thead>
                            <tbody>
                                {jobs.map((job) => (
                                    <tr key={job.job_id || job.id} className="border-b hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-3 font-mono text-xs text-gray-500">
                                            {(job.job_id || job.id || "").slice(0, 8)}…
                                        </td>
                                        <td className="px-6 py-3">{typeBadge(job.type)}</td>
                                        <td className="px-6 py-3 max-w-[250px] truncate" title={job.query}>
                                            {job.type === "descriptive" ? <HighlightedQuery query={job.query || ""} /> : job.query}
                                        </td>
                                        <td className="px-6 py-3">{statusBadge(job.status)}</td>
                                        <td className="px-6 py-3 text-xs text-gray-500 max-w-[150px] truncate">
                                            {job.status === "done" && job.result_path && job.result_path.endsWith(".png") ? (
                                                <button
                                                    onClick={() => handleViewResult(job)}
                                                    className="text-purple-600 hover:text-purple-800 font-medium"
                                                >
                                                    View
                                                </button>
                                            ) : (
                                                job.result_path || "—"
                                            )}
                                        </td>
                                        <td className="px-6 py-3 text-xs text-gray-500 whitespace-nowrap">
                                            {job.created_at ? new Date(job.created_at).toLocaleString() : "—"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </main>
    );
}
