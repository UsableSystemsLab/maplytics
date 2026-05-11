import { jest } from '@jest/globals';
import { mockReqRes } from '../../test-utils/mockReqRes.js';

const verifyIdToken = jest.fn();
const getUser = jest.fn();
const mockAdmin = {
    auth: () => ({ verifyIdToken, getUser }),
};

jest.unstable_mockModule('../../configs/firebaseAdmin.js', () => ({
    default: mockAdmin,
}));

const { authenticate } = await import('../firebaseAuth.js');

describe('authenticate middleware', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns 401 when authorization header is missing', async () => {
        const { req, res, next } = mockReqRes();
        await authenticate(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
            error: 'No token provided. Please log in.',
        });
        expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 when authorization header does not start with Bearer', async () => {
        const { req, res, next } = mockReqRes({ headers: { authorization: 'Basic abc' } });
        await authenticate(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    it('returns 403 when verifyIdToken throws', async () => {
        verifyIdToken.mockRejectedValueOnce(new Error('expired'));
        const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const { req, res, next } = mockReqRes({ headers: { authorization: 'Bearer bad' } });

        await authenticate(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
            error: 'Invalid or expired token. Please log in again.',
        });
        expect(next).not.toHaveBeenCalled();
        errSpy.mockRestore();
    });

    it('attaches user info to req and calls next on success', async () => {
        verifyIdToken.mockResolvedValueOnce({ uid: 'u1', admin: true });
        getUser.mockResolvedValueOnce({ uid: 'u1', email: 'u@example.com' });
        const { req, res, next } = mockReqRes({ headers: { authorization: 'Bearer good' } });

        await authenticate(req, res, next);

        expect(req.userId).toBe('u1');
        expect(req.user).toEqual({ uid: 'u1', email: 'u@example.com' });
        expect(req.isAdmin).toBe(true);
        expect(next).toHaveBeenCalledTimes(1);
        expect(res.status).not.toHaveBeenCalled();
    });

    it('sets isAdmin=false when admin claim is absent', async () => {
        verifyIdToken.mockResolvedValueOnce({ uid: 'u2' });
        getUser.mockResolvedValueOnce({ uid: 'u2' });
        const { req, res, next } = mockReqRes({ headers: { authorization: 'Bearer ok' } });

        await authenticate(req, res, next);

        expect(req.isAdmin).toBe(false);
        expect(next).toHaveBeenCalled();
    });
});
