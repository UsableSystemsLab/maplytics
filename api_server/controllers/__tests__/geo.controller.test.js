import { jest } from '@jest/globals';
import { mockReqRes } from '../../test-utils/mockReqRes.js';
import { makeModelStub } from '../../test-utils/sequelizeStubs.js';

const DistrictStub = makeModelStub();
const CityStub = makeModelStub();
const RegionStub = makeModelStub();
const queryMock = jest.fn();
const fnMock = jest.fn((name, ...args) => ({ _fn: name, args }));
const colMock = jest.fn(c => ({ _col: c }));
const whereMock = jest.fn((a, b) => ({ _where: [a, b] }));
const mockLogger = { error: jest.fn(), info: jest.fn(), warn: jest.fn() };

jest.unstable_mockModule('../../models/index.js', () => ({
    District: DistrictStub,
    City: CityStub,
    Region: RegionStub,
}));
jest.unstable_mockModule('../../configs/postgresDB.js', () => ({
    sequelize: {
        query: queryMock,
        fn: fnMock,
        col: colMock,
        where: whereMock,
    },
}));
jest.unstable_mockModule('../../configs/logger.js', () => ({ default: mockLogger }));

const {
    getCityInfo,
    getCityBoundaries,
    getRegionBoundaries,
    getDistrictBoundaries,
    choroplethCount,
} = await import('../geo.controller.js');

