import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { PDFProcessor } from './PDFProcessor';
import { authenticateToken, requireRole } from '../auth/auth.middleware';
import { config } from '../../config';
import { AuditService } from '../audit/audit.service';

export const pdfRouter = Router();

// Ensure upload directory exists
if (!fs.existsSync(config.uploadDir)) {
  fs.mkdirSync(config.uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, config.uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'mcq-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: config.maxFileSizeMb * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF documents are supported.'));
    }
  }
});

// POST /api/pdf/upload (Admin only)
pdfRouter.post(
  '/upload',
  authenticateToken,
  requireRole('admin'),
  (req: Request, res: Response, next: any) => {
    upload.single('pdf')(req, res, (err: any) => {
      if (err) {
        return res.status(400).json({ error: err.message || 'PDF upload failed. Please upload a valid PDF file.' });
      }
      next();
    });
  },
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Please select a PDF file to upload.' });
      }

      console.log(` Receiving PDF upload: ${req.file.originalname} (${req.file.size} bytes)`);
      const job = await PDFProcessor.createJob(req.file.originalname, req.file.size);

      // Trigger asynchronous PDF processing in background
      PDFProcessor.processPdf(job.id, req.file.path).catch((err) => {
        console.error('Asynchronous PDF processing error:', err);
      });

      await AuditService.logAction(
        req.user?.id,
        req.user?.name,
        req.user?.email,
        'PDF_UPLOADED',
        'pdf_job',
        job.id,
        { filename: req.file.originalname, filesize: req.file.size }
      );

      return res.status(202).json({
        message: 'PDF upload successful. Processing started.',
        job
      });
    } catch (err: any) {
      console.error('Error handling PDF upload:', err);
      return res.status(500).json({ error: err.message || 'Internal server error processing PDF upload' });
    }
  }
);

// GET /api/pdf/jobs/:id
pdfRouter.get('/jobs/:id', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const job = await PDFProcessor.getJob(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Processing job not found.' });
    }
    return res.json({ job });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT /api/pdf/jobs/:id/questions (Update extracted questions during review)
pdfRouter.put('/jobs/:id/questions', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { questions } = req.body;
    if (!Array.isArray(questions)) {
      return res.status(400).json({ error: 'Questions array is required.' });
    }

    await PDFProcessor.updateJobQuestions(req.params.id, questions);
    const updatedJob = await PDFProcessor.getJob(req.params.id);
    return res.json({ job: updatedJob });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
