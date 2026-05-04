import { jest } from '@jest/globals';
import { mockReqRes } from '../../test-utils/mockReqRes.js';
import { makeModelStub } from '../../test-utils/sequelizeStubs.js';

const DatasetStub = makeModelStub();
const FeatureStub = makeModelStub();
const FeaturePropertyStub = makeModelStub();
const DatasetMetadataStub = makeModelStub();
const transactionMock = { commit: jest.fn(), rollback: jest.fn() };
const sequelize = {
    transaction: jest.fn().mockResolvedValue(transactionMock),
    fn: jest.fn((name, ...args) => ({ _fn: name, args })),
    col: jest.fn((c) => ({ _col: c })),
    or: jest.fn((...args) => ({ _or: args })),
};
const mockLogger = { info: jest.fn(), error: jest.fn() };

jest.unstable_mockModule('../../models/index.js', () => ({
    Dataset: DatasetStub,
    Feature: FeatureStub,
    Feature_Property: FeaturePropertyStub,
    Dataset_Metadata: DatasetMetadataStub,
}));
jest.unstable_mockModule('../../configs/postgresDB.js', () => ({ sequelize }));
jest.unstable_mockModule('../../configs/logger.js', () => ({ default: mockLogger }));

const {
    ingestDataset,
    getAllDatasets,
    getAllPublicDatasets,
    getDatasetAsGeoJSON,
    getDatasetById,
    deleteDataset,
    searchDatasets,
    searchPublicDatasets,
} = await import('../DatasetController.js');

