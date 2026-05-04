import { jest } from '@jest/globals';
import express from 'express';
import request from 'supertest';

// Stub firebaseAdmin so the auth middleware can import without real init
const verifyIdToken = jest.fn();
jest.unstable_mockModule('../../configs/firebaseAdmin.js', () => ({
    default: { auth: () => ({ verifyIdToken, getUser: jest.fn() }) },
}));

// Stub the DB and S3 clients so controller imports don't try to connect
jest.unstable_mockModule('../../configs/postgresDB.js', () => ({
    sequelize: { fn: jest.fn(), col: jest.fn(), or: jest.fn(), where: jest.fn(), query: jest.fn(), transaction: jest.fn() },
    postgresDB: jest.fn(),
}));
jest.unstable_mockModule('../../configs/s3Client.js', () => ({
    s3Client: { send: jest.fn() },
    BUCKET_NAME: 'b',
    initBucket: jest.fn(),
}));
jest.unstable_mockModule('../../configs/logger.js', () => ({
    default: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

// Stub models
const stub = () => ({
    findAll: jest.fn(), findByPk: jest.fn(), findOne: jest.fn(),
    findOrCreate: jest.fn(), create: jest.fn(), update: jest.fn(),
    destroy: jest.fn(),
});
jest.unstable_mockModule('../../models/index.js', () => ({
    User: stub(), Dataset: stub(), Feature: stub(), Feature_Property: stub(),
    Dataset_Metadata: stub(), Region: stub(), City: stub(), District: stub(),
    Project: stub(), Dataset_Project: stub(),
}));

// Stub multer middleware so routes that use it don't fail at import
jest.unstable_mockModule('../../middlewares/upload.middleware.js', () => ({
    uploadPublic: { single: () => (req, res, next) => next() },
    uploadPrivate: { single: () => (req, res, next) => next() },
}));

const { default: apiRoutes } = await import('../index.js');

function buildApp() {
    const app = express();
    app.use(express.json());
    const router = express.Router();
    apiRoutes(router);
    app.use('/api', router);
    return app;
}

describe('routes/index.js', () => {
    let app;
    beforeAll(() => {
        app = buildApp();
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('GET /api/health returns 200 with healthy status', async () => {
        const res = await request(app).get('/api/health');
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ status: 'Healthy' });
    });

    it('GET /api/unknown-path returns 404', async () => {
        const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        const res = await request(app).get('/api/unknown-path');
        expect(res.status).toBe(404);
        expect(res.body).toEqual({ error: 'Not Found' });
        logSpy.mockRestore();
    });

    describe('auth gate on protected routes', () => {
        it('GET /api/users without auth header returns 401', async () => {
            const res = await request(app).get('/api/users');
            expect(res.status).toBe(401);
        });

        it('GET /api/projects without auth header returns 401', async () => {
            const res = await request(app).get('/api/projects');
            expect(res.status).toBe(401);
        });

        it('POST /api/comparison/stats without auth header returns 401', async () => {
            const res = await request(app).post('/api/comparison/stats').send({});
            expect(res.status).toBe(401);
        });

        it('returns 403 when token is invalid', async () => {
            verifyIdToken.mockRejectedValueOnce(new Error('bad token'));
            const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            const res = await request(app)
                .get('/api/users')
                .set('Authorization', 'Bearer bad');
            expect(res.status).toBe(403);
            errSpy.mockRestore();
        });
    });

    it('public routes (datasets, geo) skip the auth gate', async () => {
        // /api/geo/cities is mounted without authenticate middleware. The
        // controller will still execute (and may return 500 due to stubbed
        // sequelize.query); the point is it does NOT return 401.
        const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const res = await request(app).get('/api/geo/regions');
        expect(res.status).not.toBe(401);
        errSpy.mockRestore();
    });
});
