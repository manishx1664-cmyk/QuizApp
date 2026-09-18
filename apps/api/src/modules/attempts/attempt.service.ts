import { v4 as uuidv4 } from 'uuid';
import {
  Attempt,
  ActiveQuizAttemptSession,
  LearnerQuestionView,
  QuizResultResponse,
  QuizResultItem
} from '@quizforge/shared';
import { db } from '../../db/client';
import { QuizService } from '../quizzes/quiz.service';

export class AttemptService {
  public static async joinAttemptByCode(
    joinCode: string,
    learnerName: string
  ): Promise<ActiveQuizAttemptSession> {
    if (!learnerName || !learnerName.trim()) {
      throw new Error('Please enter your name to join the quiz.');
    }
    const cleanCode = (joinCode || '').trim().toUpperCase();
    if (!cleanCode) {
      throw new Error('Please enter a valid Join Code.');
    }

    const data = await QuizService.getQuizByJoinCode(cleanCode);
    if (!data) {
      throw new Error('Invalid or inactive Join Code. Please check the code and try again.');
    }

    return this.startAttempt(null, data.quiz.id, learnerName.trim());
  }

  public static async startAttempt(
    userId: string | null,
    quizId: string,
    learnerName?: string
  ): Promise<ActiveQuizAttemptSession> {
    const quizData = await QuizService.getQuizById(quizId);
    if (!quizData) {
      throw new Error('Quiz not found');
    }

    const { quiz, questions } = quizData;

    if (quiz.status !== 'published') {
      throw new Error('This quiz is not currently available to take.');
    }

    if (questions.length === 0) {
      throw new Error('This quiz does not have any questions yet.');
    }

    let attemptRow: any = null;

    // Check for existing active attempt (Resume capability for registered users)
    if (userId) {
      const activeRes = await db.query(
        `SELECT * FROM attempts 
         WHERE user_id = $1 AND quiz_id = $2 AND status = 'in_progress'
         ORDER BY started_at DESC LIMIT 1`,
        [userId, quizId]
      );

      attemptRow = activeRes.rows[0];

      // If an active attempt exists, check if expired
      if (attemptRow) {
        const now = new Date().getTime();
        const deadline = attemptRow.deadline_at ? new Date(attemptRow.deadline_at).getTime() : null;

        if (deadline && now > deadline) {
          // Auto-submit expired attempt
          await this.submitAttempt(attemptRow.id, userId, true);
          attemptRow = null;
        }
      }

      // Check attempt limits if not resuming
      if (!attemptRow && quiz.settings.attemptsAllowed > 0) {
        const countRes = await db.query(
          `SELECT COUNT(*) as count FROM attempts 
           WHERE user_id = $1 AND quiz_id = $2 AND status IN ('submitted', 'auto_submitted')`,
          [userId, quizId]
        );
        const pastAttempts = parseInt(countRes.rows[0].count || '0', 10);
        if (pastAttempts >= quiz.settings.attemptsAllowed) {
          throw new Error(
            `You have reached the maximum allowed attempts (${quiz.settings.attemptsAllowed}) for this quiz.`
          );
        }
      }
    }

    // If no active attempt, create a new one
    if (!attemptRow) {
      const attemptId = uuidv4();
      const startedAt = new Date();
      let deadlineAt: Date | null = null;

      if (quiz.settings.timeLimitMinutes > 0) {
        deadlineAt = new Date(startedAt.getTime() + quiz.settings.timeLimitMinutes * 60 * 1000);
      }

      const insertRes = await db.query(
        `INSERT INTO attempts (id, user_id, learner_name, quiz_id, started_at, deadline_at, max_score, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'in_progress')
         RETURNING *`,
        [attemptId, userId || null, learnerName || null, quizId, startedAt.toISOString(), deadlineAt?.toISOString() || null, questions.length]
      );
      attemptRow = insertRes.rows[0];
    }

    // Fetch learner's current answers for this attempt
    const answersRes = await db.query(
      `SELECT * FROM attempt_answers WHERE attempt_id = $1`,
      [attemptRow.id]
    );
    const answersMap = new Map<string, { selectedOptionId?: string; isMarkedForReview: boolean }>();
    for (const a of answersRes.rows) {
      answersMap.set(a.question_id, {
        selectedOptionId: a.selected_option_id,
        isMarkedForReview: !!a.is_marked_for_review
      });
    }

    // Format questions for learner (STRIP all answers and explanations!)
    let learnerQuestions: LearnerQuestionView[] = questions.map((q) => {
      let optionsList = q.options.map((opt) => ({
        id: opt.id,
        optionLetter: opt.optionLetter,
        text: opt.text
      }));

      // Randomize options if configured
      if (quiz.settings.randomizeOptions) {
        optionsList = this.shuffleArray(optionsList);
      }

      const savedAnswer = answersMap.get(q.id);

      return {
        id: q.id,
        questionText: q.questionText,
        imageUrl: q.imageUrl,
        options: optionsList,
        selectedOptionId: savedAnswer?.selectedOptionId,
        isMarkedForReview: savedAnswer?.isMarkedForReview || false
      };
    });

    // Randomize question order if configured
    if (quiz.settings.randomizeQuestions) {
      learnerQuestions = this.shuffleArray(learnerQuestions);
    }

    // Calculate remaining seconds
    let remainingSeconds = 0;
    if (attemptRow.deadline_at) {
      const msLeft = new Date(attemptRow.deadline_at).getTime() - Date.now();
      remainingSeconds = Math.max(0, Math.floor(msLeft / 1000));
    } else {
      remainingSeconds = -1; // untimed
    }

    const attempt: Attempt = {
      id: attemptRow.id,
      userId: attemptRow.user_id,
      learnerName: attemptRow.learner_name || undefined,
      quizId: attemptRow.quiz_id,
      quizTitle: quiz.title,
      startedAt: attemptRow.started_at,
      deadlineAt: attemptRow.deadline_at,
      maxScore: questions.length,
      status: attemptRow.status
    };

    return {
      attempt,
      quiz: {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        timeLimitMinutes: quiz.settings.timeLimitMinutes,
        questionCount: questions.length,
        allowReview: quiz.settings.allowReview
      },
      questions: learnerQuestions,
      remainingSeconds
    };
  }

