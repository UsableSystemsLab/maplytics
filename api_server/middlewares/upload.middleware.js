import multer from 'multer';
import fs from 'fs';

// Public dataset upload - organized by user ID
export const uploadPublic = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const userId = req.userId;
      const userFolder = `/datasets/public/${userId}`;

      if (!fs.existsSync(userFolder)) {
        fs.mkdirSync(userFolder, { recursive: true });
      }

      cb(null, userFolder);
    },
    filename: (req, file, cb) => {
      const uniqueName = `${Date.now()}-${file.originalname}`;
      cb(null, uniqueName);
    },
  }),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
});

// Private dataset upload - will be organized by project ID later
export const uploadPrivate = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const projectId = req.query.projectId;

      if (!projectId) {
        return cb(new Error('Project ID is required for private uploads'));
      }

      const privateFolder = `/datasets/private/${projectId}`;

      if (!fs.existsSync(privateFolder)) {
        fs.mkdirSync(privateFolder, { recursive: true });
      }

      cb(null, privateFolder);
    },
    filename: (req, file, cb) => {
      const uniqueName = `${Date.now()}-${file.originalname}`;
      cb(null, uniqueName);
    },
  }),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB
  },
});