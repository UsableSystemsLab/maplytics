export const extractUserId = (req, res, next) => {
    const userId = req.headers['x-user-id'];

    if (!userId) {
        return res.status(400).json({
            error: 'User ID is required. Please log in.'
        });
    }

    req.userId = userId;
    next();
};