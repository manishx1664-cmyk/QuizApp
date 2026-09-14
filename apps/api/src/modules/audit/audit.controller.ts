import { Router, Request, Response } from 'express';
import { AuditService } from './audit.service';
import { authenticateToken, requireRole } from '../auth/auth.middleware';

export const auditRouter = Router();

// GET /api/audit-logs (Admin only)
auditRouter.get('/', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const limit = parseInt((req.query.limit as string) || '100', 10);
    const logs = await AuditService.getLogs(limit);
    return res.json({ logs });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
