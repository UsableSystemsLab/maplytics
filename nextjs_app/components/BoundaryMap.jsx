"use client";
import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getDistrictColor } from "@/lib/districtColors";

const generatePopupContent = (properties) => {
    if (!properties || Object.keys(properties).length === 0) {
        return '<p style="color: #6b7280;">No properties available</p>';
    }

    const nameFields = ['name', 'name_ar', 'title', 'label'];
    let primaryName = '';
    for (const field of nameFields) {
        if (properties[field]) {
            primaryName = properties[field];
            break;
        }
    }

    let html = '<div style="padding: 8px; max-width: 250px;">';

    if (primaryName) {
        html += `<h3 style="font-weight: bold; font-size: 16px; margin-bottom: 8px; color: #1f2937;">${primaryName}</h3>`;
    }

    html += '<div style="display: flex; flex-direction: column; gap: 2px;">';

    for (const [key, value] of Object.entries(properties)) {
        if (nameFields.includes(key)) continue;
        if (typeof value === 'object') continue;

        const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        html += `<p style="font-size: 13px; margin: 0;"><span style="font-weight: 500; color: #4b5563;">${label}:</span> <span style="color: #1f2937;">${value}</span></p>`;
    }
    html += '</div></div>';

    return html;
};

const BoundaryMap = forwardRef(function BoundaryMap({
    geojson,
    className = "w-full h-full",
    center = [23.8859, 45.0792],
    zoom = 6,
    fitBounds: shouldFitBounds = true,
    onFeatureClick,
    colorBy,
    getFeatureColor,
    fillOpacity = 0.3,
    showZoomControl = true,
    onZoomChange,
}, ref) {
    const containerRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const layerGroupRef = useRef(null);
    const onZoomChangeRef = useRef(onZoomChange);
    onZoomChangeRef.current = onZoomChange;

    useImperativeHandle(ref, () => ({
        zoomIn: () => mapInstanceRef.current?.zoomIn(),
        zoomOut: () => mapInstanceRef.current?.zoomOut(),
        getZoom: () => mapInstanceRef.current?.getZoom(),
    }));

    // Initialize map
    useEffect(() => {
        if (!containerRef.current || mapInstanceRef.current) return;

        const map = L.map(containerRef.current, {
            center,
            zoom,
            zoomControl: false,
            minZoom: 3,
            maxZoom: 18,
        });

        L.tileLayer('https://api.maptiler.com/maps/streets-v4/256/{z}/{x}/{y}.png?key=RiFdBckUhPkjpd0WA65S', {
            attribution: '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> ' +
                '<a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>'
        }).addTo(map);

        if (showZoomControl) {
            L.control.zoom({ position: 'topright' }).addTo(map);
        }

        map.on('zoomend', () => {
            onZoomChangeRef.current?.(map.getZoom());
        });

        mapInstanceRef.current = map;
        layerGroupRef.current = L.layerGroup().addTo(map);

        return () => {
            map.remove();
            mapInstanceRef.current = null;
            layerGroupRef.current = null;
        };
    }, []);

    // Render GeoJSON when it changes
    useEffect(() => {
        const map = mapInstanceRef.current;
        const layerGroup = layerGroupRef.current;
        if (!map || !layerGroup) return;

        layerGroup.clearLayers();

        if (!geojson?.features?.length) return;

        const bounds = [];

        geojson.features.forEach((feature) => {
            const geometry = feature.geometry;
            if (!geometry) return;

            const { type, coordinates } = geometry;
            let color;
            if (getFeatureColor) {
                color = getFeatureColor(feature);
            } else {
                const colorKey = colorBy
                    ? (feature.properties?.[colorBy] || 'Unknown')
                    : (feature.properties?.name || feature.properties?.name_ar || feature.properties?.title || 'Unknown');
                color = getDistrictColor(colorKey);
            }

            if (type === 'Polygon' || type === 'MultiPolygon') {
                const coordsToLatLng = (coords) =>
                    coords.map((ring) => ring.map(([lng, lat]) => [lat, lng]));

                let polygonCoords;
                if (type === 'Polygon') {
                    polygonCoords = coordsToLatLng(coordinates);
                    coordinates[0].forEach(([lng, lat]) => bounds.push([lat, lng]));
                } else {
                    polygonCoords = coordinates.map((poly) => coordsToLatLng(poly));
                    coordinates.forEach((poly) =>
                        poly[0].forEach(([lng, lat]) => bounds.push([lat, lng]))
                    );
                }

                const polygon = L.polygon(polygonCoords, {
                    color,
                    weight: 2,
                    fillColor: color,
                    fillOpacity,
                });

                polygon.bindPopup(generatePopupContent(feature.properties), {
                    maxWidth: 300,
                });

                if (onFeatureClick) {
                    polygon.on('click', () => onFeatureClick(feature));
                }

                layerGroup.addLayer(polygon);
            } else if (type === 'Point') {
                const [lng, lat] = coordinates;
                bounds.push([lat, lng]);

                const circle = L.circleMarker([lat, lng], {
                    radius: 7,
                    color,
                    fillColor: color,
                    fillOpacity: 0.6,
                    weight: 2,
                });

                circle.bindPopup(generatePopupContent(feature.properties), {
                    maxWidth: 300,
                });

                if (onFeatureClick) {
                    circle.on('click', () => onFeatureClick(feature));
                }

                layerGroup.addLayer(circle);
            } else if (type === 'LineString' || type === 'MultiLineString') {
                let lineCoords;
                if (type === 'LineString') {
                    lineCoords = coordinates.map(([lng, lat]) => [lat, lng]);
                    coordinates.forEach(([lng, lat]) => bounds.push([lat, lng]));
                } else {
                    lineCoords = coordinates.map((line) =>
                        line.map(([lng, lat]) => [lat, lng])
                    );
                    coordinates.forEach((line) =>
                        line.forEach(([lng, lat]) => bounds.push([lat, lng]))
                    );
                }

                const polyline = L.polyline(lineCoords, {
                    color,
                    weight: 3,
                    opacity: 0.8,
                });

                polyline.bindPopup(generatePopupContent(feature.properties), {
                    maxWidth: 300,
                });

                if (onFeatureClick) {
                    polyline.on('click', () => onFeatureClick(feature));
                }

                layerGroup.addLayer(polyline);
            }
        });

        if (shouldFitBounds && bounds.length > 0) {
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [geojson, shouldFitBounds, onFeatureClick, colorBy, getFeatureColor, fillOpacity]);

    return <div ref={containerRef} className={className} />;
});

export default BoundaryMap;
