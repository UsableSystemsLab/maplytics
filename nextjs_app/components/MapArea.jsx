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
    MapPin,
    Activity,
    Database,
    Upload
} from "lucide-react";
import { getDatasets, getDatasetGeoJSON, ingestDatasetFromFile } from "@/lib/datasetApi";
import { getDistrictColor, resetDistrictColors } from "@/lib/districtColors";
import StatCard from "@/components/StatCard";
import DatasetUploadModal from "@/components/DatasetUploadModal";


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
const generatePopupContent = (properties, entityType) => {
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

    let avgRating = null;
    if (properties.reviews && Array.isArray(properties.reviews) && properties.reviews.length > 0) {
        const sum = properties.reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
        avgRating = (sum / properties.reviews.length).toFixed(1);
    }

    const district = properties.district || '';
    const districtColor = getDistrictColor(district);

    let html = '<div class="p-2 max-w-xs">';

    if (primaryName) {
        html += `<h3 style="font-weight: bold; font-size: 16px; margin-bottom: 8px; color: #1f2937;">${primaryName}</h3>`;
    }

    if (district) {
        html += `<div style="display: inline-block; padding: 2px 8px; border-radius: 12px; background-color: ${districtColor}; color: white; font-size: 11px; font-weight: 500; margin-bottom: 8px;">${district}</div>`;
    }

    if (avgRating) {
        const fullStars = Math.floor(avgRating);
        const hasHalfStar = avgRating - fullStars >= 0.5;
        let starsHtml = '';
        for (let i = 0; i < 5; i++) {
            if (i < fullStars) {
                starsHtml += '★';
            } else if (i === fullStars && hasHalfStar) {
                starsHtml += '⯪';
            } else {
                starsHtml += '☆';
            }
        }
        html += `<div style="margin-bottom: 8px;"><span style="color: #f59e0b;">${starsHtml}</span> <span style="color: #6b7280; font-size: 12px;">(${avgRating}/5 from ${properties.reviews.length} reviews)</span></div>`;
    }

    html += '<div style="display: flex; flex-direction: column; gap: 2px;">';

    const priorityFields = ['cuisine', 'price_range'];
    const skipFields = [...nameFields, 'hourly_traffic_percent', 'order_completion_time_per_hour', 'reviews', 'district'];
    for (const field of priorityFields) {
        if (properties[field]) {
            const label = field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            html += `<p style="font-size: 13px;"><span style="font-weight: 500; color: #4b5563;">${label}:</span> <span style="color: #1f2937;">${properties[field]}</span></p>`;
        }
    }

    // Show other simple properties
    for (const [key, value] of Object.entries(properties)) {
        if (skipFields.includes(key) || priorityFields.includes(key)) continue;
        if (typeof value === 'object') continue;

        const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        html += `<p style="font-size: 13px;"><span style="font-weight: 500; color: #4b5563;">${label}:</span> <span style="color: #1f2937;">${value}</span></p>`;
    }
    html += '</div>';
    html += '</div>';

    return html;
};


