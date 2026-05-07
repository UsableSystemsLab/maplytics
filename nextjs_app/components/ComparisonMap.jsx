"use client";
import { useCallback, useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

const MARKER_BASE_RADIUS = 9;
const MARKER_HIGHLIGHT_RADIUS = 13;
const MARKER_DIM_RADIUS = 6;

export default function ComparisonMap({
    mapId,
    center,
    zoom,
    markers = [],
    boundaryGeoJSON = null,
    featurePoints = null,
    color = '#2563eb',
    highlightedComparisonValue = null,
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

        const invalidate = () => map.invalidateSize?.();
        const raf = requestAnimationFrame(invalidate);
        const t1 = setTimeout(invalidate, 120);
        const t2 = setTimeout(invalidate, 400);
        window.addEventListener("resize", invalidate);

        return () => {
            cancelAnimationFrame(raf);
            clearTimeout(t1);
            clearTimeout(t2);
            window.removeEventListener("resize", invalidate);
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
                .bindPopup(escapeHtml(marker.title))
                .addTo(layerGroup);
        });

        return () => {
            layerGroup.clearLayers();
            layerGroup.remove();
        }
    }, [markers]);

    const fitRenderedBounds = useCallback(() => {
        const map = mapInstanceRef.current;
        if (!map) return;

        const boundsSources = [boundaryLayerRef.current, pointsLayerRef.current].filter(Boolean);
        const validBounds = boundsSources
            .map((layer) => layer.getBounds?.())
            .filter((bounds) => bounds?.isValid?.());

        if (validBounds.length === 0) return;

        const combined = validBounds.slice(1).reduce(
            (bounds, nextBounds) => bounds.extend(nextBounds),
            validBounds[0],
        );

        map.fitBounds(combined, { padding: [30, 30] });
        setTimeout(() => map.invalidateSize?.(), 0);
    }, []);

    // Render district boundary polygon (uses per-feature stroke/fill if present, else fallback color)
    useEffect(() => {
        if (!mapInstanceRef.current) return;

        if (boundaryLayerRef.current) {
            boundaryLayerRef.current.remove();
            boundaryLayerRef.current = null;
        }

        if (!boundaryGeoJSON?.features?.length) return;

        try {
            const fallback = colorRef.current;
            const layer = L.geoJSON(boundaryGeoJSON, {
                style: (feature) => ({
                    color: feature?.properties?.strokeColor || fallback,
                    weight: 3,
                    fillColor: feature?.properties?.fillColor || fallback,
                    fillOpacity: 0.12,
                }),
            }).addTo(mapInstanceRef.current);

            boundaryLayerRef.current = layer;

            fitRenderedBounds();
        } catch (err) {
            console.error(`[ComparisonMap:${mapId}] Error rendering boundary:`, err);
        }

        return () => {
            if (boundaryLayerRef.current) {
                boundaryLayerRef.current.remove();
                boundaryLayerRef.current = null;
            }
        };
    }, [boundaryGeoJSON, mapId, fitRenderedBounds]);

    // Render feature points as circle markers (uses per-feature markerColor if present)
    useEffect(() => {
        if (!mapInstanceRef.current) return;

        if (pointsLayerRef.current) {
            pointsLayerRef.current.remove();
            pointsLayerRef.current = null;
        }

        if (!featurePoints?.features?.length) return;

        try {
            const fallback = colorRef.current;
            const layer = L.geoJSON(featurePoints, {
                pointToLayer: (feature, latlng) => {
                    const fill = feature?.properties?.markerColor || fallback;
                    return L.circleMarker(latlng, {
                        radius: MARKER_BASE_RADIUS,
                        fillColor: fill,
                        color: '#fff',
                        weight: 2,
                        fillOpacity: 0.9,
                    });
                },
                onEachFeature: (feature, layer) => {
                    if (feature.properties) {
                        const skip = new Set([
                            "comparisonRole",
                            "comparisonSide",
                            "comparisonField",
                            "comparisonValue",
                            "markerColor",
                            "strokeColor",
                            "fillColor",
                            "districtId",
                        ]);
                        const rows = [];
                        if (feature.properties.districtName) {
                            rows.push(["District", feature.properties.districtName]);
                        }
                        for (const [k, v] of Object.entries(feature.properties)) {
                            if (rows.length >= 6) break;
                            if (skip.has(k) || v === null || v === undefined || v === "" || typeof v === "object") continue;
                            rows.push([k, v]);
                        }
                        const html = rows
                            .map(([k, v]) => `<b>${escapeHtml(k)}:</b> ${escapeHtml(v)}`)
                            .join("<br>");
                        layer.bindPopup(html);
                    }
                },
            }).addTo(mapInstanceRef.current);

            pointsLayerRef.current = layer;

            fitRenderedBounds();
        } catch (err) {
            console.error(`[ComparisonMap:${mapId}] Error rendering points:`, err);
        }

        return () => {
            if (pointsLayerRef.current) {
                pointsLayerRef.current.remove();
                pointsLayerRef.current = null;
            }
        };
    }, [featurePoints, mapId, boundaryGeoJSON, fitRenderedBounds]);

    useEffect(() => {
        const pointsLayer = pointsLayerRef.current;
        if (!pointsLayer) return;

        const target = highlightedComparisonValue;
        const hasTarget = target !== null && target !== undefined;

        pointsLayer.eachLayer((marker) => {
            if (typeof marker.setStyle !== "function") return;
            const value = marker.feature?.properties?.comparisonValue;
            const isMatch = !hasTarget || value === target;

            const radius = !hasTarget
                ? MARKER_BASE_RADIUS
                : isMatch
                    ? MARKER_HIGHLIGHT_RADIUS
                    : MARKER_DIM_RADIUS;
            const fillOpacity = !hasTarget ? 0.9 : isMatch ? 1 : 0.25;
            const weight = !hasTarget ? 2 : isMatch ? 2.5 : 1;

            marker.setStyle({ fillOpacity, weight });
            if (typeof marker.setRadius === "function") {
                marker.setRadius(radius);
            }
        });
    }, [highlightedComparisonValue, featurePoints]);

    return <div ref={mapRef} id={mapId} className="h-full w-full" />;
}