describe('geo.controller', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getCityInfo - input validation', () => {
        it.each([
            ['missing lat', {}],
            ['empty lat', { lat: '', lng: '46' }],
            ['non-numeric lat', { lat: 'abc', lng: '46' }],
            ['out-of-range lat', { lat: '200', lng: '46' }],
            ['missing lng', { lat: '24' }],
            ['out-of-range lng', { lat: '24', lng: '999' }],
        ])('returns 400 for %s', async (_, query) => {
            const { req, res, next } = mockReqRes({ query });
            await getCityInfo(req, res, next);
            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('getCityInfo - happy & error paths', () => {
        it('returns 404 when no district contains the point', async () => {
            DistrictStub.findOne.mockResolvedValueOnce(null);
            const { req, res, next } = mockReqRes({ query: { lat: '24.7', lng: '46.7' } });
            await getCityInfo(req, res, next);
            expect(res.status).toHaveBeenCalledWith(404);
            expect(mockLogger.warn).toHaveBeenCalled();
        });

        it('returns 404 when district is found but city is missing', async () => {
            DistrictStub.findOne.mockResolvedValueOnce({ district_id: 'd1', city_id: 'c1' });
            CityStub.findOne.mockResolvedValueOnce(null);
            const { req, res, next } = mockReqRes({ query: { lat: '24.7', lng: '46.7' } });
            await getCityInfo(req, res, next);
            expect(res.status).toHaveBeenCalledWith(404);
            expect(mockLogger.error).toHaveBeenCalled();
        });

        it('returns GeoJSON Feature on success', async () => {
            DistrictStub.findOne.mockResolvedValueOnce({
                district_id: 'd1', city_id: 'c1', name_ar: 'حي', name_en: 'Hood',
            });
            CityStub.findOne.mockResolvedValueOnce({
                city_id: 'c1', name_ar: 'مدينة', name_en: 'City',
                region: { region_id: 'r1', name_ar: 'منطقة', name_en: 'Region', code: 'R' },
            });

            const { req, res, next } = mockReqRes({ query: { lat: '24.7', lng: '46.7' } });
            await getCityInfo(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);
            const payload = res.json.mock.calls[0][0];
            expect(payload.type).toBe('Feature');
            expect(payload.geometry.coordinates).toEqual([46.7, 24.7]);
            expect(payload.properties.district.district_id).toBe('d1');
            expect(payload.properties.city.city_id).toBe('c1');
            expect(payload.properties.region.code).toBe('R');
        });

        it('returns null region when city has no region', async () => {
            DistrictStub.findOne.mockResolvedValueOnce({ district_id: 'd1', city_id: 'c1' });
            CityStub.findOne.mockResolvedValueOnce({ city_id: 'c1', region: null });
            const { req, res, next } = mockReqRes({ query: { lat: '24.7', lng: '46.7' } });
            await getCityInfo(req, res, next);
            expect(res.json.mock.calls[0][0].properties.region).toBeNull();
        });

        it('forwards DB errors to next()', async () => {
            DistrictStub.findOne.mockRejectedValueOnce(new Error('db'));
            const { req, res, next } = mockReqRes({ query: { lat: '24.7', lng: '46.7' } });
            await getCityInfo(req, res, next);
            expect(next).toHaveBeenCalledWith(expect.any(Error));
        });
    });

    describe('getCityBoundaries', () => {
        it('returns FeatureCollection on success', async () => {
            queryMock.mockResolvedValueOnce([[
                { city_id: 1, name_ar: 'م', name_en: 'C', region_id: 'r', region_name: 'R', region_name_ar: 'ر', geometry: { type: 'Polygon' } },
            ]]);
            const { req, res, next } = mockReqRes();
            await getCityBoundaries(req, res, next);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                type: 'FeatureCollection',
                features: expect.arrayContaining([expect.objectContaining({ type: 'Feature' })]),
            }));
        });

        it('applies region_id filter when provided', async () => {
            queryMock.mockResolvedValueOnce([[]]);
            const { req, res, next } = mockReqRes({ query: { region_id: '5' } });
            await getCityBoundaries(req, res, next);
            const callArgs = queryMock.mock.calls[0];
            expect(callArgs[1].bind).toEqual([5]);
            expect(callArgs[0]).toContain('d.region_id = $1');
        });

        it('forwards errors to next()', async () => {
            queryMock.mockRejectedValueOnce(new Error('x'));
            const { req, res, next } = mockReqRes();
            await getCityBoundaries(req, res, next);
            expect(next).toHaveBeenCalled();
        });
    });

    describe('getRegionBoundaries', () => {
        it('returns FeatureCollection filtering null boundaries', async () => {
            RegionStub.findAll.mockResolvedValueOnce([
                { region_id: 'r1', name_ar: 'ر', name_en: 'R', code: 'R', population: 1, boundaries: { type: 'Polygon' } },
                { region_id: 'r2', boundaries: null },
            ]);
            const { req, res, next } = mockReqRes();
            await getRegionBoundaries(req, res, next);
            const payload = res.json.mock.calls[0][0];
            expect(payload.features).toHaveLength(1);
            expect(payload.features[0].properties.region_id).toBe('r1');
        });

        it('forwards errors to next()', async () => {
            RegionStub.findAll.mockRejectedValueOnce(new Error('x'));
            const { req, res, next } = mockReqRes();
            await getRegionBoundaries(req, res, next);
            expect(next).toHaveBeenCalled();
        });
    });

    describe('getDistrictBoundaries', () => {
        it('returns FeatureCollection and applies region_id+city_id filters', async () => {
            DistrictStub.findAll.mockResolvedValueOnce([
                {
                    district_id: 'd1', name_ar: 'ح', name_en: 'H',
                    city_id: 'c1', region_id: 'r1', boundaries: { type: 'Polygon' },
                    city: { name_en: 'CityName' }, region: { name_en: 'RegionName' },
                },
                { district_id: 'd2', boundaries: null },
            ]);
            const { req, res, next } = mockReqRes({ query: { region_id: '1', city_id: '2' } });
            await getDistrictBoundaries(req, res, next);
            expect(DistrictStub.findAll).toHaveBeenCalledWith(expect.objectContaining({
                where: { region_id: 1, city_id: 2 },
            }));
            const payload = res.json.mock.calls[0][0];
            expect(payload.features).toHaveLength(1);
            expect(payload.features[0].properties.city_name).toBe('CityName');
        });

        it('handles districts without city/region associations', async () => {
            DistrictStub.findAll.mockResolvedValueOnce([
                { district_id: 'd1', boundaries: { type: 'Polygon' }, city: null, region: null },
            ]);
            const { req, res, next } = mockReqRes();
            await getDistrictBoundaries(req, res, next);
            expect(res.json.mock.calls[0][0].features[0].properties.city_name).toBe('');
            expect(res.json.mock.calls[0][0].features[0].properties.region_name).toBe('');
        });

        it('forwards errors to next()', async () => {
            DistrictStub.findAll.mockRejectedValueOnce(new Error('x'));
            const { req, res, next } = mockReqRes();
            await getDistrictBoundaries(req, res, next);
            expect(next).toHaveBeenCalled();
        });
    });

    describe('choroplethCount', () => {
        it('returns 400 when points is missing', async () => {
            const { req, res, next } = mockReqRes({ body: { level: 'regions' } });
            await choroplethCount(req, res, next);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('returns 400 when level is unknown', async () => {
            const { req, res, next } = mockReqRes({ body: { points: [[0, 0]], level: 'planets' } });
            await choroplethCount(req, res, next);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('handles regions level and returns FeatureCollection', async () => {
            queryMock.mockResolvedValueOnce([[
                { region_id: 'r1', geometry: { type: 'Polygon' }, count: '5' },
            ]]);
            const { req, res, next } = mockReqRes({
                body: { points: [[1, 2]], level: 'regions' },
            });
            await choroplethCount(req, res, next);
            const payload = res.json.mock.calls[0][0];
            expect(payload.features[0].properties.count).toBe(5);
            expect(payload.features[0].properties.geometry).toBeUndefined();
        });

        it('appends region_id bind for cities level', async () => {
            queryMock.mockResolvedValueOnce([[]]);
            const { req, res, next } = mockReqRes({
                body: { points: [[1, 2]], level: 'cities', region_id: 7 },
            });
            await choroplethCount(req, res, next);
            const args = queryMock.mock.calls[0];
            expect(args[1].bind[1]).toBe(7);
        });

        it('appends city_id bind for districts level when supplied', async () => {
            queryMock.mockResolvedValueOnce([[]]);
            const { req, res, next } = mockReqRes({
                body: { points: [[1, 2]], level: 'districts', city_id: 9 },
            });
            await choroplethCount(req, res, next);
            expect(queryMock.mock.calls[0][1].bind[1]).toBe(9);
        });

        it('falls back to region_id bind for districts when city_id is absent', async () => {
            queryMock.mockResolvedValueOnce([[]]);
            const { req, res, next } = mockReqRes({
                body: { points: [[1, 2]], level: 'districts', region_id: 4 },
            });
            await choroplethCount(req, res, next);
            expect(queryMock.mock.calls[0][1].bind[1]).toBe(4);
        });

        it('forwards errors to next()', async () => {
            queryMock.mockRejectedValueOnce(new Error('x'));
            const { req, res, next } = mockReqRes({
                body: { points: [[1, 2]], level: 'regions' },
            });
            await choroplethCount(req, res, next);
            expect(next).toHaveBeenCalled();
        });
    });
});