  public static async recordAnswer(
    attemptId: string,
    userId: string | null,
    questionId: string,
    selectedOptionId: string | null,
    isMarkedForReview = false
  ): Promise<{ saved: boolean; autoSubmitted?: boolean }> {
    const attemptRes = await db.query(
      `SELECT * FROM attempts WHERE id = $1`,
      [attemptId]
    );

    if (attemptRes.rows.length === 0) {
      throw new Error('Attempt not found');
    }

    const attempt = attemptRes.rows[0];
    if (attempt.user_id && userId && attempt.user_id !== userId) {
      throw new Error('Unauthorized');
    }

    if (attempt.status !== 'in_progress') {
      return { saved: false, autoSubmitted: true };
    }

    // Check timer expiration
    if (attempt.deadline_at && new Date().getTime() > new Date(attempt.deadline_at).getTime()) {
      await this.submitAttempt(attemptId, userId, true);
      return { saved: false, autoSubmitted: true };
    }

    // Upsert answer in attempt_answers
    const ansId = uuidv4();
    await db.query(
      `INSERT INTO attempt_answers (id, attempt_id, question_id, selected_option_id, is_marked_for_review, answered_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       ON CONFLICT (attempt_id, question_id)
       DO UPDATE SET 
         selected_option_id = EXCLUDED.selected_option_id,
         is_marked_for_review = EXCLUDED.is_marked_for_review,
         answered_at = CURRENT_TIMESTAMP`,
      [ansId, attemptId, questionId, selectedOptionId || null, isMarkedForReview]
    );

    return { saved: true };
  }

  public static async submitAttempt(
    attemptId: string,
    userId?: string | null,
    isAuto = false
  ): Promise<QuizResultResponse> {
    const attemptRes = await db.query(
      `SELECT * FROM attempts WHERE id = $1`,
      [attemptId]
    );

    if (attemptRes.rows.length === 0) {
      throw new Error('Attempt not found');
    }

    const attempt = attemptRes.rows[0];
    if (attempt.user_id && userId && attempt.user_id !== userId) {
      throw new Error('Unauthorized');
    }

    const quizData = await QuizService.getQuizById(attempt.quiz_id);
    if (!quizData) throw new Error('Quiz not found');

    const { quiz, questions } = quizData;

    // Fetch all recorded answers
    const answersRes = await db.query(
      `SELECT * FROM attempt_answers WHERE attempt_id = $1`,
      [attemptId]
    );
    const answersMap = new Map<string, any>();
    for (const a of answersRes.rows) {
      answersMap.set(a.question_id, a);
    }

    // Central Scoring Engine
    let correctCount = 0;
    let attemptedCount = 0;

    for (const q of questions) {
      const learnerAns = answersMap.get(q.id);
      const selectedOptionId = learnerAns?.selected_option_id;

      if (selectedOptionId) {
        attemptedCount++;
        const isCorrect = selectedOptionId === q.correctOptionId;
        if (isCorrect) {
          correctCount++;
        }

        // Update answer correctness in DB
        await db.query(
          `UPDATE attempt_answers SET is_correct = $1 WHERE attempt_id = $2 AND question_id = $3`,
          [isCorrect, attemptId, q.id]
        );
      }
    }

    const totalQuestions = questions.length;
    const percentage = totalQuestions > 0 ? Number(((correctCount / totalQuestions) * 100).toFixed(2)) : 0;
    const isPassed = percentage >= quiz.settings.passingPercentage;

    const startedTime = new Date(attempt.started_at).getTime();
    const nowTime = new Date().getTime();
    const timeTakenSeconds = Math.max(0, Math.floor((nowTime - startedTime) / 1000));

    const finalStatus = isAuto ? 'auto_submitted' : 'submitted';

    await db.query(
      `UPDATE attempts
       SET submitted_at = CURRENT_TIMESTAMP,
           time_taken_seconds = $1,
           score = $2,
           max_score = $3,
           percentage = $4,
           is_passed = $5,
           status = $6
       WHERE id = $7`,
      [timeTakenSeconds, correctCount, totalQuestions, percentage, isPassed, finalStatus, attemptId]
    );

    return (await this.getAttemptResult(attemptId, userId, false))!;
  }

