"use client";
import { useState, useEffect, useCallback } from "react";
import { Image as ImageIcon, BarChart3, ChevronRight, ChevronLeft, LayoutDashboard, Clock, AlertCircle, CheckCircle2, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSelector } from "react-redux";
import { selectActiveProject } from "@/lib/store/features/projectSlice";
import { getNlqProjectJobs } from "@/lib/nlqApi";
import { useTranslations } from "next-intl";

export default function MapResultsSidebar({ isMobile, jobs = [], isLoading = false, selectedJobId, onViewJob }) {
    const t = useTranslations("mapResults");
    const [isOpen, setIsOpen] = useState(!isMobile);
    const activeProject = useSelector(selectActiveProject);
    const projectId = activeProject?.id;

    return (
        <div className={cn(
            "absolute top-0 end-0 h-full z-[60] transition-all duration-300 flex",
            isOpen ? (isMobile ? "w-full" : "w-80 shadow-2xl") : "w-0"
        )}>
            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "absolute top-1/2 -start-8 transform -translate-y-1/2 bg-white/90 backdrop-blur-md p-1.5 rounded-s-xl shadow-lg border border-e-0 border-gray-200 text-gray-500 hover:text-primary transition-all pointer-events-auto",
                    !isOpen && "rounded-xl -start-10"
                )}
            >
                {isOpen ? <ChevronRight className="w-5 h-5 rtl:rotate-180" /> : <ChevronLeft className="w-5 h-5 rtl:rotate-180" />}
            </button>

            {/* Sidebar Content */}
            <div className={cn(
                "w-full h-full bg-white/95 backdrop-blur-xl border-s border-gray-200 shadow-2xl overflow-hidden flex flex-col pointer-events-auto",
                !isOpen && "border-s-0"
            )}>
                {/* Header */}
                <div className="p-4 bg-primary/5 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <h2 className="font-bold text-gray-900 leading-none text-sm">{t('analysisHistory')}</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        {isLoading && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-900 transition-all"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Jobs List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {jobs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
                            <Clock className="w-8 h-8 mb-2" />
                            <p className="text-xs font-medium">{t('noHistory')}</p>
                            <span className="text-[10px]">{t('noHistoryHint')}</span>
                        </div>
                    ) : (
                        jobs.map((job) => {
                            const jobId = job.job_id || job.id || "";
                            const shortId = jobId.slice(0, 8);
                            const date = job.created_at ? new Date(job.created_at).toLocaleDateString('en-GB') : "—";

                            return (
                                <div
                                    key={jobId}
                                    className={cn(
                                        "bg-gray-50 rounded-xl p-3 border transition-all shadow-sm",
                                        selectedJobId === jobId ? "border-primary bg-white ring-2 ring-primary/10" : "border-gray-100 hover:border-primary/20 hover:bg-white"
                                    )}
                                >
                                    {/* Description */}
                                    <h3 className="font-semibold text-xs text-gray-800 line-clamp-2 mb-2 leading-relaxed">
                                        {job.query || t('noDescription')}
                                    </h3>

                                    {/* Info Row */}
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-2 pt-2 border-t border-gray-100">
                                        <div className="flex items-center gap-1">
                                            <span className="text-[10px] text-primary/70 font-bold uppercase tracking-tighter">
                                                {job.type || "unknown"}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-1">
                                            <span className="text-[10px] text-gray-400">
                                                {date}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Status Badge */}
                                    <div className="mt-3 flex items-center justify-between">
                                        <div className={cn(
                                            "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-tight",
                                            job.status === "done" ? "bg-green-100 text-green-600" :
                                                job.status === "failed" ? "bg-red-100 text-red-600" :
                                                    "bg-amber-100 text-amber-600 animate-pulse"
                                        )}>
                                            {job.status === "done" ? <CheckCircle2 className="w-2.5 h-2.5" /> :
                                                job.status === "failed" ? <AlertCircle className="w-2.5 h-2.5" /> :
                                                    <Loader2 className="w-2.5 h-2.5 animate-spin" />}
                                            {job.status || "pending"}
                                        </div>

                                        {job.status === "done" && job.result_path?.endsWith(".png") && (
                                            <button
                                                onClick={() => onViewJob(jobId)}
                                                className={cn(
                                                    "flex items-center gap-1 transition-all",
                                                    selectedJobId === jobId ? "text-primary font-bold" : "text-gray-400 hover:text-primary"
                                                )}
                                            >
                                                <ImageIcon className="w-2.5 h-2.5" />
                                                <span className="text-[9px] uppercase tracking-tighter">
                                                    {selectedJobId === jobId ? t('active') : t('view')}
                                                </span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
