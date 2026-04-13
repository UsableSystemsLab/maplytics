import { inferFields } from '../infer-fields.js';

describe('inferFields', () => {
    const makeFeatureCollection = (propsArray) => ({
        type: 'FeatureCollection',
        features: propsArray.map(props => ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [0, 0] },
            properties: { ...props },
        })),
    });

    it('detects string fields with unique values', () => {
        const geojson = makeFeatureCollection([
            { category: 'park' },
            { category: 'museum' },
            { category: 'park' },
        ]);
        const fields = inferFields(geojson);

        expect(fields).toHaveLength(1);
        expect(fields[0].name).toBe('category');
        expect(fields[0].type).toBe('string');
        expect(fields[0].values).toEqual(['park', 'museum']);
    });

    it('detects number fields with min/max', () => {
        const geojson = makeFeatureCollection([
            { score: 10 },
            { score: 50 },
            { score: 30 },
        ]);
        const fields = inferFields(geojson);

        expect(fields).toHaveLength(1);
        expect(fields[0].name).toBe('score');
        expect(fields[0].type).toBe('number');
        expect(fields[0].min).toBe(10);
        expect(fields[0].max).toBe(50);
    });

    it('omits values array when more than 100 unique strings', () => {
        const props = Array.from({ length: 101 }, (_, i) => ({ tag: `tag_${i}` }));
        const geojson = makeFeatureCollection(props);
        const fields = inferFields(geojson);

        expect(fields[0].type).toBe('string');
        expect(fields[0].values).toBeUndefined();
    });

    it('returns empty array for empty FeatureCollection', () => {
        const geojson = { type: 'FeatureCollection', features: [] };
        expect(inferFields(geojson)).toEqual([]);
    });

    it('treats mixed fields (number + non-numeric string) as string', () => {
        const geojson = makeFeatureCollection([
            { val: 42 },
            { val: 'hello' },
        ]);
        const fields = inferFields(geojson);

        expect(fields[0].type).toBe('string');
    });

    it('excludes null/empty values from type detection', () => {
        const geojson = makeFeatureCollection([
            { score: 10 },
            { score: null },
            { score: '' },
            { score: 20 },
        ]);
        const fields = inferFields(geojson);

        expect(fields[0].type).toBe('number');
        expect(fields[0].min).toBe(10);
        expect(fields[0].max).toBe(20);
    });

    it('handles multiple fields of different types', () => {
        const geojson = makeFeatureCollection([
            { name: 'Park', rating: 4.5 },
            { name: 'Museum', rating: 3.8 },
        ]);
        const fields = inferFields(geojson);

        expect(fields).toHaveLength(2);

        const nameField = fields.find(f => f.name === 'name');
        const ratingField = fields.find(f => f.name === 'rating');

        expect(nameField.type).toBe('string');
        expect(nameField.values).toEqual(['Park', 'Museum']);
        expect(ratingField.type).toBe('number');
        expect(ratingField.min).toBe(3.8);
        expect(ratingField.max).toBe(4.5);
    });

    it('treats numeric strings as numbers', () => {
        const geojson = makeFeatureCollection([
            { val: '100' },
            { val: '200' },
        ]);
        const fields = inferFields(geojson);

        expect(fields[0].type).toBe('number');
        expect(fields[0].min).toBe(100);
        expect(fields[0].max).toBe(200);
    });

    it('includes exactly 100 unique values at the threshold', () => {
        const props = Array.from({ length: 100 }, (_, i) => ({ tag: `tag_${i}` }));
        const geojson = makeFeatureCollection(props);
        const fields = inferFields(geojson);

        expect(fields[0].type).toBe('string');
        expect(fields[0].values).toHaveLength(100);
    });
});
