import { renderHook, act } from '@testing-library/react';
import { useChartData, isBlocker } from '../useChartData';

describe('useChartData', () => {
    const mockFields = [
        { name: 'category', type: 'string' },
        { name: 'price', type: 'number' },
        { name: 'status', type: 'string' },
    ];

    const mockFeatures = [
        { geometry: { type: 'Point', coordinates: [0, 0] }, properties: { category: 'A', price: 10 } },
        { geometry: { type: 'Point', coordinates: [1, 1] }, properties: { category: 'B', price: 20 } },
        { geometry: { type: 'Point', coordinates: [2, 2] }, properties: { category: 'A', price: 30 } },
        { geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] }, properties: { category: 'A' } }, // Non-point
    ];

    it('should initialize with the first categorical field', () => {
        const { result } = renderHook(() => useChartData(mockFeatures, mockFields));

        expect(result.current.categoricalFields.length).toBe(2);
        expect(result.current.selectedField).toBe('category');
    });

    it('should calculate chart data based on selected field', () => {
        const { result } = renderHook(() => useChartData(mockFeatures, mockFields));

        // 3 point features: two 'A's, one 'B'
        expect(result.current.chartData).toHaveLength(2);
        
        const catA = result.current.chartData.find(d => d.category === 'A');
        expect(catA.count).toBe(2);
    });

    it('should allow changing the selected field', () => {
        const { result } = renderHook(() => useChartData(mockFeatures, mockFields));

        act(() => {
            result.current.setSelectedField('status');
        });

        expect(result.current.selectedField).toBe('status');
    });

    it('should return no_data blocker for empty features', () => {
        const { result } = renderHook(() => useChartData([], mockFields));
        expect(result.current.diagnostics.status).toBe('no_data');
        expect(isBlocker(result.current.diagnostics.status)).toBe(true);
    });

    it('should return no_categorical_fields blocker if no string fields exist', () => {
        const numericFields = [{ name: 'price', type: 'number' }];
        const { result } = renderHook(() => useChartData(mockFeatures, numericFields));
        expect(result.current.diagnostics.status).toBe('no_categorical_fields');
        expect(isBlocker(result.current.diagnostics.status)).toBe(true);
    });

    it('should return no_points blocker if no Point geometries exist', () => {
        const lineFeatures = [{ geometry: { type: 'LineString' }, properties: { category: 'A' } }];
        const { result } = renderHook(() => useChartData(lineFeatures, mockFields));
        
        expect(result.current.diagnostics.pointCount).toBe(0);
        expect(result.current.diagnostics.nonPointCount).toBe(1);
        expect(result.current.diagnostics.status).toBe('no_points');
        expect(isBlocker(result.current.diagnostics.status)).toBe(true);
    });

    it('should detect high_nulls warning', () => {
        const nullFeatures = [
            { geometry: { type: 'Point', coordinates: [0, 0] } }, // Unknown
            { geometry: { type: 'Point', coordinates: [1, 1] } }, // Unknown
            { geometry: { type: 'Point', coordinates: [2, 2] } }, // Unknown
            { geometry: { type: 'Point', coordinates: [3, 3] }, properties: { category: 'A' } },
        ];
        
        const { result } = renderHook(() => useChartData(nullFeatures, mockFields));
        
        expect(result.current.diagnostics.status).toBe('high_nulls');
        expect(result.current.diagnostics.nullPercent).toBe(75);
        expect(isBlocker(result.current.diagnostics.status)).toBe(false);
    });

    it('should detect single_value warning', () => {
        const singleCatFeatures = [
            { geometry: { type: 'Point', coordinates: [0, 0] }, properties: { category: 'A' } },
            { geometry: { type: 'Point', coordinates: [1, 1] }, properties: { category: 'A' } },
        ];
        
        const { result } = renderHook(() => useChartData(singleCatFeatures, mockFields));
        
        expect(result.current.diagnostics.status).toBe('single_value');
    });

    it('should detect all_unique warning', () => {
        const uniqueFeatures = [
            { geometry: { type: 'Point', coordinates: [0, 0] }, properties: { category: 'A' } },
            { geometry: { type: 'Point', coordinates: [1, 1] }, properties: { category: 'B' } },
            { geometry: { type: 'Point', coordinates: [2, 2] }, properties: { category: 'C' } },
        ];
        
        const { result } = renderHook(() => useChartData(uniqueFeatures, mockFields));
        
        expect(result.current.diagnostics.status).toBe('all_unique');
    });
});
