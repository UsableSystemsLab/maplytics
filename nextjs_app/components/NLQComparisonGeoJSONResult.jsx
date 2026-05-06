"use client";

import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatLabel(value) {
    if (!value) return "N/A";
    return String(value).replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function featureCollection(features) {
    return { type: "FeatureCollection", features: features.filter(Boolean) };
}

function popupContent(feature, comparisonField) {
    const props = feature.properties || {};
    const preferred = ["name", "title", "rating", "reviews", "category", "sentiment", "type", "status"];
    const rows = [];

    rows.push(["District", props.districtName]);
    if (comparisonField) {
        rows.push([formatLabel(comparisonField), props.comparisonValue ?? "Unknown"]);
    }

    for (const key of preferred) {
        if (props[key] !== undefined && props[key] !== null && props[key] !== "") {
            rows.push([formatLabel(key), props[key]]);
        }
    }

    for (const [key, value] of Object.entries(props)) {
        if (rows.length >= 8) break;
        if (
            key.startsWith("comparison") ||
            ["markerColor", "strokeColor", "fillColor", "districtId", "districtName"].includes(key) ||
            preferred.includes(key) ||
            value === undefined ||
            value === null ||
            typeof value === "object"
        ) {
            continue;
        }
        rows.push([formatLabel(key), value]);
    }

    return `
        <div style="min-width: 180px; max-width: 260px;">
            ${rows.map(([key, value]) => `
                <div style="font-size: 12px; margin: 2px 0;">
                    <strong>${escapeHtml(key)}:</strong> ${escapeHtml(value)}
                </div>
            `).join("")}
        </div>
    `;
}

function MiniComparisonMap({ title, side, boundaryFeatures, datasetFeatures, fallbackColor, comparisonField }) {
    const containerRef = useRef(null);
    const mapRef = useRef(null);
    const layerRef = useRef(null);

    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;

        const map = L.map(containerRef.current, {
            center: [24.7136, 46.6753],
            zoom: 12,
            zoomControl: true,
            attributionControl: false,
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "&copy; OpenStreetMap contributors",
        }).addTo(map);

        mapRef.current = map;

        return () => {
            map.remove();
            mapRef.current = null;
        };
    }, []);

    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        if (layerRef.current) {
            layerRef.current.remove();
            layerRef.current = null;
        }

        const group = L.layerGroup().addTo(map);
        const boundaryLayer = L.geoJSON(featureCollection(boundaryFeatures), {
            style: (feature) => ({
                color: feature.properties?.strokeColor || fallbackColor,
                weight: 3,
                fillColor: feature.properties?.fillColor || fallbackColor,
                fillOpacity: 0.12,
            }),
        }).addTo(group);

        const dataLayer = L.geoJSON(featureCollection(datasetFeatures), {
            pointToLayer: (feature, latlng) => L.circleMarker(latlng, {
                radius: 7,
                color: "#ffffff",
                weight: 2,
                fillColor: feature.properties?.markerColor || fallbackColor,
                fillOpacity: 0.9,
            }),
            style: (feature) => ({
                color: feature.properties?.markerColor || fallbackColor,
                weight: 3,
                fillColor: feature.properties?.markerColor || fallbackColor,
                fillOpacity: 0.55,
            }),
            onEachFeature: (feature, layer) => {
                layer.bindPopup(popupContent(feature, comparisonField));
            },
        }).addTo(group);

        layerRef.current = group;

        const bounds = L.featureGroup([
            ...boundaryLayer.getLayers(),
            ...dataLayer.getLayers(),
        ]).getBounds();

        if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [28, 28] });
        }

        setTimeout(() => map.invalidateSize(), 0);

        return () => {
            group.remove();
        };
    }, [boundaryFeatures, datasetFeatures, fallbackColor, comparisonField]);

    return (
        <div className="border rounded-lg overflow-hidden bg-white">
            <div className="px-3 py-2 border-b flex items-center justify-between">
                <div className="font-semibold text-sm text-gray-800 truncate">{title}</div>
                <span className="text-[11px] text-gray-500">{datasetFeatures.length} features</span>
            </div>
            <div ref={containerRef} id={`nlq-comparison-map-${side}`} className="h-80 w-full" />
        </div>
    );
}

export default function NLQComparisonGeoJSONResult({ geojson }) {
    const meta = geojson?.properties || {};
    const features = geojson?.features || [];
    const comparisonField = meta.comparisonField;

    const split = useMemo(() => {
        const by = (side, role) => features.filter(
            (feature) => feature.properties?.comparisonSide === side &&
                feature.properties?.comparisonRole === role,
        );

        return {
            boundaryA: by("A", "district-boundary"),
            boundaryB: by("B", "district-boundary"),
            featuresA: by("A", "dataset-feature"),
            featuresB: by("B", "dataset-feature"),
        };
    }, [features]);

    if (!geojson || geojson.type !== "FeatureCollection") return null;

    const districtA = meta.districtA || {};
    const districtB = meta.districtB || {};
    const metrics = meta.metrics || {};

    return (
        <section className="mt-5 border rounded-lg bg-white overflow-hidden">
            <div className="px-4 py-3 border-b">
                <h3 className="text-base font-semibold text-gray-900">{meta.query || "Comparison result"}</h3>
                <p className="text-xs text-gray-500 mt-1">
                    Dataset: <span className="font-medium">{meta.dataset?.name || "N/A"}</span>
                </p>
            </div>

            <div className="p-4 space-y-4">
                {meta.messages?.length > 0 && (
                    <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                        {meta.messages.join(" ")}
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="rounded border bg-gray-50 p-3">
                        <div className="text-xs text-gray-500">Compared field</div>
                        <div className="font-semibold text-gray-900">{meta.comparisonFieldLabel || "Spatial distribution"}</div>
                    </div>
                    <div className="rounded border bg-gray-50 p-3">
                        <div className="text-xs text-gray-500">{districtA.name || "District A"}</div>
                        <div className="font-semibold text-gray-900">{districtA.count ?? 0} features</div>
                    </div>
                    <div className="rounded border bg-gray-50 p-3">
                        <div className="text-xs text-gray-500">{districtB.name || "District B"}</div>
                        <div className="font-semibold text-gray-900">{districtB.count ?? 0} features</div>
                    </div>
                    <div className="rounded border bg-gray-50 p-3">
                        <div className="text-xs text-gray-500">Difference</div>
                        <div className="font-semibold text-gray-900">{metrics.countDifference ?? 0}</div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <MiniComparisonMap
                        title={districtA.name || "District A"}
                        side="A"
                        boundaryFeatures={split.boundaryA}
                        datasetFeatures={split.featuresA}
                        fallbackColor={districtA.color || "#dc2626"}
                        comparisonField={comparisonField}
                    />
                    <MiniComparisonMap
                        title={districtB.name || "District B"}
                        side="B"
                        boundaryFeatures={split.boundaryB}
                        datasetFeatures={split.featuresB}
                        fallbackColor={districtB.color || "#2563eb"}
                        comparisonField={comparisonField}
                    />
                </div>

                <div className="border rounded-lg p-3">
                    <div className="text-sm font-semibold text-gray-800 mb-2">Analysis</div>
                    <div className="text-sm text-gray-500 italic">
                        Statistical analysis of{" "}
                        <span className="font-medium">
                            {meta.comparisonFieldLabel || comparisonField || "the selected field"}
                        </span>{" "}
                        will appear here.
                    </div>
                </div>
            </div>
        </section>
    );
}
