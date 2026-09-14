import { Router, Request, Response } from 'express';
import { AttemptService } from './attempt.service';
import { authenticateToken, optionalAuthenticateToken, requireRole } from '../auth/auth.middleware';
import { AuditService } from '../audit/audit.service';

export const attemptRouter = Router();

// POST /api/attempts/join (Public - Learner enters Name + Join Code)
attemptRouter.post('/join', async (req: Request, res: Response) => {
  try {
    const { joinCode, learnerName } = req.body;
    if (!joinCode || !learnerName) {
      return res.status(400).json({ error: 'Both Join Code and your Name are required.' });
    }

    const session = await AttemptService.joinAttemptByCode(joinCode, learnerName);
    return res.json(session);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// POST /api/attempts/start/:quizId or /api/attempts/quizzes/:quizId/start
attemptRouter.post(['/start/:quizId', '/quizzes/:quizId/start'], optionalAuthenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || null;
    const learnerName = req.body.learnerName || req.user?.name || 'Learner';
    const session = await AttemptService.startAttempt(userId, req.params.quizId, learnerName);
    return res.json(session);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// POST /api/attempts/:id/answer (Auto-save)
attemptRouter.post('/:id/answer', optionalAuthenticateToken, async (req: Request, res: Response) => {
  try {
    const { questionId, selectedOptionId, isMarkedForReview } = req.body;
    if (!questionId) {
      return res.status(400).json({ error: 'questionId is required' });
    }

    const result = await AttemptService.recordAnswer(
      req.params.id,
      req.user?.id || null,
      questionId,
      selectedOptionId,
      isMarkedForReview
    );

    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// POST /api/attempts/:id/submit
attemptRouter.post('/:id/submit', optionalAuthenticateToken, async (req: Request, res: Response) => {
  try {
    const result = await AttemptService.submitAttempt(
      req.params.id,
      req.user?.id || null,
      req.body.isAuto === true
    );

    if (req.user?.id) {
      await AuditService.logAction(
        req.user.id,
        req.user.name,
        req.user.email,
        'QUIZ_ATTEMPT_SUBMITTED',
        'attempt',
        req.params.id,
        {
          score: result.stats.score,
          percentage: result.stats.percentage,
          isPassed: result.stats.isPassed
        }
      );
    }

    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// GET /api/attempts/my-attempts
attemptRouter.get('/my-attempts', authenticateToken, async (req: Request, res: Response) => {
  try {
    const attempts = await AttemptService.getUserAttempts(req.user!.id);
    return res.json({ attempts });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/attempts/:id
attemptRouter.get('/:id', optionalAuthenticateToken, async (req: Request, res: Response) => {
  try {
    const isAdmin = req.user?.role === 'admin';
    const result = await AttemptService.getAttemptResult(
      req.params.id,
      req.user?.id || null,
      isAdmin
    );
    if (!result) {
      return res.status(404).json({ error: 'Attempt not found' });
    }
    return res.json(result);
  } catch (err: any) {
    return res.status(403).json({ error: err.message });
  }
});

