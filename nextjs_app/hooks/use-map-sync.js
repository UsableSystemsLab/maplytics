import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet.heat";
import { setLayerGeojson, setLayerLoading } from "@/lib/store/features/layersSlice";
import { getDatasetGeoJSON, getProjectDatasetData } from "@/lib/datasetApi";
import { toLeafletHeatPoints } from "@/components/maps/shared/heatmapData";

const LAYER_COLORS = ['#FFBB00', '#26BB00', '#00BBD9', '#FF003C', '#003BFF', '#FF3BA9'];

export function useMapSync(mapInstance, selectedLayers, visibleLayerIds, layerVizModes, dispatch) {
    const layerGroupsRef = useRef({});

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
                    dispatch(setLayerGeojson({ layerId: layer.id, geojson }));
                }
            } catch (error) {
                console.error(`Failed to load layer ${layer.name}:`, error);
            } finally {
                dispatch(setLayerLoading({ layerId: layer.id, isLoading: false }));
            }
        });
    }, [selectedLayers, dispatch]);

    // 2. Sync Leaflet Layers
    useEffect(() => {
        if (!mapInstance) return;

        const currentLayerIds = selectedLayers.map(l => l.id);

        // Remove layers no longer selected
        Object.keys(layerGroupsRef.current).forEach(id => {
            if (!currentLayerIds.includes(id)) {
                mapInstance.removeLayer(layerGroupsRef.current[id]);
                delete layerGroupsRef.current[id];
            }
        });

        // Update layers
        selectedLayers.forEach((layer, index) => {
            if (!layer.geojson) return;

            const isVisible = visibleLayerIds.has(layer.id);
            const mode = layerVizModes[layer.id] || 'plotting';
            const color = LAYER_COLORS[index % LAYER_COLORS.length];

            const existingLayer = layerGroupsRef.current[layer.id];
            const needsRecreation = !existingLayer || existingLayer._vizMode !== mode;

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
                        radius: 25,
                        blur: 15,
                        maxZoom: 10,
                        minOpacity: 0.4,
                        gradient: {
                            0.2: '#0000ff', // Blue
                            0.4: '#00ff00', // Lime
                            0.6: '#ffff00', // Yellow
                            0.8: '#ff7f00', // Orange
                            1.0: '#ff0000'  // Red
                        }
                    });
                } else {
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
                            l.bindPopup(`
                                <div class="p-1">
                                    <div class="font-bold text-sm border-b pb-1 mb-1">${featureName}</div>
                                    <div class="text-xs text-gray-500">Layer: ${datasetName}</div>
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
}
