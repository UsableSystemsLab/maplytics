import { inferFieldTypes, computeFieldStats } from '../fieldUtils.js';

describe('inferFieldTypes', () => {
    it('returns empty array for empty/null input', () => {
        expect(inferFieldTypes([])).toEqual([]);
        expect(inferFieldTypes(null)).toEqual([]);
        expect(inferFieldTypes(undefined)).toEqual([]);
    });

    it('infers number type with min/max for purely numeric fields', () => {
        const fields = inferFieldTypes([{ pop: 100 }, { pop: 200 }, { pop: 50 }]);
        expect(fields).toHaveLength(1);
        expect(fields[0]).toEqual({ name: 'pop', type: 'number', min: 50, max: 200 });
    });

    it('treats numeric strings as numbers', () => {
        const fields = inferFieldTypes([{ x: '10' }, { x: '20' }]);
        expect(fields[0].type).toBe('number');
        expect(fields[0].min).toBe(10);
        expect(fields[0].max).toBe(20);
    });

    it('infers string type with unique values when <= 100 distinct', () => {
        const fields = inferFieldTypes([{ city: 'A' }, { city: 'B' }, { city: 'A' }]);
        expect(fields[0]).toEqual({
            name: 'city',
            type: 'string',
            values: expect.arrayContaining(['A', 'B']),
        });
        expect(fields[0].values).toHaveLength(2);
    });

    it('omits values list when more than 100 distinct strings', () => {
        const items = Array.from({ length: 101 }, (_, i) => ({ name: `v${i}` }));
        const fields = inferFieldTypes(items);
        expect(fields[0].type).toBe('string');
        expect(fields[0].values).toBeUndefined();
    });

    it('treats mixed numeric + non-numeric as string', () => {
        const fields = inferFieldTypes([{ v: 1 }, { v: 'hello' }]);
        expect(fields[0].type).toBe('string');
    });

    it('does not classify booleans as numbers', () => {
        const fields = inferFieldTypes([{ flag: true }, { flag: false }]);
        expect(fields[0].type).toBe('string');
    });

    it('skips undefined/null/empty values when inferring', () => {
        const fields = inferFieldTypes([{ x: 1 }, { x: null }, { x: '' }, { x: 2 }]);
        expect(fields[0].type).toBe('number');
        expect(fields[0].min).toBe(1);
        expect(fields[0].max).toBe(2);
    });

    it('aggregates keys across all property objects', () => {
        const fields = inferFieldTypes([{ a: 1 }, { b: 'x' }]);
        const names = fields.map(f => f.name).sort();
        expect(names).toEqual(['a', 'b']);
    });

    it('ignores non-object entries safely', () => {
        const fields = inferFieldTypes([null, undefined, { a: 1 }]);
        expect(fields).toHaveLength(1);
        expect(fields[0].name).toBe('a');
    });
});

describe('computeFieldStats', () => {
    it('returns count: 0 for numeric field with no valid values', () => {
        const stats = computeFieldStats(
            [{ x: 'abc' }, { x: 'xyz' }],
            [{ name: 'x', type: 'number' }]
        );
        expect(stats.x).toEqual({ type: 'number', count: 0 });
    });

    it('computes sum/avg/min/max/count for numeric fields', () => {
        const stats = computeFieldStats(
            [{ pop: 100 }, { pop: 200 }, { pop: 300 }],
            [{ name: 'pop', type: 'number' }]
        );
        expect(stats.pop).toEqual({
            type: 'number',
            count: 3,
            min: 100,
            max: 300,
            avg: 200,
            sum: 600,
        });
    });

    it('rounds avg to two decimals', () => {
        const stats = computeFieldStats(
            [{ x: 1 }, { x: 2 }, { x: 2 }],
            [{ name: 'x', type: 'number' }]
        );
        expect(stats.x.avg).toBe(1.67);
    });

    it('builds breakdown sorted by count desc for string fields', () => {
        const stats = computeFieldStats(
            [{ c: 'A' }, { c: 'B' }, { c: 'A' }, { c: 'A' }],
            [{ name: 'c', type: 'string' }]
        );
        expect(stats.c.type).toBe('string');
        expect(stats.c.breakdown[0]).toEqual({ category: 'A', count: 3, percentage: 75 });
        expect(stats.c.breakdown[1]).toEqual({ category: 'B', count: 1, percentage: 25 });
    });

    it('substitutes "Unknown" for missing string values', () => {
        const stats = computeFieldStats(
            [{}, { c: 'A' }],
            [{ name: 'c', type: 'string' }]
        );
        const unknown = stats.c.breakdown.find(b => b.category === 'Unknown');
        expect(unknown).toBeDefined();
        expect(unknown.count).toBe(1);
    });

    it('avoids division by zero on empty list', () => {
        const stats = computeFieldStats([], [{ name: 'c', type: 'string' }]);
        expect(stats.c).toEqual({ type: 'string', breakdown: [] });
    });
});
