import multer from 'multer';
import multerS3 from 'multer-s3';
import { s3Client, BUCKET_NAME } from '../configs/s3Client.js';

const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.json', '.geojson', '.xlsx', '.xls', '.sql'];
  const ext = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));

  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed: ${allowedExtensions.join(', ')}`), false);
  }
};

// Public dataset upload - organized by user ID
export const uploadPublic = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: BUCKET_NAME,
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      const userId = req.userId;
      const uniqueName = `public/${userId}/${Date.now()}-${file.originalname}`;
      cb(null, uniqueName);
    }
  }),
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
});

// Private dataset upload - organized by project ID
export const uploadPrivate = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: BUCKET_NAME,
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      const projectId = req.query.projectId;
      if (!projectId) {
        return cb(new Error('Project ID is required for private uploads'));
      }
      const uniqueName = `private/${projectId}/${Date.now()}-${file.originalname}`;
      cb(null, uniqueName);
    }
  }),
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB (Limited to 50MB as per requirement)
  },
});