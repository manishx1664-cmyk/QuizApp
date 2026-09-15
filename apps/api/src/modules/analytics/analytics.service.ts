import { AnalyticsSummary, Attempt } from '@quizforge/shared';
import { db } from '../../db/client';

export class AnalyticsService {
  public static async getSummary(adminId?: string): Promise<AnalyticsSummary> {
    const adminParam = adminId || null;

    // 1. Quizzes count
    const quizStats = await db.query(
      `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'published') as published,
        COUNT(*) FILTER (WHERE status = 'draft') as drafts
      FROM quizzes
      WHERE ($1::text IS NULL OR created_by = $1 OR created_by IS NULL)
    `,
      [adminParam]
    );
    const totalQuizzes = parseInt(quizStats.rows[0].total || '0', 10);
    const publishedQuizzes = parseInt(quizStats.rows[0].published || '0', 10);
    const draftQuizzes = parseInt(quizStats.rows[0].drafts || '0', 10);

    // 2. Unique learners count
    const learnerStats = await db.query(
      `
      SELECT COUNT(DISTINCT COALESCE(a.user_id, a.learner_name)) as total 
      FROM attempts a
      JOIN quizzes qz ON qz.id = a.quiz_id
      WHERE ($1::text IS NULL OR qz.created_by = $1 OR qz.created_by IS NULL)
    `,
      [adminParam]
    );
    const totalLearners = parseInt(learnerStats.rows[0].total || '0', 10);

    // 3. Attempts count and averages
    const attemptStats = await db.query(
      `
      SELECT 
        COUNT(a.*) as total_attempts,
        COALESCE(AVG(a.percentage), 0) as avg_score,
        COUNT(a.*) FILTER (WHERE a.is_passed = true) as passed_attempts
      FROM attempts a
      JOIN quizzes qz ON qz.id = a.quiz_id
      WHERE a.status IN ('submitted', 'auto_submitted')
        AND ($1::text IS NULL OR qz.created_by = $1 OR qz.created_by IS NULL)
    `,
      [adminParam]
    );
    const totalAttempts = parseInt(attemptStats.rows[0].total_attempts || '0', 10);
    const averageScore = Number(Number(attemptStats.rows[0].avg_score || 0).toFixed(1));
    const passedAttempts = parseInt(attemptStats.rows[0].passed_attempts || '0', 10);
    const passRate = totalAttempts > 0 ? Number(((passedAttempts / totalAttempts) * 100).toFixed(1)) : 0;

    // 4. Score distribution
    const distRes = await db.query(
      `
      SELECT 
        CASE 
          WHEN a.percentage < 20 THEN '0-20%'
          WHEN a.percentage < 40 THEN '21-40%'
          WHEN a.percentage < 60 THEN '41-60%'
          WHEN a.percentage < 80 THEN '61-80%'
          ELSE '81-100%'
        END as range,
        COUNT(a.*) as count
      FROM attempts a
      JOIN quizzes qz ON qz.id = a.quiz_id
      WHERE a.status IN ('submitted', 'auto_submitted')
        AND ($1::text IS NULL OR qz.created_by = $1 OR qz.created_by IS NULL)
      GROUP BY 1
    `,
      [adminParam]
    );

    const standardRanges = ['0-20%', '21-40%', '41-60%', '61-80%', '81-100%'];
    const distMap = new Map<string, number>();
    for (const row of distRes.rows) {
      distMap.set(row.range, parseInt(row.count, 10));
    }
    const scoreDistribution = standardRanges.map((range) => ({
      range,
      count: distMap.get(range) || 0
    }));

    // 5. Recent attempts
    const recentRes = await db.query(
      `
      SELECT a.*, u.name as user_name, u.email as user_email, q.title as quiz_title
      FROM attempts a
      LEFT JOIN users u ON u.id = a.user_id
      LEFT JOIN quizzes q ON q.id = a.quiz_id
      WHERE a.status IN ('submitted', 'auto_submitted')
        AND ($1::text IS NULL OR q.created_by = $1 OR q.created_by IS NULL)
      ORDER BY COALESCE(a.submitted_at, a.started_at) DESC LIMIT 10
    `,
      [adminParam]
    );
    const recentAttempts: Attempt[] = recentRes.rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      userName: r.user_name,
      userEmail: r.user_email,
      learnerName: r.learner_name || r.user_name || 'Learner',
      quizId: r.quiz_id,
      quizTitle: r.quiz_title,
      startedAt: r.started_at,
      submittedAt: r.submitted_at,
      timeTakenSeconds: Number(r.time_taken_seconds || 0),
      score: Number(r.score || 0),
      maxScore: Number(r.max_score || 0),
      percentage: Number(r.percentage || 0),
      isPassed: !!r.is_passed,
      status: r.status
    }));

    // 6. Difficult questions analysis
    const diffRes = await db.query(
      `
      SELECT 
        q.id as question_id,
        q.question_text,
        qz.title as quiz_title,
        COUNT(aa.id) as attempts_count,
        COUNT(aa.id) FILTER (WHERE aa.is_correct = true) as correct_count
      FROM questions q
      JOIN quizzes qz ON qz.id = q.quiz_id
      JOIN attempt_answers aa ON aa.question_id = q.id
      JOIN attempts a ON a.id = aa.attempt_id
      WHERE a.status IN ('submitted', 'auto_submitted')
        AND ($1::text IS NULL OR qz.created_by = $1 OR qz.created_by IS NULL)
      GROUP BY q.id, qz.title
      HAVING COUNT(aa.id) > 0
      ORDER BY (COUNT(aa.id) FILTER (WHERE aa.is_correct = true)::float / COUNT(aa.id)) ASC
      LIMIT 10
    `,
      [adminParam]
    );

    const difficultQuestions = diffRes.rows.map((r) => {
      const attemptsCount = parseInt(r.attempts_count, 10);
      const correctCount = parseInt(r.correct_count, 10);
      const correctRate = attemptsCount > 0 ? Number(((correctCount / attemptsCount) * 100).toFixed(1)) : 0;
      const incorrectRate = Number((100 - correctRate).toFixed(1));

      return {
        questionId: r.question_id,
        questionText: r.question_text,
        quizTitle: r.quiz_title,
        attempts: attemptsCount,
        correctRate,
        incorrectRate
      };
    });

    return {
      totalQuizzes,
      publishedQuizzes,
      draftQuizzes,
      totalLearners,
      totalAttempts,
      averageScore,
      passRate,
      scoreDistribution,
      recentAttempts,
      difficultQuestions
    };
  }
}