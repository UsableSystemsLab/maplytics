"use client";
import { Layers, Plus, X, Loader2, Eye, EyeOff, MousePointer2, Flame, Map as MapIcon, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { COLOR_SCHEMES, getColorRange } from "@/lib/choroplethScale";

const LAYER_COLORS = ['#FFBB00', '#26BB00', '#00BBD9', '#FF003C', '#003BFF', '#FF3BA9'];
const BOUNDARY_LEVELS = ['auto', 'regions', 'cities', 'districts'];

export default function MapLayerPanel({
    selectedLayers,
    visibleLayerIds,
    layerVizModes,
    choroplethSettings,
    onChoroplethSettingsChange,
    isMobile,
    isPanelExpanded,
    setIsPanelExpanded,
    setIsDrawerOpen,
    toggleVisibility,
    handleRemoveLayer,
    setLayerVizModes
}) {
    const t = useTranslations("mapPanel");
    return (
        <div className={cn(
            "absolute top-4 start-4 z-40 transition-all duration-300 flex flex-col pointer-events-none",
            isMobile && !isPanelExpanded ? "w-12" : "w-72 max-h-[calc(100%-2rem)]"
        )}>
            <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-xl border border-gray-200 overflow-hidden flex flex-col pointer-events-auto">
                {/* Header */}
                <div
                    className={cn(
                        "p-4 bg-primary/5 border-b border-gray-100 flex items-center justify-between cursor-pointer",
                        !isPanelExpanded && "p-3 border-b-0"
                    )}
                    onClick={() => setIsPanelExpanded(!isPanelExpanded)}
                >
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-primary/10 rounded-lg shrink-0">
                            <Layers className="w-4 h-4 text-primary" />
                        </div>
                        <h3 className={cn(
                            "font-bold text-gray-900 truncate transition-all duration-300",
                            !isPanelExpanded ? "w-0 opacity-0 overflow-hidden" : "w-auto opacity-100"
                        )}>
                            {t('activeLayers')}
                        </h3>
                    </div>

                    <div className={cn(
                        "flex items-center gap-1 transition-all duration-300",
                        !isPanelExpanded ? "w-0 opacity-0 overflow-hidden" : "w-auto opacity-100"
                    )}>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full hover:bg-primary/10 shrink-0"
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsDrawerOpen(true);
                            }}
                        >
                            <Plus className="w-4 h-4 text-primary" />
                        </Button>

                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full hover:bg-primary/10 shrink-0"
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsPanelExpanded(false);
                            }}
                        >
                            <ChevronUp className={cn("w-4 h-4 text-gray-500 transition-transform", !isPanelExpanded && "rotate-180")} />
                        </Button>
                    </div>
                </div>

                {/* Content */}
                <div className={cn(
                    "transition-all duration-300 overflow-hidden flex flex-col",
                    !isPanelExpanded ? "max-h-0" : "max-h-[500px] opacity-100"
                )}>
                    <div className="flex-1 overflow-y-auto p-2 min-h-[100px] max-h-[400px] space-y-1">
                        {selectedLayers.length === 0 ? (
                            <div className="py-8 px-4 text-center">
                                <p className="text-xs text-gray-500 mb-3">{t('noLayers')}</p>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="w-full text-[11px] h-8"
                                    onClick={() => setIsDrawerOpen(true)}
                                >
                                    {t('browseDatasets')}
                                </Button>
                            </div>
                        ) : (
                            selectedLayers.map((layer, index) => {
                                const layerColor = LAYER_COLORS[index % LAYER_COLORS.length];
                                return (
                                    <div
                                        key={layer.id}
                                        className={cn(
                                            "flex flex-col p-2 rounded-lg transition-all",
                                            visibleLayerIds.has(layer.id) ? "bg-white" : "bg-gray-50 opacity-60"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => toggleVisibility(layer.id)}
                                                className="text-gray-400 hover:text-primary transition-colors shrink-0"
                                            >
                                                {visibleLayerIds.has(layer.id) ? (
                                                    <Eye className="w-4 h-4" />
                                                ) : (
                                                    <EyeOff className="w-4 h-4" />
                                                )}
                                            </button>

                                            <div className="flex-1 min-w-0 flex items-center gap-2">
                                                <span
                                                    className="w-2 h-2 rounded-full shrink-0"
                                                    style={{ backgroundColor: layerColor }}
                                                />
                                                <p className="text-sm font-medium text-gray-700 truncate">
                                                    {layer.name}
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-1 shrink-0">
                                                {layer.loading && (
                                                    <Loader2 className="w-3 h-3 animate-spin text-primary me-1" />
                                                )}
                                                <button
                                                    onClick={() => handleRemoveLayer(layer.id)}
                                                    className="text-gray-300 hover:text-red-500 transition-colors p-1"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Mode Selector */}
                                        {visibleLayerIds.has(layer.id) && (
                                            <div className="flex items-center gap-1 mt-2 border-t border-gray-50 pt-2 ms-7">
                                                <button
                                                    onClick={() => setLayerVizModes(prev => ({ ...prev, [layer.id]: 'plotting' }))}
                                                    className={cn(
                                                        "flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-all",
                                                        (!layerVizModes[layer.id] || layerVizModes[layer.id] === 'plotting') ? "bg-primary text-white" : "text-gray-500 hover:bg-gray-100"
                                                    )}
                                                    title={t('standardPlotting')}
                                                >
                                                    <MousePointer2 className="w-2.5 h-2.5" />
                                                    {t('plot')}
                                                </button>
                                                <button
                                                    onClick={() => setLayerVizModes(prev => ({ ...prev, [layer.id]: 'heatmap' }))}
                                                    className={cn(
                                                        "flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-all",
                                                        layerVizModes[layer.id] === 'heatmap' ? "bg-orange-500 text-white" : "text-gray-500 hover:bg-gray-100"
                                                    )}
                                                    title={t('heatmap')}
                                                >
                                                    <Flame className="w-2.5 h-2.5" />
                                                    {t('heat')}
                                                </button>
                                                <button
                                                    onClick={() => setLayerVizModes(prev => ({ ...prev, [layer.id]: 'choropleth' }))}
                                                    className={cn(
                                                        "flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-all",
                                                        layerVizModes[layer.id] === 'choropleth' ? "bg-emerald-600 text-white" : "text-gray-500 hover:bg-gray-100"
                                                    )}
                                                    title={t('choropleth')}
                                                >
                                                    <MapIcon className="w-2.5 h-2.5" />
                                                    {t('choropleth')}
                                                </button>
                                            </div>
                                        )}

                                        {/* Choropleth Settings */}
                                        {visibleLayerIds.has(layer.id) && layerVizModes[layer.id] === 'choropleth' && (
                                            <ChoroplethSettingsPanel
                                                layerId={layer.id}
                                                settings={choroplethSettings?.[layer.id]}
                                                onChange={(patch) => onChoroplethSettingsChange?.(layer.id, patch)}
                                                t={t}
                                            />
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function ChoroplethSettingsPanel({ layerId, settings, onChange, t }) {
    const level = settings?.boundaryLock || 'auto';
    const colorScheme = settings?.colorScheme || 'Blues';
    const resolvedLevel = settings?.resolvedLevel || 'districts';

    return (
        <div className="ms-7 mt-1.5 p-2 bg-gray-50 rounded-lg border border-gray-100 space-y-2">
            <div>
                <p className="text-[10px] font-medium text-gray-500 mb-1">{t('boundaryLevel')}</p>
                <div className="flex flex-wrap gap-1">
                    {BOUNDARY_LEVELS.map((lvl) => (
                        <button
                            key={lvl}
                            onClick={() => onChange({ boundaryLock: lvl })}
                            className={cn(
                                "px-2 py-0.5 text-[10px] font-semibold rounded transition-colors capitalize",
                                level === lvl
                                    ? "bg-emerald-600 text-white"
                                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"
                            )}
                        >
                            {lvl === 'auto' ? `${t('auto')} (${resolvedLevel})` : t(lvl)}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <p className="text-[10px] font-medium text-gray-500 mb-1">{t('colorScheme')}</p>
                <div className="grid grid-cols-4 gap-1">
                    {Object.keys(COLOR_SCHEMES).map((scheme) => {
                        const colors = getColorRange(scheme, 5);
                        return (
                            <button
                                key={scheme}
                                onClick={() => onChange({ colorScheme: scheme })}
                                title={scheme}
                                className={cn(
                                    "rounded overflow-hidden border-2 transition-all",
                                    colorScheme === scheme ? "border-emerald-600 shadow-sm" : "border-transparent hover:border-gray-300"
                                )}
                            >
                                <div className="flex h-3">
                                    {colors.map((color, i) => (
                                        <div key={i} style={{ backgroundColor: color }} className="flex-1" />
                                    ))}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
