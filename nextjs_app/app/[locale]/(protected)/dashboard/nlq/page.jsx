"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import api from "@/lib/apiClient";
import { useSelector } from "react-redux";
import { selectActiveProject } from "@/lib/store/features/projectSlice";

export default function NLQPage() {
    const { user, token } = useAuth();
    const activeProject = useSelector(selectActiveProject);
    const projectId = activeProject?.id;
    const [query, setQuery] = useState("compare dataset 1 and dataset 2");
    const [status, setStatus] = useState(null);
    const [resultPath, setResultPath] = useState(null);
    const [jobId, setJobId] = useState(null);
    const [error, setError] = useState(null);
    const [jobs, setJobs] = useState([]);
    const [loadingJobs, setLoadingJobs] = useState(false);

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

    useEffect(() => {
        fetchJobs();
    }, [fetchJobs]);

    const handleTest = async (type) => {
        if (!projectId) {
            setError("No project found. Please create a project first.");
            return;
        }

        setStatus("submitting");
        setError(null);
        setResultPath(null);
        setJobId(null);

        try {
            const res = await api.post("/nlq", {
                type,
                query,
                projectId,
                datasets: []
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
                        clearInterval(interval);
                        fetchJobs(); // refresh table
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
                                            {job.query}
                                        </td>
                                        <td className="px-6 py-3">{statusBadge(job.status)}</td>
                                        <td className="px-6 py-3 text-xs text-gray-500 max-w-[150px] truncate">
                                            {job.result_path || "—"}
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
