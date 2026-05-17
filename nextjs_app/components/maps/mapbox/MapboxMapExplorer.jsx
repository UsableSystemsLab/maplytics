"use client";
import { useEffect, useRef, useState, useContext } from "react";
import { useSelector, useDispatch } from "react-redux";
import { selectSelectedLayers, removeLayer, setLayerGeojson, setLayerLoading, setLayerPopupFields } from "@/lib/store/features/layersSlice";
import { selectActiveProject } from "@/lib/store/features/projectSlice";
import { getDatasetGeoJSON, getProjectDatasetData } from "@/lib/datasetApi";
import { getChoroplethData } from "@/lib/geoApi";
import { createChoroplethScale } from "@/lib/choroplethScale";
import DatasetDrawer from "@/components/DatasetDrawer";
import { useIsMobile } from "@/hooks/use-mobile";
import MapLayerPanel from "@/components/MapLayerPanel";
import MapSummaryPanel from "@/components/MapSummaryPanel";
import MapResultsSidebar from "@/components/MapResultsSidebar";
import MapCommandInput from "@/components/MapCommandInput";
import MapResultPreview from "@/components/MapResultPreview";
import { getNlqProjectJobs } from "@/lib/nlqApi";
import { MapEngineContext } from "@/components/maps/MapEngineContext";
import { MAPBOX_STYLE, SAUDI_CENTER, SAUDI_ZOOM } from "@/components/maps/shared/mapDefaults";
import { toMapboxHeatGeoJSON } from "@/components/maps/shared/heatmapData";

const LAYER_COLORS = ['#FFBB00', '#26BB00', '#00BBD9', '#FF003C', '#003BFF', '#FF3BA9'];

