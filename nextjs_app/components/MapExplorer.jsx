"use client";
import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useSelector, useDispatch } from "react-redux";
import {
    selectSelectedLayers,
    setLayerGeojson,
    setLayerLoading,
    removeLayer
} from "@/lib/store/features/layersSlice";
import { selectActiveProject } from "@/lib/store/features/projectSlice";
import { getDatasetGeoJSON, getProjectDatasetData } from "@/lib/datasetApi";
import { Layers, Plus, X, Loader2, Eye, EyeOff, MousePointer2, Flame, ChevronDown, ChevronUp } from "lucide-react";
import DatasetDrawer from "@/components/DatasetDrawer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import "leaflet.heat";

const LAYER_COLORS = ['#13B38D', '#0E3147', '#A7B34F', '#EF4444', '#F59E0B', '#8B5CF6'];

export default function MapExplorer({ className = "w-full h-full" }) {
    const mapContainerRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const layerGroupsRef = useRef({});

    const dispatch = useDispatch();
    const selectedLayers = useSelector(selectSelectedLayers);
    const activeProject = useSelector(selectActiveProject);
    const isMobile = useIsMobile();

    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [visibleLayerIds, setVisibleLayerIds] = useState(new Set());
    const [isPanelExpanded, setIsPanelExpanded] = useState(true);
    const [layerVizModes, setLayerVizModes] = useState({});
    const isInitialSync = useRef(false);

    // Sync visibleLayerIds with selectedLayers on mount/rehydration
    useEffect(() => {
        if (!isInitialSync.current && selectedLayers.length > 0) {
            const allIds = selectedLayers.map(l => l.id);
            setVisibleLayerIds(new Set(allIds));
            isInitialSync.current = true;
        }
    }, [selectedLayers]);

    useEffect(() => {
        if (!mapContainerRef.current || mapInstanceRef.current) return;

        const map = L.map(mapContainerRef.current, {
            center: [23.8859, 45.0792],
            zoom: 6,
            zoomControl: false,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        L.control.zoom({ position: 'bottomright' }).addTo(map);

        mapInstanceRef.current = map;

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, []);

    // Effect to collapse panel by default on mobile
    useEffect(() => {
        if (isMobile) {
            setIsPanelExpanded(false);
        } else {
            setIsPanelExpanded(true);
        }
    }, [isMobile]);

    // Load data for layers
    useEffect(() => {
        selectedLayers.forEach(async (layer) => {
            if (layer.geojson || layer.loading) return;

            dispatch(setLayerLoading({ layerId: layer.id, isLoading: true }));
            try {
                let data;
                if (layer.projectId) {
                    data = await getProjectDatasetData(layer.projectId, layer.id);
                } else {
                    data = await getDatasetGeoJSON(layer.id);
                }

                const geojson = data.geojson || (data.type === "FeatureCollection" ? data : null);
                if (geojson) {
                    dispatch(setLayerGeojson({ layerId: layer.id, geojson }));
                    // Auto-show when loaded
                    setVisibleLayerIds(prev => new Set(prev).add(layer.id));
                    // Default to plotting
                    setLayerVizModes(prev => ({ ...prev, [layer.id]: 'plotting' }));
                }
            } catch (error) {
                console.error(`Failed to load layer ${layer.name}:`, error);
            } finally {
                dispatch(setLayerLoading({ layerId: layer.id, isLoading: false }));
            }
        });
    }, [selectedLayers, dispatch]);

    // Update map layers based on selectedLayers, visibleLayerIds, and layerVizModes
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map) return;

        // Sync layers
        const currentLayerIds = selectedLayers.map(l => l.id);

        // Remove layers that are no longer selected
        Object.keys(layerGroupsRef.current).forEach(id => {
            if (!currentLayerIds.includes(id)) {
                map.removeLayer(layerGroupsRef.current[id]);
                delete layerGroupsRef.current[id];
            }
        });

        // Add or Update layers
        selectedLayers.forEach((layer, index) => {
            if (!layer.geojson) return;

            const isVisible = visibleLayerIds.has(layer.id);
            const mode = layerVizModes[layer.id] || 'plotting';
            const color = LAYER_COLORS[index % LAYER_COLORS.length];

            // Re-create layer if mode changed or doesn't exist
            const existingLayer = layerGroupsRef.current[layer.id];
            const needsRecreation = !existingLayer || existingLayer._vizMode !== mode;

            if (needsRecreation) {
                if (existingLayer) map.removeLayer(existingLayer);

                let newLayer;
                if (mode === 'heatmap') {
                    const points = [];
                    L.geoJSON(layer.geojson).eachLayer(l => {
                        if (l.getLatLng) {
                            const latlng = l.getLatLng();
                            points.push([latlng.lat, latlng.lng, 0.5]);
                        }
                    });
                    newLayer = L.heatLayer(points, {
                        radius: 25,
                        blur: 15,
                        maxZoom: 10,
                        gradient: { 0.4: 'blue', 0.65: 'lime', 1: 'red' }
                    });
                } else {
                    // Default plotting
                    newLayer = L.geoJSON(layer.geojson, {
                        style: { color, weight: 2, fillOpacity: 0.2 },
                        pointToLayer: (feature, latlng) => L.circleMarker(latlng, {
                            radius: 6,
                            fillColor: color,
                            color: "#fff",
                            weight: 1,
                            opacity: 1,
                            fillOpacity: 0.8
                        }),
                        onEachFeature: (feature, l) => {
                            const props = feature.properties || {};
                            const featureName = props.name || props.title || props.id || "Feature";
                            const datasetName = layer.name;

                            l.bindPopup(`
                                <div class="p-1">
                                    <div class="font-bold text-sm border-b pb-1 mb-1">${featureName}</div>
                                    <div class="text-xs text-gray-500">Layer: ${datasetName}</div>
                                </div>
                            `);

                            l.bindTooltip(`
                                <div class="font-medium text-xs">${featureName}</div>
                                <div class="text-[10px] text-gray-400 font-normal">${datasetName}</div>
                            `, {
                                sticky: true,
                                direction: 'top',
                                offset: [0, -5],
                                className: 'custom-map-tooltip'
                            });
                        }
                    });
                }

                newLayer._vizMode = mode;
                layerGroupsRef.current[layer.id] = newLayer;
            }

            const lg = layerGroupsRef.current[layer.id];
            if (isVisible && !map.hasLayer(lg)) {
                lg.addTo(map);
            } else if (!isVisible && map.hasLayer(lg)) {
                map.removeLayer(lg);
            }
        });
    }, [selectedLayers, visibleLayerIds, layerVizModes]);

    const toggleVisibility = (id) => {
        setVisibleLayerIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleRemoveLayer = (id) => {
        dispatch(removeLayer(id));
        setVisibleLayerIds(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
        });
    };

    return (
        <div className="relative w-full h-full">
            <div ref={mapContainerRef} className={className} style={{ minHeight: "400px" }} />

            {/* Layer Selector Overlay */}
            <div className={cn(
                "absolute top-4 right-4 z-40 transition-all duration-300 flex flex-col pointer-events-none",
                isMobile && !isPanelExpanded ? "w-12" : "w-72 max-h-[calc(100%-2rem)]"
            )}>
                <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-xl border border-gray-200 overflow-hidden flex flex-col pointer-events-auto">
                    {/* Header */}
                    <div
                        className={cn(
                            "p-4 bg-primary/5 border-b border-gray-100 flex items-center justify-between cursor-pointer md:cursor-default",
                            isMobile && !isPanelExpanded && "p-3 border-b-0"
                        )}
                        onClick={() => isMobile && setIsPanelExpanded(!isPanelExpanded)}
                    >
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-primary/10 rounded-lg shrink-0">
                                <Layers className="w-4 h-4 text-primary" />
                            </div>
                            <h3 className={cn(
                                "font-bold text-gray-900 truncate transition-all duration-300",
                                isMobile && !isPanelExpanded ? "w-0 opacity-0 overflow-hidden" : "w-auto opacity-100"
                            )}>
                                Active layers
                            </h3>
                        </div>

                        <div className={cn(
                            "flex items-center gap-1 transition-all duration-300",
                            isMobile && !isPanelExpanded ? "w-0 opacity-0 overflow-hidden" : "w-auto opacity-100"
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

                            {isMobile && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-full hover:bg-primary/10 shrink-0"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsPanelExpanded(false);
                                    }}
                                >
                                    <ChevronUp className="w-4 h-4 text-gray-500" />
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Content */}
                    <div className={cn(
                        "transition-all duration-300 overflow-hidden flex flex-col",
                        isMobile && !isPanelExpanded ? "max-h-0" : "max-h-[500px] opacity-100"
                    )}>
                        <div className="flex-1 overflow-y-auto p-2 min-h-[100px] max-h-[400px] space-y-1">
                            {selectedLayers.length === 0 ? (
                                <div className="py-8 px-4 text-center">
                                    <p className="text-xs text-gray-500 mb-3">No layers added to map</p>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="w-full text-[11px] h-8"
                                        onClick={() => setIsDrawerOpen(true)}
                                    >
                                        Browse Datasets
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
                                                        <Loader2 className="w-3 h-3 animate-spin text-primary mr-1" />
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
                                                <div className="flex items-center gap-1 mt-2 border-t border-gray-50 pt-2 ml-7">
                                                    <button
                                                        onClick={() => setLayerVizModes(prev => ({ ...prev, [layer.id]: 'plotting' }))}
                                                        className={cn(
                                                            "flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-all",
                                                            layerVizModes[layer.id] === 'plotting' ? "bg-primary text-white" : "text-gray-500 hover:bg-gray-100"
                                                        )}
                                                        title="Standard Plotting"
                                                    >
                                                        <MousePointer2 className="w-2.5 h-2.5" />
                                                        Plot
                                                    </button>
                                                    <button
                                                        onClick={() => setLayerVizModes(prev => ({ ...prev, [layer.id]: 'heatmap' }))}
                                                        className={cn(
                                                            "flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-all",
                                                            layerVizModes[layer.id] === 'heatmap' ? "bg-orange-500 text-white" : "text-gray-500 hover:bg-gray-100"
                                                        )}
                                                        title="Heatmap"
                                                    >
                                                        <Flame className="w-2.5 h-2.5" />
                                                        Heat
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <DatasetDrawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                activeProject={activeProject}
            />
        </div>
    );
}
