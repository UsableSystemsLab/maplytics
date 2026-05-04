import { jest } from '@jest/globals';
import { mockReqRes } from '../../test-utils/mockReqRes.js';
import { makeModelStub } from '../../test-utils/sequelizeStubs.js';

const ProjectStub = makeModelStub();
const DatasetStub = makeModelStub();
const DatasetProjectStub = makeModelStub();
const s3Send = jest.fn();
const inferFieldsMock = jest.fn();

jest.unstable_mockModule('../../models/index.js', () => ({
    Project: ProjectStub,
    Dataset: DatasetStub,
    Dataset_Project: DatasetProjectStub,
}));
jest.unstable_mockModule('../../configs/s3Client.js', () => ({
    s3Client: { send: s3Send },
    BUCKET_NAME: 'test-bucket',
}));
jest.unstable_mockModule('@aws-sdk/client-s3', () => ({
    DeleteObjectCommand: jest.fn(function (p) { this.input = p; }),
    GetObjectCommand: jest.fn(function (p) { this.input = p; }),
}));
jest.unstable_mockModule('../../lib/geo/index.js', () => ({
    parseCSV: jest.fn(),
    buildGeoJSONFromObjects: jest.fn(),
    inferFields: inferFieldsMock,
}));

const {
    getPublicFile,
    getPrivateFile,
    getProjectDatasets,
    deleteDataset,
    getDatasetData,
} = await import('../files.controller.js');

describe('files.controller', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('stubbed handlers', () => {
        it('getPublicFile returns 501', async () => {
            const { req, res } = mockReqRes();
            await getPublicFile(req, res);
            expect(res.status).toHaveBeenCalledWith(501);
        });

        it('getPrivateFile returns 501', async () => {
            const { req, res } = mockReqRes();
            await getPrivateFile(req, res);
            expect(res.status).toHaveBeenCalledWith(501);
        });
    });

    describe('getProjectDatasets', () => {
        it('returns 404 when project not found', async () => {
            ProjectStub.findOne.mockResolvedValueOnce(null);
            const { req, res } = mockReqRes({ params: { id: 'p1' } });
            req.userId = 'u';

            await getProjectDatasets(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
        });

        it('returns project datasets with 200', async () => {
            ProjectStub.findOne.mockResolvedValueOnce({ datasets: [{ id: 'd1' }] });
            const { req, res } = mockReqRes({ params: { id: 'p1' } });
            req.userId = 'u';

            await getProjectDatasets(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith([{ id: 'd1' }]);
        });

        it('returns [] when project has no datasets field', async () => {
            ProjectStub.findOne.mockResolvedValueOnce({});
            const { req, res } = mockReqRes({ params: { id: 'p1' } });
            req.userId = 'u';

            await getProjectDatasets(req, res);

            expect(res.json).toHaveBeenCalledWith([]);
        });

        it('returns 500 when findOne throws', async () => {
            ProjectStub.findOne.mockRejectedValueOnce(new Error('db'));
            const { req, res } = mockReqRes({ params: { id: 'p1' } });
            req.userId = 'u';

            await getProjectDatasets(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('deleteDataset', () => {
        it('returns 404 when project missing', async () => {
            ProjectStub.findOne.mockResolvedValueOnce(null);
            const { req, res } = mockReqRes({ params: { id: 'p1', datasetId: 'd1' } });
            req.userId = 'u';

            await deleteDataset(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ error: 'Project not found' });
        });

        it('returns 404 when dataset missing', async () => {
            ProjectStub.findOne.mockResolvedValueOnce({ id: 'p1' });
            DatasetStub.findByPk.mockResolvedValueOnce(null);
            const { req, res } = mockReqRes({ params: { id: 'p1', datasetId: 'd1' } });
            req.userId = 'u';

            await deleteDataset(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ error: 'Dataset not found' });
        });

        it('unlinks dataset from project on success', async () => {
            ProjectStub.findOne.mockResolvedValueOnce({ id: 'p1' });
            DatasetStub.findByPk.mockResolvedValueOnce({ id: 'd1' });
            DatasetProjectStub.destroy.mockResolvedValueOnce(1);
            const { req, res } = mockReqRes({ params: { id: 'p1', datasetId: 'd1' } });
            req.userId = 'u';

            await deleteDataset(req, res);

            expect(DatasetProjectStub.destroy).toHaveBeenCalledWith({
                where: { project_id: 'p1', dataset_id: 'd1' },
            });
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('returns 500 when destroy throws', async () => {
            ProjectStub.findOne.mockResolvedValueOnce({ id: 'p1' });
            DatasetStub.findByPk.mockResolvedValueOnce({ id: 'd1' });
            DatasetProjectStub.destroy.mockRejectedValueOnce(new Error('x'));
            const { req, res } = mockReqRes({ params: { id: 'p1', datasetId: 'd1' } });
            req.userId = 'u';

            await deleteDataset(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('getDatasetData', () => {
        it('returns 404 when project missing', async () => {
            ProjectStub.findOne.mockResolvedValueOnce(null);
            const { req, res } = mockReqRes({ params: { id: 'p1', datasetId: 'd1' } });
            req.userId = 'u';

            await getDatasetData(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
        });

        it('returns 404 when dataset missing', async () => {
            ProjectStub.findOne.mockResolvedValueOnce({ id: 'p1' });
            DatasetStub.findByPk.mockResolvedValueOnce(null);
            const { req, res } = mockReqRes({ params: { id: 'p1', datasetId: 'd1' } });
            req.userId = 'u';

            await getDatasetData(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
        });

        it('fetches file from S3 and returns geojson + fields', async () => {
            const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
            const dirSpy = jest.spyOn(console, 'dir').mockImplementation(() => {});
            ProjectStub.findOne.mockResolvedValueOnce({ id: 'p1' });
            DatasetStub.findByPk.mockResolvedValueOnce({
                file_format: 'JSON',
                dataValues: { slug: 'my-slug' },
            });
            const fakeBody = { transformToString: jest.fn().mockResolvedValue('{"type":"FeatureCollection","features":[]}') };
            s3Send.mockResolvedValueOnce({ Body: fakeBody });
            inferFieldsMock.mockReturnValueOnce([{ name: 'x', type: 'string' }]);

            const { req, res } = mockReqRes({ params: { id: 'p1', datasetId: 'd1' } });
            req.userId = 'u';

            await getDatasetData(req, res);

            expect(s3Send).toHaveBeenCalled();
            expect(inferFieldsMock).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                geojson: { type: 'FeatureCollection', features: [] },
                fields: [{ name: 'x', type: 'string' }],
            });

            logSpy.mockRestore();
            dirSpy.mockRestore();
        });

        it('returns 500 when S3 fetch throws', async () => {
            const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
            const dirSpy = jest.spyOn(console, 'dir').mockImplementation(() => {});
            ProjectStub.findOne.mockResolvedValueOnce({ id: 'p1' });
            DatasetStub.findByPk.mockResolvedValueOnce({
                file_format: 'JSON',
                dataValues: { slug: 'my-slug' },
            });
            s3Send.mockRejectedValueOnce(new Error('s3 down'));

            const { req, res } = mockReqRes({ params: { id: 'p1', datasetId: 'd1' } });
            req.userId = 'u';

            await getDatasetData(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            errSpy.mockRestore();
            logSpy.mockRestore();
            dirSpy.mockRestore();
        });
    });
});
