import { renderHook, act, waitFor } from '@testing-library/react';
import { useDistrictComparison } from '../useDistrictComparison';
import { getDistrictBoundaries } from '@/lib/geoApi';
import { getProjectDatasetData } from '@/lib/datasetApi';
import { getComparisonStats } from '@/lib/comparisonApi';
import { useAuth } from '@/hooks/useAuth';

jest.mock('@/lib/geoApi', () => ({
    getDistrictBoundaries: jest.fn(),
}));

jest.mock('@/lib/datasetApi', () => ({
    getProjectDatasetData: jest.fn(),
}));

jest.mock('@/lib/comparisonApi', () => ({
    getComparisonStats: jest.fn(),
}));

jest.mock('@/hooks/useAuth', () => ({
    useAuth: jest.fn(),
}));

// Mock window events
const dispatchLayerSelected = (detail) => {
    const event = new CustomEvent('layerSelected', { detail });
    window.dispatchEvent(event);
};

describe('useDistrictComparison', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        useAuth.mockReturnValue({ user: { uid: '123' } });
        
        getDistrictBoundaries.mockResolvedValue({
            features: [
                { properties: { district_id: '1', name_en: 'District 1', city_name: 'City A' }, geometry: { type: 'Polygon', coordinates: [] } },
                { properties: { district_id: '2', name_en: 'District 2', city_name: 'City A' }, geometry: { type: 'Polygon', coordinates: [] } },
                { properties: { district_id: '3', name_en: 'District 3', city_name: 'City B' }, geometry: { type: 'Polygon', coordinates: [] } },
            ]
        });
    });

    it('should initialize and load districts on mount', async () => {
        const { result } = renderHook(() => useDistrictComparison());

        await waitFor(() => {
            expect(result.current.allCities).toHaveLength(2); // City A, City B
        });

        expect(getDistrictBoundaries).toHaveBeenCalledTimes(1);
    });

    it('should handle layerSelected event and load dataset data', async () => {
        getProjectDatasetData.mockResolvedValue({
            geojson: { type: 'FeatureCollection', features: [] },
            fields: [{ name: 'category', type: 'string' }]
        });

        const { result } = renderHook(() => useDistrictComparison());

        act(() => {
            dispatchLayerSelected({
                projectId: 'p1',
                datasetId: 'd1',
                datasetName: 'Test Dataset',
                pgDatasetId: 'pg1'
            });
        });

        expect(result.current.loading).toBe(true);
        expect(result.current.selectedDataset).toEqual(expect.objectContaining({ datasetId: 'd1' }));

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(getProjectDatasetData).toHaveBeenCalledWith('p1', 'd1', '123');
        expect(result.current.selectedField).toBe('category'); // Auto selected
    });

    it('should clear data when layerSelected event has no detail', async () => {
        const { result } = renderHook(() => useDistrictComparison());

        act(() => {
            dispatchLayerSelected(null);
        });

        expect(result.current.selectedDataset).toBeNull();
        expect(result.current.geojsonData).toBeNull();
    });

    it('should cascade city to district selection properly', async () => {
        const { result } = renderHook(() => useDistrictComparison());

        await waitFor(() => {
            expect(result.current.allCities).toHaveLength(2);
        });

        act(() => {
            result.current.handleCityAChange('City A');
        });

        expect(result.current.cityA).toBe('City A');
        // District 1 and 2 are in City A
        expect(result.current.districtsForCityA).toHaveLength(2);

        act(() => {
            result.current.setDistrictB('1'); // B selects district 1
        });

        // District 1 should no longer be available for A since B selected it
        expect(result.current.districtsForCityA).toHaveLength(1);
        expect(result.current.districtsForCityA[0].district_id).toBe('2');
    });

    it('should fetch backend comparison stats when pgDatasetId and districts are selected', async () => {
        getComparisonStats.mockResolvedValue({
            districts: [
                { district_id: '1', total_count: 100 },
                { district_id: '2', total_count: 50 },
            ],
            fields: []
        });

        const { result } = renderHook(() => useDistrictComparison());

        // Simulate dataset selection
        act(() => {
            dispatchLayerSelected({ pgDatasetId: 'pg1' });
        });

        // Select districts
        act(() => {
            result.current.setDistrictA('1');
            result.current.setDistrictB('2');
        });

        expect(result.current.statsLoading).toBe(true);

        await waitFor(() => {
            expect(result.current.statsLoading).toBe(false);
        });

        expect(getComparisonStats).toHaveBeenCalledWith('pg1', ['1', '2']);
        expect(result.current.statsA).toEqual({ district_id: '1', total_count: 100 });
        expect(result.current.statsB).toEqual({ district_id: '2', total_count: 50 });
    });
});
