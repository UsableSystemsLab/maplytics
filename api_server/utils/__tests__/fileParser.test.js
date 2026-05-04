import { jest } from '@jest/globals';
import { parseCSV, buildGeoJSONFromObjects, parseFileToGeoJSON } from '../fileParser.js';

describe('parseCSV', () => {
    it('parses CSV with auto-numeric conversion', () => {
        const rows = parseCSV('name,age\nAlice,30\nBob,25');
        expect(rows).toEqual([
            { name: 'Alice', age: 30 },
            { name: 'Bob', age: 25 },
        ]);
    });

    it('preserves commas inside quoted fields', () => {
        const rows = parseCSV('a,b\n"x,y",z');
        expect(rows[0]).toEqual({ a: 'x,y', b: 'z' });
    });

    it('returns [] for empty or header-only input', () => {
        expect(parseCSV('')).toEqual([]);
        expect(parseCSV('a,b')).toEqual([]);
    });

    it('handles CRLF line endings', () => {
        const rows = parseCSV('a\r\n1\r\n2');
        expect(rows).toEqual([{ a: 1 }, { a: 2 }]);
    });
});

describe('buildGeoJSONFromObjects', () => {
    it('builds Point features from lat/lng pairs', () => {
        const fc = buildGeoJSONFromObjects([
            { latitude: 24.7, longitude: 46.7, name: 'Riyadh' },
        ]);
        expect(fc.type).toBe('FeatureCollection');
        expect(fc.features).toHaveLength(1);
        expect(fc.features[0].geometry).toEqual({
            type: 'Point',
            coordinates: [46.7, 24.7],
        });
        expect(fc.features[0].properties).toEqual({ name: 'Riyadh' });
    });

    it('accepts alternate field name casings (lat/lng/Lat/LNG/lon)', () => {
        const fc = buildGeoJSONFromObjects([
            { lat: 1, lng: 2 },
            { Lat: 3, Lon: 4 },
            { LAT: 5, LNG: 6 },
        ]);
        expect(fc.features).toHaveLength(3);
        expect(fc.features[0].geometry.coordinates).toEqual([2, 1]);
        expect(fc.features[1].geometry.coordinates).toEqual([4, 3]);
        expect(fc.features[2].geometry.coordinates).toEqual([6, 5]);
    });

    it('skips items with missing or non-numeric coordinates', () => {
        const fc = buildGeoJSONFromObjects([
            { latitude: 1, longitude: 2 },
            { latitude: 'NaN', longitude: 'abc' },
            { foo: 'bar' },
        ]);
        expect(fc.features).toHaveLength(1);
    });

    it('strips coordinate fields from properties', () => {
        const fc = buildGeoJSONFromObjects([{ lat: 1, lng: 2, color: 'red' }]);
        expect(fc.features[0].properties).toEqual({ color: 'red' });
        expect(fc.features[0].properties.lat).toBeUndefined();
    });
});

describe('parseFileToGeoJSON', () => {
    it('routes csv extension through parseCSV + buildGeoJSON', () => {
        const fc = parseFileToGeoJSON('lat,lng,name\n1,2,A', 'csv');
        expect(fc.features).toHaveLength(1);
        expect(fc.features[0].properties.name).toBe('A');
    });

    it('returns FeatureCollection input untouched', () => {
        const input = { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: {}, properties: {} }] };
        expect(parseFileToGeoJSON(JSON.stringify(input), 'json')).toEqual(input);
    });

    it('wraps a single Feature in a FeatureCollection', () => {
        const feat = { type: 'Feature', geometry: { type: 'Point', coordinates: [0, 0] }, properties: {} };
        const fc = parseFileToGeoJSON(JSON.stringify(feat), 'geojson');
        expect(fc.type).toBe('FeatureCollection');
        expect(fc.features).toHaveLength(1);
        expect(fc.features[0]).toEqual(feat);
    });

    it('handles JSON arrays as object lists', () => {
        const fc = parseFileToGeoJSON(JSON.stringify([{ lat: 1, lng: 2 }]), 'json');
        expect(fc.features).toHaveLength(1);
    });

    it('handles {data: [...]} wrapped objects', () => {
        const fc = parseFileToGeoJSON(JSON.stringify({ data: [{ lat: 1, lng: 2 }] }), 'json');
        expect(fc.features).toHaveLength(1);
    });

    it('falls back to single-object handling for plain objects', () => {
        const fc = parseFileToGeoJSON(JSON.stringify({ lat: 1, lng: 2 }), 'json');
        expect(fc.features).toHaveLength(1);
    });

    it('returns empty FeatureCollection when content is unparseable JSON', () => {
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
        const fc = parseFileToGeoJSON('not json {', 'json');
        expect(fc).toEqual({ type: 'FeatureCollection', features: [] });
        warn.mockRestore();
    });
});
