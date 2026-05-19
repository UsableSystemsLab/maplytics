import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    selectedLayers: [], // Array of layer objects { id, name, type, pgDatasetId, geojson, ... }
    loadingLayerIds: [], // Array of IDs currently being loaded
};

const layersSlice = createSlice({
    name: 'layers',
    initialState,
    reducers: {
        toggleLayer: (state, action) => {
            const layer = action.payload;
            const index = state.selectedLayers.findIndex(l => l.id === layer.id);
            if (index >= 0) {
                state.selectedLayers.splice(index, 1);
            } else {
                state.selectedLayers.push(layer);
            }
        },
        addLayer: (state, action) => {
            const layer = action.payload;
            if (!state.selectedLayers.find(l => l.id === layer.id)) {
                state.selectedLayers.push(layer);
            }
        },
        removeLayer: (state, action) => {
            const layerId = action.payload;
            state.selectedLayers = state.selectedLayers.filter(l => l.id !== layerId);
        },
        setLayerGeojson: (state, action) => {
            const { layerId, geojson, fields, popupFields } = action.payload;
            const layer = state.selectedLayers.find(l => l.id === layerId);
            if (layer) {
                layer.geojson = geojson;
                layer.fields = fields;
                if (popupFields !== undefined) layer.popupFields = popupFields;
            }
        },
        setLayerPopupFields: (state, action) => {
            const { layerId, popupFields } = action.payload;
            const layer = state.selectedLayers.find(l => l.id === layerId);
            if (layer) layer.popupFields = popupFields;
        },
        setLayerLoading: (state, action) => {
            const { layerId, isLoading } = action.payload;
            if (isLoading) {
                if (!state.loadingLayerIds.includes(layerId)) {
                    state.loadingLayerIds.push(layerId);
                }
            } else {
                state.loadingLayerIds = state.loadingLayerIds.filter(id => id !== layerId);
            }
        },
        clearLayers: (state) => {
            state.selectedLayers = [];
            state.loadingLayerIds = [];
        }
    },
});

export const {
    toggleLayer,
    addLayer,
    removeLayer,
    setLayerGeojson,
    setLayerPopupFields,
    setLayerLoading,
    clearLayers
} = layersSlice.actions;

export const selectSelectedLayers = (state) => state.layers.selectedLayers;
export const selectLoadingLayerIds = (state) => state.layers.loadingLayerIds;
export const selectIsLayerSelected = (state, layerId) => 
    state.layers.selectedLayers.some(l => l.id === layerId);

export default layersSlice.reducer;
