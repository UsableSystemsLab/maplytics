import { resolve } from '../utils/locationResolver.js';

export const resolveLocations = async (req, res) => {
    try {
        const raw = req.query.names;
        if (!raw || typeof raw !== 'string') {
            return res.status(400).json({
                error: 'bad_request',
                message: 'names query parameter is required',
            });
        }
        const names = raw.split(',').map((s) => s.trim()).filter(Boolean);
        if (names.length !== 2) {
            return res.status(400).json({
                error: 'bad_request',
                message: 'names must contain exactly two comma-separated values',
            });
        }

        const result = await resolve(names);
        if (!result) {
            return res.status(422).json({
                error: 'location_unresolved',
                details: {
                    unresolved: names,
                    tried_levels: ['district', 'city', 'region'],
                },
            });
        }
        if (result.error === 'bad_request') {
            return res.status(400).json({ error: 'bad_request' });
        }

        return res.status(200).json(result);
    } catch (error) {
        console.error('Error resolving locations:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
