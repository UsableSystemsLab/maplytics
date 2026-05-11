"use client";

import { useState } from "react";
import { History, RefreshCcw, ChevronDown, ChevronUp } from "lucide-react";
import {
    Card,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function ComparisonHistoryStrip({
    history = [],
    loading = false,
    onRefresh,
    onSelectJob,
    activeJobId = null,
}) {
    const [expanded, setExpanded] = useState(true);

    return (
        <Card className="border shadow-xs overflow-hidden">
            <CardHeader className="py-4 px-6">
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="flex items-center gap-2 text-left"
                    >
                        <CardTitle className="text-base flex items-center gap-2">
                            <History className="h-4 w-4 text-primary" />
                            Recent Comparisons
                        </CardTitle>
                        {expanded ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                        {!expanded && history.length > 0 && (
                            <span className="text-xs text-muted-foreground">
                                ({history.length})
                            </span>
                        )}
                    </button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onRefresh}
                        className="h-8 text-xs text-primary hover:bg-primary/5"
                    >
                        <RefreshCcw
                            className={cn(
                                "h-3 w-3 mr-1",
                                loading && "animate-spin"
                            )}
                        />
                        Refresh
                    </Button>
                </div>
            </CardHeader>

            {expanded && (
                <div className="border-t">
                    {loading ? (
                        <div className="p-6 space-y-3">
                            {[1, 2, 3].map((i) => (
                                <Skeleton key={i} className="h-12 rounded-lg" />
                            ))}
                        </div>
                    ) : history.length === 0 ? (
                        <div className="py-12 text-center">
                            <div className="size-14 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-4">
                                <History className="h-6 w-6 text-gray-300" />
                            </div>
                            <p className="text-sm font-medium text-gray-400">
                                No comparisons yet
                            </p>
                            <p className="text-xs text-gray-300 mt-1">
                                Submit a query above to get started
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {history.map((job) => {
                                const id = job.job_id || job.id || "";
                                const isDone = job.status === "done";
                                return (
                                    <button
                                        key={id}
                                        onClick={() => isDone && onSelectJob?.(job)}
                                        disabled={!isDone}
                                        className={cn(
                                            "w-full flex items-center gap-4 px-6 py-3 text-left transition-colors",
                                            isDone
                                                ? "hover:bg-gray-50/80 cursor-pointer"
                                                : "opacity-60 cursor-default",
                                            id === activeJobId && "bg-primary/5 border-l-2 border-l-primary"
                                        )}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-sm text-gray-700 truncate">
                                                {job.query}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] font-mono text-muted-foreground">
                                                    #{id.slice(0, 8)}
                                                </span>
                                                <Separator
                                                    orientation="vertical"
                                                    className="h-2 bg-gray-200"
                                                />
                                                <span className="text-[10px] text-muted-foreground">
                                                    {job.created_at
                                                        ? new Date(job.created_at).toLocaleDateString()
                                                        : "—"}
                                                </span>
                                            </div>
                                        </div>
                                        <Badge
                                            variant="secondary"
                                            className={cn(
                                                "text-[10px] px-2 py-0 shrink-0",
                                                isDone && "bg-emerald-50 text-emerald-700 border-emerald-200",
                                                job.status === "failed" && "bg-red-50 text-red-700 border-red-200",
                                                job.status === "processing" && "bg-amber-50 text-amber-700 border-amber-200"
                                            )}
                                        >
                                            {job.status}
                                        </Badge>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </Card>
    );
}
