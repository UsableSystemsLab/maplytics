"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import {
    Search, ZoomIn, ZoomOut, Maximize2, Minimize2,
    ChevronUp, ChevronDown, MapPin, Activity, Database,
    Filter, X, Loader2, Map as MapIcon, Layers, BarChart3,
} from "lucide-react";
import { useSelector } from "react-redux";
import { selectSelectedLayer } from "@/lib/store/features/layerSlice";
import { getProjectDatasetData, getDatasetGeoJSON } from "@/lib/datasetApi";
import { getDistrictColor, resetDistrictColors } from "@/lib/districtColors";
import { useAuth } from "@/hooks/useAuth";
import StatCard from "@/components/StatCard";
import MapComponent from "@/components/MapComponent";
import ChartSidePanel from "@/components/ChartSidePanel";

export default function MapArea() {
    const { user } = useAuth();
    const persistedLayer = useSelector(selectSelectedLayer);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(5);
    const [isAnalysisExpanded, setIsAnalysisExpanded] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    const [selectedLayer, setSelectedLayer] = useState(null);
    const [geojsonData, setGeojsonData] = useState(null);
    const [displayGeojson, setDisplayGeojson] = useState(null);
    const [fieldsMetadata, setFieldsMetadata] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [featureCount, setFeatureCount] = useState(0);

    const [filters, setFilters] = useState({});
    const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(true);

    const [categories, setCategories] = useState([]);
    const [categoryField, setCategoryField] = useState(null);

    const [viewMode, setViewMode] = useState("map");
    const [isChartPanelOpen, setIsChartPanelOpen] = useState(false);

    const mapRef = useRef(null);
    const panelSlotRef = useRef(null);
    const [panelSlotReady, setPanelSlotReady] = useState(false);
    const userRef = useRef(user);
    userRef.current = user;

    const handleZoomIn = () => mapRef.current?.zoomIn();
    const handleZoomOut = () => mapRef.current?.zoomOut();

    const loadLayerData = async (projectId, datasetId) => {
        setIsLoading(true);
        setError(null);
        try {
            let result;
            if (projectId) {
                result = await getProjectDatasetData(projectId, datasetId);
            } else {
                result = await getDatasetGeoJSON(datasetId);
            }

            // Robust data extraction
            let geojson = result?.geojson || (result?.type === "FeatureCollection" ? result : null);
            let fields = result?.fields || [];

            if (!geojson) {
                console.error("Received invalid data structure:", result);
                throw new Error("Invalid dataset format received from server");
            }

            // Fallback: Infer fields on frontend if they are missing
            if (fields.length === 0 && geojson.features?.length > 0) {
                const keySet = new Set();
                geojson.features.forEach(f => {
                    if (f.properties) Object.keys(f.properties).forEach(k => keySet.add(k));
                });

                fields = Array.from(keySet).map(key => {
                    const values = geojson.features.map(f => f.properties?.[key]).filter(v => v != null && v !== '');
                    const allNumbers = values.length > 0 && values.every(v => typeof v === 'number' || (!isNaN(Number(v)) && typeof v !== 'boolean'));
                    const type = allNumbers ? 'number' : 'string';
                    const field = { name: key, type };
                    if (type === 'string') {
                        const unique = [...new Set(values.map(String))];
                        if (unique.length <= 100) field.values = unique;
                    } else {
                        const nums = values.map(Number);
                        field.min = Math.min(...nums);
                        field.max = Math.max(...nums);
                    }
                    return field;
                });
            }

            resetDistrictColors();
            setGeojsonData(geojson);
            setDisplayGeojson(geojson);
            setFieldsMetadata(fields || []);
            setFeatureCount(geojson.features?.length || 0);
            
            const firstCategorical = (fields || []).find(
                (f) => f.type === "string" && f.values?.length > 1 && f.values.length <= 20
            );
            if (firstCategorical) { 
                setCategoryField(firstCategorical.name); 
                setCategories(firstCategorical.values); 
            } else { 
                setCategoryField(null); 
                setCategories([]); 
            }
        } catch (err) {
            console.error("Failed to load layer data:", err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const loadLayerDataRef = useRef(loadLayerData);
    loadLayerDataRef.current = loadLayerData;

    useEffect(() => {
        const handleLayerSelected = async (e) => {
            const detail = e.detail;
            if (!detail) {
                setSelectedLayer(null); setGeojsonData(null); setDisplayGeojson(null);
                setFieldsMetadata([]); setFeatureCount(0); setFilters({}); setCategories([]);
                setCategoryField(null); setViewMode("map"); setIsChartPanelOpen(false);
                resetDistrictColors();
                return;
            }
            const { projectId, datasetId, datasetName } = detail;
            setSelectedLayer({ projectId, datasetId, datasetName });
            setFilters({});
            await loadLayerDataRef.current(projectId, datasetId);
        };
        window.addEventListener("layerSelected", handleLayerSelected);

        // Rehydrate on mount: if Redux already has a selected layer (from a
        // prior navigation), replay it so the map fetches and renders.
        if (persistedLayer?.datasetId && !selectedLayer) {
            handleLayerSelected({ detail: persistedLayer });
        }

        return () => window.removeEventListener("layerSelected", handleLayerSelected);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const applyFilters = useCallback(() => {
        if (!geojsonData?.features) return;
        const activeFilters = Object.entries(filters).filter(([, val]) =>
            val.type === "string" ? val.selected?.length > 0
                : val.type === "number" ? val.min !== undefined || val.max !== undefined
                    : false
        );
        if (activeFilters.length === 0) {
            setDisplayGeojson(geojsonData); setFeatureCount(geojsonData.features.length); return;
        }
        const filtered = geojsonData.features.filter((feature) =>
            activeFilters.every(([fieldName, filterVal]) => {
                const propVal = feature.properties?.[fieldName];
                if (filterVal.type === "string") return filterVal.selected.includes(String(propVal ?? ""));
                if (filterVal.type === "number") {
                    const num = Number(propVal);
                    if (isNaN(num)) return false;
                    if (filterVal.min !== undefined && num < filterVal.min) return false;
                    if (filterVal.max !== undefined && num > filterVal.max) return false;
                    return true;
                }
                return true;
            })
        );
        setDisplayGeojson({ ...geojsonData, features: filtered });
        setFeatureCount(filtered.length);
    }, [filters, geojsonData]);

    useEffect(() => { if (geojsonData && Object.keys(filters).length > 0) applyFilters(); }, [filters, applyFilters]);

    const handleStringFilterChange = (fieldName, value, checked) => {
        setFilters((prev) => {
            const current = prev[fieldName] || { type: "string", selected: [] };
            const selected = checked
                ? [...new Set([...(current.selected || []), value])]
                : (current.selected || []).filter((v) => v !== value);
            return { ...prev, [fieldName]: { ...current, type: "string", selected } };
        });
    };

    const handleNumberFilterChange = (fieldName, bound, value) => {
        setFilters((prev) => {
            const current = prev[fieldName] || { type: "number" };
            return { ...prev, [fieldName]: { ...current, type: "number", [bound]: value === "" ? undefined : Number(value) } };
        });
    };

    const clearFilters = () => {
        setFilters({});
        if (geojsonData) { setDisplayGeojson(geojsonData); setFeatureCount(geojsonData.features?.length || 0); }
    };

    const hasActiveFilters = Object.values(filters).some((val) =>
        val.type === "string" ? val.selected?.length > 0
            : val.type === "number" ? val.min !== undefined || val.max !== undefined
                : false
    );

    const hasPointFeatures = displayGeojson?.features?.some((f) => f.geometry?.type === "Point");
    const isChartAvailable = !!selectedLayer && hasPointFeatures && fieldsMetadata.some((f) => f.type === "string");
    const showChartHint = isChartAvailable && !isChartPanelOpen;

    return (
        <div className="relative w-full h-full bg-gray-100">
            <div className="absolute inset-0 z-0">
                <MapComponent
                    ref={mapRef}
                    type={viewMode !== "map" ? viewMode : undefined}
                    displayGeojson={displayGeojson}
                    categoryField={categoryField}
                    onZoomChange={setZoomLevel}
                    panelSlotRef={panelSlotRef}
                    className="h-full w-full"
                />
            </div>

            {isLoading && (
                <div className="absolute left-1/2 top-20 transform -translate-x-1/2 z-40 bg-white rounded-lg shadow-lg border border-gray-200 px-4 py-2 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span className="text-sm text-gray-600">Loading dataset...</span>
                </div>
            )}

            {error && (
                <div className="absolute left-1/2 top-20 transform -translate-x-1/2 z-40 bg-red-50 rounded-lg shadow-lg border border-red-200 px-4 py-2 flex items-center gap-2">
                    <span className="text-sm text-red-600">{error}</span>
                    <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
                </div>
            )}

            {/* Left panel — category legend + filters. Choropleth panel is rendered
                via Portal inside ChoroplethRender so it sits here visually without
                being buried in MapComponent's stacking context. */}
            {selectedLayer && (
                <div className="absolute left-6 top-24 z-30 flex flex-col gap-3 max-w-[260px]">
                    {/* Renderer panels portal into this slot */}
                    <div ref={(el) => { panelSlotRef.current = el; if (el && !panelSlotReady) setPanelSlotReady(true); }} />
                    {viewMode === "map" && categories.length > 0 && categoryField && (
                        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-3">
                            <h4 className="text-xs font-semibold text-gray-600 uppercase mb-2">
                                {categoryField.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                            </h4>
                            <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                {categories.map((cat) => (
                                    <div key={cat} className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: getDistrictColor(cat) }} />
                                        <span className="text-sm text-gray-700 truncate">{cat}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {fieldsMetadata.length > 0 && (
                        <div className="bg-white rounded-lg shadow-lg border border-gray-200">
                            <button
                                onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                                className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors rounded-lg"
                            >
                                <div className="flex items-center gap-2">
                                    <Filter className="w-4 h-4" />
                                    <span>Filters</span>
                                    {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-primary" />}
                                </div>
                                {isFilterPanelOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                            {isFilterPanelOpen && (
                                <div className="border-t border-gray-200 px-3 py-2 max-h-[400px] overflow-y-auto">
                                    {hasActiveFilters && (
                                        <button onClick={clearFilters} className="w-full mb-2 flex items-center justify-center gap-1 text-xs text-red-500 hover:text-red-700 py-1">
                                            <X className="w-3 h-3" /> Clear Filters
                                        </button>
                                    )}
                                    {fieldsMetadata.map((field) => (
                                        <div key={field.name} className="mb-3">
                                            <label className="text-xs font-medium text-gray-600 block mb-1">
                                                {field.name.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                                            </label>
                                            {field.type === "string" && field.values && (
                                                <div className="max-h-32 overflow-y-auto space-y-0.5 bg-gray-50 rounded p-1.5">
                                                    {field.values.map((val) => (
                                                        <label key={val} className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer hover:bg-white rounded px-1 py-0.5">
                                                            <input
                                                                type="checkbox"
                                                                checked={filters[field.name]?.selected?.includes(val) || false}
                                                                onChange={(e) => handleStringFilterChange(field.name, val, e.target.checked)}
                                                                className="rounded border-gray-300 text-primary focus:ring-primary w-3 h-3"
                                                            />
                                                            <span className="truncate">{val}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            )}
                                            {field.type === "number" && (
                                                <div className="flex gap-2">
                                                    <input type="number" placeholder={`Min${field.min !== undefined ? ` (${field.min})` : ""}`} value={filters[field.name]?.min ?? ""} onChange={(e) => handleNumberFilterChange(field.name, "min", e.target.value)} className="w-1/2 text-xs px-2 py-1 border border-gray-300 rounded focus:ring-primary focus:border-primary" />
                                                    <input type="number" placeholder={`Max${field.max !== undefined ? ` (${field.max})` : ""}`} value={filters[field.name]?.max ?? ""} onChange={(e) => handleNumberFilterChange(field.name, "max", e.target.value)} className="w-1/2 text-xs px-2 py-1 border border-gray-300 rounded focus:ring-primary focus:border-primary" />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-30 w-full max-w-2xl px-4">
                <div className="relative">
                    <div className="flex items-center bg-white rounded-full shadow-lg border border-gray-200 overflow-hidden">
                        <div className="pl-5 pr-3"><Search className="w-5 h-5 text-gray-400" /></div>
                        <input type="text" placeholder="Search locations..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-1 py-3 pr-4 text-sm outline-none placeholder:text-gray-400" />
                        {searchQuery && <button onClick={() => setSearchQuery("")} className="px-4 text-gray-400 hover:text-gray-600">✕</button>}
                    </div>
                    {searchQuery && (
                        <div className="absolute top-full mt-2 w-full bg-white rounded-lg shadow-xl border border-gray-200 py-2 max-h-64 overflow-y-auto">
                            <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Suggestions</div>
                            {["New York City", "Population Density Layer", "Traffic Analysis", "Urban Development Zone"].map((item, i) => (
                                <button key={i} className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors flex items-center gap-3">
                                    <MapPin className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm text-gray-700">{item}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className={`absolute top-24 z-30 flex flex-col items-end gap-2 transition-all duration-300 ${isChartPanelOpen ? "right-106" : "right-6"}`}>
                {selectedLayer && (
                    <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                        <button onClick={() => setViewMode("map")} className={`p-3 transition-colors ${viewMode === "map" ? "bg-primary text-white" : "hover:bg-gray-50 text-gray-700"}`} title="Map View">
                            <MapIcon className="w-5 h-5" />
                        </button>
                        <button onClick={() => setViewMode("choropleth")} className={`p-3 transition-colors border-t border-gray-200 ${viewMode === "choropleth" ? "bg-primary text-white" : "hover:bg-gray-50 text-gray-700"}`} title="Choropleth View">
                            <Layers className="w-5 h-5" />
                        </button>
                    </div>
                )}

                <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                    <button onClick={handleZoomIn} className="p-3 hover:bg-gray-50 transition-colors border-b border-gray-200" title="Zoom In"><ZoomIn className="w-5 h-5 text-gray-700" /></button>
                    <div className="px-3 py-2 text-xs font-medium text-gray-600 text-center border-b border-gray-200">{Math.round(zoomLevel)}</div>
                    <button onClick={handleZoomOut} className="p-3 hover:bg-gray-50 transition-colors" title="Zoom Out"><ZoomOut className="w-5 h-5 text-gray-700" /></button>
                </div>

                {isChartAvailable && (
                    <div className="relative">
                        <button onClick={() => setIsChartPanelOpen(!isChartPanelOpen)} className={`p-3 rounded-lg shadow-lg transition-colors ${isChartPanelOpen ? "bg-cyan text-white border-transparent" : "bg-white hover:bg-gray-50 text-gray-700 border border-gray-200"}`} title={isChartPanelOpen ? "Close Chart" : "Open Chart"}>
                            <BarChart3 className="w-5 h-5" />
                        </button>
                        {showChartHint && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-earthy-green rounded-full pointer-events-none" />}
                    </div>
                )}

                <button onClick={() => setIsFullscreen(!isFullscreen)} className="bg-white p-3 rounded-lg shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                    {isFullscreen ? <Minimize2 className="w-5 h-5 text-gray-700" /> : <Maximize2 className="w-5 h-5 text-gray-700" />}
                </button>
            </div>

            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-30 w-[95%] max-w-4xl">
                <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 bg-cyan cursor-pointer" onClick={() => setIsAnalysisExpanded(!isAnalysisExpanded)}>
                        <div className="flex items-center gap-3">
                            <Activity className="w-5 h-5 text-white" />
                            <h3 className="text-lg font-semibold text-white">{selectedLayer ? selectedLayer.datasetName : "Analysis Results"}</h3>
                        </div>
                        <button className={`text-white hover:bg-white/20 p-1 rounded transition-transform duration-500 ${isAnalysisExpanded ? "rotate-180" : "rotate-0"}`}>
                            <ChevronUp className="w-5 h-5" />
                        </button>
                    </div>
                    <div className={`overflow-hidden transition-all duration-700 ease-in-out ${isAnalysisExpanded ? "max-h-[1000px] opacity-100 translate-y-0" : "max-h-0 opacity-0 -translate-y-4"}`}>
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                <StatCard icon={Database} label="Dataset" value={selectedLayer?.datasetName || "N/A"} subtitle="Selected layer" />
                                <StatCard icon={MapPin} label="Features" value={featureCount.toLocaleString()} subtitle={hasActiveFilters ? "Filtered results" : "Points on map"} />
                                <StatCard icon={Activity} iconColor="text-earthy-green" label="Status" value={isLoading ? "Loading..." : selectedLayer ? "Active" : "Ready"} subtitle={selectedLayer ? "Dataset loaded" : "Select a layer"} />
                            </div>

                            {showChartHint && (
                                <button onClick={() => setIsChartPanelOpen(true)} className="w-full mb-4 flex items-center gap-3 px-4 py-3 bg-cyan/5 border border-cyan/20 rounded-lg hover:bg-cyan/10 transition-colors group">
                                    <div className="p-2 bg-cyan/10 rounded-lg group-hover:bg-cyan/20 transition-colors"><BarChart3 className="w-4 h-4 text-cyan" /></div>
                                    <div className="text-left">
                                        <p className="text-sm font-semibold text-gray-800">Chart analysis ready</p>
                                        <p className="text-xs text-gray-500">View categorical breakdown of your dataset</p>
                                    </div>
                                    <ChevronDown className="w-4 h-4 text-gray-400 ml-auto -rotate-90" />
                                </button>
                            )}

                            <div className="flex gap-3">
                                <button className="flex-1 bg-primary text-white py-2.5 rounded-lg font-medium hover:opacity-80 transition-colors">Export Report</button>
                                <button className="flex-1 bg-cyan text-white py-2.5 rounded-lg font-medium hover:opacity-80 transition-colors">Save Analysis</button>
                                <button className="px-4 border border-gray-300 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition-colors">Share</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <ChartSidePanel features={displayGeojson?.features} fieldsMetadata={fieldsMetadata} isOpen={isChartPanelOpen} onClose={() => setIsChartPanelOpen(false)} />
        </div>
    );
}