describe('DatasetController', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        transactionMock.commit.mockClear();
        transactionMock.rollback.mockClear();
    });

    describe('ingestDataset', () => {
        it('returns 401 when no userId on request', async () => {
            const { req, res, next } = mockReqRes({ body: {} });
            await ingestDataset(req, res, next);
            expect(res.status).toHaveBeenCalledWith(401);
        });

        it('returns 400 when dataset_name or data is missing/non-array', async () => {
            const { req, res, next } = mockReqRes({ body: { data: 'not-array' } });
            req.userId = 'u';
            await ingestDataset(req, res, next);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('returns 400 when data array is empty', async () => {
            const { req, res, next } = mockReqRes({
                body: { dataset_name: 'd', data: [] },
            });
            req.userId = 'u';
            await ingestDataset(req, res, next);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('returns 409 when dataset name already exists and force_override is not set', async () => {
            DatasetStub.findOne.mockResolvedValueOnce({ id: 'old', name: 'd', feature_count: 5 });
            const { req, res, next } = mockReqRes({
                body: { dataset_name: 'd', data: [{ latitude: 1, longitude: 2 }] },
            });
            req.userId = 'u';
            await ingestDataset(req, res, next);
            expect(res.status).toHaveBeenCalledWith(409);
        });

        it('returns 400 when no items have valid geometry', async () => {
            DatasetStub.findOne.mockResolvedValueOnce(null);
            const { req, res, next } = mockReqRes({
                body: { dataset_name: 'd', data: [{ foo: 'bar' }] },
            });
            req.userId = 'u';
            await ingestDataset(req, res, next);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('ingests successfully with lat/lng-based features', async () => {
            DatasetStub.findOne.mockResolvedValueOnce(null);
            DatasetStub.create.mockResolvedValueOnce({ id: 'ds1', slug: 'slug-1' });
            FeatureStub.create.mockResolvedValue({ feature_id: 'f1' });
            FeaturePropertyStub.create.mockResolvedValue({});

            const { req, res, next } = mockReqRes({
                body: {
                    dataset_name: 'My Dataset',
                    data: [
                        { latitude: 24.7, longitude: 46.7, name: 'A' },
                        { latitude: 25.0, longitude: 47.0, name: 'B' },
                    ],
                },
            });
            req.userId = 'u1';
            req.isAdmin = true;

            await ingestDataset(req, res, next);

            expect(DatasetStub.create).toHaveBeenCalled();
            expect(FeatureStub.create).toHaveBeenCalledTimes(2);
            expect(FeaturePropertyStub.create).toHaveBeenCalledTimes(2);
            expect(transactionMock.commit).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json.mock.calls[0][0]).toEqual(expect.objectContaining({
                id: 'ds1', feature_count: 2,
            }));
        });

        it('ingests successfully with GeoJSON geometry-based features', async () => {
            DatasetStub.findOne.mockResolvedValueOnce(null);
            DatasetStub.create.mockResolvedValueOnce({ id: 'ds1', slug: 's' });
            FeatureStub.create.mockResolvedValue({ feature_id: 'f' });
            FeaturePropertyStub.create.mockResolvedValue({});

            const { req, res, next } = mockReqRes({
                body: {
                    dataset_name: 'D',
                    data: [
                        { geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 1], [1, 0], [0, 0]]] }, name: 'P' },
                    ],
                },
            });
            req.userId = 'u';

            await ingestDataset(req, res, next);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json.mock.calls[0][0].geometry_type).toBe('Polygon');
        });

        it('overrides existing dataset when force_override is true', async () => {
            const existing = { id: 'old', destroy: jest.fn().mockResolvedValue() };
            DatasetStub.findOne.mockResolvedValueOnce(existing);
            DatasetStub.create.mockResolvedValueOnce({ id: 'new', slug: 's' });
            FeatureStub.create.mockResolvedValue({ feature_id: 'f' });
            FeaturePropertyStub.create.mockResolvedValue({});

            const { req, res, next } = mockReqRes({
                body: {
                    dataset_name: 'd',
                    data: [{ latitude: 1, longitude: 2 }],
                    force_override: true,
                },
            });
            req.userId = 'u';

            await ingestDataset(req, res, next);

            expect(existing.destroy).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(201);
        });

        it('rolls back and forwards errors on failure', async () => {
            DatasetStub.findOne.mockRejectedValueOnce(new Error('db'));
            const { req, res, next } = mockReqRes({
                body: { dataset_name: 'd', data: [{ latitude: 1, longitude: 2 }] },
            });
            req.userId = 'u';

            await ingestDataset(req, res, next);

            expect(transactionMock.rollback).toHaveBeenCalled();
            expect(next).toHaveBeenCalledWith(expect.any(Error));
        });

        it('handles MultiPolygon geometry types in bounding box calculation', async () => {
            DatasetStub.findOne.mockResolvedValueOnce(null);
            DatasetStub.create.mockResolvedValueOnce({ id: 'ds', slug: 's' });
            FeatureStub.create.mockResolvedValue({ feature_id: 'f' });
            FeaturePropertyStub.create.mockResolvedValue({});

            const { req, res, next } = mockReqRes({
                body: {
                    dataset_name: 'd',
                    data: [
                        {
                            geometry: {
                                type: 'MultiPolygon',
                                coordinates: [[[[0, 0], [2, 2], [2, 0], [0, 0]]]],
                            },
                        },
                        {
                            geometry: {
                                type: 'LineString',
                                coordinates: [[5, 5], [6, 6]],
                            },
                        },
                        { geometry: { type: 'Point', coordinates: [10, 10] } },
                        { geometry: { type: 'MultiPoint', coordinates: [[3, 3], [4, 4]] } },
                        { geometry: { type: 'MultiLineString', coordinates: [[[7, 7], [8, 8]]] } },
                    ],
                },
            });
            req.userId = 'u';
            await ingestDataset(req, res, next);
            expect(res.status).toHaveBeenCalledWith(201);
        });
    });

    describe('getAllDatasets', () => {
        it('returns 401 without userId', async () => {
            const { req, res, next } = mockReqRes();
            await getAllDatasets(req, res, next);
            expect(res.status).toHaveBeenCalledWith(401);
        });

        it('returns user\'s private datasets ordered desc', async () => {
            DatasetStub.findAll.mockResolvedValueOnce([{ id: 'd1' }]);
            const { req, res, next } = mockReqRes();
            req.userId = 'u';
            await getAllDatasets(req, res, next);
            expect(DatasetStub.findAll).toHaveBeenCalledWith(expect.objectContaining({
                where: { user_id: 'u', is_public: false },
            }));
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ count: 1, datasets: [{ id: 'd1' }] });
        });

        it('forwards errors to next()', async () => {
            DatasetStub.findAll.mockRejectedValueOnce(new Error('db'));
            const { req, res, next } = mockReqRes();
            req.userId = 'u';
            await getAllDatasets(req, res, next);
            expect(next).toHaveBeenCalled();
        });
    });

    describe('getAllPublicDatasets', () => {
        it('returns public datasets', async () => {
            DatasetStub.findAll.mockResolvedValueOnce([{ id: 'p1' }]);
            const { req, res, next } = mockReqRes();
            await getAllPublicDatasets(req, res, next);
            expect(DatasetStub.findAll).toHaveBeenCalledWith(expect.objectContaining({
                where: { is_public: true },
            }));
            expect(res.json).toHaveBeenCalledWith({ count: 1, datasets: [{ id: 'p1' }] });
        });

        it('forwards errors to next()', async () => {
            DatasetStub.findAll.mockRejectedValueOnce(new Error('x'));
            const { req, res, next } = mockReqRes();
            await getAllPublicDatasets(req, res, next);
            expect(next).toHaveBeenCalled();
        });
    });

    describe('getDatasetAsGeoJSON', () => {
        it('returns 404 when dataset is not found', async () => {
            DatasetStub.findOne.mockResolvedValueOnce(null);
            const { req, res, next } = mockReqRes({ params: { id: 'missing' } });
            await getDatasetAsGeoJSON(req, res, next);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        it('builds a FeatureCollection with parsed geometry and properties', async () => {
            DatasetStub.findOne.mockResolvedValueOnce({
                id: 'ds1', name: 'X', entity_type: 'poi', feature_count: 1,
            });
            FeatureStub.findAll.mockResolvedValueOnce([
                {
                    feature_id: 'f1',
                    dataValues: { geometry_json: '{"type":"Point","coordinates":[1,2]}' },
                    properties: { properties: { name: 'A' } },
                },
                {
                    feature_id: 'f2',
                    dataValues: { geometry_json: '{"type":"Point","coordinates":[3,4]}' },
                    properties: null,
                },
            ]);
            const { req, res, next } = mockReqRes({ params: { id: 'ds1' } });
            await getDatasetAsGeoJSON(req, res, next);

            const payload = res.json.mock.calls[0][0];
            expect(payload.type).toBe('FeatureCollection');
            expect(payload.features).toHaveLength(2);
            expect(payload.features[0].properties).toEqual({ name: 'A' });
            expect(payload.features[1].properties).toEqual({});
        });

        it('forwards errors to next()', async () => {
            DatasetStub.findOne.mockRejectedValueOnce(new Error('x'));
            const { req, res, next } = mockReqRes({ params: { id: 'd' } });
            await getDatasetAsGeoJSON(req, res, next);
            expect(next).toHaveBeenCalled();
        });
    });

    describe('getDatasetById', () => {
        it('returns 404 when not found', async () => {
            DatasetStub.findOne.mockResolvedValueOnce(null);
            const { req, res, next } = mockReqRes({ params: { id: 'm' } });
            await getDatasetById(req, res, next);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        it('returns the dataset on success', async () => {
            DatasetStub.findOne.mockResolvedValueOnce({ id: 'd1' });
            const { req, res, next } = mockReqRes({ params: { id: 'd1' } });
            await getDatasetById(req, res, next);
            expect(res.json).toHaveBeenCalledWith({ id: 'd1' });
        });

        it('forwards errors to next()', async () => {
            DatasetStub.findOne.mockRejectedValueOnce(new Error('x'));
            const { req, res, next } = mockReqRes({ params: { id: 'd1' } });
            await getDatasetById(req, res, next);
            expect(next).toHaveBeenCalled();
        });
    });

    describe('deleteDataset', () => {
        it('returns 404 when dataset is missing', async () => {
            DatasetStub.findOne.mockResolvedValueOnce(null);
            const { req, res, next } = mockReqRes({ params: { id: 'm' } });
            await deleteDataset(req, res, next);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        it('destroys the dataset on success', async () => {
            const ds = { id: 'd1', name: 'X', destroy: jest.fn().mockResolvedValue() };
            DatasetStub.findOne.mockResolvedValueOnce(ds);
            const { req, res, next } = mockReqRes({ params: { id: 'd1' } });
            await deleteDataset(req, res, next);
            expect(ds.destroy).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('forwards errors to next()', async () => {
            DatasetStub.findOne.mockRejectedValueOnce(new Error('x'));
            const { req, res, next } = mockReqRes({ params: { id: 'd' } });
            await deleteDataset(req, res, next);
            expect(next).toHaveBeenCalled();
        });
    });

    describe('searchDatasets', () => {
        it('returns 400 when q is missing', async () => {
            const { req, res, next } = mockReqRes({ query: {} });
            await searchDatasets(req, res, next);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('returns 401 when no userId', async () => {
            const { req, res, next } = mockReqRes({ query: { q: 'foo' } });
            await searchDatasets(req, res, next);
            expect(res.status).toHaveBeenCalledWith(401);
        });

        it('returns matching user datasets', async () => {
            DatasetStub.findAll.mockResolvedValueOnce([{ id: 'd1' }]);
            const { req, res, next } = mockReqRes({ query: { q: 'foo' } });
            req.userId = 'u';
            await searchDatasets(req, res, next);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                count: 1, query: 'foo',
            }));
        });

        it('forwards errors to next()', async () => {
            DatasetStub.findAll.mockRejectedValueOnce(new Error('x'));
            const { req, res, next } = mockReqRes({ query: { q: 'foo' } });
            req.userId = 'u';
            await searchDatasets(req, res, next);
            expect(next).toHaveBeenCalled();
        });
    });

    describe('searchPublicDatasets', () => {
        it('returns 400 when q is missing', async () => {
            const { req, res, next } = mockReqRes({ query: {} });
            await searchPublicDatasets(req, res, next);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('returns matching public datasets', async () => {
            DatasetStub.findAll.mockResolvedValueOnce([{ id: 'p1' }]);
            const { req, res, next } = mockReqRes({ query: { q: 'foo' } });
            await searchPublicDatasets(req, res, next);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                count: 1, query: 'foo',
            }));
        });

        it('forwards errors to next()', async () => {
            DatasetStub.findAll.mockRejectedValueOnce(new Error('x'));
            const { req, res, next } = mockReqRes({ query: { q: 'foo' } });
            await searchPublicDatasets(req, res, next);
            expect(next).toHaveBeenCalled();
        });
    });
});
