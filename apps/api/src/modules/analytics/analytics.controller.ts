import { Router, Request, Response } from 'express';
import { AnalyticsService } from './analytics.service';
import { authenticateToken, requireRole } from '../auth/auth.middleware';

export const analyticsRouter = Router();

// GET /api/analytics (Admin only)
analyticsRouter.get('/', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const summary = await AnalyticsService.getSummary(req.user?.id);
    return res.json(summary);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

