import { v4 as uuidv4 } from 'uuid';
import {
  Quiz,
  QuizDifficulty,
  QuizStatus,
  QuizSettings,
  ExtractedQuestion,
  Question
} from '@quizforge/shared';
import { db } from '../../db/client';
import { QuestionService } from '../questions/question.service';

export interface QuizFilter {
  status?: QuizStatus;
  categoryId?: string;
  difficulty?: QuizDifficulty;
  search?: string;
  adminId?: string;
}

export class QuizService {
  public static async generateUniqueJoinCode(): Promise<string> {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Clean uppercase alphanumeric
    let isUnique = false;
    let code = '';

    while (!isUnique) {
      code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const existing = await db.query('SELECT id FROM quizzes WHERE join_code = $1', [code]);
      if (existing.rows.length === 0) {
        isUnique = true;
      }
    }
    return code;
  }

  public static async getQuizzes(filter: QuizFilter = {}): Promise<Quiz[]> {
    let sql = `
      SELECT q.*, 
             c.name as category_name,
             COUNT(DISTINCT qn.id) as question_count,
             COUNT(DISTINCT a.id) as attempt_count
      FROM quizzes q
      LEFT JOIN categories c ON c.id = q.category_id
      LEFT JOIN questions qn ON qn.quiz_id = q.id
      LEFT JOIN attempts a ON a.quiz_id = q.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let pIndex = 1;

    if (filter.adminId) {
      sql += ` AND q.created_by = $${pIndex}`;
      params.push(filter.adminId);
      pIndex++;
    }

    if (filter.status) {
      sql += ` AND q.status = $${pIndex}`;
      params.push(filter.status);
      pIndex++;
    }

    if (filter.categoryId) {
      sql += ` AND q.category_id = $${pIndex}`;
      params.push(filter.categoryId);
      pIndex++;
    }

    if (filter.difficulty) {
      sql += ` AND q.difficulty = $${pIndex}`;
      params.push(filter.difficulty);
      pIndex++;
    }

    if (filter.search) {
      sql += ` AND (q.title ILIKE $${pIndex} OR q.description ILIKE $${pIndex})`;
      params.push(`%${filter.search}%`);
      pIndex++;
    }

    sql += ` GROUP BY q.id, c.name ORDER BY q.created_at DESC`;

    const res = await db.query(sql, params);
    return res.rows.map(this.mapQuizRow);
  }

  public static async getQuizById(id: string): Promise<{ quiz: Quiz; questions: Question[] } | null> {
    const res = await db.query(
      `SELECT q.*, 
              c.name as category_name,
              COUNT(DISTINCT qn.id) as question_count,
              COUNT(DISTINCT a.id) as attempt_count
       FROM quizzes q
       LEFT JOIN categories c ON c.id = q.category_id
       LEFT JOIN questions qn ON qn.quiz_id = q.id
       LEFT JOIN attempts a ON a.quiz_id = q.id
       WHERE q.id = $1
       GROUP BY q.id, c.name`,
      [id]
    );

    if (res.rows.length === 0) return null;

    const quiz = this.mapQuizRow(res.rows[0]);
    const questions = await QuestionService.getQuestions({ quizId: id });

    return { quiz, questions };
  }

  public static async createQuiz(data: {
    title: string;
    description?: string;
    categoryId?: string;
    difficulty?: QuizDifficulty;
    settings?: Partial<QuizSettings>;
    createdBy?: string;
  }): Promise<Quiz> {
    const id = uuidv4();
    const settings = this.normalizeSettings(data.settings);

    await db.query(
      `INSERT INTO quizzes (
        id, title, description, category_id, difficulty, status,
        time_limit_minutes, passing_percentage, attempts_allowed,
        randomize_questions, randomize_options, show_results_immediately,
        show_correct_answers, show_explanations, allow_review, allow_retake,
        review_mode, created_by
      ) VALUES ($1, $2, $3, $4, $5, 'draft', $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
      [
        id,
        data.title.trim(),
        data.description || '',
        data.categoryId || null,
        data.difficulty || 'medium',
        settings.timeLimitMinutes,
        settings.passingPercentage,
        settings.attemptsAllowed,
        settings.randomizeQuestions,
        settings.randomizeOptions,
        settings.showResultsImmediately,
        settings.showCorrectAnswers,
        settings.showExplanations,
        settings.allowReview,
        settings.allowRetake,
        settings.reviewMode,
        data.createdBy || null
      ]
    );

    const created = await this.getQuizById(id);
    return created!.quiz;
  }

