import layersReducer, {
    toggleLayer,
    addLayer,
    removeLayer,
    setLayerGeojson,
    setLayerLoading,
    clearLayers,
    selectSelectedLayers,
    selectLoadingLayerIds,
    selectIsLayerSelected
} from '../layersSlice';

describe('layersSlice', () => {
    const initialState = {
        selectedLayers: [],
        loadingLayerIds: [],
    };

    it('should return the initial state', () => {
        expect(layersReducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    describe('reducers', () => {
        it('should handle toggleLayer', () => {
            const layer1 = { id: 'l1', name: 'Layer 1' };
            // Add
            let state = layersReducer(initialState, toggleLayer(layer1));
            expect(state.selectedLayers).toEqual([layer1]);
            
            // Remove (toggle off)
            state = layersReducer(state, toggleLayer(layer1));
            expect(state.selectedLayers).toEqual([]);
        });

        it('should handle addLayer', () => {
            const layer1 = { id: 'l1', name: 'Layer 1' };
            let state = layersReducer(initialState, addLayer(layer1));
            expect(state.selectedLayers).toEqual([layer1]);

            // Add duplicate, should not add
            state = layersReducer(state, addLayer(layer1));
            expect(state.selectedLayers).toEqual([layer1]);
        });

        it('should handle removeLayer', () => {
            const layer1 = { id: 'l1' };
            const layer2 = { id: 'l2' };
            let state = { selectedLayers: [layer1, layer2], loadingLayerIds: [] };
            
            state = layersReducer(state, removeLayer('l1'));
            expect(state.selectedLayers).toEqual([layer2]);
        });

        it('should handle setLayerGeojson', () => {
            const layer1 = { id: 'l1', geojson: null, fields: null };
            let state = { selectedLayers: [layer1], loadingLayerIds: [] };
            
            const geojson = { type: 'FeatureCollection' };
            const fields = [{ name: 'f1' }];
            
            state = layersReducer(state, setLayerGeojson({ layerId: 'l1', geojson, fields }));
            expect(state.selectedLayers[0].geojson).toEqual(geojson);
            expect(state.selectedLayers[0].fields).toEqual(fields);
            
            // Should do nothing if layer not found
            state = layersReducer(state, setLayerGeojson({ layerId: 'l99', geojson, fields }));
            expect(state.selectedLayers[0].geojson).toEqual(geojson);
        });

        it('should handle setLayerLoading', () => {
            let state = layersReducer(initialState, setLayerLoading({ layerId: 'l1', isLoading: true }));
            expect(state.loadingLayerIds).toEqual(['l1']);
            
            // Duplicate should not add
            state = layersReducer(state, setLayerLoading({ layerId: 'l1', isLoading: true }));
            expect(state.loadingLayerIds).toEqual(['l1']);
            
            // Set false should remove
            state = layersReducer(state, setLayerLoading({ layerId: 'l1', isLoading: false }));
            expect(state.loadingLayerIds).toEqual([]);
        });

        it('should handle clearLayers', () => {
            let state = { selectedLayers: [{ id: 'l1' }], loadingLayerIds: ['l1'] };
            state = layersReducer(state, clearLayers());
            expect(state.selectedLayers).toEqual([]);
            expect(state.loadingLayerIds).toEqual([]);
        });
    });

    describe('selectors', () => {
        const mockState = {
            layers: {
                selectedLayers: [{ id: 'l1', name: 'Layer 1' }],
                loadingLayerIds: ['l1']
            }
        };

        it('should selectSelectedLayers', () => {
            expect(selectSelectedLayers(mockState)).toEqual([{ id: 'l1', name: 'Layer 1' }]);
        });

        it('should selectLoadingLayerIds', () => {
            expect(selectLoadingLayerIds(mockState)).toEqual(['l1']);
        });

        it('should selectIsLayerSelected', () => {
            expect(selectIsLayerSelected(mockState, 'l1')).toBe(true);
            expect(selectIsLayerSelected(mockState, 'l2')).toBe(false);
        });
    });
});
