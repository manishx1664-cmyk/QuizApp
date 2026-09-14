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

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static uploads
app.use('/uploads', express.static(config.uploadDir));

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/categories', categoryRouter);
app.use('/api/quizzes', quizRouter);
app.use('/api/questions', questionRouter);
app.use('/api/attempts', attemptRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/audit-logs', auditRouter);
app.use('/api/pdf', pdfRouter);
app.use('/api/upload', uploadRouter);

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'QuizForge Backend API'
  });
});

// One-click reseed endpoint (convenience for demo/testing)
app.post('/api/seed', async (_req: Request, res: Response) => {
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
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
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

// Boot server
async function startServer() {
  try {
    console.log(' Starting QuizForge Backend API...');
    await db.init();

    // Auto-seed if database is empty
    const usersCount = await db.query('SELECT COUNT(*) as count FROM users');
    if (parseInt(usersCount.rows[0].count || '0', 10) === 0) {
      console.log(' Empty database detected. Running initial seed data...');
      await seedDatabase();
    }

    app.listen(config.port, '0.0.0.0', () => {
      console.log(` QuizForge API server running on http://127.0.0.1:${config.port}`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

startServer();

export default app;
