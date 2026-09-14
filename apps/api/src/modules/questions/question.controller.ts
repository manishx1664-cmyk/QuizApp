import { Router, Request, Response } from 'express';
import { QuestionService } from './question.service';
import { authenticateToken, requireRole } from '../auth/auth.middleware';
import { AuditService } from '../audit/audit.service';
import { QuizDifficulty } from '@quizforge/shared';

export const questionRouter = Router();

// GET /api/questions (Admin Question Bank)
questionRouter.get('/', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { search, categoryId, difficulty, quizId, requiresReview } = req.query;
    const questions = await QuestionService.getQuestions({
      search: search as string,
      categoryId: categoryId as string,
      difficulty: difficulty as QuizDifficulty,
      quizId: quizId as string,
      requiresReview: requiresReview !== undefined ? requiresReview === 'true' : undefined,
      adminId: req.user?.id
    });
    return res.json({ questions });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});


// GET /api/questions/:id
questionRouter.get('/:id', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const question = await QuestionService.getQuestionById(req.params.id);
    if (!question) return res.status(404).json({ error: 'Question not found' });
    return res.json({ question });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/questions/:id/versions
questionRouter.get('/:id/versions', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const versions = await QuestionService.getVersions(req.params.id);
    return res.json({ versions });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/questions (Create manual question)
questionRouter.post('/', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { quizId, questionText, imageUrl, explanation, difficulty, categoryId, options, requiresReview } = req.body;
    if (!questionText || !options || options.length < 2) {
      return res.status(400).json({ error: 'Question text and at least 2 options are required.' });
    }

    const question = await QuestionService.createQuestion({
      quizId,
      questionText,
      imageUrl,
      explanation,
      difficulty,
      categoryId,
      options,
      requiresReview
    });

    await AuditService.logAction(
      req.user?.id,
      req.user?.name,
      req.user?.email,
      'QUESTION_CREATED',
      'question',
      question.id,
      { questionText: question.questionText }
    );

    return res.status(201).json({ question });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// PUT /api/questions/:id (Update question & record version)
questionRouter.put('/:id', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { questionText, imageUrl, explanation, difficulty, categoryId, options, correctOptionId, requiresReview } = req.body;
    const question = await QuestionService.updateQuestion(
      req.params.id,
      {
        questionText,
        imageUrl,
        explanation,
        difficulty,
        categoryId,
        options,
        correctOptionId,
        requiresReview
      },
      req.user?.id
    );

    await AuditService.logAction(
      req.user?.id,
      req.user?.name,
      req.user?.email,
      'QUESTION_UPDATED',
      'question',
      question.id,
      { version: question.version }
    );

    return res.json({ question });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// POST /api/questions/:id/duplicate
questionRouter.post('/:id/duplicate', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const question = await QuestionService.duplicateQuestion(req.params.id);
    await AuditService.logAction(
      req.user?.id,
      req.user?.name,
      req.user?.email,
      'QUESTION_DUPLICATED',
      'question',
      question.id
    );
    return res.status(201).json({ question });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// DELETE /api/questions/:id
questionRouter.delete('/:id', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    await QuestionService.deleteQuestion(req.params.id);
    await AuditService.logAction(
      req.user?.id,
      req.user?.name,
      req.user?.email,
      'QUESTION_DELETED',
      'question',
      req.params.id
    );
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
