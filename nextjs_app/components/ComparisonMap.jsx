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

export default function ComparisonMap({
    mapId,
    center,
    zoom,
    markers = [],
    boundaryGeoJSON = null,
    featurePoints = null,
    color = '#2563eb',
}) {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const boundaryLayerRef = useRef(null);
    const pointsLayerRef = useRef(null);
    const initialCenterRef = useRef(center);
    const initialZoomRef = useRef(zoom);
    const colorRef = useRef(color);
    colorRef.current = color;

    // Initialize map (only once per mapId)
    useEffect(() => {
        if (!mapRef.current) return;
        if (mapInstanceRef.current) return;

        const map = L.map(mapRef.current, {
            center: initialCenterRef.current || [24.7136, 46.6753],
            zoom: initialZoomRef.current || 12,
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
    }, [mapId]);

    // Render simple markers
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

    // Render district boundary polygon
    useEffect(() => {
        if (!mapInstanceRef.current) return;

        if (boundaryLayerRef.current) {
            boundaryLayerRef.current.remove();
            boundaryLayerRef.current = null;
        }

        if (!boundaryGeoJSON) return;

        try {
            const c = colorRef.current;
            const layer = L.geoJSON(boundaryGeoJSON, {
                style: {
                    color: c,
                    weight: 3,
                    fillColor: c,
                    fillOpacity: 0.12,
                },
            }).addTo(mapInstanceRef.current);

            boundaryLayerRef.current = layer;

            const bounds = layer.getBounds();
            if (bounds.isValid()) {
                mapInstanceRef.current.fitBounds(bounds, { padding: [30, 30] });
            }
        } catch (err) {
            console.error(`[ComparisonMap:${mapId}] Error rendering boundary:`, err);
        }

        return () => {
            if (boundaryLayerRef.current) {
                boundaryLayerRef.current.remove();
                boundaryLayerRef.current = null;
            }
        };
    }, [boundaryGeoJSON, mapId]);

    // Render feature points as circle markers
    useEffect(() => {
        if (!mapInstanceRef.current) return;

        if (pointsLayerRef.current) {
            pointsLayerRef.current.remove();
            pointsLayerRef.current = null;
        }

        if (!featurePoints?.features?.length) return;

        try {
            const pc = colorRef.current;
            const layer = L.geoJSON(featurePoints, {
                pointToLayer: (_feature, latlng) => {
                    return L.circleMarker(latlng, {
                        radius: 6,
                        fillColor: pc,
                        color: '#fff',
                        weight: 2,
                        fillOpacity: 0.8,
                    });
                },
                onEachFeature: (feature, layer) => {
                    if (feature.properties) {
                        const entries = Object.entries(feature.properties).slice(0, 5);
                        const content = entries.map(([k, v]) => `<b>${k}:</b> ${v}`).join('<br>');
                        layer.bindPopup(content);
                    }
                },
            }).addTo(mapInstanceRef.current);

            pointsLayerRef.current = layer;

            if (!boundaryGeoJSON) {
                const bounds = layer.getBounds();
                if (bounds.isValid()) {
                    mapInstanceRef.current.fitBounds(bounds, { padding: [30, 30] });
                }
            }
        } catch (err) {
            console.error(`[ComparisonMap:${mapId}] Error rendering points:`, err);
        }

        return () => {
            if (pointsLayerRef.current) {
                pointsLayerRef.current.remove();
                pointsLayerRef.current = null;
            }
        };
    }, [featurePoints, mapId, boundaryGeoJSON]);

    return <div ref={mapRef} id={mapId} className="w-full h-full rounded-lg" />;
}