export default function MapArea() {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(5);
    const [isAnalysisExpanded, setIsAnalysisExpanded] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    // Dataset states
    const [datasets, setDatasets] = useState([]);
    const [selectedDataset, setSelectedDataset] = useState(null);
    const [geojsonData, setGeojsonData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showDatasetPanel, setShowDatasetPanel] = useState(false);
    const [featureCount, setFeatureCount] = useState(0);
    const [uniqueDistricts, setUniqueDistricts] = useState([]);

    // Upload modal state
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadFile, setUploadFile] = useState(null);
    const [uploadFormData, setUploadFormData] = useState({
        datasetName: '',
        entityType: 'restaurant'
    });

    const mapRef = useRef(null);
    const markersLayerRef = useRef(null);
    const fileInputRef = useRef(null);
    const heatLayerRef = useRef(null);
    const districtCirclesRef = useRef(null);

    // Visualization mode: |markers|, |density|, |both|
    const [vizMode, setVizMode] = useState('both');

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
        loadDatasets();
    }, []);

    const loadDatasets = async () => {
        try {
            const result = await getDatasets();
            setDatasets(result.datasets || []);
        } catch (err) {
            console.error('Failed to load datasets:', err);
        }
    };

    const loadDatasetGeoJSON = useCallback(async (datasetId) => {
        if (!datasetId) {
            if (markersLayerRef.current) {
                markersLayerRef.current.clearLayers();
            }
            setGeojsonData(null);
            setFeatureCount(0);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const geojson = await getDatasetGeoJSON(datasetId);
            setGeojsonData(geojson);
            setFeatureCount(geojson.features?.length || 0);
            renderGeoJSON(geojson);
        } catch (err) {
            console.error('Failed to load GeoJSON:', err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const renderGeoJSON = (geojson) => {
        if (!markersLayerRef.current || !geojson?.features) return;

        resetDistrictColors();

        markersLayerRef.current.clearLayers();
        if (districtCirclesRef.current) {
            districtCirclesRef.current.clearLayers();
        } else {
            districtCirclesRef.current = L.layerGroup().addTo(mapRef.current);
        }

        const bounds = [];
        const entityType = geojson.metadata?.entity_type || 'generic';
        const districtsFound = new Set();

        const districtData = new Map();

        geojson.features.forEach(feature => {
            const geometryType = feature.geometry?.type;

            if (geometryType === 'Point') {
                const [lng, lat] = feature.geometry.coordinates;
                bounds.push([lat, lng]);

                const district = feature.properties?.district || 'Unknown';
                districtsFound.add(district);

                if (!districtData.has(district)) {
                    districtData.set(district, { points: [], count: 0 });
                }
                districtData.get(district).points.push([lat, lng]);
                districtData.get(district).count++;

                const markerColor = getDistrictColor(district);

                const marker = L.marker([lat, lng], {
                    icon: createMarkerIcon(markerColor)
                });

                const popupContent = generatePopupContent(feature.properties, entityType);
                marker.bindPopup(popupContent, {
                    maxWidth: 300,
                    className: 'custom-popup'
                });

                markersLayerRef.current.addLayer(marker);
            }
            else if (geometryType === 'Polygon' || geometryType === 'MultiPolygon') {
                const district = feature.properties?.district || feature.properties?.name || 'Unknown';
                const color = getDistrictColor(district);

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

                const popupContent = generatePopupContent(feature.properties, entityType);
                polygon.bindPopup(popupContent, {
                    maxWidth: 300,
                    className: 'custom-popup'
                });

                markersLayerRef.current.addLayer(polygon);
            }
            else if (geometryType === 'LineString' || geometryType === 'MultiLineString') {
                const district = feature.properties?.district || feature.properties?.name || 'Unknown';
                const color = getDistrictColor(district);

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

                const popupContent = generatePopupContent(feature.properties, entityType);
                polyline.bindPopup(popupContent, {
                    maxWidth: 300,
                    className: 'custom-popup'
                });

                markersLayerRef.current.addLayer(polyline);
            }
        });

        districtData.forEach((data, district) => {
            const color = getDistrictColor(district);

            const centroid = data.points.reduce(
                (acc, [lat, lng]) => [acc[0] + lat / data.count, acc[1] + lng / data.count],
                [0, 0]
            );

            let maxDist = 0;
            data.points.forEach(([lat, lng]) => {
                const dist = Math.sqrt(
                    Math.pow(lat - centroid[0], 2) + Math.pow(lng - centroid[1], 2)
                );
                maxDist = Math.max(maxDist, dist);
            });
            const radiusMeters = Math.max(maxDist * 111000 * 1.5, 500);

            const circle = L.circle(centroid, {
                radius: radiusMeters,
                color: color,
                fillColor: color,
                fillOpacity: 0.25,
                weight: 2,
                opacity: 0.7
            });

            circle.bindTooltip(`<strong>${district}</strong><br/>${data.count} locations`, {
                permanent: false,
                direction: 'center'
            });

            districtCirclesRef.current.addLayer(circle);
        });

        setUniqueDistricts(Array.from(districtsFound));

        if (bounds.length > 0 && mapRef.current) {
            mapRef.current.fitBounds(bounds, { padding: [50, 50] });
        }
    };

    const handleDatasetSelect = (dataset) => {
        setSelectedDataset(dataset);
        setShowDatasetPanel(false);
        loadDatasetGeoJSON(dataset?.dataset_id);
    };

    const handleFileUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setUploadFile(file);
        setUploadFormData({
            datasetName: file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '),
            entityType: 'restaurant'
        });
        setShowUploadModal(true);
        setShowDatasetPanel(false);

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleUploadSubmit = async (e, forceOverride = false) => {
        e?.preventDefault();
        if (!uploadFile || !uploadFormData.datasetName) return;

        setIsLoading(true);
        setError(null);

        try {
            const result = await ingestDatasetFromFile(
                uploadFile,
                uploadFormData.datasetName,
                uploadFormData.entityType,
                forceOverride
            );
            setShowUploadModal(false);
            await loadDatasets();
            loadDatasetGeoJSON(result.dataset_id);
            setSelectedDataset({
                dataset_id: result.dataset_id,
                dataset_name: uploadFormData.datasetName
            });
            setUploadFile(null);
        } catch (err) {
            console.error('Failed to upload dataset:', err);

            if (err.isConflict) {
                const confirmReplace = window.confirm(
                    `A dataset named "${uploadFormData.datasetName}" already exists ` +
                    `(${err.existingDataset?.feature_count || 0} features).\n\n` +
                    `Do you want to replace it with the new data?`
                );

                if (confirmReplace) {
                    handleUploadSubmit(null, true);
                    return;
                } else {
                    setError('Please choose a different name or click "Replace" to override.');
                }
            } else {
                setError(err.message);
                setShowUploadModal(false);
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="relative w-full h-full bg-gray-100">
            <div className="absolute inset-0 z-0">
                <div id="map" className="h-full w-full" />
            </div>

            {/* District Legend & Visualization Controls */}
            {uniqueDistricts.length > 0 && (
                <div className="absolute left-6 top-24 z-30 bg-white rounded-lg shadow-lg border border-gray-200 p-3 max-w-[200px]">
                    <h4 className="text-xs font-semibold text-gray-600 uppercase mb-2">Districts</h4>
                    <div className="space-y-1.5 mb-3">
                        {uniqueDistricts.map(district => (
                            <div key={district} className="flex items-center gap-2">
                                <div
                                    className="w-3 h-3 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: getDistrictColor(district) }}
                                />
                                <span className="text-sm text-gray-700 truncate">{district}</span>
                            </div>
                        ))}
                    </div>

                    {/* Visualization Toggle */}
                    <div className="border-t border-gray-200 pt-2">
                        <h4 className="text-xs font-semibold text-gray-600 uppercase mb-2">View Mode</h4>
                        <div className="flex flex-col gap-1">
                            <button
                                onClick={() => {
                                    if (markersLayerRef.current) {
                                        mapRef.current.addLayer(markersLayerRef.current);
                                    }
                                    if (districtCirclesRef.current) {
                                        mapRef.current.removeLayer(districtCirclesRef.current);
                                    }
                                    setVizMode('markers');
                                }}
                                className={`text-xs px-2 py-1.5 rounded transition-colors ${vizMode === 'markers'
                                    ? 'bg-primary text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                📍 Markers Only
                            </button>
                            <button
                                onClick={() => {
                                    if (markersLayerRef.current) {
                                        mapRef.current.removeLayer(markersLayerRef.current);
                                    }
                                    if (districtCirclesRef.current) {
                                        mapRef.current.addLayer(districtCirclesRef.current);
                                    }
                                    setVizMode('density');
                                }}
                                className={`text-xs px-2 py-1.5 rounded transition-colors ${vizMode === 'density'
                                    ? 'bg-primary text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                🎨 Density Only
                            </button>
                            <button
                                onClick={() => {
                                    if (markersLayerRef.current) {
                                        mapRef.current.addLayer(markersLayerRef.current);
                                    }
                                    if (districtCirclesRef.current) {
                                        mapRef.current.addLayer(districtCirclesRef.current);
                                    }
                                    setVizMode('both');
                                }}
                                className={`text-xs px-2 py-1.5 rounded transition-colors ${vizMode === 'both'
                                    ? 'bg-primary text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                📍🎨 Both
                            </button>
                        </div>
                    </div>
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

                {/* Dataset Selector */}
                <div className="relative">
                    <button
                        onClick={() => setShowDatasetPanel(!showDatasetPanel)}
                        className={`bg-white p-3 rounded-lg shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors ${selectedDataset ? 'ring-2 ring-[#2C3580]' : ''}`}
                        title="Datasets"
                    >
                        <Database className="w-5 h-5 text-gray-700" />
                    </button>

                    {showDatasetPanel && (
                        <>
                            <div
                                className="fixed inset-0 z-10"
                                onClick={() => setShowDatasetPanel(false)}
                            ></div>
                            <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-200 py-3 z-20">
                                <div className="px-4 pb-2 mb-2 border-b border-gray-200 flex items-center justify-between">
                                    <h3 className="text-sm font-semibold text-gray-900">Datasets</h3>
                                    <label className="cursor-pointer">
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept=".json"
                                            onChange={handleFileUpload}
                                            className="hidden"
                                        />
                                        <div className="flex items-center gap-1 text-xs text-[#2C3580] hover:underline">
                                            <Upload className="w-3 h-3" />
                                            Upload
                                        </div>
                                    </label>
                                </div>

                                {isLoading && (
                                    <div className="px-4 py-2 text-sm text-gray-500">Loading...</div>
                                )}

                                {error && (
                                    <div className="px-4 py-2 text-sm text-red-500">{error}</div>
                                )}

                                <div className="max-h-64 overflow-y-auto">
                                    {/* Clear selection option */}
                                    <button
                                        onClick={() => handleDatasetSelect(null)}
                                        className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors flex items-center gap-3 ${!selectedDataset ? 'bg-gray-100' : ''}`}
                                    >
                                        <span className="text-sm text-gray-500 italic">No dataset selected</span>
                                    </button>

                                    {datasets.map((dataset) => (
                                        <button
                                            key={dataset.dataset_id}
                                            onClick={() => handleDatasetSelect(dataset)}
                                            className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${selectedDataset?.dataset_id === dataset.dataset_id ? 'bg-blue-50 border-l-2 border-[#2C3580]' : ''}`}
                                        >
                                            <div className="text-sm font-medium text-gray-700">{dataset.dataset_name}</div>
                                            <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                                                <span className="capitalize">{dataset.entity_type}</span>
                                                <span>•</span>
                                                <span>{dataset.feature_count} features</span>
                                            </div>
                                        </button>
                                    ))}

                                    {datasets.length === 0 && !isLoading && (
                                        <div className="px-4 py-4 text-sm text-gray-500 text-center">
                                            No datasets available.<br />
                                            <span className="text-xs">Upload a JSON file to get started.</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
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
                                {selectedDataset ? selectedDataset.dataset_name : 'Analysis Results'}
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
                                    label="Entity Type"
                                    value={geojsonData?.metadata?.entity_type || 'N/A'}
                                    subtitle="Dataset category"
                                />
                                <StatCard
                                    icon={MapPin}
                                    label="Features"
                                    value={featureCount.toLocaleString()}
                                    subtitle="Points on map"
                                />
                                <StatCard
                                    icon={Activity}
                                    iconColor="text-earthy-green"
                                    label="Status"
                                    value={isLoading ? 'Loading...' : selectedDataset ? 'Active' : 'Ready'}
                                    subtitle={selectedDataset ? 'Dataset loaded' : 'Select a dataset'}
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
            
            {/* Upload Modal */}
            <DatasetUploadModal
                isOpen={showUploadModal}
                onClose={() => {
                    setShowUploadModal(false);
                    setUploadFile(null);
                }}
                onSubmit={(datasetName, entityType, forceOverride) => {
                    setUploadFormData({ datasetName, entityType });
                    handleUploadSubmit(null, forceOverride);
                }}
                fileName={uploadFile?.name}
                defaultDatasetName={uploadFormData.datasetName}
                defaultEntityType={uploadFormData.entityType}
                isLoading={isLoading}
                error={error}
            />
        </div>
    );
}