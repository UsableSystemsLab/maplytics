"use client";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { getRegionBoundaries, getCityBoundaries, getChoroplethData } from "@/lib/geoApi";
import { pointInGeometry } from "@/lib/aggregateData";
import { COLOR_SCHEMES, createChoroplethScale, getLegendEntries, getColorRange } from "@/lib/choroplethScale";

export default function ChoroplethRender({ displayGeojson, mapCenter, zoomLevel, view, panelSlotRef, onReady }) {
    const [colorScheme, setColorScheme] = useState("Blues");
    const [boundaryLock, setBoundaryLock] = useState(view ?? "auto");
    const viewLocked = !!view;

    useEffect(() => { setBoundaryLock(view ?? "auto"); }, [view]);

    const boundaryLevel =
        boundaryLock !== "auto" ? boundaryLock
            : zoomLevel <= 7 ? "regions"
                : zoomLevel <= 10 ? "cities"
                    : "districts";

    // ── Region / city detection ───────────────────────────────────────────────
    const [focusedRegionId, setFocusedRegionId] = useState(null);
    const [focusedCityId, setFocusedCityId] = useState(null);
    const regionBoundariesCache = useRef(null);
    const cityBoundariesCache = useRef({});
    const [regionCacheReady, setRegionCacheReady] = useState(false);
    const [cityCacheKeys, setCityCacheKeys] = useState([]);

    useEffect(() => {
        if (regionBoundariesCache.current) return;
        let cancelled = false;
        getRegionBoundaries()
            .then((data) => { if (!cancelled) { regionBoundariesCache.current = data; setRegionCacheReady(true); } })
            .catch((err) => console.error("Failed to preload region boundaries:", err));
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        if (!focusedRegionId || cityBoundariesCache.current[focusedRegionId]) return;
        let cancelled = false;
        getCityBoundaries({ region_id: focusedRegionId })
            .then((data) => { if (!cancelled) { cityBoundariesCache.current[focusedRegionId] = data; setCityCacheKeys((prev) => [...prev, focusedRegionId]); } })
            .catch((err) => console.error("Failed to preload city boundaries:", err));
        return () => { cancelled = true; };
    }, [focusedRegionId]);

    useEffect(() => {
        if (!regionCacheReady || !regionBoundariesCache.current || !mapCenter) return;
        const pt = [mapCenter[1], mapCenter[0]];
        for (const f of regionBoundariesCache.current.features) {
            if (pointInGeometry(pt, f.geometry)) { setFocusedRegionId(f.properties.region_id); return; }
        }
    }, [mapCenter, regionCacheReady]);

    useEffect(() => {
        if (!focusedRegionId || !cityBoundariesCache.current[focusedRegionId] || !mapCenter) return;
        const pt = [mapCenter[1], mapCenter[0]];
        for (const f of cityBoundariesCache.current[focusedRegionId].features) {
            if (pointInGeometry(pt, f.geometry)) { setFocusedCityId(f.properties.city_id); return; }
        }
    }, [mapCenter, focusedRegionId, cityCacheKeys]);

    // ── Fetch ────────────────────────────────────────────────────────────────
    const [boundaryData, setBoundaryData] = useState(null);
    const [choroplethData, setChoroplethData] = useState(null);
    const [loading, setLoading] = useState(false);

    const executeFetch = useCallback(async ({ level, region_id, city_id, isCancelled }) => {
        if (!displayGeojson?.features?.length) return null;
        setLoading(true);
        try {
            const points = displayGeojson.features
                .filter((f) => f.geometry?.type === "Point")
                .map((f) => f.geometry.coordinates);
            const result = await getChoroplethData({ points, level, region_id, city_id });
            if (isCancelled()) return null;
            setBoundaryData(result);
            setChoroplethData(result.features.map((f) => ({
                name: f.properties?.name_en || f.properties?.name_ar || "Unknown",
                count: f.properties?.count ?? 0,
            })));
            return result;
        } catch (err) {
            console.error("Failed to load choropleth data:", err);
            return null;
        } finally {
            if (!isCancelled()) setLoading(false);
        }
    }, [displayGeojson]);

    // Locked: deps exclude focus IDs — panning never triggers a reload
    useEffect(() => {
        if (boundaryLock === "auto") return;
        let cancelled = false;
        executeFetch({ level: boundaryLock, region_id: null, city_id: null, isCancelled: () => cancelled });
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [boundaryLock, executeFetch]);

    // Auto: reacts to zoom-derived level and focus IDs
    useEffect(() => {
        if (boundaryLock !== "auto") return;
        if (!displayGeojson?.features?.length) return;
        if (boundaryLevel === "cities" && !focusedRegionId) return;
        if (boundaryLevel === "districts" && !focusedCityId) return;
        let cancelled = false;
        const run = async () => {
            const result = await executeFetch({ level: boundaryLevel, region_id: focusedRegionId, city_id: focusedCityId, isCancelled: () => cancelled });
            if (!result || cancelled) return;
            if (boundaryLevel === "regions" && !regionBoundariesCache.current) {
                regionBoundariesCache.current = result; setRegionCacheReady(true);
            } else if (boundaryLevel === "cities" && focusedRegionId && !cityBoundariesCache.current[focusedRegionId]) {
                cityBoundariesCache.current[focusedRegionId] = result;
                setCityCacheKeys((prev) => [...prev, focusedRegionId]);
            }
        };
        run();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [boundaryLevel, focusedRegionId, focusedCityId, executeFetch]);

    // ── Scale + colorFn ──────────────────────────────────────────────────────
    const choroplethScale = useMemo(() => {
        if (!choroplethData) return null;
        return createChoroplethScale(choroplethData.map((d) => d.count), colorScheme);
    }, [choroplethData, colorScheme]);

    const colorFn = useMemo(() => {
        if (!choroplethScale) return null;
        return (feature) => {
            const count = feature.properties?.count ?? 0;
            return count === 0 ? "#e5e7eb" : choroplethScale.getQuantizedColor(count);
        };
    }, [choroplethScale]);

    // Notify MapComponent whenever map-ready output changes
    const onReadyRef = useRef(onReady);
    onReadyRef.current = onReady;
    useEffect(() => { onReadyRef.current?.({ geojson: boundaryData, colorFn, loading }); }, [boundaryData, colorFn, loading]);

    // ── Label helpers ────────────────────────────────────────────────────────
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const regionName = useMemo(() => regionBoundariesCache.current?.features.find((f) => f.properties.region_id === focusedRegionId)?.properties?.name_en ?? null, [focusedRegionId, regionCacheReady]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const cityName = useMemo(() => cityBoundariesCache.current[focusedRegionId]?.features.find((f) => f.properties.city_id === focusedCityId)?.properties?.name_en ?? null, [focusedCityId, focusedRegionId, cityCacheKeys]);

    const levelLabel =
        boundaryLevel === "regions" ? "Regions"
            : boundaryLevel === "cities" ? (regionName ? `Cities — ${regionName}` : "Cities")
                : boundaryLevel === "districts" ? (cityName ? `Districts — ${cityName}` : "Districts")
                    : boundaryLevel;

    // Panel portals into MapArea's slot div — correct position, correct z-index, no viewport bleed
    const panel = (
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-3">
            <h4 className="text-xs font-semibold text-gray-600 uppercase mb-2">Choropleth Settings</h4>

            {!viewLocked && (
                <>
                    <p className="text-xs font-medium text-gray-500 mb-1.5">Boundary Level</p>
                    <div className="grid grid-cols-2 gap-1.5 mb-2">
                        {["auto", "regions", "cities", "districts"].map((level) => (
                            <button
                                key={level}
                                onClick={() => setBoundaryLock(level)}
                                className={`py-1.5 px-2 text-[10px] uppercase tracking-wider font-semibold rounded transition-colors ${boundaryLock === level ? "bg-primary text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                    }`}
                            >
                                {level}
                            </button>
                        ))}
                    </div>
                </>
            )}

            <div className="mb-3 px-2 py-1.5 bg-gray-100 rounded-lg flex flex-col items-center justify-center min-h-[40px]">
                <div className="text-xs font-medium text-gray-700 text-center">{levelLabel}</div>
                {!viewLocked && boundaryLock === "auto" && (
                    <span className="text-gray-400 text-[10px] mt-0.5">(zoom {Math.round(zoomLevel)})</span>
                )}
            </div>

            <p className="text-xs font-medium text-gray-500 mb-1.5">Color Scheme</p>
            <div className="grid grid-cols-2 gap-1.5 mb-3">
                {Object.keys(COLOR_SCHEMES).map((scheme) => {
                    const colors = getColorRange(scheme, 5);
                    return (
                        <button
                            key={scheme}
                            onClick={() => setColorScheme(scheme)}
                            title={scheme}
                            className={`rounded-md overflow-hidden border-2 transition-all ${colorScheme === scheme ? "border-primary shadow-sm" : "border-transparent hover:border-gray-300"
                                }`}
                        >
                            <div className="flex h-4 w-full">
                                {colors.map((color, i) => (
                                    <div key={i} style={{ backgroundColor: color }} className="flex-1" />
                                ))}
                            </div>
                            <div className="text-[10px] text-center py-0.5 bg-gray-50 text-gray-600 leading-tight">{scheme}</div>
                        </button>
                    );
                })}
            </div>

            {choroplethScale && (
                <div className="border-t border-gray-200 pt-2">
                    <h4 className="text-xs font-semibold text-gray-600 uppercase mb-1.5">Count</h4>
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-3 rounded-sm shrink-0 border border-gray-200" style={{ backgroundColor: "#e5e7eb" }} />
                            <span className="text-xs text-gray-700">0</span>
                        </div>
                        {getLegendEntries(choroplethScale).map((entry, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <div className="w-4 h-3 rounded-sm shrink-0 border border-gray-200" style={{ backgroundColor: entry.color }} />
                                <span className="text-xs text-gray-700">{entry.rangeLabel}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );

    if (!panelSlotRef?.current) return null;
    return createPortal(panel, panelSlotRef.current);
}
