import { jest } from '@jest/globals';
import { mockReqRes } from '../../test-utils/mockReqRes.js';
import { makeModelStub } from '../../test-utils/sequelizeStubs.js';

const ProjectStub = makeModelStub();
const DatasetStub = makeModelStub();
const DatasetProjectStub = makeModelStub();
const s3Send = jest.fn();
const insertFeaturesIntoDB = jest.fn();
const parseFileToGeoJSON = jest.fn();

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
    GetObjectCommand: jest.fn(function (p) { this.input = p; }),
}));
jest.unstable_mockModule('../../utils/fileParser.js', () => ({ parseFileToGeoJSON }));
jest.unstable_mockModule('../../utils/featureInserter.js', () => ({ insertFeaturesIntoDB }));

const { uploadPublicFile, uploadPrivateFile } = await import('../upload.controller.js');

function fileReq(overrides = {}) {
    return {
        userId: 'user-1',
        user: { displayName: 'Sultan' },
        isAdmin: false,
        body: {},
        query: {},
        file: {
            key: 'public/123-data.json',
            location: 'http://s3/test-bucket/public/123-data.json',
            originalname: 'data.json',
            size: 42,
        },
        ...overrides,
    };
}

function setupS3Success() {
    s3Send.mockResolvedValueOnce({
        Body: { transformToString: jest.fn().mockResolvedValue('{}') },
    });
    parseFileToGeoJSON.mockReturnValueOnce({ type: 'FeatureCollection', features: [] });
    insertFeaturesIntoDB.mockResolvedValueOnce('ds-1');
}

describe('upload.controller', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('uploadPublicFile', () => {
        it('returns 400 when no file is attached', async () => {
            const { res } = mockReqRes();
            await uploadPublicFile({ ...fileReq(), file: undefined }, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('returns 201 with the public dataset payload on success', async () => {
            setupS3Success();
            const req = fileReq();
            const { res } = mockReqRes();

            await uploadPublicFile(req, res);

            expect(insertFeaturesIntoDB).toHaveBeenCalledWith(expect.objectContaining({
                datasetName: 'data.json',
                userId: 'user-1',
                author: 'Sultan',
                isPublic: true,
            }));
            expect(res.status).toHaveBeenCalledWith(201);
            const payload = res.json.mock.calls[0][0];
            expect(payload).toEqual(expect.objectContaining({
                success: true,
                type: 'public',
                id: 'ds-1',
                filename: '123-data.json',
            }));
        });

        it('links dataset to project when projectId is supplied and project exists', async () => {
            setupS3Success();
            ProjectStub.findByPk.mockResolvedValueOnce({ id: 'p1' });
            const req = fileReq({ query: { projectId: 'p1' } });
            const { res } = mockReqRes();

            await uploadPublicFile(req, res);

            expect(DatasetProjectStub.create).toHaveBeenCalledWith({
                project_id: 'p1', dataset_id: 'ds-1',
            });
        });

        it('skips linking when projectId is provided but the project does not exist', async () => {
            setupS3Success();
            ProjectStub.findByPk.mockResolvedValueOnce(null);
            const req = fileReq({ query: { projectId: 'p1' } });
            const { res } = mockReqRes();

            await uploadPublicFile(req, res);

            expect(DatasetProjectStub.create).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(201);
        });

        it('continues with 201 when project lookup throws', async () => {
            const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            setupS3Success();
            ProjectStub.findByPk.mockRejectedValueOnce(new Error('db'));
            const req = fileReq({ query: { projectId: 'p1' } });
            const { res } = mockReqRes();

            await uploadPublicFile(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            errSpy.mockRestore();
        });

        it('returns 201 with id=null when feature insertion fails', async () => {
            const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            s3Send.mockRejectedValueOnce(new Error('s3'));
            const req = fileReq();
            const { res } = mockReqRes();

            await uploadPublicFile(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json.mock.calls[0][0].id).toBeNull();
            errSpy.mockRestore();
        });

        it('falls back to "unknown user" when displayName is missing', async () => {
            setupS3Success();
            const req = fileReq({ user: undefined });
            const { res } = mockReqRes();

            await uploadPublicFile(req, res);

            expect(insertFeaturesIntoDB.mock.calls[0][0].author).toBe('unknown user');
        });
    });

    describe('uploadPrivateFile', () => {
        it('returns 400 when no file is attached', async () => {
            const { res } = mockReqRes();
            await uploadPrivateFile({ ...fileReq(), file: undefined }, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('returns 201 with private payload and isPublic=false', async () => {
            setupS3Success();
            const req = fileReq();
            const { res } = mockReqRes();

            await uploadPrivateFile(req, res);

            expect(insertFeaturesIntoDB.mock.calls[0][0].isPublic).toBe(false);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json.mock.calls[0][0].type).toBe('private');
        });

        it('links dataset to project when projectId is supplied', async () => {
            setupS3Success();
            ProjectStub.findByPk.mockResolvedValueOnce({ id: 'p1' });
            const req = fileReq({ query: { projectId: 'p1' } });
            const { res } = mockReqRes();

            await uploadPrivateFile(req, res);

            expect(DatasetProjectStub.create).toHaveBeenCalled();
        });

        it('continues when project linking throws', async () => {
            const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            setupS3Success();
            ProjectStub.findByPk.mockRejectedValueOnce(new Error('x'));
            const req = fileReq({ query: { projectId: 'p1' } });
            const { res } = mockReqRes();

            await uploadPrivateFile(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            errSpy.mockRestore();
        });
    });
});
