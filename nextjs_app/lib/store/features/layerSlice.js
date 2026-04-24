import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  selectedLayer: null, // { projectId, datasetId, datasetName }
};

export const layerSlice = createSlice({
  name: 'layer',
  initialState,
  reducers: {
    setSelectedLayer: (state, action) => {
      state.selectedLayer = action.payload;
    },
    clearSelectedLayer: (state) => {
      state.selectedLayer = null;
    },
  },
});

export const { setSelectedLayer, clearSelectedLayer } = layerSlice.actions;
export const selectSelectedLayer = (state) => state.layer.selectedLayer;
export default layerSlice.reducer;
