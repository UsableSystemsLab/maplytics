"use client";
import { useState, useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
    Search,
    ZoomIn,
    ZoomOut,
    Layers,
    Maximize2,
    Minimize2,
    ChevronDown,
    ChevronUp,
    MapPin,
    TrendingUp,
    Activity
} from "lucide-react";

export default function MapArea() {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(12);
    const [showLayersPanel, setShowLayersPanel] = useState(false);
    const [isAnalysisExpanded, setIsAnalysisExpanded] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    const handleZoomIn = () => setZoomLevel(Math.min(zoomLevel + 1, 20));
    const handleZoomOut = () => setZoomLevel(Math.max(zoomLevel - 1, 1));
    const mapRef = useRef(null);

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
            maxBoundsViscosity: 1.0, // strong resistance at edges
        }).setView([23.8859, 45.0792], 5);
        mapRef.current = map;
        L.tileLayer('https://api.maptiler.com/maps/streets-v4/256/{z}/{x}/{y}.png?key=RiFdBckUhPkjpd0WA65S', {
            attribution: '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a>' +
                '<a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>'
        }
        ).addTo(map);
    }, []);
    return (
        <div className="relative w-full h-full bg-gray-100">
            <div className="fixed inset-0 z-0">
                <div id="map" className="h-full w-full" />
            </div>

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


            <div className="absolute right-6 top-24 z-30 flex flex-col gap-2">
                <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                    <button
                        onClick={handleZoomIn}
                        className="p-3 hover:bg-gray-50 transition-colors border-b border-gray-200"
                        title="Zoom In"
                    >
                        <ZoomIn className="w-5 h-5 text-gray-700" />
                    </button>
                    <div className="px-3 py-2 text-xs font-medium text-gray-600 text-center border-b border-gray-200">
                        {zoomLevel}
                    </div>
                    <button
                        onClick={handleZoomOut}
                        className="p-3 hover:bg-gray-50 transition-colors"
                        title="Zoom Out"
                    >
                        <ZoomOut className="w-5 h-5 text-gray-700" />
                    </button>
                </div>

                <div className="relative">
                    <button
                        onClick={() => setShowLayersPanel(!showLayersPanel)}
                        className="bg-white p-3 rounded-lg shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                        title="Layers"
                    >
                        <Layers className="w-5 h-5 text-gray-700" />
                    </button>

                    {showLayersPanel && (
                        <>
                            <div
                                className="fixed inset-0 z-10"
                                onClick={() => setShowLayersPanel(false)}
                            ></div>
                            <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-3 z-20">
                                <div className="px-4 pb-2 mb-2 border-b border-gray-200">
                                    <h3 className="text-sm font-semibold text-gray-900">Map Layers</h3>
                                </div>
                                <div className="space-y-1 px-2">
                                    {[
                                        { name: "Base Map", active: true },
                                        { name: "Traffic", active: false },
                                        { name: "Terrain", active: false },
                                        { name: "Street Names", active: true },
                                        { name: "POI Labels", active: true }
                                    ].map((layer, index) => (
                                        <button
                                            key={index}
                                            className="w-full flex items-center justify-between px-3 py-2 rounded hover:bg-gray-50 transition-colors"
                                        >
                                            <span className="text-sm text-gray-700">{layer.name}</span>
                                            <div className={`w-10 h-5 rounded-full transition-colors ${layer.active ? 'bg-[#2C3580]' : 'bg-gray-300'}`}>
                                                <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${layer.active ? 'translate-x-5' : 'translate-x-0.5'} mt-0.5`}></div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>

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

            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-30 w-full max-w-4xl px-4 transition-all ease-in-out duration-700">
                <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
                    <div
                        className="flex items-center justify-between px-6 py-4 bg-cyan cursor-pointer"
                        onClick={() => setIsAnalysisExpanded(!isAnalysisExpanded)}>
                        <div className="flex items-center gap-3">
                            <Activity className="w-5 h-5 text-white" />
                            <h3 className="text-lg font-semibold text-white">Analysis Results</h3>
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
                                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                    <div className="flex items-center gap-2 mb-2">
                                        <TrendingUp className="w-4 h-4 text-earthy-green" />
                                        <span className="text-xs font-medium text-gray-600 uppercase">Growth Rate</span>
                                    </div>
                                    <p className="text-2xl font-bold text-gray-900">+12.5%</p>
                                    <p className="text-xs text-gray-500 mt-1">Year over year</p>
                                </div>

                                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                    <div className="flex items-center gap-2 mb-2">
                                        <MapPin className="w-4 h-4 text-[#2C3580]" />
                                        <span className="text-xs font-medium text-gray-600 uppercase">Area Coverage</span>
                                    </div>
                                    <p className="text-2xl font-bold text-gray-900">24.3 km²</p>
                                    <p className="text-xs text-gray-500 mt-1">Total analyzed</p>
                                </div>

                                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Activity className="w-4 h-4 text-earthy-green" />
                                        <span className="text-xs font-medium text-gray-600 uppercase">Data Points</span>
                                    </div>
                                    <p className="text-2xl font-bold text-gray-900">1,247</p>
                                    <p className="text-xs text-gray-500 mt-1">Active markers</p>
                                </div>
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
