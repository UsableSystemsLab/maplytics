"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
    Search,
    ZoomIn,
    ZoomOut,
    Maximize2,
    Minimize2,
    ChevronUp,
    ChevronDown,
    MapPin,
    Activity,
    Database,
    Filter,
    X,
    Loader2
} from "lucide-react";
import { getProjectDatasetData } from "@/lib/datasetApi";
import { getDistrictColor, resetDistrictColors } from "@/lib/districtColors";
import { useAuth } from "@/hooks/useAuth";
import StatCard from "@/components/StatCard";


// Custom marker icon
const createMarkerIcon = (color = '#2C3580') => {
    return L.divIcon({
        className: 'custom-marker',
        html: `<div style="
            background-color: ${color};
            width: 24px;
            height: 24px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 2px solid white;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        "></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 24],
        popupAnchor: [0, -24]
    });
};


// popup content from the feature properties
const generatePopupContent = (properties) => {
    if (!properties || Object.keys(properties).length === 0) {
        return '<p class="text-gray-500">No properties available</p>';
    }

    const nameFields = ['name', 'restaurant_name', 'school_name', 'hospital_name', 'title', 'label'];
    let primaryName = '';
    for (const field of nameFields) {
        if (properties[field]) {
            primaryName = properties[field];
            break;
        }
    }

    let html = '<div class="p-2 max-w-xs">';

    if (primaryName) {
        html += `<h3 style="font-weight: bold; font-size: 16px; margin-bottom: 8px; color: #1f2937;">${primaryName}</h3>`;
    }

    html += '<div style="display: flex; flex-direction: column; gap: 2px;">';

    for (const [key, value] of Object.entries(properties)) {
        if (nameFields.includes(key)) continue;
        if (typeof value === 'object') continue;

        const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        html += `<p style="font-size: 13px;"><span style="font-weight: 500; color: #4b5563;">${label}:</span> <span style="color: #1f2937;">${value}</span></p>`;
    }
    html += '</div>';
    html += '</div>';

    return html;
};


export default function MapArea() {
    const { user } = useAuth();
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(5);
    const [isAnalysisExpanded, setIsAnalysisExpanded] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    // Dataset states (RustFS-backed)
    const [selectedLayer, setSelectedLayer] = useState(null);
    const [geojsonData, setGeojsonData] = useState(null);
    const [fieldsMetadata, setFieldsMetadata] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [featureCount, setFeatureCount] = useState(0);

    // Filter states
    const [filters, setFilters] = useState({});
    const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(true);

    // Category legend
    const [categories, setCategories] = useState([]);
    const [categoryField, setCategoryField] = useState(null);

    const mapRef = useRef(null);
    const markersLayerRef = useRef(null);

    // Refs to avoid stale closures in event handlers
    const userRef = useRef(user);
    userRef.current = user;
    const geojsonRef = useRef(geojsonData);
    geojsonRef.current = geojsonData;
    const categoryFieldRef = useRef(categoryField);
    categoryFieldRef.current = categoryField;

    const handleZoomIn = () => {
        if (mapRef.current) {
            mapRef.current.zoomIn();
            setZoomLevel(mapRef.current.getZoom());
        }
    };

    const handleZoomOut = () => {
        if (mapRef.current) {
            mapRef.current.zoomOut();
            setZoomLevel(mapRef.current.getZoom());
        }
    };

    // Initialize map
    useEffect(() => {
        if (mapRef.current) return;

        const map = L.map("map", {
            minZoom: 3,
            maxZoom: 18,
            zoomControl: false,
            worldCopyJump: true,
            maxBounds: [
                [-85, -180],
                [85, 180],
            ],
            maxBoundsViscosity: 1.0,
        }).setView([23.8859, 45.0792], 5);
        mapRef.current = map;
        markersLayerRef.current = L.layerGroup().addTo(map);
        L.tileLayer('https://api.maptiler.com/maps/streets-v4/256/{z}/{x}/{y}.png?key=RiFdBckUhPkjpd0WA65S', {
            attribution: '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a>' +
                '<a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>'
        }).addTo(map);

        map.on('zoomend', () => {
            setZoomLevel(map.getZoom());
        });
    }, []);

    // Render GeoJSON on the map
    const renderGeoJSON = (geojson, catField) => {
        console.log('[MapArea] renderGeoJSON called:', { hasMarkersLayer: !!markersLayerRef.current, featureCount: geojson?.features?.length, catField });
        if (!markersLayerRef.current || !geojson?.features) return;

        const effectiveCatField = catField !== undefined ? catField : categoryFieldRef.current;

        resetDistrictColors();
        markersLayerRef.current.clearLayers();

        const bounds = [];

        geojson.features.forEach(feature => {
            const geometryType = feature.geometry?.type;

            if (geometryType === 'Point') {
                const [lng, lat] = feature.geometry.coordinates;
                bounds.push([lat, lng]);

                const catValue = effectiveCatField ? (feature.properties?.[effectiveCatField] || 'Unknown') : 'Default';
                const markerColor = getDistrictColor(catValue);

                const marker = L.marker([lat, lng], {
                    icon: createMarkerIcon(markerColor)
                });

                const popupContent = generatePopupContent(feature.properties);
                marker.bindPopup(popupContent, {
                    maxWidth: 300,
                    className: 'custom-popup'
                });

                markersLayerRef.current.addLayer(marker);
            }
            else if (geometryType === 'Polygon' || geometryType === 'MultiPolygon') {
                const catValue = effectiveCatField ? (feature.properties?.[effectiveCatField] || feature.properties?.name || 'Unknown') : (feature.properties?.name || 'Unknown');
                const color = getDistrictColor(catValue);

                const coordsToLatLng = (coords) => coords.map(ring =>
                    ring.map(coord => [coord[1], coord[0]])
                );

                let polygonCoords;
                if (geometryType === 'Polygon') {
                    polygonCoords = coordsToLatLng(feature.geometry.coordinates);
                    feature.geometry.coordinates[0].forEach(([lng, lat]) => bounds.push([lat, lng]));
                } else {
                    polygonCoords = feature.geometry.coordinates.map(poly => coordsToLatLng(poly));
                    feature.geometry.coordinates.forEach(poly =>
                        poly[0].forEach(([lng, lat]) => bounds.push([lat, lng]))
                    );
                }

                const polygon = L.polygon(polygonCoords, {
                    color: color,
                    weight: 2,
                    fillColor: color,
                    fillOpacity: 0.3
                });

                const popupContent = generatePopupContent(feature.properties);
                polygon.bindPopup(popupContent, {
                    maxWidth: 300,
                    className: 'custom-popup'
                });

                markersLayerRef.current.addLayer(polygon);
            }
            else if (geometryType === 'LineString' || geometryType === 'MultiLineString') {
                const catValue = effectiveCatField ? (feature.properties?.[effectiveCatField] || feature.properties?.name || 'Unknown') : (feature.properties?.name || 'Unknown');
                const color = getDistrictColor(catValue);

                let lineCoords;
                if (geometryType === 'LineString') {
                    lineCoords = feature.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
                    feature.geometry.coordinates.forEach(([lng, lat]) => bounds.push([lat, lng]));
                } else {
                    lineCoords = feature.geometry.coordinates.map(line =>
                        line.map(([lng, lat]) => [lat, lng])
                    );
                    feature.geometry.coordinates.forEach(line =>
                        line.forEach(([lng, lat]) => bounds.push([lat, lng]))
                    );
                }

                const polyline = L.polyline(lineCoords, {
                    color: color,
                    weight: 3,
                    opacity: 0.8
                });

                const popupContent = generatePopupContent(feature.properties);
                polyline.bindPopup(popupContent, {
                    maxWidth: 300,
                    className: 'custom-popup'
                });

                markersLayerRef.current.addLayer(polyline);
            }
        });

        console.log('[MapArea] renderGeoJSON done:', { markersAdded: markersLayerRef.current.getLayers().length, boundsCount: bounds.length });
        if (bounds.length > 0 && mapRef.current) {
            mapRef.current.fitBounds(bounds, { padding: [50, 50] });
        }
    };

    const renderGeoJSONRef = useRef(renderGeoJSON);
    renderGeoJSONRef.current = renderGeoJSON;

    const clearMap = () => {
        if (markersLayerRef.current) {
            markersLayerRef.current.clearLayers();
        }
    };

    const loadLayerData = async (projectId, datasetId) => {
        setIsLoading(true);
        setError(null);

        try {
            const userId = userRef.current?.uid;
            console.log('[MapArea] loadLayerData called:', { projectId, datasetId, userId });
            const result = await getProjectDatasetData(projectId, datasetId, userId);
            const { geojson, fields } = result;
            console.log('[MapArea] API response:', { featureCount: geojson?.features?.length, fields: fields?.length, geojsonType: geojson?.type });

            setGeojsonData(geojson);
            geojsonRef.current = geojson;
            setFieldsMetadata(fields || []);
            setFeatureCount(geojson.features?.length || 0);

            const firstCategorical = (fields || []).find(f => f.type === 'string' && f.values && f.values.length > 1 && f.values.length <= 20);
            if (firstCategorical) {
                setCategoryField(firstCategorical.name);
                categoryFieldRef.current = firstCategorical.name;
                setCategories(firstCategorical.values);
            } else {
                setCategoryField(null);
                categoryFieldRef.current = null;
                setCategories([]);
            }

            renderGeoJSONRef.current(geojson, firstCategorical?.name);
        } catch (err) {
            console.error('Failed to load layer data:', err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const loadLayerDataRef = useRef(loadLayerData);
    loadLayerDataRef.current = loadLayerData;

    useEffect(() => {
        const handleLayerSelected = async (e) => {
            console.log('[MapArea] layerSelected event received:', e.detail);
            const detail = e.detail;

            if (!detail) {
                // Deselected
                clearMap();
                setSelectedLayer(null);
                setGeojsonData(null);
                setFieldsMetadata([]);
                setFeatureCount(0);
                setFilters({});
                setCategories([]);
                setCategoryField(null);
                return;
            }

            const { projectId, datasetId, datasetName } = detail;
            setSelectedLayer({ projectId, datasetId, datasetName });
            setFilters({});
            await loadLayerDataRef.current(projectId, datasetId);
        };

        window.addEventListener('layerSelected', handleLayerSelected);
        return () => window.removeEventListener('layerSelected', handleLayerSelected);
    }, []);

    // Apply filters client-side and re-render
    const applyFilters = useCallback(() => {
        const currentGeojson = geojsonRef.current;
        if (!currentGeojson?.features) return;

        const activeFilters = Object.entries(filters).filter(([, val]) => {
            if (val.type === 'string') return val.selected && val.selected.length > 0;
            if (val.type === 'number') return val.min !== undefined || val.max !== undefined;
            return false;
        });

        if (activeFilters.length === 0) {
            renderGeoJSONRef.current(currentGeojson);
            setFeatureCount(currentGeojson.features.length);
            return;
        }

        const filtered = currentGeojson.features.filter(feature => {
            return activeFilters.every(([fieldName, filterVal]) => {
                const propVal = feature.properties?.[fieldName];
                if (filterVal.type === 'string') {
                    return filterVal.selected.includes(String(propVal ?? ''));
                }
                if (filterVal.type === 'number') {
                    const num = Number(propVal);
                    if (isNaN(num)) return false;
                    if (filterVal.min !== undefined && num < filterVal.min) return false;
                    if (filterVal.max !== undefined && num > filterVal.max) return false;
                    return true;
                }
                return true;
            });
        });

        const filteredGeojson = { ...currentGeojson, features: filtered };
        renderGeoJSONRef.current(filteredGeojson);
        setFeatureCount(filtered.length);
    }, [filters]);

    useEffect(() => {
        if (geojsonRef.current && Object.keys(filters).length > 0) {
            applyFilters();
        }
    }, [filters, applyFilters]);

    const handleStringFilterChange = (fieldName, value, checked) => {
        setFilters(prev => {
            const current = prev[fieldName] || { type: 'string', selected: [] };
            let selected = [...(current.selected || [])];
            if (checked) {
                if (!selected.includes(value)) selected.push(value);
            } else {
                selected = selected.filter(v => v !== value);
            }
            return { ...prev, [fieldName]: { ...current, type: 'string', selected } };
        });
    };

    const handleNumberFilterChange = (fieldName, bound, value) => {
        setFilters(prev => {
            const current = prev[fieldName] || { type: 'number' };
            const numVal = value === '' ? undefined : Number(value);
            return { ...prev, [fieldName]: { ...current, type: 'number', [bound]: numVal } };
        });
    };

    const clearFilters = () => {
        setFilters({});
        // Re-render with all data when filters are cleared
        if (geojsonRef.current) {
            renderGeoJSONRef.current(geojsonRef.current);
            setFeatureCount(geojsonRef.current.features?.length || 0);
        }
    };

    const hasActiveFilters = Object.values(filters).some(val => {
        if (val.type === 'string') return val.selected && val.selected.length > 0;
        if (val.type === 'number') return val.min !== undefined || val.max !== undefined;
        return false;
    });

    return (
        <div className="relative w-full h-full bg-gray-100">
            <div className="absolute inset-0 z-0">
                <div id="map" className="h-full w-full" />
            </div>

            {/* Left Panel: Category Legend + Filter Panel */}
            {selectedLayer && (
                <div className="absolute left-6 top-24 z-30 flex flex-col gap-3 max-w-[260px]">
                    {/* Category Legend */}
                    {categories.length > 0 && categoryField && (
                        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-3">
                            <h4 className="text-xs font-semibold text-gray-600 uppercase mb-2">
                                {categoryField.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </h4>
                            <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                {categories.map(cat => (
                                    <div key={cat} className="flex items-center gap-2">
                                        <div
                                            className="w-3 h-3 rounded-full flex-shrink-0"
                                            style={{ backgroundColor: getDistrictColor(cat) }}
                                        />
                                        <span className="text-sm text-gray-700 truncate">{cat}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Dynamic Filter Panel */}
                    {fieldsMetadata.length > 0 && (
                        <div className="bg-white rounded-lg shadow-lg border border-gray-200">
                            <button
                                onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                                className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors rounded-lg"
                            >
                                <div className="flex items-center gap-2">
                                    <Filter className="w-4 h-4" />
                                    <span>Filters</span>
                                    {hasActiveFilters && (
                                        <span className="w-2 h-2 rounded-full bg-primary"></span>
                                    )}
                                </div>
                                {isFilterPanelOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>

                            {isFilterPanelOpen && (
                                <div className="border-t border-gray-200 px-3 py-2 max-h-[400px] overflow-y-auto">
                                    {hasActiveFilters && (
                                        <button
                                            onClick={clearFilters}
                                            className="w-full mb-2 flex items-center justify-center gap-1 text-xs text-red-500 hover:text-red-700 py-1"
                                        >
                                            <X className="w-3 h-3" />
                                            Clear Filters
                                        </button>
                                    )}

                                    {fieldsMetadata.map(field => (
                                        <div key={field.name} className="mb-3">
                                            <label className="text-xs font-medium text-gray-600 block mb-1">
                                                {field.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                            </label>

                                            {field.type === 'string' && field.values && (
                                                <div className="max-h-32 overflow-y-auto space-y-0.5 bg-gray-50 rounded p-1.5">
                                                    {field.values.map(val => (
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

                                            {field.type === 'number' && (
                                                <div className="flex gap-2">
                                                    <input
                                                        type="number"
                                                        placeholder={`Min${field.min !== undefined ? ` (${field.min})` : ''}`}
                                                        value={filters[field.name]?.min ?? ''}
                                                        onChange={(e) => handleNumberFilterChange(field.name, 'min', e.target.value)}
                                                        className="w-1/2 text-xs px-2 py-1 border border-gray-300 rounded focus:ring-primary focus:border-primary"
                                                    />
                                                    <input
                                                        type="number"
                                                        placeholder={`Max${field.max !== undefined ? ` (${field.max})` : ''}`}
                                                        value={filters[field.name]?.max ?? ''}
                                                        onChange={(e) => handleNumberFilterChange(field.name, 'max', e.target.value)}
                                                        className="w-1/2 text-xs px-2 py-1 border border-gray-300 rounded focus:ring-primary focus:border-primary"
                                                    />
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

            {/* Loading Overlay */}
            {isLoading && (
                <div className="absolute left-1/2 top-20 transform -translate-x-1/2 z-40 bg-white rounded-lg shadow-lg border border-gray-200 px-4 py-2 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span className="text-sm text-gray-600">Loading dataset...</span>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="absolute left-1/2 top-20 transform -translate-x-1/2 z-40 bg-red-50 rounded-lg shadow-lg border border-red-200 px-4 py-2 flex items-center gap-2">
                    <span className="text-sm text-red-600">{error}</span>
                    <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Search Bar */}
            <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-30 w-full max-w-2xl px-4">
                <div className="relative">
                    <div className="flex items-center bg-white rounded-full shadow-lg border border-gray-200 overflow-hidden">
                        <div className="pl-5 pr-3">
                            <Search className="w-5 h-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search locations..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="flex-1 py-3 pr-4 text-sm outline-none placeholder:text-gray-400"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery("")}
                                className="px-4 text-gray-400 hover:text-gray-600"
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    {searchQuery && (
                        <div className="absolute top-full mt-2 w-full bg-white rounded-lg shadow-xl border border-gray-200 py-2 max-h-64 overflow-y-auto">
                            <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Suggestions</div>
                            {["New York City", "Population Density Layer", "Traffic Analysis", "Urban Development Zone"].map((item, index) => (
                                <button
                                    key={index}
                                    className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors flex items-center gap-3"
                                >
                                    <MapPin className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm text-gray-700">{item}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Right Controls */}
            <div className="absolute right-6 top-24 z-30 flex flex-col gap-2">
                {/* Zoom Controls */}
                <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                    <button
                        onClick={handleZoomIn}
                        className="p-3 hover:bg-gray-50 transition-colors border-b border-gray-200"
                        title="Zoom In"
                    >
                        <ZoomIn className="w-5 h-5 text-gray-700" />
                    </button>
                    <div className="px-3 py-2 text-xs font-medium text-gray-600 text-center border-b border-gray-200">
                        {Math.round(zoomLevel)}
                    </div>
                    <button
                        onClick={handleZoomOut}
                        className="p-3 hover:bg-gray-50 transition-colors"
                        title="Zoom Out"
                    >
                        <ZoomOut className="w-5 h-5 text-gray-700" />
                    </button>
                </div>

                {/* Fullscreen Toggle */}
                <button
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className="bg-white p-3 rounded-lg shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                    title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                >
                    {isFullscreen ? (
                        <Minimize2 className="w-5 h-5 text-gray-700" />
                    ) : (
                        <Maximize2 className="w-5 h-5 text-gray-700" />
                    )}
                </button>
            </div>

            {/* Analysis Panel */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-30 w-[95%] max-w-4xl">
                <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
                    <div
                        className="flex items-center justify-between px-6 py-4 bg-cyan cursor-pointer"
                        onClick={() => setIsAnalysisExpanded(!isAnalysisExpanded)}>
                        <div className="flex items-center gap-3">
                            <Activity className="w-5 h-5 text-white" />
                            <h3 className="text-lg font-semibold text-white">
                                {selectedLayer ? selectedLayer.datasetName : 'Analysis Results'}
                            </h3>
                        </div>
                        <button
                            className={`
                                text-white hover:bg-white/20 p-1 rounded transition-transform duration-500
                                ${isAnalysisExpanded ? "rotate-180" : "rotate-0"}`}>
                            <ChevronUp className="w-5 h-5" />
                        </button>
                    </div>
                    <div
                        className={`
                            overflow-hidden
                            transition-all duration-700 ease-in-out
                            ${isAnalysisExpanded
                                ? "max-h-[1000px] opacity-100 translate-y-0"
                                : "max-h-0 opacity-0 -translate-y-4"
                            }`}>
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                <StatCard
                                    icon={Database}
                                    label="Dataset"
                                    value={selectedLayer?.datasetName || 'N/A'}
                                    subtitle="Selected layer"
                                />
                                <StatCard
                                    icon={MapPin}
                                    label="Features"
                                    value={featureCount.toLocaleString()}
                                    subtitle={hasActiveFilters ? 'Filtered results' : 'Points on map'}
                                />
                                <StatCard
                                    icon={Activity}
                                    iconColor="text-earthy-green"
                                    label="Status"
                                    value={isLoading ? 'Loading...' : selectedLayer ? 'Active' : 'Ready'}
                                    subtitle={selectedLayer ? 'Dataset loaded' : 'Select a layer'}
                                />
                            </div>
                            <div className="flex gap-3">
                                <button className="flex-1 bg-primary text-white py-2.5 rounded-lg font-medium hover:opacity-80 transition-colors">
                                    Export Report
                                </button>
                                <button className="flex-1 bg-cyan text-white py-2.5 rounded-lg font-medium hover:opacity-80 transition-colors">
                                    Save Analysis
                                </button>
                                <button className="px-4 border border-gray-300 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition-colors">
                                    Share
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
