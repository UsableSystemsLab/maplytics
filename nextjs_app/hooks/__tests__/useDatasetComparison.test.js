import { renderHook, act, waitFor } from '@testing-library/react';
import { useDatasetComparison } from '../useDatasetComparison';
import { getDatasets, getDatasetGeoJSON } from '@/lib/datasetApi';
import { useAuth } from '@/hooks/useAuth';

jest.mock('@/lib/datasetApi', () => ({
    getDatasets: jest.fn(),
    getDatasetGeoJSON: jest.fn(),
}));

jest.mock('@/hooks/useAuth', () => ({
    useAuth: jest.fn(),
}));

jest.mock('@/lib/fieldStats', () => ({
    computeFieldStats: jest.fn().mockReturnValue({}),
}));

describe('useDatasetComparison', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should initialize and fetch public datasets when user is not logged in', async () => {
        useAuth.mockReturnValue({ user: null });
        getDatasets.mockResolvedValueOnce({
            datasets: [{ id: 'd1', name: 'Public Data' }]
        });

        const { result } = renderHook(() => useDatasetComparison());

        expect(result.current.loadingDatasets).toBe(true);

        await waitFor(() => {
            expect(result.current.loadingDatasets).toBe(false);
        });

        expect(getDatasets).toHaveBeenCalledWith({ is_public: true });
        expect(getDatasets).toHaveBeenCalledTimes(1);
        expect(result.current.allDatasets).toHaveLength(1);
        expect(result.current.allDatasets[0].uniqueId).toBe('d1');
    });

    it('should fetch public and private datasets when user is logged in', async () => {
        useAuth.mockReturnValue({ user: { uid: '123' } });
        
        // Mock public call
        getDatasets.mockResolvedValueOnce({
            datasets: [{ id: 'd1', name: 'Public Data' }]
        });
        
        // Mock private call
        getDatasets.mockResolvedValueOnce({
            datasets: [
                { id: 'd1', name: 'Public Data' }, // Duplicate, should be ignored
                { id: 'd2', name: 'Private Data' }
            ]
        });

        const { result } = renderHook(() => useDatasetComparison());

        await waitFor(() => {
            expect(result.current.loadingDatasets).toBe(false);
        });

        expect(getDatasets).toHaveBeenCalledWith({ is_public: true });
        expect(getDatasets).toHaveBeenCalledWith({ is_public: false });
        
        expect(result.current.allDatasets).toHaveLength(2);
        expect(result.current.allDatasets[0].uniqueId).toBe('d1');
        expect(result.current.allDatasets[1].uniqueId).toBe('d2');
    });

    it('should load dataset data when datasetId changes', async () => {
        useAuth.mockReturnValue({ user: null });
        getDatasets.mockResolvedValue({ datasets: [] });
        
        const mockGeojson = {
            features: [
                { properties: { name: 'A', value: 10 } }
            ]
        };
        getDatasetGeoJSON.mockResolvedValue(mockGeojson);

        const { result } = renderHook(() => useDatasetComparison());

        act(() => {
            result.current.setDatasetIdA('test-id');
        });

        expect(result.current.loadingA).toBe(true);

        await waitFor(() => {
            expect(result.current.loadingA).toBe(false);
        });

        expect(getDatasetGeoJSON).toHaveBeenCalledWith('test-id');
        expect(result.current.featurePointsA).toEqual(mockGeojson);
        expect(result.current.stringFields).toHaveLength(1); // 'name' inferred
        expect(result.current.numericFields).toHaveLength(1); // 'value' inferred
    });

    it('should handle errors gracefully during dataset list fetch', async () => {
        useAuth.mockReturnValue({ user: null });
        getDatasets.mockRejectedValue(new Error('Network error'));

        const { result } = renderHook(() => useDatasetComparison());

        await waitFor(() => {
            expect(result.current.loadingDatasets).toBe(false);
        });

        expect(result.current.error).toBe('Failed to load datasets list.');
        expect(result.current.allDatasets).toEqual([]);
    });
});
