"use client";
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function ComparisonMap({ mapId, center, zoom, markers = [] }) {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);

    useEffect(() => {
        if (!mapRef.current) return;
        if (mapInstanceRef.current) return; // Already initialized

        const map = L.map(mapRef.current, {
            center: center || [24.7136, 46.6753], // Riyadh default
            zoom: zoom || 12,
            zoomControl: false,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        mapInstanceRef.current = map;

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [mapId, center, zoom]);

    useEffect(() => {
        if (!mapInstanceRef.current) return;

        const layerGroup = L.layerGroup().addTo(mapInstanceRef.current);

        markers.forEach(marker => {
            L.marker(marker.position)
                .bindPopup(marker.title)
                .addTo(layerGroup);
        });

        return () => {
            layerGroup.clearLayers();
            layerGroup.remove();
        }
    }, [markers]);

    return <div ref={mapRef} id={mapId} className="w-full h-full rounded-lg" />;
}
