"use client";
import { useState } from "react";
import { Sparkles, BarChart3, Loader2, Send, SendHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSelector } from "react-redux";
import { selectSelectedLayers } from "@/lib/store/features/layersSlice";
import { selectActiveProject } from "@/lib/store/features/projectSlice";
import { submitNlqJob } from "@/lib/nlqApi";

const BAGS = {
    aggregation: {
        keywords: ["aggregate", "total", "sum", "count", "number", "aggregation", "report", "analyze", "group"],
        color: "text-blue-600",
        bg: "bg-blue-100",
    },
    descriptive: {
        keywords: ["min", "minimum", "max", "maximum", "avg", "average", "mean",
            "median", "std", "deviation", "sum", "count", "summarize",
            "summary", "statistics", "stats", "range", "variance"
        ],
        color: "text-purple-600",
        bg: "bg-purple-100",
    }
};

function getDetectedType(word) {
    const lower = word.toLowerCase().trim();
    for (const [key, bag] of Object.entries(BAGS)) {
        if (bag.keywords.includes(lower)) return bag;
    }
    return null;
}

export default function MapCommandInput({ isMobile }) {
    const [query, setQuery] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const selectedLayers = useSelector(selectSelectedLayers);
    const activeProject = useSelector(selectActiveProject);

    const handleSubmit = async () => {
        if (!query.trim() || !activeProject?.id || isSubmitting) return;

        setIsSubmitting(true);
        try {
            const type = query.toLowerCase().includes("aggregate") ? "aggregation" : "descriptive";

            const datasetIds = selectedLayers.map(l => l.id);

            await submitNlqJob({
                type,
                query,
                projectId: activeProject.id,
                datasets: datasetIds
            });

            setQuery("");
        } catch (error) {
            console.error("Failed to submit analysis job:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderHighlights = () => {
        if (!query) return null;
        const words = query.split(/(\s+)/);
        return words.map((word, i) => {
            const bag = getDetectedType(word);
            if (bag) {
                return (
                    <span key={i} className={cn("font-bold rounded transition-all duration-300", bag.bg, bag.color)}>
                        {word}
                    </span>
                );
            }
            return <span key={i}>{word}</span>;
        });
    };

    return (
        <div className={cn(
            "absolute bottom-6 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-2xl px-4 pointer-events-none transition-all duration-300",
            isMobile && "bottom-24"
        )}>
            <div className="bg-white/80 backdrop-blur-2xl rounded-[28px] shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-white/40 p-1.5 flex items-center gap-2 pointer-events-auto group focus-within:shadow-[0_8px_40px_rgba(0,0,0,0.15)] focus-within:border-primary/20 transition-all">
                <div className="pl-4 text-primary/40">
                    <Sparkles className="w-5 h-5 animate-pulse" />
                </div>

                <div className="flex-1 relative h-10 flex items-center overflow-hidden">
                    {/* Highlighting Layer */}
                    <div className="absolute inset-0 flex items-center px-1 text-[15px] font-medium pointer-events-none whitespace-pre overflow-hidden font-sans tracking-normal leading-none">
                        {renderHighlights()}
                    </div>

                    {/* Actual Input */}
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                        placeholder="Ask Maplytics to analyze data..."
                        disabled={isSubmitting}
                        className="w-full bg-transparent border-none p-1 text-[15px] focus:ring-0 outline-none placeholder:text-gray-400 disabled:opacity-50 font-medium z-10 text-transparent caret-gray-900 font-sans tracking-normal leading-none"
                    />
                </div>

                <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !query.trim()}
                    className={cn(
                        "rounded-full p-2.5 transition-all disabled:opacity-50",
                        query.trim() ? "bg-primary text-white shadow-md hover:scale-105 active:scale-95" : "bg-gray-100 text-gray-400"
                    )}
                >
                    {isSubmitting ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <SendHorizontal className="w-5 h-5" />
                    )}
                </button>
            </div>

            {/* Subtle Hint */}
            {!query && (
                <div className="mt-3 flex justify-center gap-4 text-[10px] font-bold text-gray-400/80 uppercase tracking-widest animate-in fade-in slide-in-from-bottom-2 duration-700">
                    <div className="flex items-center gap-1.5">
                        <div className="w-1 h-1 rounded-full bg-gray-300" />
                        <span>Aggregation Analysis</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-1 h-1 rounded-full bg-gray-300" />
                        <span>Spatial Reports</span>
                    </div>
                </div>
            )}
        </div>
    );
}