  public static async getAttemptResult(
    attemptId: string,
    userId?: string | null,
    isAdmin = false
  ): Promise<QuizResultResponse | null> {
    const attemptRes = await db.query(
      `SELECT a.*, u.name as user_name, u.email as user_email, q.title as quiz_title, q.created_by as quiz_created_by
       FROM attempts a
       LEFT JOIN users u ON u.id = a.user_id
       LEFT JOIN quizzes q ON q.id = a.quiz_id
       WHERE a.id = $1`,
      [attemptId]
    );

    if (attemptRes.rows.length === 0) return null;

    const row = attemptRes.rows[0];
    if (isAdmin && userId && row.quiz_created_by && row.quiz_created_by !== userId) {
      throw new Error('Access denied: You do not own this quiz.');
    }

    const quizData = await QuizService.getQuizById(row.quiz_id);
    if (!quizData) return null;
    const { quiz, questions } = quizData;

    const answersRes = await db.query(
      `SELECT * FROM attempt_answers WHERE attempt_id = $1`,
      [attemptId]
    );
    const answersMap = new Map<string, any>();
    for (const a of answersRes.rows) {
      answersMap.set(a.question_id, a);
    }

    const reviewMode = quiz.settings.reviewMode;
    const showReview = isAdmin || quiz.settings.allowReview;
    const showCorrect = isAdmin || quiz.settings.showCorrectAnswers;
    const showExp = isAdmin || quiz.settings.showExplanations;

    let results: QuizResultItem[] | undefined = undefined;

    if (showReview && reviewMode !== 'score_only') {
      results = questions.map((q) => {
        const ans = answersMap.get(q.id);
        const selectedOption = q.options.find((o) => o.id === ans?.selected_option_id);
        const correctOption = q.options.find((o) => o.id === q.correctOptionId);
        const isCorrect = !!ans?.is_correct;

        return {
          questionId: q.id,
          questionText: q.questionText,
          imageUrl: q.imageUrl,
          options: q.options.map((o) => ({
            id: o.id,
            optionLetter: o.optionLetter,
            text: o.text
          })),
          selectedOptionId: ans?.selected_option_id,
          selectedLetter: selectedOption?.optionLetter,
          correctOptionId: showCorrect ? q.correctOptionId : undefined,
          correctLetter: showCorrect ? correctOption?.optionLetter : undefined,
          isCorrect,
          explanation: showExp ? q.explanation : undefined
        };
      });
    }

    const score = Number(row.score || 0);
    const maxScore = Number(row.max_score || questions.length);
    const percentage = Number(row.percentage || 0);
    const isPassed = !!row.is_passed;
    const timeTaken = Number(row.time_taken_seconds || 0);

    const attempted = Array.from(answersMap.values()).filter((a) => !!a.selected_option_id).length;
    const unattempted = maxScore - attempted;
    const correct = score;
    const incorrect = attempted - correct;

    const attempt: Attempt = {
      id: row.id,
      userId: row.user_id,
      userName: row.user_name,
      userEmail: row.user_email,
      learnerName: row.learner_name || row.user_name || 'Learner',
      quizId: row.quiz_id,
      quizTitle: row.quiz_title,
      startedAt: row.started_at,
      submittedAt: row.submitted_at,
      timeTakenSeconds: timeTaken,
      score,
      maxScore,
      percentage,
      isPassed,
      status: row.status
    };

    return {
      attempt,
      quiz,
      reviewAllowed: showReview,
      showCorrectAnswers: showCorrect,
      showExplanations: showExp,
      results,
      stats: {
        totalQuestions: maxScore,
        attempted,
        unattempted,
        correct,
        incorrect,
        score,
        percentage,
        isPassed,
        timeTakenSeconds: timeTaken
      }
    };
  }

