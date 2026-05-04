import { jest } from '@jest/globals';
import { mockReqRes } from '../../test-utils/mockReqRes.js';
import { makeModelStub } from '../../test-utils/sequelizeStubs.js';

const UserStub = makeModelStub();
jest.unstable_mockModule('../../models/index.js', () => ({
    User: UserStub,
}));

const { default: UserController } = await import('../UserController.js');

describe('UserController', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createUser', () => {
        it('returns 201 with the created user on success', async () => {
            const newUser = { id: 'u1', email: 'a@b.c' };
            UserStub.create.mockResolvedValueOnce(newUser);
            const { req, res } = mockReqRes({ body: newUser });

            await UserController.createUser(req, res);

            expect(UserStub.create).toHaveBeenCalledWith(expect.objectContaining({ id: 'u1', email: 'a@b.c' }));
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(newUser);
        });

        it('returns 400 when create throws', async () => {
            UserStub.create.mockRejectedValueOnce(new Error('dup key'));
            const { req, res } = mockReqRes({ body: {} });

            await UserController.createUser(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Error creating user',
                error: 'dup key',
            });
        });
    });

    describe('getAllUsers', () => {
        it('returns 200 with the list of users', async () => {
            const users = [{ id: 'a' }, { id: 'b' }];
            UserStub.findAll.mockResolvedValueOnce(users);
            const { req, res } = mockReqRes();

            await UserController.getAllUsers(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(users);
        });

        it('returns 500 when findAll throws', async () => {
            UserStub.findAll.mockRejectedValueOnce(new Error('db down'));
            const { req, res } = mockReqRes();

            await UserController.getAllUsers(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Error fetching users',
                error: 'db down',
            });
        });
    });

    describe('getUserById', () => {
        it('returns 200 with the user when found', async () => {
            UserStub.findByPk.mockResolvedValueOnce({ id: 'u1' });
            const { req, res } = mockReqRes({ params: { id: 'u1' } });

            await UserController.getUserById(req, res);

            expect(UserStub.findByPk).toHaveBeenCalledWith('u1');
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ id: 'u1' });
        });

        it('returns 404 when user is not found', async () => {
            UserStub.findByPk.mockResolvedValueOnce(null);
            const { req, res } = mockReqRes({ params: { id: 'missing' } });

            await UserController.getUserById(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
        });

        it('returns 500 when findByPk throws', async () => {
            UserStub.findByPk.mockRejectedValueOnce(new Error('boom'));
            const { req, res } = mockReqRes({ params: { id: 'u1' } });

            await UserController.getUserById(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('updateUser', () => {
        it('returns 200 with the refreshed user when an update happened', async () => {
            UserStub.update.mockResolvedValueOnce([1]);
            UserStub.findByPk.mockResolvedValueOnce({ id: 'u1', email: 'new@x.y' });
            const { req, res } = mockReqRes({ params: { id: 'u1' }, body: { email: 'new@x.y' } });

            await UserController.updateUser(req, res);

            expect(UserStub.update).toHaveBeenCalledWith({ email: 'new@x.y' }, { where: { id: 'u1' } });
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ id: 'u1', email: 'new@x.y' });
        });

        it('returns 404 when no rows were updated', async () => {
            UserStub.update.mockResolvedValueOnce([0]);
            const { req, res } = mockReqRes({ params: { id: 'missing' }, body: {} });

            await UserController.updateUser(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
        });

        it('returns 400 when update throws', async () => {
            UserStub.update.mockRejectedValueOnce(new Error('bad'));
            const { req, res } = mockReqRes({ params: { id: 'u1' }, body: {} });

            await UserController.updateUser(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('deleteUser', () => {
        it('returns 204 when the user is deleted', async () => {
            UserStub.destroy.mockResolvedValueOnce(1);
            const { req, res } = mockReqRes({ params: { id: 'u1' } });

            await UserController.deleteUser(req, res);

            expect(UserStub.destroy).toHaveBeenCalledWith({ where: { id: 'u1' } });
            expect(res.status).toHaveBeenCalledWith(204);
            expect(res.send).toHaveBeenCalledWith('User deleted');
        });

        it('returns 404 when nothing was deleted', async () => {
            UserStub.destroy.mockResolvedValueOnce(0);
            const { req, res } = mockReqRes({ params: { id: 'missing' } });

            await UserController.deleteUser(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
        });

        it('returns 500 when destroy throws', async () => {
            UserStub.destroy.mockRejectedValueOnce(new Error('x'));
            const { req, res } = mockReqRes({ params: { id: 'u1' } });

            await UserController.deleteUser(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });
});
