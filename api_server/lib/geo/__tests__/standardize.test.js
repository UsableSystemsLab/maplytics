import { standardizeFieldNames, standardizeValues, deduplicateFeatures } from '../standardize.js';

// --- standardizeFieldNames ---

describe('standardizeFieldNames', () => {
    it('converts camelCase to snake_case', () => {
        const items = [{ firstName: 'Alice', lastName: 'Smith' }];
        const { items: result, renamedFields } = standardizeFieldNames(items);

        expect(result[0]).toHaveProperty('first_name', 'Alice');
        expect(result[0]).toHaveProperty('last_name', 'Smith');
        expect(renamedFields).toEqual({ firstName: 'first_name', lastName: 'last_name' });
    });

    it('converts spaces, hyphens, and dots to underscores', () => {
        const items = [{ 'First Name': 'A', 'last-name': 'B', 'middle.name': 'C' }];
        const { items: result } = standardizeFieldNames(items);

        expect(result[0]).toHaveProperty('first_name');
        expect(result[0]).toHaveProperty('last_name');
        expect(result[0]).toHaveProperty('middle_name');
    });

    it('maps coordinate variants to canonical names', () => {
        const items = [{ Lat: 40, lng: -74, name: 'Test' }];
        const { items: result, renamedFields } = standardizeFieldNames(items);

        expect(result[0]).toHaveProperty('latitude', 40);
        expect(result[0]).toHaveProperty('longitude', -74);
        expect(renamedFields.Lat).toBe('latitude');
        expect(renamedFields.lng).toBe('longitude');
    });

    it('handles field name collisions with numeric suffixes', () => {
        const items = [{ 'First Name': 'A', first_name: 'B' }];
        const { items: result } = standardizeFieldNames(items);

        const keys = Object.keys(result[0]);
        expect(keys).toContain('first_name');
        expect(keys).toContain('first_name_2');
    });

    it('returns empty result for empty items', () => {
        const { items, renamedFields } = standardizeFieldNames([]);

        expect(items).toEqual([]);
        expect(renamedFields).toEqual({});
    });

    it('returns original items by reference when no renames needed', () => {
        const original = [{ name: 'Alice', age: 30 }];
        const { items, renamedFields } = standardizeFieldNames(original);

        expect(items).toBe(original);
        expect(renamedFields).toEqual({});
    });

    it('applies renames to all items, not just the first', () => {
        const items = [
            { firstName: 'Alice' },
            { firstName: 'Bob' },
            { firstName: 'Charlie' },
        ];
        const { items: result } = standardizeFieldNames(items);

        result.forEach(item => {
            expect(item).toHaveProperty('first_name');
            expect(item).not.toHaveProperty('firstName');
        });
    });

    it('handles uppercase acronyms', () => {
        const items = [{ OSM_ID: 123 }];
        const { items: result } = standardizeFieldNames(items);

        expect(result[0]).toHaveProperty('osm_id', 123);
    });
});

// --- standardizeValues ---

describe('standardizeValues', () => {
    const makeFeatureCollection = (features) => ({
        type: 'FeatureCollection',
        features: features.map(props => ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [0, 0] },
            properties: { ...props },
        })),
    });

    it('replaces missing value strings with "Unknown" for string fields', () => {
        const geojson = makeFeatureCollection([
            { name: 'N/A', category: 'null' },
            { name: 'Alice', category: 'park' },
        ]);
        const { filledCount } = standardizeValues(geojson);

        expect(geojson.features[0].properties.name).toBe('Unknown');
        expect(geojson.features[0].properties.category).toBe('Unknown');
        expect(filledCount).toBe(2);
    });

    it('replaces missing values in numeric fields with null', () => {
        const geojson = makeFeatureCollection([
            { score: 10 },
            { score: '' },
        ]);
        standardizeValues(geojson);

        expect(geojson.features[1].properties.score).toBeNull();
    });

    it('trims whitespace on string values', () => {
        const geojson = makeFeatureCollection([
            { name: '  hello  ' },
        ]);
        standardizeValues(geojson);

        expect(geojson.features[0].properties.name).toBe('hello');
    });

    it('handles all known missing value strings', () => {
        const missingValues = ['', 'null', 'NULL', 'N/A', 'n/a', 'NA', 'na', '-', 'undefined', 'none', 'None', 'NONE'];
        const geojson = makeFeatureCollection(
            missingValues.map(v => ({ val: v }))
        );
        standardizeValues(geojson);

        geojson.features.forEach(f => {
            expect(f.properties.val).toBe('Unknown');
        });
    });

    it('ensures all features have the same set of property keys', () => {
        const geojson = makeFeatureCollection([
            { name: 'A' },
            { category: 'park' },
        ]);
        standardizeValues(geojson);

        expect(geojson.features[0].properties).toHaveProperty('category');
        expect(geojson.features[1].properties).toHaveProperty('name');
    });

    it('returns unchanged for empty FeatureCollection', () => {
        const geojson = { type: 'FeatureCollection', features: [] };
        const { filledCount } = standardizeValues(geojson);

        expect(filledCount).toBe(0);
    });

    it('treats mixed types (number + non-numeric string) as string field', () => {
        const geojson = makeFeatureCollection([
            { val: 42 },
            { val: 'hello' },
            { val: '' },
        ]);
        standardizeValues(geojson);

        // Mixed type → string field → empty string becomes "Unknown"
        expect(geojson.features[2].properties.val).toBe('Unknown');
    });
});

