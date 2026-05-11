import { jest } from '@jest/globals';
import { mockReqRes } from '../../test-utils/mockReqRes.js';
import { makeModelStub } from '../../test-utils/sequelizeStubs.js';

const DistrictStub = makeModelStub();
const queryMock = jest.fn();
const mockLogger = { error: jest.fn(), info: jest.fn() };

jest.unstable_mockModule('../../models/index.js', () => ({
    District: DistrictStub,
}));
jest.unstable_mockModule('../../configs/postgresDB.js', () => ({
    sequelize: { query: queryMock },
}));
jest.unstable_mockModule('../../configs/logger.js', () => ({ default: mockLogger }));

const { getDistrictComparison } = await import('../comparisonController.js');

describe('comparisonController.getDistrictComparison', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns 400 when dataset_id is missing', async () => {
        const { req, res, next } = mockReqRes({ body: { district_ids: ['d1'] } });
        await getDistrictComparison(req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 400 when district_ids is empty or not an array', async () => {
        const { req, res, next } = mockReqRes({ body: { dataset_id: 'ds', district_ids: [] } });
        await getDistrictComparison(req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);

        const r2 = mockReqRes({ body: { dataset_id: 'ds', district_ids: 'not-array' } });
        await getDistrictComparison(r2.req, r2.res, r2.next);
        expect(r2.res.status).toHaveBeenCalledWith(400);
    });

    it('aggregates stats per district on success', async () => {
        // 1st query: sample properties for schema inference
        queryMock.mockResolvedValueOnce([
            { properties: { city: 'A', pop: 10 } },
            { properties: { city: 'B', pop: 20 } },
        ]);
        // For each district: findByPk + spatial query
        DistrictStub.findByPk
            .mockResolvedValueOnce({ district_id: 'd1', name_en: 'One', name_ar: 'واحد' });
        queryMock.mockResolvedValueOnce([
            { properties: { city: 'A', pop: 10 } },
        ]);

        const { req, res, next } = mockReqRes({
            body: { dataset_id: 'ds', district_ids: ['d1'] },
        });

        await getDistrictComparison(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
        const payload = res.json.mock.calls[0][0];
        expect(payload.fields).toEqual(expect.any(Array));
        expect(payload.districts).toHaveLength(1);
        expect(payload.districts[0]).toEqual(expect.objectContaining({
            district_id: 'd1', name_en: 'One', total_count: 1,
        }));
        expect(payload.districts[0].field_stats).toBeDefined();
    });

    it('returns "District not found" entry when District.findByPk returns null', async () => {
        queryMock.mockResolvedValueOnce([{ properties: {} }]);
        DistrictStub.findByPk.mockResolvedValueOnce(null);

        const { req, res, next } = mockReqRes({
            body: { dataset_id: 'ds', district_ids: ['missing'] },
        });

        await getDistrictComparison(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json.mock.calls[0][0].districts[0]).toEqual({
            district_id: 'missing',
            error: 'District not found',
        });
    });

    it('forwards errors to next() when sample query fails', async () => {
        queryMock.mockRejectedValueOnce(new Error('db'));
        const { req, res, next } = mockReqRes({
            body: { dataset_id: 'ds', district_ids: ['d1'] },
        });

        await getDistrictComparison(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.any(Error));
        expect(mockLogger.error).toHaveBeenCalled();
    });
});
