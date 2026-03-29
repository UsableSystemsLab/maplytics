"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import { getRegionBoundaries, getCityBoundaries, getChoroplethData } from "@/lib/geoApi";
import { pointInGeometry } from "@/lib/aggregateData";
import {
    COLOR_SCHEMES,
    createChoroplethScale,
    getLegendEntries,
    getColorRange,
} from "@/lib/choroplethScale";

/**
 * ChoroplethRender
 *
 * Owns everything choropleth — fetching, caching, scale derivation, colorFn,
 * and the left-panel settings + legend UI.
 *
 * Map-ready output is exposed upward via onReady({ geojson, colorFn, loading })
 * so MapArea can pass it straight into MapComponent without MapComponent
 * knowing anything about choropleth internals.
 *
 * Props
 * ─────
 * displayGeojson  – filtered point GeoJSON to aggregate into boundaries
 * mapCenter       – [lat, lng] from MapComponent; drives region/city detection
 * zoomLevel       – current map zoom; drives auto boundary level
 * view            – optional 'regions' | 'cities' | 'districts'
 *                   locks the boundary level and hides the toggle UI
 * onReady         – callback({ geojson, colorFn, loading })
 *                   fired whenever map-ready output changes
 */
export default function ChoroplethRender({
    displayGeojson,
    mapCenter,
    zoomLevel,
    view,
    onReady,
}) {
    // ── Color scheme ─────────────────────────────────────────────────────────
    const [colorScheme, setColorScheme] = useState("Blues");

    // ── Boundary lock ─────────────────────────────────────────────────────────
    const [boundaryLock, setBoundaryLock] = useState(view ?? "auto");
    const viewLocked = !!view;

    useEffect(() => {
        setBoundaryLock(view ?? "auto");
    }, [view]);

    const boundaryLevel =
        boundaryLock !== "auto"
            ? boundaryLock
            : zoomLevel <= 7
                ? "regions"
                : zoomLevel <= 10
                    ? "cities"
                    : "districts";

    // ── Region / city focus detection ────────────────────────────────────────
    const [focusedRegionId, setFocusedRegionId] = useState(null);
    const [focusedCityId, setFocusedCityId] = useState(null);
    const regionBoundariesCache = useRef(null);
    const cityBoundariesCache = useRef({}); // keyed by region_id
    const [regionCacheReady, setRegionCacheReady] = useState(false);
    const [cityCacheKeys, setCityCacheKeys] = useState([]);

    // Eager-load region boundaries on mount
    useEffect(() => {
        if (regionBoundariesCache.current) return;
        let cancelled = false;
        getRegionBoundaries()
            .then((data) => {
                if (!cancelled) {
                    regionBoundariesCache.current = data;
                    setRegionCacheReady(true);
                }
            })
            .catch((err) => console.error("Failed to preload region boundaries:", err));
        return () => { cancelled = true; };
    }, []);

    // Eager-load city boundaries whenever focusedRegionId is known
    useEffect(() => {
        if (!focusedRegionId || cityBoundariesCache.current[focusedRegionId]) return;
        let cancelled = false;
        getCityBoundaries({ region_id: focusedRegionId })
            .then((data) => {
                if (!cancelled) {
                    cityBoundariesCache.current[focusedRegionId] = data;
                    setCityCacheKeys((prev) => [...prev, focusedRegionId]);
                }
            })
            .catch((err) => console.error("Failed to preload city boundaries:", err));
        return () => { cancelled = true; };
    }, [focusedRegionId]);

    // Detect which region mapCenter falls in
    useEffect(() => {
        if (!regionCacheReady || !regionBoundariesCache.current || !mapCenter) return;
        const pt = [mapCenter[1], mapCenter[0]]; // [lng, lat]
        for (const f of regionBoundariesCache.current.features) {
            if (pointInGeometry(pt, f.geometry)) {
                setFocusedRegionId(f.properties.region_id);
                return;
            }
        }
        // No match — keep previous (center over sea / outside all boundaries)
    }, [mapCenter, regionCacheReady]);

    // Detect which city mapCenter falls in
    useEffect(() => {
        if (!focusedRegionId || !cityBoundariesCache.current[focusedRegionId] || !mapCenter) return;
        const pt = [mapCenter[1], mapCenter[0]];
        for (const f of cityBoundariesCache.current[focusedRegionId].features) {
            if (pointInGeometry(pt, f.geometry)) {
                setFocusedCityId(f.properties.city_id);
                return;
            }
        }
    }, [mapCenter, focusedRegionId, cityCacheKeys]);

    // ── Fetch boundary + count data ──────────────────────────────────────────
    const [boundaryData, setBoundaryData] = useState(null);
    const [choroplethData, setChoroplethData] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!displayGeojson?.features?.length) return;

        const isLocked = boundaryLock !== "auto";
        if (!isLocked && boundaryLevel === "cities" && !focusedRegionId) return;
        if (!isLocked && boundaryLevel === "districts" && !focusedCityId) return;

        let cancelled = false;
        setLoading(true);

        const run = async () => {
            try {
                const points = displayGeojson.features
                    .filter((f) => f.geometry?.type === "Point")
                    .map((f) => f.geometry.coordinates); // [lng, lat]

                const result = await getChoroplethData({
                    points,
                    level: boundaryLevel,
                    region_id: isLocked ? null : focusedRegionId,
                    city_id: isLocked ? null : focusedCityId,
                });

                if (cancelled) return;

                // Opportunistically cache returned boundaries
                if (!isLocked) {
                    if (boundaryLevel === "regions" && !regionBoundariesCache.current) {
                        regionBoundariesCache.current = result;
                        setRegionCacheReady(true);
                    } else if (
                        boundaryLevel === "cities" &&
                        focusedRegionId &&
                        !cityBoundariesCache.current[focusedRegionId]
                    ) {
                        cityBoundariesCache.current[focusedRegionId] = result;
                        setCityCacheKeys((prev) => [...prev, focusedRegionId]);
                    }
                }

                setBoundaryData(result);
                setChoroplethData(
                    result.features.map((f) => ({
                        name: f.properties?.name_en || f.properties?.name_ar || "Unknown",
                        count: f.properties?.count ?? 0,
                    }))
                );
            } catch (err) {
                console.error("Failed to load choropleth data:", err);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        run();
        return () => { cancelled = true; };
    }, [boundaryLevel, focusedRegionId, focusedCityId, displayGeojson, boundaryLock]);

    // ── Derive scale + colorFn ───────────────────────────────────────────────
    const choroplethScale = useMemo(() => {
        if (!choroplethData) return null;
        return createChoroplethScale(
            choroplethData.map((d) => d.count),
            colorScheme
        );
    }, [choroplethData, colorScheme]);

    const colorFn = useMemo(() => {
        if (!choroplethScale) return null;
        return (feature) => {
            const count = feature.properties?.count ?? 0;
            return count === 0 ? "#e5e7eb" : choroplethScale.getQuantizedColor(count);
        };
    }, [choroplethScale]);

    // ── Notify parent whenever map-ready output changes ──────────────────────
    const onReadyRef = useRef(onReady);
    onReadyRef.current = onReady;

    useEffect(() => {
        onReadyRef.current?.({ geojson: boundaryData, colorFn, loading });
    }, [boundaryData, colorFn, loading]);

    // ── Level badge label ────────────────────────────────────────────────────
    const regionName = useMemo(() => {
        if (!focusedRegionId || !regionBoundariesCache.current) return null;
        return (
            regionBoundariesCache.current.features
                .find((f) => f.properties.region_id === focusedRegionId)
                ?.properties?.name_en ?? null
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [focusedRegionId, regionCacheReady]);

    const cityName = useMemo(() => {
        if (!focusedCityId || !focusedRegionId || !cityBoundariesCache.current[focusedRegionId]) return null;
        return (
            cityBoundariesCache.current[focusedRegionId].features
                .find((f) => f.properties.city_id === focusedCityId)
                ?.properties?.name_en ?? null
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [focusedCityId, focusedRegionId, cityCacheKeys]);

    const levelLabel =
        boundaryLevel === "regions" ? "Regions"
            : boundaryLevel === "cities" ? (regionName ? `Cities — ${regionName}` : "Cities")
                : boundaryLevel === "districts" ? (cityName ? `Districts — ${cityName}` : "Districts")
                    : boundaryLevel;

    // ── Render: settings + legend panel only ─────────────────────────────────
    // BoundaryMap rendering is handled by MapComponent — we just supply it data.
    return (
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-3">
            <h4 className="text-xs font-semibold text-gray-600 uppercase mb-2">
                Choropleth Settings
            </h4>

            {/* Boundary level toggle — hidden when view prop locks it */}
            {!viewLocked && (
                <>
                    <p className="text-xs font-medium text-gray-500 mb-1.5">
                        Boundary Level
                    </p>
                    <div className="grid grid-cols-2 gap-1.5 mb-2">
                        {["auto", "regions", "cities", "districts"].map((level) => (
                            <button
                                key={level}
                                onClick={() => setBoundaryLock(level)}
                                className={`py-1.5 px-2 text-[10px] uppercase tracking-wider font-semibold rounded transition-colors ${boundaryLock === level
                                        ? "bg-primary text-white shadow-sm"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                    }`}
                            >
                                {level}
                            </button>
                        ))}
                    </div>
                </>
            )}

            {/* Current level badge */}
            <div className="mb-3 px-2 py-1.5 bg-gray-100 rounded-lg flex flex-col items-center justify-center min-h-[40px]">
                <div className="text-xs font-medium text-gray-700 text-center">
                    {levelLabel}
                </div>
                {!viewLocked && boundaryLock === "auto" && (
                    <span className="text-gray-400 text-[10px] mt-0.5">
                        (zoom {Math.round(zoomLevel)})
                    </span>
                )}
            </div>

            {/* Color scheme swatches */}
            <p className="text-xs font-medium text-gray-500 mb-1.5">Color Scheme</p>
            <div className="grid grid-cols-2 gap-1.5 mb-3">
                {Object.keys(COLOR_SCHEMES).map((scheme) => {
                    const colors = getColorRange(scheme, 5);
                    return (
                        <button
                            key={scheme}
                            onClick={() => setColorScheme(scheme)}
                            title={scheme}
                            className={`rounded-md overflow-hidden border-2 transition-all ${colorScheme === scheme
                                    ? "border-primary shadow-sm"
                                    : "border-transparent hover:border-gray-300"
                                }`}
                        >
                            <div className="flex h-4 w-full">
                                {colors.map((color, i) => (
                                    <div
                                        key={i}
                                        style={{ backgroundColor: color }}
                                        className="flex-1"
                                    />
                                ))}
                            </div>
                            <div className="text-[10px] text-center py-0.5 bg-gray-50 text-gray-600 leading-tight">
                                {scheme}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Count legend */}
            {choroplethScale && (
                <div className="border-t border-gray-200 pt-2">
                    <h4 className="text-xs font-semibold text-gray-600 uppercase mb-1.5">
                        Count
                    </h4>
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <div
                                className="w-4 h-3 rounded-sm shrink-0 border border-gray-200"
                                style={{ backgroundColor: "#e5e7eb" }}
                            />
                            <span className="text-xs text-gray-700">0</span>
                        </div>
                        {getLegendEntries(choroplethScale).map((entry, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <div
                                    className="w-4 h-3 rounded-sm shrink-0 border border-gray-200"
                                    style={{ backgroundColor: entry.color }}
                                />
                                <span className="text-xs text-gray-700">{entry.rangeLabel}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
