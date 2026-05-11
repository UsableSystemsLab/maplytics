"use client";
import { useState, useEffect } from "react";
import { Maximize2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getNlqJobResultUrl } from "@/lib/nlqApi";

export default function MapResultPreview({ jobs, isMobile, selectedJobId }) {
    const [imageUrl, setImageUrl] = useState(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        if (!selectedJobId) {
            setImageUrl(null);
            return;
        }
        
        const fetchImage = async () => {
            setIsUpdating(true);
            const url = await getNlqJobResultUrl(selectedJobId);
            setImageUrl(url);
            setTimeout(() => setIsUpdating(false), 500);
        };
        
        fetchImage();
    }, [selectedJobId]);

    if (!imageUrl || isMobile) return null;

    return (
        <>
            {/* Small Preview Box */}
            <div className="absolute left-6 top-1/2 -translate-y-1/2 z-40 group pointer-events-none">
                <div className={cn(
                    "relative w-72 bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/40 p-1.5 pointer-events-auto transition-all duration-500",
                    isUpdating ? "opacity-50 scale-95" : "opacity-100 scale-100"
                )}>
                    <img 
                        src={imageUrl} 
                        alt="Result" 
                        className="w-full h-auto rounded-xl shadow-sm"
                    />
                    
                    {/* Expand Button - Always Shown */}
                    <button 
                        onClick={() => setIsExpanded(true)}
                        className="absolute -bottom-2 -right-2 bg-primary text-white p-2 rounded-xl shadow-lg hover:scale-110 active:scale-95 transition-all z-10"
                    >
                        <Maximize2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Expanded Modal */}
            {isExpanded && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="relative max-w-5xl w-full h-full flex items-center justify-center pointer-events-none">
                        <img 
                            src={imageUrl} 
                            alt="Result Expanded" 
                            className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl pointer-events-auto"
                        />
                        <button 
                            onClick={() => setIsExpanded(false)}
                            className="absolute top-0 right-0 bg-white/20 hover:bg-white/30 text-white p-3 rounded-full backdrop-blur-md transition-all pointer-events-auto"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
