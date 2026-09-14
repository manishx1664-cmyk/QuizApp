import { Router, Request, Response } from 'express';
import { QuizService } from './quiz.service';
import { AttemptService } from '../attempts/attempt.service';
import { authenticateToken, requireRole } from '../auth/auth.middleware';
import { AuditService } from '../audit/audit.service';
import { QuizDifficulty, QuizStatus } from '@quizforge/shared';

export const quizRouter = Router();

// GET /api/quizzes/join/:joinCode (Public - No login required)
quizRouter.get('/join/:joinCode', async (req: Request, res: Response) => {
  try {
    const data = await QuizService.getQuizByJoinCode(req.params.joinCode);
    if (!data) {
      return res.status(404).json({ error: 'Invalid or inactive Join Code. Please check the code and try again.' });
    }
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/quizzes (Admin sees only their quizzes; Learner sees published quizzes)
quizRouter.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { status, categoryId, difficulty, search } = req.query;
    const filterAdminId = req.user?.role === 'admin' ? req.user.id : undefined;
    const filterStatus = req.user?.role === 'learner' ? 'published' : (status as QuizStatus);

    const quizzes = await QuizService.getQuizzes({
      status: filterStatus,
      adminId: filterAdminId,
      categoryId: categoryId as string,
      difficulty: difficulty as QuizDifficulty,
      search: search as string
    });

    return res.json({ quizzes });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/quizzes/:id
quizRouter.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const data = await QuizService.getQuizById(req.params.id);
    if (!data) return res.status(404).json({ error: 'Quiz not found' });

    // Multi-admin data isolation check
    if (req.user?.role === 'admin' && data.quiz.createdBy && data.quiz.createdBy !== req.user.id) {
      return res.status(403).json({ error: 'Access denied: You do not own this quiz.' });
    }

    // If learner, do not return questions directly here (questions are delivered via active attempt)
    if (req.user?.role === 'learner') {
      return res.json({
        quiz: data.quiz,
        questionCount: data.questions.length
      });
    }

    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/quizzes/:id/start (Start or resume a quiz attempt)
quizRouter.post('/:id/start', authenticateToken, async (req: Request, res: Response) => {
  try {
    const session = await AttemptService.startAttempt(req.user!.id, req.params.id);
    return res.json(session);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// POST /api/quizzes
quizRouter.post('/', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { title, description, categoryId, difficulty, settings } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const quiz = await QuizService.createQuiz({
      title,
      description,
      categoryId,
      difficulty,
      settings,
      createdBy: req.user?.id
    });

    await AuditService.logAction(
      req.user?.id,
      req.user?.name,
      req.user?.email,
      'QUIZ_CREATED',
      'quiz',
      quiz.id,
      { title: quiz.title }
    );

    return res.status(201).json({ quiz });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// POST /api/quizzes/from-extraction
quizRouter.post('/from-extraction', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { title, description, categoryId, difficulty, settings, questions } = req.body;
    if (!title) return res.status(400).json({ error: 'Quiz title is required' });
    if (!questions || questions.length === 0) {
      return res.status(400).json({ error: 'At least one question is required' });
    }

    const result = await QuizService.createQuizFromExtraction({
      title,
      description,
      categoryId,
      difficulty,
      settings,
      createdBy: req.user?.id,
      questions
    });

    await AuditService.logAction(
      req.user?.id,
      req.user?.name,
      req.user?.email,
      'QUIZ_CREATED_FROM_PDF',
      'quiz',
      result.quiz.id,
      { title: result.quiz.title, questionsCount: questions.length }
    );

    return res.status(201).json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// PUT /api/quizzes/:id
quizRouter.put('/:id', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const existing = await QuizService.getQuizById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Quiz not found' });
    if (existing.quiz.createdBy && existing.quiz.createdBy !== req.user?.id) {
      return res.status(403).json({ error: 'Access denied: You do not own this quiz.' });
    }

    const quiz = await QuizService.updateQuiz(req.params.id, req.body);
    await AuditService.logAction(
      req.user?.id,
      req.user?.name,
      req.user?.email,
      'QUIZ_UPDATED',
      'quiz',
      quiz.id,
      { title: quiz.title }
    );
    return res.json({ quiz });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// POST /api/quizzes/:id/publish
quizRouter.post('/:id/publish', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const existing = await QuizService.getQuizById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Quiz not found' });
    if (existing.quiz.createdBy && existing.quiz.createdBy !== req.user?.id) {
      return res.status(403).json({ error: 'Access denied: You do not own this quiz.' });
    }

    const force = req.body.force === true;
    const result = await QuizService.publishQuiz(req.params.id, force);

    if (result.warning) {
      return res.status(400).json({ warning: result.warning });
    }

    await AuditService.logAction(
      req.user?.id,
      req.user?.name,
      req.user?.email,
      'QUIZ_PUBLISHED',
      'quiz',
      result.quiz.id
    );

    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// POST /api/quizzes/:id/duplicate
quizRouter.post('/:id/duplicate', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const existing = await QuizService.getQuizById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Quiz not found' });
    if (existing.quiz.createdBy && existing.quiz.createdBy !== req.user?.id) {
      return res.status(403).json({ error: 'Access denied: You do not own this quiz.' });
    }

    const quiz = await QuizService.duplicateQuiz(req.params.id, req.user?.id);
    await AuditService.logAction(
      req.user?.id,
      req.user?.name,
      req.user?.email,
      'QUIZ_DUPLICATED',
      'quiz',
      quiz.id
    );
    return res.status(201).json({ quiz });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// DELETE /api/quizzes/:id
quizRouter.delete('/:id', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const existing = await QuizService.getQuizById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Quiz not found' });
    if (existing.quiz.createdBy && existing.quiz.createdBy !== req.user?.id) {
      return res.status(403).json({ error: 'Access denied: You do not own this quiz.' });
    }

    await QuizService.deleteQuiz(req.params.id);
    await AuditService.logAction(
      req.user?.id,
      req.user?.name,
      req.user?.email,
      'QUIZ_DELETED',
      'quiz',
      req.params.id
    );
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/quizzes/:id/export
quizRouter.get('/:id/export', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const existing = await QuizService.getQuizById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Quiz not found' });
    if (existing.quiz.createdBy && existing.quiz.createdBy !== req.user?.id) {
      return res.status(403).json({ error: 'Access denied: You do not own this quiz.' });
    }

    const format = (req.query.format as 'json' | 'csv') || 'json';
    const exported = await QuizService.exportQuiz(req.params.id, format);

    res.setHeader('Content-Type', exported.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${exported.filename}"`);
    return res.send(exported.content);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
