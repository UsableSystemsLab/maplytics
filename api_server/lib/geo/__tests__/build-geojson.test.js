import { buildGeoJSONFromObjects } from '../build-geojson.js';

describe('buildGeoJSONFromObjects', () => {
    it('builds a FeatureCollection from objects with latitude/longitude', () => {
        const items = [
            { name: 'Central Park', latitude: 40.785091, longitude: -73.968285 },
        ];
        const result = buildGeoJSONFromObjects(items);

        expect(result.type).toBe('FeatureCollection');
        expect(result.features).toHaveLength(1);

        const feature = result.features[0];
        expect(feature.type).toBe('Feature');
        expect(feature.geometry.type).toBe('Point');
        expect(feature.geometry.coordinates).toEqual([-73.968285, 40.785091]);
        expect(feature.properties).toEqual({ name: 'Central Park' });
    });

    it('removes coordinate fields from properties', () => {
        const items = [
            { name: 'A', latitude: 40, longitude: -74, extra: 'val' },
        ];
        const result = buildGeoJSONFromObjects(items);

        expect(result.features[0].properties).toEqual({ name: 'A', extra: 'val' });
        expect(result.features[0].properties.latitude).toBeUndefined();
        expect(result.features[0].properties.longitude).toBeUndefined();
    });

    it('drops items with invalid coordinates', () => {
        const items = [
            { name: 'Valid', latitude: 40, longitude: -74 },
            { name: 'Invalid lat', latitude: 200, longitude: -74 },
            { name: 'Missing coords', category: 'test' },
        ];
        const result = buildGeoJSONFromObjects(items);

        expect(result.features).toHaveLength(1);
        expect(result.features[0].properties.name).toBe('Valid');
    });

    it('returns empty FeatureCollection for empty input', () => {
        const result = buildGeoJSONFromObjects([]);

        expect(result.type).toBe('FeatureCollection');
        expect(result.features).toEqual([]);
    });

    it('coerces string coordinates to numbers', () => {
        const items = [
            { name: 'Test', latitude: '40.7', longitude: '-74.0' },
        ];
        const result = buildGeoJSONFromObjects(items);

        expect(result.features[0].geometry.coordinates).toEqual([-74, 40.7]);
        expect(typeof result.features[0].geometry.coordinates[0]).toBe('number');
        expect(typeof result.features[0].geometry.coordinates[1]).toBe('number');
    });

    it('recognizes lat/lng field name variants', () => {
        const items = [
            { name: 'A', lat: 10, lng: 20 },
            { name: 'B', Lat: 11, Lng: 21 },
            { name: 'C', Y: 12, X: 22 },
        ];
        const result = buildGeoJSONFromObjects(items);

        expect(result.features).toHaveLength(3);
        expect(result.features[0].geometry.coordinates).toEqual([20, 10]);
        expect(result.features[1].geometry.coordinates).toEqual([21, 11]);
        expect(result.features[2].geometry.coordinates).toEqual([22, 12]);
    });

    it('handles multiple items correctly', () => {
        const items = [
            { name: 'A', latitude: 40, longitude: -74 },
            { name: 'B', latitude: 41, longitude: -75 },
            { name: 'C', latitude: 42, longitude: -76 },
        ];
        const result = buildGeoJSONFromObjects(items);

        expect(result.features).toHaveLength(3);
        expect(result.features.map(f => f.properties.name)).toEqual(['A', 'B', 'C']);
    });
});
