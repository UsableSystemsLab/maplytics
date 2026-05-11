import { jest } from '@jest/globals';

const mockResolve = jest.fn();
jest.unstable_mockModule('../../utils/locationResolver.js', () => ({
    resolve: mockResolve,
}));

const { resolveLocations } = await import('../locations.js');

describe('controllers/locations.js', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = { query: {} };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
    });

    it('returns 400 if names query param is missing', async () => {
        await resolveLocations(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'bad_request' }));
    });

    it('returns 400 if names does not contain exactly two values', async () => {
        req.query.names = 'Olaya';
        await resolveLocations(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        
        req.query.names = 'Olaya,Malaz,Mursalat';
        await resolveLocations(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 200 and data on successful resolution', async () => {
        req.query.names = 'Olaya, Malaz';
        const mockResult = { level: 'district', matches: [] };
        mockResolve.mockResolvedValue(mockResult);

        await resolveLocations(req, res);
        expect(mockResolve).toHaveBeenCalledWith(['Olaya', 'Malaz']);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(mockResult);
    });

    it('returns 422 if location is unresolved', async () => {
        req.query.names = 'Unknown1, Unknown2';
        mockResolve.mockResolvedValue(null);

        await resolveLocations(req, res);
        expect(res.status).toHaveBeenCalledWith(422);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'location_unresolved' }));
    });

    it('returns 400 if resolver returns bad_request error', async () => {
        req.query.names = 'A, B';
        mockResolve.mockResolvedValue({ error: 'bad_request' });

        await resolveLocations(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 500 on internal error', async () => {
        req.query.names = 'A, B';
        mockResolve.mockRejectedValue(new Error('DB Error'));
        
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        await resolveLocations(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        consoleSpy.mockRestore();
    });
});
