import { jest } from '@jest/globals';

// Mock Redis
const mockLpush = jest.fn();
const mockHset = jest.fn();
const mockHgetall = jest.fn();
jest.unstable_mockModule('ioredis', () => ({
    default: jest.fn().mockImplementation(() => ({
        lpush: mockLpush,
        hset: mockHset,
        hgetall: mockHgetall,
    })),
}));

// Mock AWS S3
const mockS3Send = jest.fn();
jest.unstable_mockModule('../../configs/s3Client.js', () => ({
    s3Client: { send: mockS3Send },
    BUCKET_NAME: 'test-bucket',
}));
jest.unstable_mockModule('@aws-sdk/client-s3', () => ({
    PutObjectCommand: jest.fn(),
    GetObjectCommand: jest.fn(),
}));

// Mock Models
const mockNLQJobCreate = jest.fn();
const mockNLQJobFindByPk = jest.fn();
const mockNLQJobUpdate = jest.fn();
const mockNLQJobFindAll = jest.fn();
const mockProjectFindOne = jest.fn();
const mockDatasetFindAll = jest.fn();

jest.unstable_mockModule('../../models/index.js', () => ({
    NLQJob: {
        create: mockNLQJobCreate,
        findByPk: mockNLQJobFindByPk,
        update: mockNLQJobUpdate,
        findAll: mockNLQJobFindAll,
    },
    Project: { findOne: mockProjectFindOne },
    Dataset: { findAll: mockDatasetFindAll },
}));

const {
    createNLQJob,
    getNLQJobStatus,
    updateNLQJobStatus,
    getNLQJobResult,
    listNLQJobs,
} = await import('../nlq.js');

describe('controllers/nlq.js', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = {
            body: {},
            query: {},
            params: {},
            headers: {},
            user: { uid: 'user123' },
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            setHeader: jest.fn(),
        };
    });

    describe('createNLQJob', () => {
        it('returns 400 if no datasets selected', async () => {
            req.body = { type: 'aggregation', query: 'test', projectId: 'p1' };
            await createNLQJob(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: 'At least one dataset must be selected.' });
        });

        it('returns 400 if invalid type', async () => {
            req.body = { type: 'invalid', query: 'test', projectId: 'p1', datasets: ['d1'] };
            await createNLQJob(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: 'Invalid type. Must be aggregation, comparison, or descriptive.' });
        });

        it('returns 404 if project not found or does not belong to user', async () => {
            req.body = { type: 'aggregation', query: 'test', projectId: 'p1', datasets: ['d1'] };
            mockProjectFindOne.mockResolvedValue(null);
            await createNLQJob(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ error: 'Project not found.' });
        });

        it('successfully creates a job and returns 201', async () => {
            req.body = { type: 'aggregation', query: 'test', projectId: 'p1', datasets: ['d1'] };
            mockProjectFindOne.mockResolvedValue({ id: 'p1' });
            mockNLQJobCreate.mockResolvedValue({ id: 'j1' });
            mockDatasetFindAll.mockResolvedValue([{ id: 'd1', s3_key: 'k1', file_format: 'csv', name: 'D1' }]);
            mockS3Send.mockResolvedValue({});

            await createNLQJob(req, res);

            expect(mockNLQJobCreate).toHaveBeenCalled();
            expect(mockLpush).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ jobId: 'j1', status: 'processing' }));
        });

        it('handles internal error during creation', async () => {
            req.body = { type: 'aggregation', query: 'test', projectId: 'p1', datasets: ['d1'] };
            mockProjectFindOne.mockRejectedValue(new Error('DB Error'));
            
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            await createNLQJob(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
            consoleSpy.mockRestore();
        });
    });

    describe('getNLQJobStatus', () => {
        it('returns 404 if job not found in redis or db', async () => {
            req.params.id = 'j1';
            mockHgetall.mockResolvedValue({});
            mockNLQJobFindByPk.mockResolvedValue(null);

            await getNLQJobStatus(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        it('returns status from redis if available', async () => {
            req.params.id = 'j1';
            mockHgetall.mockResolvedValue({ status: 'done', resultPath: 'path/to/res' });

            await getNLQJobStatus(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'done', resultPath: 'path/to/res' }));
        });

        it('returns processing if db says so', async () => {
            req.params.id = 'j1';
            mockHgetall.mockResolvedValue({});
            mockNLQJobFindByPk.mockResolvedValue({ status: 'processing' });

            await getNLQJobStatus(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ status: 'processing' });
        });
    });

    describe('updateNLQJobStatus', () => {
        it('returns 403 if invalid worker key', async () => {
            req.params.id = 'j1';
            req.headers['x-worker-key'] = 'wrong';
            process.env.WORKER_API_KEY = 'secret';

            await updateNLQJobStatus(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
        });

        it('successfully updates job status', async () => {
            req.params.id = 'j1';
            req.headers['x-worker-key'] = 'secret';
            req.body = { status: 'done', resultPath: 'path' };
            process.env.WORKER_API_KEY = 'secret';

            await updateNLQJobStatus(req, res);
            expect(mockNLQJobUpdate).toHaveBeenCalled();
            expect(mockHset).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });

    describe('getNLQJobResult', () => {
        it('returns 404 if job not found', async () => {
            req.params.id = 'j1';
            mockNLQJobFindByPk.mockResolvedValue(null);
            await getNLQJobResult(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        it('returns 400 if result not available', async () => {
            req.params.id = 'j1';
            mockNLQJobFindByPk.mockResolvedValue({ status: 'processing' });
            await getNLQJobResult(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('streams the S3 object on success', async () => {
            req.params.id = 'j1';
            const mockBody = { pipe: jest.fn() };
            mockNLQJobFindByPk.mockResolvedValue({ status: 'done', result_path: 'res.png' });
            mockS3Send.mockResolvedValue({ Body: mockBody });

            await getNLQJobResult(req, res);
            expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'image/png');
            expect(mockBody.pipe).toHaveBeenCalledWith(res);
        });
    });

    describe('listNLQJobs', () => {
        it('lists jobs for a project', async () => {
            req.params.projectId = 'p1';
            mockNLQJobFindAll.mockResolvedValue([{ id: 'j1' }]);

            await listNLQJobs(req, res);
            expect(mockNLQJobFindAll).toHaveBeenCalledWith(expect.objectContaining({
                where: { project_id: 'p1' }
            }));
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith([{ id: 'j1' }]);
        });

        it('lists jobs filtered by type', async () => {
            req.params.projectId = 'p1';
            req.query.type = 'aggregation';
            mockNLQJobFindAll.mockResolvedValue([{ id: 'j1', type: 'aggregation' }]);

            await listNLQJobs(req, res);
            expect(mockNLQJobFindAll).toHaveBeenCalledWith(expect.objectContaining({
                where: { project_id: 'p1', type: 'aggregation' }
            }));
        });
    });
});
