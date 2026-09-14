import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { config } from './config';
import { db } from './db/client';
import { authRouter } from './modules/auth/auth.controller';
import { categoryRouter } from './modules/categories/category.controller';
import { quizRouter } from './modules/quizzes/quiz.controller';
import { questionRouter } from './modules/questions/question.controller';
import { attemptRouter } from './modules/attempts/attempt.controller';
import { analyticsRouter } from './modules/analytics/analytics.controller';
import { auditRouter } from './modules/audit/audit.controller';
import { pdfRouter } from './modules/pdf-processor/pdf.controller';
import { uploadRouter } from './modules/upload/upload.controller';
import { seedDatabase } from './db/seed';

export const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Ensure DB is initialized
let isSeeded = false;
app.use(async (_req, _res, next) => {
  try {
    await db.init();
    if (!isSeeded) {
      const usersCount = await db.query('SELECT COUNT(*) as count FROM users');
      if (parseInt(usersCount.rows[0]?.count || '0', 10) === 0) {
        await seedDatabase();
      }
      isSeeded = true;
    }
    next();
  } catch (err) {
    next(err);
  }
});

// Static uploads
app.use('/uploads', express.static(config.uploadDir));

// API Routes supporting standard, direct, and Netlify function paths
const routePrefixes = (endpoint: string) => [
  `/api/${endpoint}`,
  `/${endpoint}`,
  `/.netlify/functions/api/${endpoint}`,
  `/.netlify/functions/api/api/${endpoint}`
];

app.use(routePrefixes('auth'), authRouter);
app.use(routePrefixes('categories'), categoryRouter);
app.use(routePrefixes('quizzes'), quizRouter);
app.use(routePrefixes('questions'), questionRouter);
app.use(routePrefixes('attempts'), attemptRouter);
app.use(routePrefixes('analytics'), analyticsRouter);
app.use(routePrefixes('audit-logs'), auditRouter);
app.use(routePrefixes('pdf'), pdfRouter);
app.use(routePrefixes('upload'), uploadRouter);

// Health check
app.get(['/api/health', '/health', '/.netlify/functions/api/health', '/.netlify/functions/api/api/health'], (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'QuizForge Backend API'
  });
});

// One-click reseed endpoint (convenience for demo/testing)
app.post(['/api/seed', '/seed', '/.netlify/functions/api/seed'], async (_req: Request, res: Response) => {
  try {
    await seedDatabase();
    res.json({ success: true, message: 'Database seeded successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Static frontend serving if dist exists (Production / standalone hosting)
const webDistPath = path.resolve(__dirname, '../../web/dist');
if (fs.existsSync(webDistPath)) {
  app.use(express.static(webDistPath));
  app.get('*', (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path.startsWith('/.netlify')) {
      return next();
    }
    res.sendFile(path.join(webDistPath, 'index.html'));
  });
}

// Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled server error:', err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error'
  });
});

// Standalone server boot (skipped in serverless environments)
if (!config.isServerless) {
  app.listen(config.port, '0.0.0.0', () => {
    console.log(` QuizForge API server running on http://127.0.0.1:${config.port}`);
  });
}

export default app;

