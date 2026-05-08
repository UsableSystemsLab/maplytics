import { computeFieldStats } from '../fieldStats';

describe('fieldStats.js', () => {
    describe('computeFieldStats', () => {
        it('should return an empty object for empty fields array', () => {
            expect(computeFieldStats([{ a: 1 }], [])).toEqual({});
        });

        it('should compute stats for string fields', () => {
            const propertiesList = [
                { category: 'A' },
                { category: 'A' },
                { category: 'B' },
                {}, // missing field
            ];
            const fields = [{ name: 'category', type: 'string' }];

            const stats = computeFieldStats(propertiesList, fields);

            expect(stats.category).toBeDefined();
            expect(stats.category.type).toBe('string');
            expect(stats.category.breakdown.length).toBe(3); // A, B, Unknown

            // Breakdown should be sorted by count descending
            expect(stats.category.breakdown[0]).toEqual({ category: 'A', count: 2, percentage: 50 });
            expect(stats.category.breakdown[1]).toEqual({ category: 'B', count: 1, percentage: 25 });
            expect(stats.category.breakdown[2]).toEqual({ category: 'Unknown', count: 1, percentage: 25 });
        });

        it('should compute stats for numeric fields', () => {
            const propertiesList = [
                { score: 10 },
                { score: 20 },
                { score: 30 },
                { score: 'invalid' }, // NaN should be filtered out
                {}, // undefined should be filtered out if it coerces to NaN
            ];
            const fields = [{ name: 'score', type: 'number' }];

            const stats = computeFieldStats(propertiesList, fields);

            expect(stats.score).toBeDefined();
            expect(stats.score.type).toBe('number');
            expect(stats.score.count).toBe(3); // 10, 20, 30
            expect(stats.score.min).toBe(10);
            expect(stats.score.max).toBe(30);
            expect(stats.score.sum).toBe(60);
            expect(stats.score.avg).toBe(20);
        });

        it('should handle numeric fields with no valid values', () => {
            const propertiesList = [
                { score: 'invalid' },
                {}, 
            ];
            const fields = [{ name: 'score', type: 'number' }];

            const stats = computeFieldStats(propertiesList, fields);

            expect(stats.score).toBeDefined();
            expect(stats.score.type).toBe('number');
            expect(stats.score.count).toBe(0);
            expect(stats.score.min).toBeUndefined();
        });

        it('should handle empty properties list for string fields', () => {
            const fields = [{ name: 'category', type: 'string' }];
            const stats = computeFieldStats([], fields);

            expect(stats.category.breakdown.length).toBe(0);
        });
    });
});