  public static async createQuizFromExtraction(data: {
    title: string;
    description?: string;
    categoryId?: string;
    difficulty?: QuizDifficulty;
    settings?: Partial<QuizSettings>;
    createdBy?: string;
    questions: ExtractedQuestion[];
  }): Promise<{ quiz: Quiz; questions: Question[] }> {
    const quiz = await this.createQuiz({
      title: data.title,
      description: data.description,
      categoryId: data.categoryId,
      difficulty: data.difficulty,
      settings: data.settings,
      createdBy: data.createdBy
    });

    const savedQuestions = await QuestionService.createQuestionsBatch(
      quiz.id,
      data.questions.map((eq) => ({
        questionText: eq.questionText,
        imageUrl: eq.imageUrl,
        explanation: eq.explanation,
        difficulty: eq.difficulty || data.difficulty || 'medium',
        categoryId: data.categoryId,
        options: eq.options.map((opt) => ({
          letter: opt.letter,
          text: opt.text,
          isCorrect: eq.detectedAnswerLetter?.toUpperCase() === opt.letter.toUpperCase()
        })),
        requiresReview: eq.requiresReview,
        detectionMethod: eq.detectionMethod,
        confidence: eq.confidence
      }))
    );

    return { quiz, questions: savedQuestions };
  }

  public static async updateQuiz(
    id: string,
    data: {
      title?: string;
      description?: string;
      categoryId?: string;
      difficulty?: QuizDifficulty;
      status?: QuizStatus;
      settings?: Partial<QuizSettings>;
    }
  ): Promise<Quiz> {
    const existing = await this.getQuizById(id);
    if (!existing) throw new Error('Quiz not found');

    const s = { ...existing.quiz.settings, ...data.settings };

    await db.query(
      `UPDATE quizzes
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           category_id = COALESCE($3, category_id),
           difficulty = COALESCE($4, difficulty),
           status = COALESCE($5, status),
           time_limit_minutes = $6,
           passing_percentage = $7,
           attempts_allowed = $8,
           randomize_questions = $9,
           randomize_options = $10,
           show_results_immediately = $11,
           show_correct_answers = $12,
           show_explanations = $13,
           allow_review = $14,
           allow_retake = $15,
           review_mode = $16,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $17`,
      [
        data.title ? data.title.trim() : null,
        data.description !== undefined ? data.description : null,
        data.categoryId || null,
        data.difficulty || null,
        data.status || null,
        s.timeLimitMinutes,
        s.passingPercentage,
        s.attemptsAllowed,
        s.randomizeQuestions,
        s.randomizeOptions,
        s.showResultsImmediately,
        s.showCorrectAnswers,
        s.showExplanations,
        s.allowReview,
        s.allowRetake,
        s.reviewMode,
        id
      ]
    );

    const updated = await this.getQuizById(id);
    return updated!.quiz;
  }

  public static async getQuizByJoinCode(joinCode: string): Promise<{ quiz: Quiz; questionCount: number } | null> {
    const cleanCode = (joinCode || '').trim().toUpperCase();
    if (!cleanCode) return null;

    const res = await db.query(
      `SELECT q.*, 
              c.name as category_name,
              COUNT(DISTINCT qn.id) as question_count,
              COUNT(DISTINCT a.id) as attempt_count
       FROM quizzes q
       LEFT JOIN categories c ON c.id = q.category_id
       LEFT JOIN questions qn ON qn.quiz_id = q.id
       LEFT JOIN attempts a ON a.quiz_id = q.id
       WHERE UPPER(q.join_code) = $1 AND q.status = 'published'
       GROUP BY q.id, c.name`,
      [cleanCode]
    );

    if (res.rows.length === 0) return null;
    const quiz = this.mapQuizRow(res.rows[0]);
    return { quiz, questionCount: quiz.questionCount };
  }

  public static async publishQuiz(id: string, force = false): Promise<{ quiz: Quiz; warning?: string }> {
    const existing = await this.getQuizById(id);
    if (!existing) throw new Error('Quiz not found');

    // Check questions requiring review
    const pendingQuestions = existing.questions.filter((q) => q.requiresReview || !q.correctOptionId);

    if (pendingQuestions.length > 0 && !force) {
      return {
        quiz: existing.quiz,
        warning: `This quiz has ${pendingQuestions.length} question(s) requiring review or missing correct answers. Confirm if you still wish to publish.`
      };
    }

    // Generate unique Join Code if not already set
    let joinCode = existing.quiz.joinCode;
    if (!joinCode) {
      joinCode = await this.generateUniqueJoinCode();
      await db.query(`UPDATE quizzes SET join_code = $1 WHERE id = $2`, [joinCode, id]);
    }

    const updated = await this.updateQuiz(id, { status: 'published' });
    return { quiz: updated };
  }

