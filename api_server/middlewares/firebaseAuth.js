import admin from '../configs/firebaseAdmin.js';

export const authenticate = async (req, res, next) => {
    // Allow worker bypass via service token
    const workerKey = req.headers['x-worker-key'];
    if (workerKey && workerKey === process.env.WORKER_API_KEY) {
        req.user = { uid: '__worker__', isWorker: true };
        req.userId = '__worker__';
        req.isAdmin = false;
        return next();
    }

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