  public static async getUserAttempts(userId: string): Promise<Attempt[]> {
    const res = await db.query(
      `SELECT a.*, q.title as quiz_title
       FROM attempts a
       LEFT JOIN quizzes q ON q.id = a.quiz_id
       WHERE a.user_id = $1
       ORDER BY a.started_at DESC`,
      [userId]
    );

    return res.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      learnerName: row.learner_name || undefined,
      quizId: row.quiz_id,
      quizTitle: row.quiz_title,
      startedAt: row.started_at,
      submittedAt: row.submitted_at,
      timeTakenSeconds: Number(row.time_taken_seconds || 0),
      score: Number(row.score || 0),
      maxScore: Number(row.max_score || 0),
      percentage: Number(row.percentage || 0),
      isPassed: !!row.is_passed,
      status: row.status
    }));
  }

  public static async getAdminAttempts(filter: {
    adminId?: string;
    quizId?: string;
    search?: string;
    status?: string;
    isPassed?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ attempts: Attempt[]; total: number }> {
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let pIndex = 1;

    if (filter.adminId) {
      whereClause += ` AND (q.created_by = $${pIndex} OR q.created_by IS NULL)`;
      params.push(filter.adminId);
      pIndex++;
    }

    if (filter.quizId) {
      whereClause += ` AND a.quiz_id = $${pIndex}`;
      params.push(filter.quizId);
      pIndex++;
    }

    if (filter.status) {
      whereClause += ` AND a.status = $${pIndex}`;
      params.push(filter.status);
      pIndex++;
    }

    if (filter.isPassed !== undefined) {
      whereClause += ` AND a.is_passed = $${pIndex}`;
      params.push(filter.isPassed);
      pIndex++;
    }

    if (filter.search) {
      whereClause += ` AND (COALESCE(a.learner_name, u.name, '') ILIKE $${pIndex} OR q.title ILIKE $${pIndex} OR COALESCE(u.email, '') ILIKE $${pIndex})`;
      params.push(`%${filter.search}%`);
      pIndex++;
    }

    const countSql = `
      SELECT COUNT(*) as total
      FROM attempts a
      LEFT JOIN users u ON u.id = a.user_id
      LEFT JOIN quizzes q ON q.id = a.quiz_id
      ${whereClause}
    `;

    const countRes = await db.query(countSql, params);
    const total = parseInt(countRes.rows[0]?.total || '0', 10);

    const limit = filter.limit || 50;
    const offset = filter.offset || 0;

    const selectSql = `
      SELECT a.*, u.name as user_name, u.email as user_email, q.title as quiz_title
      FROM attempts a
      LEFT JOIN users u ON u.id = a.user_id
      LEFT JOIN quizzes q ON q.id = a.quiz_id
      ${whereClause}
      ORDER BY COALESCE(a.submitted_at, a.started_at) DESC
      LIMIT $${pIndex} OFFSET $${pIndex + 1}
    `;

    const queryParams = [...params, limit, offset];
    const res = await db.query(selectSql, queryParams);

    const attempts: Attempt[] = res.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      userName: row.user_name,
      userEmail: row.user_email,
      learnerName: row.learner_name || row.user_name || 'Learner',
      quizId: row.quiz_id,
      quizTitle: row.quiz_title,
      startedAt: row.started_at,
      submittedAt: row.submitted_at,
      timeTakenSeconds: Number(row.time_taken_seconds || 0),
      score: Number(row.score || 0),
      maxScore: Number(row.max_score || 0),
      percentage: Number(row.percentage || 0),
      isPassed: !!row.is_passed,
      status: row.status
    }));

    return { attempts, total };
  }

  public static async exportAdminAttemptsCsv(adminId?: string, quizId?: string): Promise<{ filename: string; content: string; mimeType: string }> {
    const { attempts } = await this.getAdminAttempts({ adminId, quizId, limit: 10000 });
    
    let csv = 'Attempt ID,Learner Name,Email,Quiz Title,Score,Max Score,Percentage,Status,Passed,Time Taken (Seconds),Submitted At\n';
    
    for (const a of attempts) {
      const row = [
        `"${a.id}"`,
        `"${(a.learnerName || '').replace(/"/g, '""')}"`,
        `"${(a.userEmail || '').replace(/"/g, '""')}"`,
        `"${(a.quizTitle || '').replace(/"/g, '""')}"`,
        a.score,
        a.maxScore,
        `${a.percentage}%`,
        `"${a.status}"`,
        a.isPassed ? 'Yes' : 'No',
        a.timeTakenSeconds,
        `"${a.submittedAt || a.startedAt || ''}"`
      ];
      csv += row.join(',') + '\n';
    }

    return {
      filename: `learner_performance_${Date.now()}.csv`,
      content: csv,
      mimeType: 'text/csv'
    };
  }

  private static shuffleArray<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}