  public static async duplicateQuiz(id: string, createdBy?: string): Promise<Quiz> {
    const existing = await this.getQuizById(id);
    if (!existing) throw new Error('Quiz not found');

    const newQuiz = await this.createQuiz({
      title: `${existing.quiz.title} (Copy)`,
      description: existing.quiz.description,
      categoryId: existing.quiz.categoryId,
      difficulty: existing.quiz.difficulty,
      settings: existing.quiz.settings,
      createdBy: createdBy || existing.quiz.createdBy
    });

    for (const q of existing.questions) {
      await QuestionService.createQuestion({
        quizId: newQuiz.id,
        questionText: q.questionText,
        imageUrl: q.imageUrl,
        explanation: q.explanation,
        difficulty: q.difficulty,
        categoryId: q.categoryId,
        options: q.options.map((opt) => ({
          letter: opt.optionLetter,
          text: opt.text,
          isCorrect: opt.isCorrect
        })),
        requiresReview: q.requiresReview,
        detectionMethod: q.detectionMethod,
        confidence: q.confidence
      });
    }

    const res = await this.getQuizById(newQuiz.id);
    return res!.quiz;
  }

  public static async deleteQuiz(id: string): Promise<void> {
    await db.query(`DELETE FROM quizzes WHERE id = $1`, [id]);
  }

  public static async exportQuiz(id: string, format: 'json' | 'csv'): Promise<{ content: string; mimeType: string; filename: string }> {
    const data = await this.getQuizById(id);
    if (!data) throw new Error('Quiz not found');

    const safeTitle = data.quiz.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    if (format === 'json') {
      return {
        content: JSON.stringify(data, null, 2),
        mimeType: 'application/json',
        filename: `${safeTitle}.json`
      };
    }

    // CSV format: Question,OptionA,OptionB,OptionC,OptionD,CorrectAnswer,Explanation
    const headers = ['Question Number', 'Question Text', 'Option A', 'Option B', 'Option C', 'Option D', 'Correct Answer', 'Explanation'];
    const rows = [headers.join(',')];

    for (let i = 0; i < data.questions.length; i++) {
      const q = data.questions[i];
      const optA = q.options.find((o) => o.optionLetter === 'A')?.text || '';
      const optB = q.options.find((o) => o.optionLetter === 'B')?.text || '';
      const optC = q.options.find((o) => o.optionLetter === 'C')?.text || '';
      const optD = q.options.find((o) => o.optionLetter === 'D')?.text || '';
      const correct = q.options.find((o) => o.isCorrect)?.optionLetter || '';

      const escapeCsv = (val: string) => `"${(val || '').replace(/"/g, '""')}"`;

      rows.push([
        i + 1,
        escapeCsv(q.questionText),
        escapeCsv(optA),
        escapeCsv(optB),
        escapeCsv(optC),
        escapeCsv(optD),
        escapeCsv(correct),
        escapeCsv(q.explanation || '')
      ].join(','));
    }

    return {
      content: rows.join('\n'),
      mimeType: 'text/csv',
      filename: `${safeTitle}.csv`
    };
  }

  private static normalizeSettings(s?: Partial<QuizSettings>): QuizSettings {
    return {
      timeLimitMinutes: s?.timeLimitMinutes !== undefined ? s.timeLimitMinutes : 15,
      passingPercentage: s?.passingPercentage !== undefined ? s.passingPercentage : 60,
      attemptsAllowed: s?.attemptsAllowed !== undefined ? s.attemptsAllowed : 0,
      randomizeQuestions: s?.randomizeQuestions ?? false,
      randomizeOptions: s?.randomizeOptions ?? false,
      showResultsImmediately: s?.showResultsImmediately ?? true,
      showCorrectAnswers: s?.showCorrectAnswers ?? true,
      showExplanations: s?.showExplanations ?? true,
      allowReview: s?.allowReview ?? true,
      allowRetake: s?.allowRetake ?? true,
      reviewMode: s?.reviewMode ?? 'full_review'
    };
  }

  private static mapQuizRow(row: any): Quiz {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      categoryId: row.category_id,
      categoryName: row.category_name,
      difficulty: row.difficulty as QuizDifficulty,
      status: row.status as QuizStatus,
      settings: {
        timeLimitMinutes: Number(row.time_limit_minutes || 0),
        passingPercentage: Number(row.passing_percentage || 60),
        attemptsAllowed: Number(row.attempts_allowed || 0),
        randomizeQuestions: !!row.randomize_questions,
        randomizeOptions: !!row.randomize_options,
        showResultsImmediately: !!row.show_results_immediately,
        showCorrectAnswers: !!row.show_correct_answers,
        showExplanations: !!row.show_explanations,
        allowReview: !!row.allow_review,
        allowRetake: !!row.allow_retake,
        reviewMode: row.review_mode || 'full_review'
      },
      questionCount: parseInt(row.question_count || '0', 10),
      attemptCount: parseInt(row.attempt_count || '0', 10),
      joinCode: row.join_code || undefined,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
