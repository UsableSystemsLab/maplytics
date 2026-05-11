"use client";
import { Info, Database, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

export default function MapSummaryPanel({ selectedLayers, visibleLayerIds, isMobile }) {
    // Calculate statistics
    const activeLayersCount = selectedLayers.length;
    const visibleLayersCount = selectedLayers.filter(l => visibleLayerIds.has(l.id)).length;

    let totalFeatures = 0;
    selectedLayers.forEach(layer => {
        if (visibleLayerIds.has(layer.id) && layer.geojson?.features) {
            totalFeatures += layer.geojson.features.length;
        }
    });

    if (activeLayersCount === 0) return null;

    return (
        <div className={cn(
            "absolute bottom-6 left-6 z-40 transition-all duration-300 pointer-events-none",
            isMobile ? "hidden" : "bottom-6 left-6"
        )}>
            <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-lg border border-gray-200 p-3 flex flex-col gap-2 pointer-events-auto min-w-[180px]">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-2 mb-1">
                    <div className="p-1 bg-primary/10 rounded-md">
                        <Info className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <span className="text-xs font-bold text-gray-900">Map Summary</span>
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-1.5 text-gray-500">
                            <Database className="w-3 h-3" />
                            <span className="text-[10px] font-medium uppercase tracking-wider">Layers</span>
                        </div>
                        <span className="text-xs font-bold text-gray-900">{visibleLayersCount} / {activeLayersCount}</span>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-1.5 text-gray-500">
                            <MapPin className="w-3 h-3" />
                            <span className="text-[10px] font-medium uppercase tracking-wider">Features</span>
                        </div>
                        <span className="text-xs font-bold text-gray-900">{totalFeatures.toLocaleString()}</span>
                    </div>
                </div>

                <div className="mt-1 pt-2 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-[9px] text-gray-400 italic">Live dataset analysis</span>
                    <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    </div>
                </div>
            </div>
        </div>
    );
}
