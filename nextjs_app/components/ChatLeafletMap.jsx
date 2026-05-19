"use client";
import { useEffect, useRef } from "react";

export default function ChatLeafletMap({ geojson, className = "" }) {
    const mapRef = useRef(null);
    const mapInstance = useRef(null);
    const geojsonLayer = useRef(null);

    useEffect(() => {
        // Only run on client
        if (typeof window === "undefined") return;
        
        // Dynamically import leaflet to avoid SSR issues
        import("leaflet").then((L) => {
            if (!mapInstance.current && mapRef.current) {
                // Initialize map
                mapInstance.current = L.map(mapRef.current, {
                    center: [24.7136, 46.6753], // Default Saudi Arabia center roughly
                    zoom: 5,
                    zoomControl: true,
                });

                // Add CartoDB Positron (white theme)
                L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
                    attribution: '&copy; <a href="https://carto.com/">CARTO</a>'
                }).addTo(mapInstance.current);
                
                // Add leaflet css if not already present
                if (!document.getElementById("leaflet-css")) {
                    const link = document.createElement("link");
                    link.id = "leaflet-css";
                    link.rel = "stylesheet";
                    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
                    document.head.appendChild(link);
                }
            }
        });

        return () => {
            if (mapInstance.current) {
                mapInstance.current.remove();
                mapInstance.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (!geojson || typeof window === "undefined") return;
        
        import("leaflet").then((L) => {
            // Give the map a moment to initialize if it hasn't already
            if (!mapInstance.current) return;

            if (geojsonLayer.current) {
                mapInstance.current.removeLayer(geojsonLayer.current);
            }

            geojsonLayer.current = L.geoJSON(geojson, {
                pointToLayer: (feature, latlng) => {
                    return L.circleMarker(latlng, {
                        radius: 6,
                        fillColor: "#2C3580", // Theme primary color
                        color: "#ffffff",
                        weight: 2,
                        opacity: 1,
                        fillOpacity: 0.8
                    });
                },
                onEachFeature: (feature, layer) => {
                    if (feature.properties) {
                        let popupContent = "<div class='text-sm font-sans p-1'>";
                        
                        const name = feature.properties.name || feature.properties["name:en"] || feature.properties["name:ar"];
                        if (name) popupContent += `<strong class='block mb-1 text-base'>${name}</strong>`;
                        
                        const type = feature.properties.amenity || feature.properties.shop || feature.properties.osm_type;
                        if (type) {
                            popupContent += `<span class='text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full uppercase tracking-wider font-semibold'>${type}</span>`;
                        }
                        
                        popupContent += "</div>";
                        layer.bindPopup(popupContent);
                    }
                }
            }).addTo(mapInstance.current);

            // Fit bounds
            if (geojsonLayer.current.getLayers().length > 0) {
                mapInstance.current.fitBounds(geojsonLayer.current.getBounds(), { padding: [50, 50] });
            }
        });
    }, [geojson]);

    return (
        <div ref={mapRef} className={`w-full h-full z-0 ${className}`}></div>
    );
}
