import { jest } from '@jest/globals';
import { mockReqRes } from '../../test-utils/mockReqRes.js';
import { makeModelStub } from '../../test-utils/sequelizeStubs.js';

const ProjectStub = makeModelStub();
const UserStub = makeModelStub();
const s3Send = jest.fn();

jest.unstable_mockModule('../../models/index.js', () => ({
    Project: ProjectStub,
    User: UserStub,
}));

jest.unstable_mockModule('../../configs/s3Client.js', () => ({
    s3Client: { send: s3Send },
    BUCKET_NAME: 'test-bucket',
}));

jest.unstable_mockModule('@aws-sdk/client-s3', () => ({
    ListObjectsV2Command: jest.fn(function (params) { this.input = params; this._cmd = 'list'; }),
    DeleteObjectsCommand: jest.fn(function (params) { this.input = params; this._cmd = 'delete'; }),
}));

const { getProjects, createProject, deleteProject } = await import('../project.controller.js');

describe('project.controller', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getProjects', () => {
        it('returns 200 with the user\'s non-deleted projects ordered by created_at desc', async () => {
            const projects = [{ id: 'p1' }, { id: 'p2' }];
            ProjectStub.findAll.mockResolvedValueOnce(projects);
            const { req, res } = mockReqRes({});
            req.userId = 'user-1';

            await getProjects(req, res);

            expect(ProjectStub.findAll).toHaveBeenCalledWith({
                where: { user_id: 'user-1', is_deleted: false },
                order: [['created_at', 'DESC']],
            });
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(projects);
        });

        it('returns 500 when findAll throws', async () => {
            ProjectStub.findAll.mockRejectedValueOnce(new Error('db'));
            const { req, res } = mockReqRes();
            req.userId = 'u';

            await getProjects(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Failed to fetch projects',
                message: 'db',
            });
        });
    });

    describe('createProject', () => {
        it('returns 400 when name is missing', async () => {
            const { req, res } = mockReqRes({ body: {} });
            req.userId = 'u';

            await createProject(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: 'Project name is required' });
        });

        it('upserts the user and returns 201 with the created project on success', async () => {
            UserStub.findOrCreate.mockResolvedValueOnce([{ id: 'u' }, true]);
            ProjectStub.create.mockResolvedValueOnce({ id: 'p1', name: 'My' });
            const { req, res } = mockReqRes({
                body: { name: 'My', description: 'd' },
                headers: { 'x-user-email': 'u@x.y' },
            });
            req.userId = 'u';

            await createProject(req, res);

            expect(UserStub.findOrCreate).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 'u' },
                defaults: expect.objectContaining({ id: 'u', email: 'u@x.y', role: 'User' }),
            }));
            expect(ProjectStub.create).toHaveBeenCalledWith({
                name: 'My', description: 'd', user_id: 'u',
            });
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({ id: 'p1', name: 'My' });
        });

        it('falls back to placeholder email when x-user-email header is missing', async () => {
            UserStub.findOrCreate.mockResolvedValueOnce([{}, false]);
            ProjectStub.create.mockResolvedValueOnce({ id: 'p2' });
            const { req, res } = mockReqRes({ body: { name: 'X' } });
            req.userId = 'abc';

            await createProject(req, res);

            expect(UserStub.findOrCreate.mock.calls[0][0].defaults.email).toBe('abc@placeholder.com');
        });

        it('continues even if user upsert fails', async () => {
            const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            UserStub.findOrCreate.mockRejectedValueOnce(new Error('user fail'));
            ProjectStub.create.mockResolvedValueOnce({ id: 'p1' });
            const { req, res } = mockReqRes({ body: { name: 'A' } });
            req.userId = 'u';

            await createProject(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            errSpy.mockRestore();
        });

        it('returns 500 when project create throws', async () => {
            UserStub.findOrCreate.mockResolvedValueOnce([{}, false]);
            ProjectStub.create.mockRejectedValueOnce(new Error('create'));
            const { req, res } = mockReqRes({ body: { name: 'A' } });
            req.userId = 'u';

            await createProject(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Failed to create project',
                message: 'create',
            });
        });
    });

    describe('deleteProject', () => {
        it('returns 404 when the project is not owned by the user', async () => {
            ProjectStub.findOne.mockResolvedValueOnce(null);
            const { req, res } = mockReqRes({ params: { id: 'p1' } });
            req.userId = 'u';

            await deleteProject(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ error: 'Project not found or not authorized' });
        });

        it('soft-deletes the project and removes its S3 objects', async () => {
            const project = { id: 'p1', is_deleted: false, save: jest.fn().mockResolvedValue() };
            ProjectStub.findOne.mockResolvedValueOnce(project);
            // first send: list response with 2 objects; second send: delete response
            s3Send
                .mockResolvedValueOnce({ Contents: [{ Key: 'a' }, { Key: 'b' }] })
                .mockResolvedValueOnce({});
            const { req, res } = mockReqRes({ params: { id: 'p1' } });
            req.userId = 'u';

            await deleteProject(req, res);

            expect(project.is_deleted).toBe(true);
            expect(project.save).toHaveBeenCalled();
            expect(s3Send).toHaveBeenCalledTimes(2);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ message: 'Project deleted successfully' });
        });

        it('skips delete when there are no S3 objects', async () => {
            const project = { id: 'p1', is_deleted: false, save: jest.fn().mockResolvedValue() };
            ProjectStub.findOne.mockResolvedValueOnce(project);
            s3Send.mockResolvedValueOnce({ Contents: [] });
            const { req, res } = mockReqRes({ params: { id: 'p1' } });
            req.userId = 'u';

            await deleteProject(req, res);

            expect(s3Send).toHaveBeenCalledTimes(1);
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('still returns 200 if S3 cleanup fails', async () => {
            const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            const project = { id: 'p1', is_deleted: false, save: jest.fn().mockResolvedValue() };
            ProjectStub.findOne.mockResolvedValueOnce(project);
            s3Send.mockRejectedValueOnce(new Error('s3 down'));
            const { req, res } = mockReqRes({ params: { id: 'p1' } });
            req.userId = 'u';

            await deleteProject(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            errSpy.mockRestore();
        });

        it('returns 500 when findOne throws', async () => {
            ProjectStub.findOne.mockRejectedValueOnce(new Error('db'));
            const { req, res } = mockReqRes({ params: { id: 'p1' } });
            req.userId = 'u';

            await deleteProject(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });
});
