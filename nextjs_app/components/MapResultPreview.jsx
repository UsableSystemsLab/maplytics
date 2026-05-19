"use client";
import { useState, useEffect, useRef } from "react";
import { Maximize2, X, ZoomIn, ZoomOut, RotateCcw, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { getNlqJobResultUrl } from "@/lib/nlqApi";
import { useTranslations } from "next-intl";

export default function MapResultPreview({ jobs, isMobile, selectedJobId }) {
    const t = useTranslations("mapResultPreview");
    const [imageUrl, setImageUrl] = useState(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

    // Zoom & Pan State
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    
    const imgRef = useRef(null);

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

    // Reset Zoom/Pan when expanded state or image changes
    useEffect(() => {
        if (!isExpanded) {
            setScale(1);
            setPosition({ x: 0, y: 0 });
        }
    }, [isExpanded, imageUrl]);

    // Attach wheel event listener to ref with passive: false to prevent scrolling parent container
    useEffect(() => {
        const imgEl = imgRef.current;
        if (!imgEl) return;

        const handleWheel = (e) => {
            e.preventDefault();
            const zoomFactor = 0.15;
            setScale((prev) => {
                const next = e.deltaY < 0 ? Math.min(prev + zoomFactor, 5) : Math.max(prev - zoomFactor, 1);
                if (next === 1) {
                    setPosition({ x: 0, y: 0 });
                }
                return next;
            });
        };

        imgEl.addEventListener("wheel", handleWheel, { passive: false });
        return () => {
            imgEl.removeEventListener("wheel", handleWheel);
        };
    }, [isExpanded, imageUrl]);

    if (!imageUrl || isMobile) return null;

    // Panning Event Handlers
    const handleMouseDown = (e) => {
        if (scale <= 1) return;
        setIsDragging(true);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    };

    const handleMouseMove = (e) => {
        if (!isDragging || scale <= 1) return;
        setPosition({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
        });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleTouchStart = (e) => {
        if (scale <= 1 || e.touches.length !== 1) return;
        setIsDragging(true);
        const touch = e.touches[0];
        setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
    };

    const handleTouchMove = (e) => {
        if (!isDragging || scale <= 1 || e.touches.length !== 1) return;
        const touch = e.touches[0];
        setPosition({
            x: touch.clientX - dragStart.x,
            y: touch.clientY - dragStart.y
        });
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
    };

    // Download Handler
    const handleDownload = async () => {
        try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `maplytics_spatial_report_${selectedJobId || "export"}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            // Fallback to direct tab link opening
            const link = document.createElement("a");
            link.href = imageUrl;
            link.target = "_blank";
            link.download = `maplytics_spatial_report_${selectedJobId || "export"}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    return (
        <>
            {/* Small Preview Box */}
            <div className="absolute start-6 top-1/2 -translate-y-1/2 z-40 group pointer-events-none">
                <div className={cn(
                    "relative w-72 bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/40 p-1.5 pointer-events-auto transition-all duration-500",
                    isUpdating ? "opacity-50 scale-95" : "opacity-100 scale-100"
                )}>
                    <img
                        src={imageUrl}
                        alt={t('altResult')}
                        className="w-full h-auto rounded-xl shadow-sm"
                    />
                    
                    {/* Expand Button - Always Shown */}
                    <button 
                        onClick={() => setIsExpanded(true)}
                        className="absolute -bottom-2 -end-2 bg-primary text-white p-2 rounded-xl shadow-lg hover:scale-110 active:scale-95 transition-all z-10"
                    >
                        <Maximize2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Expanded Modal */}
            {isExpanded && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
                    {/* Floating Controls Bar */}
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white/10 backdrop-blur-xl px-5 py-3 rounded-full border border-white/15 shadow-2xl z-[110] animate-in slide-in-from-bottom-4 duration-300">
                        <button
                            onClick={() => setScale((prev) => Math.min(prev + 0.4, 5))}
                            className="size-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all border border-white/10 active:scale-95"
                            title="Zoom In"
                        >
                            <ZoomIn className="size-4" />
                        </button>
                        
                        <span className="text-white text-xs font-mono font-semibold px-2 min-w-[50px] text-center select-none">
                            {Math.round(scale * 100)}%
                        </span>

                        <button
                            onClick={() => {
                                setScale((prev) => {
                                    const next = Math.max(prev - 0.4, 1);
                                    if (next === 1) setPosition({ x: 0, y: 0 });
                                    return next;
                                });
                            }}
                            className="size-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all border border-white/10 active:scale-95"
                            title="Zoom Out"
                        >
                            <ZoomOut className="size-4" />
                        </button>

                        <div className="h-4 w-px bg-white/20 mx-1" />

                        <button
                            onClick={() => {
                                setScale(1);
                                setPosition({ x: 0, y: 0 });
                            }}
                            className="size-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all border border-white/10 active:scale-95"
                            title="Reset Zoom"
                        >
                            <RotateCcw className="size-4" />
                        </button>

                        <button
                            onClick={handleDownload}
                            className="size-8 rounded-full bg-primary hover:bg-primary/95 text-white flex items-center justify-center transition-all shadow-md active:scale-95"
                            title="Download Report"
                        >
                            <Download className="size-4" />
                        </button>
                    </div>

                    {/* Image Viewer Shell */}
                    <div 
                        className="relative w-full h-full flex items-center justify-center overflow-hidden cursor-default select-none"
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                    >
                        <img
                            ref={imgRef}
                            src={imageUrl}
                            alt={t('altResultExpanded')}
                            style={{
                                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                                transition: isDragging ? "none" : "transform 0.15s cubic-bezier(0.16, 1, 0.3, 1)",
                                cursor: scale > 1 ? (isDragging ? "grabbing" : "grab") : "default"
                            }}
                            className="max-w-[92%] max-h-[92%] object-contain rounded-2xl shadow-2xl transition-shadow duration-300"
                            draggable={false}
                        />
                    </div>

                    {/* Close Button */}
                    <button 
                        onClick={() => setIsExpanded(false)}
                        className="absolute top-6 end-6 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full border border-white/10 backdrop-blur-md transition-all active:scale-95 z-[110]"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            )}
        </>
    );
}
