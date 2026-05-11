import { createChoroplethScale, getColorRange, getLegendEntries, COLOR_SCHEMES } from '../choroplethScale';

describe('choroplethScale.js', () => {
    describe('getColorRange', () => {
        it('should return an array of hex colors', () => {
            const colors = getColorRange('Blues', 5);
            expect(colors.length).toBe(5);
            expect(colors[0]).toMatch(/^#[0-9A-Fa-f]{6}$/);
        });

        it('should fallback to YlOrRd for invalid scheme', () => {
            const colors = getColorRange('InvalidScheme', 3);
            const fallbackColors = getColorRange('YlOrRd', 3);
            expect(colors).toEqual(fallbackColors);
        });
    });

    describe('createChoroplethScale', () => {
        it('should create a scale with correct max and buckets', () => {
            const values = [0, 10, 50, 100];
            const result = createChoroplethScale(values, 'Blues');

            expect(result.domain).toEqual([0, 100]);
            expect(result.breaks.length).toBe(5);
            expect(result.buckets.length).toBe(4);
            expect(result.range.length).toBe(7); // Default steps
            
            // Bucket tests
            expect(result.buckets[0].lo).toBe(1);
            expect(result.buckets[3].hi).toBe(Infinity);
        });

        it('should handle empty arrays or zero max gracefully', () => {
            const result = createChoroplethScale([0, 0, 0], 'Blues');
            expect(result.domain).toEqual([0, 1]); // Max gets bumped to 1 to avoid /0
        });

        it('should fallback to YlOrRd for invalid scheme', () => {
            const result = createChoroplethScale([1, 2, 3], 'Invalid');
            const fallback = createChoroplethScale([1, 2, 3], 'YlOrRd');
            expect(result.domain).toEqual(fallback.domain);
        });

        it('getColor should interpolate raw values', () => {
            const result = createChoroplethScale([0, 100], 'Blues');
            expect(result.getColor(50)).toMatch(/^#[0-9A-Fa-f]{6}$/);
        });

        it('getQuantizedColor should map to correct buckets', () => {
            // Breaks will be 0, 25, 50, 75, 100
            // Buckets: [1, 25], [26, 50], [51, 75], [76, Infinity]
            const result = createChoroplethScale([0, 100], 'Blues');
            
            expect(result.getQuantizedColor(10)).toBe(result.buckets[0].color);
            expect(result.getQuantizedColor(25)).toBe(result.buckets[0].color);
            expect(result.getQuantizedColor(26)).toBe(result.buckets[1].color);
            expect(result.getQuantizedColor(100)).toBe(result.buckets[3].color);
            expect(result.getQuantizedColor(200)).toBe(result.buckets[3].color); // Fallback to last
        });
    });

    describe('getLegendEntries', () => {
        it('should handle undefined input', () => {
            expect(getLegendEntries()).toEqual([]);
            expect(getLegendEntries(null)).toEqual([]);
            expect(getLegendEntries({})).toEqual([]);
        });

        it('should format legend labels correctly', () => {
            const scaleResult = {
                buckets: [
                    { lo: 1, hi: 1, color: '#f00' },
                    { lo: 2, hi: 10, color: '#0f0' },
                    { lo: 11, hi: Infinity, color: '#00f' }
                ]
            };

            const entries = getLegendEntries(scaleResult);
            expect(entries).toEqual([
                { color: '#f00', rangeLabel: '1' },
                { color: '#0f0', rangeLabel: '2 - 10' },
                { color: '#00f', rangeLabel: '11+' }
            ]);
        });
    });
});