// --- deduplicateFeatures ---

describe('deduplicateFeatures', () => {
    const makeFeature = (lng, lat, props = {}) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [lng, lat] },
        properties: { ...props },
    });

    it('removes identical features', () => {
        const geojson = {
            type: 'FeatureCollection',
            features: [
                makeFeature(-74, 40, { name: 'A' }),
                makeFeature(-74, 40, { name: 'A' }),
            ],
        };
        const { duplicatesRemoved } = deduplicateFeatures(geojson);

        expect(geojson.features).toHaveLength(1);
        expect(duplicatesRemoved).toBe(1);
    });

    it('keeps features with same coords but different properties', () => {
        const geojson = {
            type: 'FeatureCollection',
            features: [
                makeFeature(-74, 40, { name: 'A' }),
                makeFeature(-74, 40, { name: 'B' }),
            ],
        };
        const { duplicatesRemoved } = deduplicateFeatures(geojson);

        expect(geojson.features).toHaveLength(2);
        expect(duplicatesRemoved).toBe(0);
    });

    it('keeps features with different coords but same properties', () => {
        const geojson = {
            type: 'FeatureCollection',
            features: [
                makeFeature(-74, 40, { name: 'A' }),
                makeFeature(-75, 41, { name: 'A' }),
            ],
        };
        const { duplicatesRemoved } = deduplicateFeatures(geojson);

        expect(geojson.features).toHaveLength(2);
        expect(duplicatesRemoved).toBe(0);
    });

    it('treats coords differing at 7th decimal as duplicates (6-decimal precision)', () => {
        const geojson = {
            type: 'FeatureCollection',
            features: [
                makeFeature(-74.0000001, 40.0000001, { name: 'A' }),
                makeFeature(-74.0000002, 40.0000002, { name: 'A' }),
            ],
        };
        const { duplicatesRemoved } = deduplicateFeatures(geojson);

        expect(geojson.features).toHaveLength(1);
        expect(duplicatesRemoved).toBe(1);
    });

    it('keeps features without geometry/coordinates', () => {
        const geojson = {
            type: 'FeatureCollection',
            features: [
                { type: 'Feature', properties: { name: 'NoGeo' } },
                makeFeature(-74, 40, { name: 'A' }),
            ],
        };
        const { duplicatesRemoved } = deduplicateFeatures(geojson);

        expect(geojson.features).toHaveLength(2);
        expect(duplicatesRemoved).toBe(0);
    });

    it('returns unchanged for empty FeatureCollection', () => {
        const geojson = { type: 'FeatureCollection', features: [] };
        const { duplicatesRemoved } = deduplicateFeatures(geojson);

        expect(geojson.features).toHaveLength(0);
        expect(duplicatesRemoved).toBe(0);
    });

    it('deduplicates regardless of property key order', () => {
        const geojson = {
            type: 'FeatureCollection',
            features: [
                makeFeature(-74, 40, { a: 1, b: 2 }),
                makeFeature(-74, 40, { b: 2, a: 1 }),
            ],
        };
        const { duplicatesRemoved } = deduplicateFeatures(geojson);

        expect(geojson.features).toHaveLength(1);
        expect(duplicatesRemoved).toBe(1);
    });
});
