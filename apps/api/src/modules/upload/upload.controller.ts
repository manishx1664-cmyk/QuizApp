import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken, requireRole } from '../auth/auth.middleware';
import { config } from '../../config';

export const uploadRouter = Router();

const imagesDir = path.join(config.uploadDir, 'images');
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, imagesDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    cb(null, `img-${Date.now()}-${uuidv4().substring(0, 8)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (PNG, JPG, JPEG, GIF, WEBP) are allowed.'));
    }
  }
});

// POST /api/upload/image
uploadRouter.post(
  '/image',
  authenticateToken,
  requireRole('admin'),
  (req: Request, res: Response) => {
    upload.single('image')(req, res, (err: any) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      if (!req.file) {
        return res.status(400).json({ error: 'No image file uploaded' });
      }
      const publicUrl = `/uploads/images/${req.file.filename}`;
      return res.json({ url: publicUrl, filename: req.file.filename });
    });
  }
);

// POST /api/upload/image-base64
uploadRouter.post(
  '/image-base64',
  authenticateToken,
  requireRole('admin'),
  async (req: Request, res: Response) => {
    try {
      const { base64 } = req.body;
      if (!base64 || typeof base64 !== 'string') {
        return res.status(400).json({ error: 'Invalid base64 payload' });
      }

      const matches = base64.match(/^data:image\/([a-zA-Z0-9\+\-]+);base64,(.+)$/);
      let ext = 'png';
      let dataBuffer: Buffer;

      if (matches && matches.length === 3) {
        ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
        dataBuffer = Buffer.from(matches[2], 'base64');
      } else {
        dataBuffer = Buffer.from(base64, 'base64');
      }

      const generatedFilename = `img-${Date.now()}-${uuidv4().substring(0, 8)}.${ext}`;
      const filePath = path.join(imagesDir, generatedFilename);
      fs.writeFileSync(filePath, dataBuffer);

      const publicUrl = `/uploads/images/${generatedFilename}`;
      return res.json({ url: publicUrl, filename: generatedFilename });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to save base64 image' });
    }
  }
);
