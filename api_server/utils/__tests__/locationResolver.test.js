import { jest } from '@jest/globals';

// Mock models and sequelize
const mockFindAll = jest.fn();
const mockQuery = jest.fn();

jest.unstable_mockModule('../../models/index.js', () => ({
    Region: { findAll: mockFindAll },
    City: { findAll: mockFindAll },
    District: { findAll: mockFindAll },
}));

jest.unstable_mockModule('../../configs/postgresDB.js', () => ({
    sequelize: { query: mockQuery },
}));

// Now import the module under test
const { normalize, resolve } = await import('../locationResolver.js');

describe('utils/locationResolver.js', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('normalize', () => {
        it('removes noise tokens and special characters', () => {
            expect(normalize('Al-Olaya District')).toBe('olaya');
            expect(normalize('Dist. Malaz')).toBe('malaz');
            expect(normalize('Riyadh')).toBe('riyadh');
        });

        it('handles empty or null input', () => {
            expect(normalize('')).toBe('');
            expect(normalize(null)).toBe('');
        });
    });

    describe('resolve', () => {
        it('returns bad_request for invalid input', async () => {
            expect(await resolve('not an array')).toEqual({ error: 'bad_request' });
            expect(await resolve(['one'])).toEqual({ error: 'bad_request' });
        });

        it('resolves district level match', async () => {
            mockFindAll.mockResolvedValueOnce([
                { name_en: 'Olaya', boundary_geojson: '{"type":"Polygon","coordinates":[]}' },
                { name_en: 'Malaz', boundary_geojson: '{"type":"Polygon","coordinates":[]}' },
            ]);

            const result = await resolve(['Olaya', 'Malaz']);
            expect(result.level).toBe('district');
            expect(result.matches).toHaveLength(2);
            expect(result.matches[0].name_en).toBe('Olaya');
            expect(result.matches[0].boundary).toEqual({"type":"Polygon","coordinates":[]});
            expect(mockFindAll).toHaveBeenCalledTimes(1);
        });

        it('resolves city level match if district fails', async () => {
            // District.findAll (first level) returns no matches
            mockFindAll.mockResolvedValueOnce([]);
            
            // fetchCityRows (second level) returns Riyadh match
            mockQuery.mockResolvedValueOnce([[
                { name_en: 'Riyadh', boundary_geojson: '{"type":"MultiPolygon","coordinates":[]}' },
                { name_en: 'Jeddah', boundary_geojson: '{"type":"MultiPolygon","coordinates":[]}' },
            ]]);

            const result = await resolve(['Riyadh', 'Jeddah']);
            expect(result.level).toBe('city');
            expect(result.matches[0].name_en).toBe('Riyadh');
            expect(result.matches[1].name_en).toBe('Jeddah');
        });

        it('resolves region level match if district and city fail', async () => {
            mockFindAll.mockResolvedValueOnce([]); // District
            mockQuery.mockResolvedValueOnce([[]]); // City
            mockFindAll.mockResolvedValueOnce([
                { name_en: 'Riyadh Region', boundary_geojson: '{"type":"Polygon"}' },
                { name_en: 'Makkah Region', boundary_geojson: '{"type":"Polygon"}' },
            ]);

            const result = await resolve(['Riyadh Region', 'Makkah Region']);
            expect(result.level).toBe('region');
            expect(result.matches[0].name_en).toBe('Riyadh Region');
        });

        it('returns null if no match found at any level', async () => {
            mockFindAll.mockResolvedValue([]); // District
            mockQuery.mockResolvedValueOnce([[]]); // City
            mockFindAll.mockResolvedValue([]); // Region

            const result = await resolve(['Mars', 'Venus']);
            expect(result).toBeNull();
        });

        it('handles fuzzy matching within MAX_DISTANCE', async () => {
            mockFindAll.mockResolvedValueOnce([
                { name_en: 'Olaya', boundary_geojson: '{"type":"Polygon"}' },
            ]);

            // "Olay" is distance 1 from "Olaya"
            const result = await resolve(['Olay', 'Olaya']);
            expect(result.level).toBe('district');
            expect(result.matches[0].name_en).toBe('Olaya');
        });
    });
});
