import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet.heat";
import { setLayerGeojson, setLayerLoading } from "@/lib/store/features/layersSlice";
import { getDatasetGeoJSON, getProjectDatasetData } from "@/lib/datasetApi";
import { toLeafletHeatPoints } from "@/components/maps/shared/heatmapData";
import { getChoroplethData } from "@/lib/geoApi";
import { createChoroplethScale } from "@/lib/choroplethScale";

const LAYER_COLORS = ['#FFBB00', '#26BB00', '#00BBD9', '#FF003C', '#003BFF', '#FF3BA9'];

function zoomToLevel(z) {
    return z <= 7 ? 'regions' : z <= 10 ? 'cities' : 'districts';
}

export function useMapSync(mapInstance, selectedLayers, visibleLayerIds, layerVizModes, dispatch, choroplethSettings, setChoroplethSettings) {
    const layerGroupsRef = useRef({});
    const [mapZoom, setMapZoom] = useState(6);
    // Cache raw boundary geojson keyed by `${layerId}::${level}`
    const choroplethCacheRef = useRef({});
    // Track what's currently rendered: `${level}::${colorScheme}`
    const choroplethRenderedRef = useRef({});
    const preloadedLayersRef = useRef(new Set());

    useEffect(() => {
        if (!mapInstance) return;
        const onZoom = () => setMapZoom(mapInstance.getZoom());
        mapInstance.on('zoomend', onZoom);
        return () => mapInstance.off('zoomend', onZoom);
    }, [mapInstance]);

    // 1. Fetch missing data
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

    // Eagerly preload choropleth data for all 3 boundary levels
    useEffect(() => {
        selectedLayers.forEach((layer) => {
            if (!layer.geojson) return;
            if (preloadedLayersRef.current.has(layer.id)) return;

            const points = (layer.geojson.features || [])
                .filter(f => f.geometry?.type === 'Point')
                .map(f => f.geometry.coordinates);
            if (points.length === 0) return;

            preloadedLayersRef.current.add(layer.id);

            ['regions', 'cities', 'districts'].forEach(level => {
                const cacheKey = `${layer.id}::${level}`;
                if (choroplethCacheRef.current[cacheKey]) return;
                getChoroplethData({ points, level, region_id: null, city_id: null })
                    .then(data => { choroplethCacheRef.current[cacheKey] = data; })
                    .catch(err => console.error(`Choropleth preload (${level}):`, err));
            });
        });
    }, [selectedLayers]);

    // 2. Sync non-choropleth Leaflet Layers
    useEffect(() => {
        if (!mapInstance) return;

        const currentLayerIds = selectedLayers.map(l => l.id);

        Object.keys(layerGroupsRef.current).forEach(id => {
            if (!currentLayerIds.includes(id)) {
                mapInstance.removeLayer(layerGroupsRef.current[id]);
                delete layerGroupsRef.current[id];
            }
        });

        selectedLayers.forEach((layer, index) => {
            if (!layer.geojson) return;

            const isVisible = visibleLayerIds.has(layer.id);
            const mode = layerVizModes[layer.id] || 'plotting';
            const color = LAYER_COLORS[index % LAYER_COLORS.length];

            if (mode === 'none') {
                if (layerGroupsRef.current[layer.id]) {
                    mapInstance.removeLayer(layerGroupsRef.current[layer.id]);
                    delete layerGroupsRef.current[layer.id];
                }
                return;
            }

            if (mode === 'choropleth') {
                if (layerGroupsRef.current[layer.id] && layerGroupsRef.current[layer.id]._vizMode !== 'choropleth') {
                    mapInstance.removeLayer(layerGroupsRef.current[layer.id]);
                    delete layerGroupsRef.current[layer.id];
                }
                return;
            }

            const existingLayer = layerGroupsRef.current[layer.id];
            const popupKey = (layer.popupFields || []).join(',');
            const needsRecreation = !existingLayer || existingLayer._vizMode !== mode || existingLayer._popupKey !== popupKey;

            if (needsRecreation) {
                if (existingLayer) mapInstance.removeLayer(existingLayer);

                let newLayer;
                if (mode === 'heatmap') {
                    const raw = [];
                    L.geoJSON(layer.geojson).eachLayer(l => {
                        if (l.getLatLng) {
                            const latlng = l.getLatLng();
                            raw.push({ lat: latlng.lat, lng: latlng.lng, intensity: 1.0 });
                        }
                    });
                    const points = toLeafletHeatPoints(raw);
                    newLayer = L.heatLayer(points, {
                        radius: 40,
                        blur: 25,
                        maxZoom: 18,
                        max: Math.max(points.length * 0.15, 3),
                        minOpacity: 0.3,
                        gradient: {
                            0.2: '#0000ff',
                            0.4: '#00ff00',
                            0.6: '#ffff00',
                            0.8: '#ff7f00',
                            1.0: '#ff0000'
                        }
                    });
                } else {
                    const allowed = layer.popupFields?.length > 0 ? new Set(layer.popupFields) : null;
                    newLayer = L.geoJSON(layer.geojson, {
                        style: { color, weight: 1, fillOpacity: 1.0, color: '#fff' },
                        pointToLayer: (feature, latlng) => L.circleMarker(latlng, {
                            radius: 7,
                            fillColor: color,
                            stroke: false,
                            fillOpacity: 1.0
                        }),
                        onEachFeature: (feature, l) => {
                            const props = feature.properties || {};
                            const featureName = props.name || props.title || props.id || "Feature";
                            const datasetName = layer.name;
                            const HIDDEN = new Set(['name', 'title', 'id']);
                            const entries = Object.entries(props).filter(([k, v]) =>
                                !HIDDEN.has(k) && typeof v !== 'object' && v !== null && v !== ''
                                && (!allowed || allowed.has(k))
                            );
                            const propsHtml = entries.length
                                ? entries.slice(0, 12).map(([k, v]) =>
                                    `<div class="text-xs"><span class="font-medium text-gray-600">${k.replace(/_/g, ' ')}:</span> ${v}</div>`
                                ).join('')
                                : '';
                            l.bindPopup(`
                                <div class="p-1">
                                    <div class="font-bold text-sm border-b pb-1 mb-1">${featureName}</div>
                                    <div class="text-xs text-gray-500 mb-1">Layer: ${datasetName}</div>
                                    ${propsHtml}
                                </div>
                            `);
                            l.bindTooltip(`
                                <div class="font-medium text-xs">${featureName}</div>
                                <div class="text-[10px] text-gray-400 font-normal">${datasetName}</div>
                            `, { sticky: true, direction: 'top', offset: [0, -5], className: 'custom-map-tooltip' });
                        }
                    });
                }

                newLayer._vizMode = mode;
                newLayer._popupKey = popupKey;
                layerGroupsRef.current[layer.id] = newLayer;
            }

            const lg = layerGroupsRef.current[layer.id];
            if (isVisible && !mapInstance.hasLayer(lg)) {
                lg.addTo(mapInstance);
            } else if (!isVisible && mapInstance.hasLayer(lg)) {
                mapInstance.removeLayer(lg);
            }
        });
    }, [mapInstance, selectedLayers, visibleLayerIds, layerVizModes]);

    // 3. Choropleth effect — cached fetches, instant recolor
    useEffect(() => {
        if (!mapInstance) return;

        const buildLayer = (boundaryGeojson, colorScheme) => {
            const counts = boundaryGeojson.features.map(f => f.properties?.count ?? 0);
            const scale = createChoroplethScale(counts, colorScheme);
            return L.geoJSON(boundaryGeojson, {
                style: (feature) => {
                    const count = feature.properties?.count ?? 0;
                    const fillColor = count === 0 ? '#e5e7eb' : scale.getQuantizedColor(count);
                    return { fillColor, fillOpacity: 0.65, color: '#666', weight: 1 };
                },
                onEachFeature: (feature, l) => {
                    const props = feature.properties || {};
                    const name = props.name_en || props.name_ar || 'Unknown';
                    const count = props.count ?? 0;
                    l.bindTooltip(`<b>${name}</b>: ${count}`, { sticky: true });
                    l.bindPopup(`
                        <div class="p-1">
                            <div class="font-bold text-sm border-b pb-1 mb-1">${name}</div>
                            <div class="text-xs text-gray-500">${count} point${count !== 1 ? 's' : ''}</div>
                        </div>
                    `);
                }
            });
        };

        selectedLayers.forEach((layer) => {
            const mode = layerVizModes[layer.id] || 'plotting';

            if (mode !== 'choropleth') {
                const existing = layerGroupsRef.current[layer.id];
                if (existing && existing._vizMode === 'choropleth') {
                    mapInstance.removeLayer(existing);
                    delete layerGroupsRef.current[layer.id];
                    delete choroplethRenderedRef.current[layer.id];
                }
                return;
            }

            if (!layer.geojson) return;
            if (!visibleLayerIds.has(layer.id)) return;

            const settings = choroplethSettings?.[layer.id] || { boundaryLock: 'auto', colorScheme: 'Blues' };
            const resolvedLevel = settings.boundaryLock === 'auto' ? zoomToLevel(mapZoom) : settings.boundaryLock;
            const colorScheme = settings.colorScheme || 'Blues';

            if (settings.resolvedLevel !== resolvedLevel && setChoroplethSettings) {
                setChoroplethSettings(prev => ({
                    ...prev,
                    [layer.id]: { ...(prev[layer.id] || { boundaryLock: 'auto', colorScheme: 'Blues' }), resolvedLevel }
                }));
            }

            const renderKey = `${resolvedLevel}::${colorScheme}`;
            if (choroplethRenderedRef.current[layer.id] === renderKey) {
                const lg = layerGroupsRef.current[layer.id];
                if (lg && !mapInstance.hasLayer(lg)) lg.addTo(mapInstance);
                return;
            }

            const cacheKey = `${layer.id}::${resolvedLevel}`;
            const cached = choroplethCacheRef.current[cacheKey];

            if (cached) {
                // Cache hit — rebuild layer with new colors (no fetch)
                const existing = layerGroupsRef.current[layer.id];
                if (existing) mapInstance.removeLayer(existing);

                const newLayer = L.layerGroup();
                newLayer._vizMode = 'choropleth';
                buildLayer(cached, colorScheme).addTo(newLayer);
                layerGroupsRef.current[layer.id] = newLayer;
                newLayer.addTo(mapInstance);
                choroplethRenderedRef.current[layer.id] = renderKey;
                return;
            }

            // Cache miss — fetch
            const points = [];
            L.geoJSON(layer.geojson).eachLayer(l => {
                if (l.getLatLng) {
                    const latlng = l.getLatLng();
                    points.push([latlng.lng, latlng.lat]);
                }
            });
            if (points.length === 0) return;

            const existing = layerGroupsRef.current[layer.id];
            if (existing) mapInstance.removeLayer(existing);
            choroplethRenderedRef.current[layer.id] = null;

            const newLayer = L.layerGroup();
            newLayer._vizMode = 'choropleth';
            layerGroupsRef.current[layer.id] = newLayer;
            newLayer.addTo(mapInstance);

            getChoroplethData({ points, level: resolvedLevel, region_id: null, city_id: null })
                .then(boundaryGeojson => {
                    choroplethCacheRef.current[cacheKey] = boundaryGeojson;
                    if (choroplethRenderedRef.current[layer.id] !== null) return;
                    buildLayer(boundaryGeojson, colorScheme).addTo(newLayer);
                    choroplethRenderedRef.current[layer.id] = renderKey;
                })
                .catch(err => console.error('Choropleth fetch failed:', err));
        });
    }, [mapInstance, selectedLayers, visibleLayerIds, layerVizModes, mapZoom, choroplethSettings]);
}
