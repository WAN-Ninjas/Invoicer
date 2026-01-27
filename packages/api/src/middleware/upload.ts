import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create uploads directory if it doesn't exist
const uploadsDir = join(__dirname, '../../uploads');
if (!existsSync(uploadsDir)) {
  mkdirSync(uploadsDir, { recursive: true });
}

// CSV uploads - stored temporarily for processing
const csvStorage = multer.memoryStorage();

export const uploadCsv = multer({
  storage: csvStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
});

// Logo uploads - stored on disk
const logoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const logosDir = join(uploadsDir, 'logos');
    if (!existsSync(logosDir)) {
      mkdirSync(logosDir, { recursive: true });
    }
    cb(null, logosDir);
  },
  filename: (_req, file, cb) => {
    const ext = file.originalname.split('.').pop();
    cb(null, `company-logo.${ext}`);
  },
});

export const uploadLogo = multer({
  storage: logoStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (JPEG, PNG, GIF, SVG)'));
    }
  },
});
