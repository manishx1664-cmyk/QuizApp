import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../src/db/client';
import { AuthService } from '../src/modules/auth/auth.service';
import { QuizService } from '../src/modules/quizzes/quiz.service';
import { AttemptService } from '../src/modules/attempts/attempt.service';
import { seedDatabase } from '../src/db/seed';

describe('QuizForge Full Integration Lifecycle', () => {
  beforeAll(async () => {
    await seedDatabase();
  });

  afterAll(async () => {
    await db.close();
  });

  it('should authenticate admin and learner accounts', async () => {
    const adminAuth = await AuthService.login('admin@quizforge.com', 'Admin@123');
    expect(adminAuth.token).toBeDefined();
    expect(adminAuth.user.role).toBe('admin');

    const learnerAuth = await AuthService.login('john@quizforge.com', 'Learner@123');
    expect(learnerAuth.token).toBeDefined();
    expect(learnerAuth.user.role).toBe('learner');
  });

  it('should execute end-to-end learner quiz taking: start -> answer -> submit -> calculate score', async () => {
    // 1. Get published quiz
    const quizzes = await QuizService.getQuizzes({ status: 'published' });
    expect(quizzes.length).toBeGreaterThan(0);
    const quiz = quizzes[0];

    // 2. Sarah starts attempt
    const sarahAuth = await AuthService.login('sarah@quizforge.com', 'Learner@123');
    const session = await AttemptService.startAttempt(sarahAuth.user.id, quiz.id);

    expect(session.attempt.id).toBeDefined();
    expect(session.questions.length).toBe(quiz.questionCount);
    // Security check: questions sent to learner MUST NOT expose correctOptionId!
    for (const q of session.questions) {
      expect((q as any).correctOptionId).toBeUndefined();
      expect((q as any).explanation).toBeUndefined();
    }

    // 3. Answer first 2 questions
    const q1 = session.questions[0];
    const fullQuiz = await QuizService.getQuizById(quiz.id);
    const fullQ1 = fullQuiz!.questions.find((q) => q.id === q1.id)!;
    
    // Choose correct option for Q1
    await AttemptService.recordAnswer(
      session.attempt.id,
      sarahAuth.user.id,
      q1.id,
      fullQ1.correctOptionId!
    );

    // 4. Submit attempt
    const result = await AttemptService.submitAttempt(session.attempt.id, sarahAuth.user.id);
    expect(result.attempt.status).toBe('submitted');
    expect(result.stats.attempted).toBeGreaterThanOrEqual(1);
    expect(result.stats.correct).toBeGreaterThanOrEqual(1);
    expect(result.stats.percentage).toBeGreaterThan(0);
    expect(result.stats.timeTakenSeconds).toBeGreaterThanOrEqual(0);
  });
});
