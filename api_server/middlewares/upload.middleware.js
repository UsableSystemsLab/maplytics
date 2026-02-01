import multer from 'multer';
import fs from 'fs';

const createStorage = (destinationPath) => {
  if (!fs.existsSync(destinationPath)) {
    fs.mkdirSync(destinationPath, { recursive: true });
  }

  return multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, destinationPath);
    },
    filename: (req, file, cb) => {
      const uniqueName = `${Date.now()}-${file.originalname}`;
      cb(null, uniqueName);
    },
  });
};

// Public dataset upload (for developers/admins)
export const uploadPublic = multer({
  storage: createStorage('/datasets/public'),
  limits: {
    fileSize: 1000 * 1024 * 1024,
  },
});

// Private dataset upload (for users)
export const uploadPrivate = multer({
  storage: createStorage('/datasets/private'),
  limits: {
    fileSize: 500 * 1024 * 1024,
  },
});