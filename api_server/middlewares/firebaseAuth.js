import admin from '../configs/firebaseAdmin.js';

export const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            error: 'No token provided. Please log in.'
        });
    }

    const idToken = authHeader.split('Bearer ')[1];

    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const userRecord = await admin.auth().getUser(decodedToken.uid);
        req.user = userRecord;
        req.userId = decodedToken.uid;
        req.isAdmin = !!decodedToken.admin;

        next();
    } catch (error) {
        console.error('Error verifying Firebase ID token:', error);
        return res.status(403).json({
            error: 'Invalid or expired token. Please log in again.'
        });
    }
};

// Like authenticate, but a missing/invalid token is treated as "unauthenticated guest"
// instead of returning 401/403. Used for endpoints that are public but also want
// per-user context when a token is present.
export const optionalAuthenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return next();

    const idToken = authHeader.split('Bearer ')[1];
    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        req.userId = decodedToken.uid;
        req.isAdmin = !!decodedToken.admin;
        // Skip the getUser call here — we don't need the full user record for prefs resolution.
    } catch {
        // Bad token on an optional-auth route is a no-op, not a rejection.
    }
    next();
};