export default function MapboxMapExplorer({ className = "w-full h-full" }) {
    const mapContainerRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const dispatch = useDispatch();

    const selectedLayers = useSelector(selectSelectedLayers);
    const activeProject = useSelector(selectActiveProject);
    const isMobile = useIsMobile();
    const { mapboxToken, reportMapboxError } = useContext(MapEngineContext);

    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [visibleLayerIds, setVisibleLayerIds] = useState(() => new Set(selectedLayers.map(l => l.id)));
    const [isPanelExpanded, setIsPanelExpanded] = useState(true);
    const [layerVizModes, setLayerVizModes] = useState({});
    const [jobs, setJobs] = useState([]);
    const [isLoadingJobs, setIsLoadingJobs] = useState(false);
    const [selectedJobId, setSelectedJobId] = useState(null);

    // Choropleth: per-layer settings { [layerId]: { boundaryLock, colorScheme, resolvedLevel } }
    const [choroplethSettings, setChoroplethSettings] = useState({});
    const [mapZoom, setMapZoom] = useState(SAUDI_ZOOM);
    const [mapReady, setMapReady] = useState(false);
    // Cache raw boundary geojson keyed by `${layerId}::${level}` — avoids re-fetching on color/level toggle
    const choroplethCacheRef = useRef({});
    // Track what's currently rendered to detect when only color changed
    const choroplethRenderedRef = useRef({});

    const handleChoroplethSettingsChange = (layerId, patch) => {
        setChoroplethSettings(prev => ({
            ...prev,
            [layerId]: { ...(prev[layerId] || { boundaryLock: 'auto', colorScheme: 'Blues' }), ...patch }
        }));
    };

    const isInitialSync = useRef(false);
    const prevSelectedLayersRef = useRef([]);
    const prevJobsRef = useRef([]);

    // Tracked Mapbox ids keyed by `${layerId}::${mode}` so we can remove on change.
    const trackedRef = useRef({});
    const autoFitDoneRef = useRef(new Set());
    const popupInstanceRef = useRef(null);
    const layerPopupFieldsRef = useRef({});

    const fetchJobs = async (isInitial = false) => {
        if (!activeProject?.id) return;

        const data = await getNlqProjectJobs(activeProject.id);
        const sortedData = [...data].sort((a, b) => {
            const dateA = new Date(a.created_at || a.updated_at || 0);
            const dateB = new Date(b.created_at || b.updated_at || 0);
            return dateB - dateA;
        });

        const latestDone = sortedData.find(j => j.status === "done" && (j.result_path?.endsWith(".png") || j.result_path?.includes("/result")));
        const prevLatestDone = prevJobsRef.current.find(j => j.status === "done" && (j.result_path?.endsWith(".png") || j.result_path?.includes("/result")));

        const aNewJobFinished = latestDone && latestDone.id !== prevLatestDone?.id;
        const initialAutoSelect = isInitial && !selectedJobId && latestDone;

        if (aNewJobFinished || initialAutoSelect) {
            setSelectedJobId(latestDone.job_id || latestDone.id);
        }

        setJobs(sortedData);
        prevJobsRef.current = sortedData;
    };

    useEffect(() => {
        if (activeProject?.id) {
            fetchJobs(true);
        }
    }, [activeProject?.id]);

    useEffect(() => {
        const hasProcessing = jobs.some(j => j.status === "processing" || j.status === "queued");
        if (!hasProcessing || !activeProject?.id) return;

        const interval = setInterval(() => fetchJobs(false), 4000);
        return () => clearInterval(interval);
    }, [jobs, activeProject?.id, selectedJobId]);

    useEffect(() => {
        if (!isInitialSync.current && selectedLayers.length > 0) {
            setVisibleLayerIds(new Set(selectedLayers.map(l => l.id)));
            isInitialSync.current = true;
            prevSelectedLayersRef.current = selectedLayers;
        }
    }, [selectedLayers]);

    useEffect(() => {
        const prevIds = new Set(prevSelectedLayersRef.current.map(l => l.id));
        const newLayers = selectedLayers.filter(l => !prevIds.has(l.id));

        if (newLayers.length > 0) {
            setVisibleLayerIds(prev => {
                const next = new Set(prev);
                newLayers.forEach(l => next.add(l.id));
                return next;
            });
        }
        prevSelectedLayersRef.current = selectedLayers;
    }, [selectedLayers]);

    // Initialize Mapbox map
    useEffect(() => {
        if (!mapContainerRef.current || mapInstanceRef.current) return;
        let cancelled = false;

        (async () => {
            const mapboxgl = (await import("mapbox-gl")).default;
            await import("mapbox-gl/dist/mapbox-gl.css");
            if (cancelled) return;

            mapboxgl.accessToken = mapboxToken;
            const [lat, lng] = SAUDI_CENTER;
            const map = new mapboxgl.Map({
                container: mapContainerRef.current,
                style: MAPBOX_STYLE,
                center: [lng, lat],
                zoom: SAUDI_ZOOM,
            });
            map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "bottom-right");
            map.on("error", (e) => reportMapboxError(e.error || e));
            map.on("zoomend", () => setMapZoom(map.getZoom()));
            mapInstanceRef.current = map;
            map.once('load', () => setMapReady(true));
        })();

        return () => {
            cancelled = true;
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
            setMapReady(false);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mapboxToken]);

    // Handle Mobile Panel State
    useEffect(() => {
        setIsPanelExpanded(!isMobile);
    }, [isMobile]);

    // Fetch missing layer data (engine-agnostic — same as useMapSync's first effect)
    useEffect(() => {
        selectedLayers.forEach(async (layer) => {
            if (layer.geojson || layer.loading) return;

            dispatch(setLayerLoading({ layerId: layer.id, isLoading: true }));
            try {
                let data;
                if (layer.projectId) {
                    data = await getProjectDatasetData(layer.projectId, layer.id);
                } else {
                    data = await getDatasetGeoJSON(layer.id);
                }

                const geojson = data.geojson || (data.type === "FeatureCollection" ? data : null);
                if (geojson) {
                    const popupFields = data.popup_fields || geojson?.metadata?.popup_fields || null;
                    dispatch(setLayerGeojson({ layerId: layer.id, geojson, popupFields }));
                }
            } catch (error) {
                console.error(`Failed to load layer ${layer.name}:`, error);
            } finally {
                dispatch(setLayerLoading({ layerId: layer.id, isLoading: false }));
            }
        });
    }, [selectedLayers, dispatch]);

    // Sync Mapbox layers
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map) return;

        const removeTracked = (key) => {
            const ids = trackedRef.current[key];
            if (!ids) return;
            for (const id of ids) {
                if (map.getLayer(id)) map.removeLayer(id);
                if (map.getSource(id)) map.removeSource(id);
            }
            delete trackedRef.current[key];
        };

        const popupInstance = popupInstanceRef.current || (popupInstanceRef.current = { inst: null });
        selectedLayers.forEach(l => { layerPopupFieldsRef.current[l.id] = l.popupFields; });

        const bindFeaturePopup = (mapboxgl, interactiveId, layer) => {
            const datasetName = layer.name || '';
            const layerId = layer.id;
            map.on('click', interactiveId, (e) => {
                const currentFields = layerPopupFieldsRef.current[layerId];
                const allowed = currentFields?.length > 0 ? new Set(currentFields) : null;
                const feat = e.features?.[0];
                if (!feat) return;
                const props = feat.properties || {};
                const featureName = props.name || props.title || props.id || 'Feature';
                const HIDDEN = new Set(['_lyrColor', '_lyrFillOpacity', 'name', 'title', 'id']);
                const propEntries = Object.entries(props).filter(([k, v]) =>
                    !HIDDEN.has(k) && typeof v !== 'object' && v !== null && v !== ''
                    && (!allowed || allowed.has(k))
                );
                const propsHtml = propEntries.length
                    ? `<dl class="maplytics-popup__list">${propEntries.slice(0, 12).map(([k, v]) =>
                        `<div class="maplytics-popup__row"><dt>${escapeHtml(k)}</dt><dd>${escapeHtml(String(v))}</dd></div>`
                      ).join('')}</dl>`
                    : '<div class="maplytics-popup__empty">No additional properties</div>';
                const html = `
                    <div class="maplytics-popup__body">
                        <h3 class="maplytics-popup__title">${escapeHtml(featureName)}</h3>
                        <div class="maplytics-popup__layer">${escapeHtml(datasetName)}</div>
                        ${propsHtml}
                    </div>
                `;
                if (popupInstance.inst) popupInstance.inst.remove();
                popupInstance.inst = new mapboxgl.Popup({
                    className: 'maplytics-popup',
                    maxWidth: '320px',
                    offset: 12,
                    closeOnClick: true,
                })
                    .setLngLat(e.lngLat)
                    .setHTML(html)
                    .addTo(map);
            });
            map.on('mouseenter', interactiveId, () => { map.getCanvas().style.cursor = 'pointer'; });
            map.on('mouseleave', interactiveId, () => { map.getCanvas().style.cursor = ''; });
        };

        const sync = async () => {
            const mapboxgl = (await import('mapbox-gl')).default;
            if (!mapInstanceRef.current) return;

            const visible = new Set([...visibleLayerIds]);
            const wantKeys = new Set();

            selectedLayers.forEach((layer) => {
                if (!layer.geojson) return;
                if (!visible.has(layer.id)) return;
                const mode = layerVizModes[layer.id] || 'plotting';
                if (mode === 'none') return;
                wantKeys.add(`${layer.id}::${mode}`);
            });

            // Remove anything we no longer want (different mode, hidden, removed)
            for (const key of Object.keys(trackedRef.current)) {
                if (!wantKeys.has(key)) removeTracked(key);
            }

            // Forget auto-fit state for layers that are no longer visible
            // (so toggling them back on, or re-adding them, re-zooms).
            for (const id of [...autoFitDoneRef.current]) {
                if (!visible.has(id)) autoFitDoneRef.current.delete(id);
            }

            const newlyVisibleIds = [];

            selectedLayers.forEach((layer, index) => {
                if (!layer.geojson) return;
                if (!visible.has(layer.id)) return;
                const mode = layerVizModes[layer.id] || 'plotting';
                if (mode === 'none') return;
                const key = `${layer.id}::${mode}`;
                if (trackedRef.current[key]) return; // already rendered

                const color = LAYER_COLORS[index % LAYER_COLORS.length];

                if (mode === 'choropleth') {
                    // Choropleth is managed by a dedicated effect that responds to zoom/settings
                    trackedRef.current[key] = [];
                } else if (mode === 'heatmap') {
                    const points = [];
                    (layer.geojson.features || []).forEach(f => {
                        const g = f.geometry;
                        if (!g) return;
                        if (g.type === 'Point') {
                            const [lng, lat] = g.coordinates;
                            points.push({ lat, lng, intensity: 1.0 });
                        }
                    });
                    const data = toMapboxHeatGeoJSON(points);
                    const srcId = `heat-src-${layer.id}`;
                    const layerId = `heat-layer-${layer.id}`;
                    map.addSource(srcId, { type: 'geojson', data });
                    map.addLayer({
                        id: layerId,
                        type: 'heatmap',
                        source: srcId,
                        paint: {
                            'heatmap-weight': ['get', 'intensity'],
                            'heatmap-intensity': [
                                'interpolate', ['linear'], ['zoom'],
                                0, 0.1,
                                10, 0.5,
                                15, 1,
                                20, 2,
                            ],
                            'heatmap-radius': [
                                'interpolate', ['linear'], ['zoom'],
                                0, 20,
                                10, 35,
                                14, 55,
                                18, 70,
                            ],
                            'heatmap-opacity': 0.8,
                            'heatmap-color': [
                                'interpolate', ['linear'], ['heatmap-density'],
                                0, 'rgba(0,0,255,0)',
                                0.2, '#0000ff',
                                0.4, '#00ff00',
                                0.6, '#ffff00',
                                0.8, '#ff7f00',
                                1.0, '#ff0000',
                            ],
                        },
                    });
                    trackedRef.current[key] = [layerId, srcId];
                } else {
                    const srcId = `lyr-src-${layer.id}`;
                    const fillId = `lyr-fill-${layer.id}`;
                    const lineId = `lyr-line-${layer.id}`;
                    const circleId = `lyr-circle-${layer.id}`;

                    map.addSource(srcId, { type: 'geojson', data: layer.geojson });
                    map.addLayer({
                        id: fillId,
                        type: 'fill',
                        source: srcId,
                        filter: ['any', ['==', ['geometry-type'], 'Polygon'], ['==', ['geometry-type'], 'MultiPolygon']],
                        paint: { 'fill-color': color, 'fill-opacity': 0.4, 'fill-outline-color': '#fff' },
                    });
                    map.addLayer({
                        id: lineId,
                        type: 'line',
                        source: srcId,
                        filter: ['any',
                            ['==', ['geometry-type'], 'LineString'],
                            ['==', ['geometry-type'], 'MultiLineString'],
                        ],
                        paint: { 'line-color': color, 'line-width': 2 },
                    });
                    map.addLayer({
                        id: circleId,
                        type: 'circle',
                        source: srcId,
                        filter: ['==', ['geometry-type'], 'Point'],
                        paint: {
                            'circle-radius': 7,
                            'circle-color': color,
                            'circle-stroke-color': '#fff',
                            'circle-stroke-width': 0,
                        },
                    });
                    trackedRef.current[key] = [fillId, lineId, circleId, srcId];

                    // Click → popup with feature properties + layer name
                    bindFeaturePopup(mapboxgl, fillId, layer);
                    bindFeaturePopup(mapboxgl, lineId, layer);
                    bindFeaturePopup(mapboxgl, circleId, layer);
                }

                if (!autoFitDoneRef.current.has(layer.id)) {
                    newlyVisibleIds.push(layer.id);
                    autoFitDoneRef.current.add(layer.id);
                }
            });

            // If any layer just became visible, fit camera to the union bbox
            // of ALL currently visible layers (so multi-district datasets and
            // multi-layer setups are fully framed).
            if (newlyVisibleIds.length > 0) {
                let union = null;
                selectedLayers.forEach((layer) => {
                    if (!layer.geojson) return;
                    if (!visible.has(layer.id)) return;
                    const bbox = computeBboxFromGeoJSON(layer.geojson);
                    if (!bbox) return;
                    if (!union) {
                        union = [[bbox[0][0], bbox[0][1]], [bbox[1][0], bbox[1][1]]];
                    } else {
                        if (bbox[0][0] < union[0][0]) union[0][0] = bbox[0][0];
                        if (bbox[0][1] < union[0][1]) union[0][1] = bbox[0][1];
                        if (bbox[1][0] > union[1][0]) union[1][0] = bbox[1][0];
                        if (bbox[1][1] > union[1][1]) union[1][1] = bbox[1][1];
                    }
                });
                if (union) {
                    map.fitBounds(union, { padding: 60, duration: 600, maxZoom: 14 });
                }
            }
        };

        if (map.isStyleLoaded()) sync();
        else map.once('load', sync);
    }, [selectedLayers, visibleLayerIds, layerVizModes, mapReady]);

    // Cache mapboxgl module ref so choropleth effect doesn't need dynamic import
    const mapboxglRef = useRef(null);
    useEffect(() => { import('mapbox-gl').then(m => { mapboxglRef.current = m.default; }); }, []);

    // Dedicated choropleth effect — uses cache, recolors instantly on scheme change
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map) return;

        const zoomToLevel = (z) => z <= 7 ? 'regions' : z <= 10 ? 'cities' : 'districts';

        const colorize = (boundaryGeojson, colorScheme) => {
            const counts = boundaryGeojson.features.map(f => f.properties?.count ?? 0);
            const scale = createChoroplethScale(counts, colorScheme);
            return {
                ...boundaryGeojson,
                features: boundaryGeojson.features.map(f => {
                    const count = f.properties?.count ?? 0;
                    const fillColor = count === 0 ? '#e5e7eb' : scale.getQuantizedColor(count);
                    return { ...f, properties: { ...f.properties, _fillColor: fillColor } };
                }),
            };
        };

        const ensureLayers = (layerId, colored) => {
            const srcId = `choro-src-${layerId}`;
            const fillId = `choro-fill-${layerId}`;
            const lineId = `choro-line-${layerId}`;

            if (map.getSource(srcId)) {
                map.getSource(srcId).setData(colored);
            } else {
                map.addSource(srcId, { type: 'geojson', data: colored });
                map.addLayer({
                    id: fillId,
                    type: 'fill',
                    source: srcId,
                    paint: { 'fill-color': ['get', '_fillColor'], 'fill-opacity': 0.65, 'fill-outline-color': '#ffffff' },
                });
                map.addLayer({
                    id: lineId,
                    type: 'line',
                    source: srcId,
                    paint: { 'line-color': '#666666', 'line-width': 1 },
                });

                map.on('click', fillId, (e) => {
                    const feat = e.features?.[0];
                    if (!feat) return;
                    const mapboxgl = mapboxglRef.current;
                    if (!mapboxgl) return;
                    const props = feat.properties || {};
                    const name = props.name_en || props.name_ar || 'Unknown';
                    const count = props.count ?? 0;
                    const HIDDEN = new Set(['_fillColor', 'name_en', 'name_ar', 'count', 'name', 'title', 'id']);
                    const propEntries = Object.entries(props).filter(([k, v]) =>
                        !HIDDEN.has(k) && typeof v !== 'object' && v !== null && v !== ''
                    );
                    const propsHtml = propEntries.length
                        ? `<dl class="maplytics-popup__list">${propEntries.slice(0, 12).map(([k, v]) =>
                            `<div class="maplytics-popup__row"><dt>${escapeHtml(k)}</dt><dd>${escapeHtml(String(v))}</dd></div>`
                          ).join('')}</dl>`
                        : '';
                    const html = `
                        <div class="maplytics-popup__body">
                            <h3 class="maplytics-popup__title">${escapeHtml(name)}</h3>
                            <div class="maplytics-popup__layer">${count} POINT${count !== 1 ? 'S' : ''}</div>
                            ${propsHtml}
                        </div>
                    `;
                    const popupInstance = popupInstanceRef.current || (popupInstanceRef.current = { inst: null });
                    if (popupInstance.inst) popupInstance.inst.remove();
                    popupInstance.inst = new mapboxgl.Popup({
                        className: 'maplytics-popup',
                        maxWidth: '320px',
                        offset: 12,
                        closeOnClick: true,
                    })
                        .setLngLat(e.lngLat)
                        .setHTML(html)
                        .addTo(map);
                });
                map.on('mouseenter', fillId, () => { map.getCanvas().style.cursor = 'pointer'; });
                map.on('mouseleave', fillId, () => { map.getCanvas().style.cursor = ''; });

                const key = `${layerId}::choropleth`;
                trackedRef.current[key] = [fillId, lineId, srcId];
            }
        };

        const removeLayers = (layerId) => {
            const srcId = `choro-src-${layerId}`;
            const fillId = `choro-fill-${layerId}`;
            const lineId = `choro-line-${layerId}`;
            if (map.getLayer(fillId)) map.removeLayer(fillId);
            if (map.getLayer(lineId)) map.removeLayer(lineId);
            if (map.getSource(srcId)) map.removeSource(srcId);
        };

        selectedLayers.forEach((layer) => {
            const mode = layerVizModes[layer.id] || 'plotting';
            if (mode !== 'choropleth') return;
            if (!layer.geojson) return;
            if (!visibleLayerIds.has(layer.id)) return;

            const settings = choroplethSettings[layer.id] || { boundaryLock: 'auto', colorScheme: 'Blues' };
            const resolvedLevel = settings.boundaryLock === 'auto' ? zoomToLevel(mapZoom) : settings.boundaryLock;
            const colorScheme = settings.colorScheme || 'Blues';

            // Update resolvedLevel in state for UI display
            if (settings.resolvedLevel !== resolvedLevel) {
                setChoroplethSettings(prev => ({
                    ...prev,
                    [layer.id]: { ...(prev[layer.id] || { boundaryLock: 'auto', colorScheme: 'Blues' }), resolvedLevel }
                }));
            }

            const rendered = choroplethRenderedRef.current[layer.id];
            const renderKey = `${resolvedLevel}::${colorScheme}`;

            // Already showing exactly this — skip
            if (rendered === renderKey) return;

            const cacheKey = `${layer.id}::${resolvedLevel}`;
            const cached = choroplethCacheRef.current[cacheKey];

            if (cached) {
                // Cache hit — just recolor (or switch level from cache). Instant.
                const prevLevel = rendered?.split('::')[0];
                if (prevLevel !== resolvedLevel) removeLayers(layer.id);
                const colored = colorize(cached, colorScheme);
                ensureLayers(layer.id, colored);
                choroplethRenderedRef.current[layer.id] = renderKey;
                return;
            }

            // Cache miss — fetch from API
            const points = (layer.geojson.features || [])
                .filter(f => f.geometry?.type === 'Point')
                .map(f => f.geometry.coordinates);
            if (points.length === 0) return;

            // Remove old layers while loading
            removeLayers(layer.id);
            choroplethRenderedRef.current[layer.id] = null;

            getChoroplethData({ points, level: resolvedLevel, region_id: null, city_id: null })
                .then(boundaryGeojson => {
                    if (!mapInstanceRef.current) return;
                    // Cache the raw result
                    choroplethCacheRef.current[cacheKey] = boundaryGeojson;
                    // Check settings haven't changed while we were fetching
                    const current = choroplethSettings[layer.id] || { boundaryLock: 'auto', colorScheme: 'Blues' };
                    const currentLevel = current.boundaryLock === 'auto' ? zoomToLevel(mapZoom) : current.boundaryLock;
                    if (currentLevel !== resolvedLevel) return;

                    const colored = colorize(boundaryGeojson, colorScheme);
                    ensureLayers(layer.id, colored);
                    choroplethRenderedRef.current[layer.id] = renderKey;
                })
                .catch(err => console.error('Choropleth fetch failed:', err));
        });
    }, [selectedLayers, visibleLayerIds, layerVizModes, mapZoom, choroplethSettings, mapReady]);

    const toggleVisibility = (id) => {
        setVisibleLayerIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleRemoveLayer = (id) => {
        dispatch(removeLayer(id));
        setVisibleLayerIds(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
        });
    };

    return (
        <div className="relative w-full h-full">
            <div ref={mapContainerRef} className={className} style={{ minHeight: "400px" }} />

            <MapLayerPanel
                selectedLayers={selectedLayers}
                visibleLayerIds={visibleLayerIds}
                layerVizModes={layerVizModes}
                choroplethSettings={choroplethSettings}
                onChoroplethSettingsChange={handleChoroplethSettingsChange}
                isMobile={isMobile}
                isPanelExpanded={isPanelExpanded}
                setIsPanelExpanded={setIsPanelExpanded}
                setIsDrawerOpen={setIsDrawerOpen}
                toggleVisibility={toggleVisibility}
                handleRemoveLayer={handleRemoveLayer}
                setLayerVizModes={setLayerVizModes}
                onPopupFieldsChange={(layerId, fields) => dispatch(setLayerPopupFields({ layerId, popupFields: fields }))}
            />

            <MapResultsSidebar
                isMobile={isMobile}
                jobs={jobs}
                isLoading={isLoadingJobs}
                selectedJobId={selectedJobId}
                onViewJob={setSelectedJobId}
            />

            <MapResultPreview
                jobs={jobs}
                isMobile={isMobile}
                selectedJobId={selectedJobId}
            />

            <MapCommandInput
                isMobile={isMobile}
                onSuccess={() => fetchJobs(false)}
            />

            <MapSummaryPanel
                selectedLayers={selectedLayers}
                visibleLayerIds={visibleLayerIds}
                isMobile={isMobile}
            />

            <DatasetDrawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                activeProject={activeProject}
            />
        </div>
    );
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function computeBboxFromGeoJSON(geojson) {
    let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
    const visit = (coords) => {
        if (typeof coords[0] === 'number') {
            const [lng, lat] = coords;
            if (lng < minLng) minLng = lng;
            if (lat < minLat) minLat = lat;
            if (lng > maxLng) maxLng = lng;
            if (lat > maxLat) maxLat = lat;
        } else {
            coords.forEach(visit);
        }
    };
    const walk = (g) => {
        if (!g) return;
        if (g.type === 'FeatureCollection') g.features.forEach(f => walk(f));
        else if (g.type === 'Feature') walk(g.geometry);
        else if (g.coordinates) visit(g.coordinates);
    };
    walk(geojson);
    if (!isFinite(minLng)) return null;
    return [[minLng, minLat], [maxLng, maxLat]];
}
