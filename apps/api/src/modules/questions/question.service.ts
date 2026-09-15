import { v4 as uuidv4 } from 'uuid';
import { Question, Option, QuestionVersion, QuizDifficulty, AnswerDetectionMethod } from '@quizforge/shared';
import { db } from '../../db/client';

export interface QuestionFilter {
  search?: string;
  categoryId?: string;
  difficulty?: QuizDifficulty;
  quizId?: string;
  requiresReview?: boolean;
  adminId?: string;
}

export class QuestionService {
  public static async getQuestions(filter: QuestionFilter = {}): Promise<Question[]> {
    let sql = `
      SELECT q.*, c.name as category_name, qz.title as quiz_title
      FROM questions q
      LEFT JOIN categories c ON c.id = q.category_id
      LEFT JOIN quizzes qz ON qz.id = q.quiz_id
      WHERE 1=1
    `;
    const params: any[] = [];
    let pIndex = 1;

    if (filter.adminId) {
      sql += ` AND (qz.created_by = $${pIndex} OR (q.quiz_id IS NULL AND qz.id IS NULL))`;
      params.push(filter.adminId);
      pIndex++;
    }

    if (filter.search) {
      sql += ` AND (q.question_text ILIKE $${pIndex} OR q.explanation ILIKE $${pIndex})`;
      params.push(`%${filter.search}%`);
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

    if (filter.quizId) {
      sql += ` AND q.quiz_id = $${pIndex}`;
      params.push(filter.quizId);
      pIndex++;
    }

    if (filter.requiresReview !== undefined) {
      sql += ` AND q.requires_review = $${pIndex}`;
      params.push(filter.requiresReview);
      pIndex++;
    }

    sql += ` ORDER BY q.created_at DESC`;

    const res = await db.query(sql, params);
    if (res.rows.length === 0) return [];

    const questionIds = res.rows.map((r) => r.id);
    const optionsRes = await db.query(
      `SELECT * FROM question_options WHERE question_id = ANY($1::text[]) ORDER BY sort_order ASC, option_letter ASC`,
      [questionIds]
    );

    const optionsByQuestionId = new Map<string, any[]>();
    for (const opt of optionsRes.rows) {
      if (!optionsByQuestionId.has(opt.question_id)) {
        optionsByQuestionId.set(opt.question_id, []);
      }
      optionsByQuestionId.get(opt.question_id)!.push(opt);
    }

    return res.rows.map((row) => this.mapQuestionRow(row, optionsByQuestionId.get(row.id) || []));
  }

  public static async getQuestionById(id: string): Promise<Question | null> {
    const res = await db.query(
      `SELECT q.*, c.name as category_name, qz.title as quiz_title
       FROM questions q
       LEFT JOIN categories c ON c.id = q.category_id
       LEFT JOIN quizzes qz ON qz.id = q.quiz_id
       WHERE q.id = $1`,
      [id]
    );

    if (res.rows.length === 0) return null;

    const optionsRes = await db.query(
      `SELECT * FROM question_options WHERE question_id = $1 ORDER BY sort_order ASC, option_letter ASC`,
      [id]
    );

    return this.mapQuestionRow(res.rows[0], optionsRes.rows);
  }

  public static async getVersions(questionId: string): Promise<QuestionVersion[]> {
    const res = await db.query(
      `SELECT qv.*, u.name as changed_by_name
       FROM question_versions qv
       LEFT JOIN users u ON u.id = qv.changed_by
       WHERE qv.question_id = $1
       ORDER BY qv.changed_at DESC`,
      [questionId]
    );

    return res.rows.map((r) => ({
      id: r.id,
      questionId: r.question_id,
      questionText: r.question_text,
      imageUrl: r.image_url || undefined,
      explanation: r.explanation,
      optionsJson: typeof r.options_json === 'string' ? JSON.parse(r.options_json) : r.options_json,
      changedBy: r.changed_by,
      changedByName: r.changed_by_name || 'Admin',
      changedAt: r.changed_at
    }));
  }

  public static async createQuestion(data: {
    quizId?: string;
    questionText: string;
    imageUrl?: string;
    explanation?: string;
    difficulty?: QuizDifficulty;
    categoryId?: string;
    options: { letter: string; text: string; isCorrect: boolean }[];
    requiresReview?: boolean;
    detectionMethod?: AnswerDetectionMethod;
    confidence?: number;
  }): Promise<Question> {
    const qId = uuidv4();
    const difficulty = data.difficulty || 'medium';
    const detectionMethod: AnswerDetectionMethod = data.detectionMethod || 'manual_required';
    const confidence = data.confidence !== undefined ? data.confidence : 1.0;

    let correctOptionId: string | null = null;
    const optionsList: Option[] = [];

    for (let i = 0; i < data.options.length; i++) {
      const opt = data.options[i];
      const optId = uuidv4();
      if (opt.isCorrect) {
        correctOptionId = optId;
      }
      optionsList.push({
        id: optId,
        questionId: qId,
        optionLetter: opt.letter.toUpperCase(),
        text: opt.text.trim(),
        isCorrect: opt.isCorrect,
        sortOrder: i
      });
    }

    // Insert question with correct_option_id directly in 1 query
    await db.query(
      `INSERT INTO questions (id, quiz_id, question_text, image_url, explanation, difficulty, category_id, correct_option_id, detection_method, confidence, requires_review, version)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 1)`,
      [
        qId,
        data.quizId || null,
        data.questionText.trim(),
        data.imageUrl || null,
        data.explanation || null,
        difficulty,
        data.categoryId || null,
        correctOptionId,
        detectionMethod,
        confidence,
        data.requiresReview || false
      ]
    );

    // Insert options
    for (const opt of optionsList) {
      await db.query(
        `INSERT INTO question_options (id, question_id, option_letter, text, is_correct, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [opt.id, qId, opt.optionLetter, opt.text, opt.isCorrect, opt.sortOrder]
      );
    }

    return (await this.getQuestionById(qId))!;
  }

  public static async createQuestionsBatch(
    quizId: string,
    questionsData: Array<{
      questionText: string;
      imageUrl?: string;
      explanation?: string;
      difficulty?: QuizDifficulty;
      categoryId?: string;
      options: { letter: string; text: string; isCorrect: boolean }[];
      requiresReview?: boolean;
      detectionMethod?: AnswerDetectionMethod;
      confidence?: number;
    }>
  ): Promise<Question[]> {
    if (questionsData.length === 0) return [];

    const resultQuestions: Question[] = [];

    for (const data of questionsData) {
      const qId = uuidv4();
      const difficulty = data.difficulty || 'medium';
      const detectionMethod: AnswerDetectionMethod = data.detectionMethod || 'manual_required';
      const confidence = data.confidence !== undefined ? data.confidence : 1.0;

      let correctOptionId: string | null = null;
      const optionsList: Option[] = [];

      for (let i = 0; i < data.options.length; i++) {
        const opt = data.options[i];
        const optId = uuidv4();
        if (opt.isCorrect) {
          correctOptionId = optId;
        }
        optionsList.push({
          id: optId,
          questionId: qId,
          optionLetter: opt.letter.toUpperCase(),
          text: opt.text.trim(),
          isCorrect: opt.isCorrect,
          sortOrder: i
        });
      }

      await db.query(
        `INSERT INTO questions (id, quiz_id, question_text, image_url, explanation, difficulty, category_id, correct_option_id, detection_method, confidence, requires_review, version)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 1)`,
        [
          qId,
          quizId,
          data.questionText.trim(),
          data.imageUrl || null,
          data.explanation || null,
          difficulty,
          data.categoryId || null,
          correctOptionId,
          detectionMethod,
          confidence,
          data.requiresReview || false
        ]
      );

      for (const opt of optionsList) {
        await db.query(
          `INSERT INTO question_options (id, question_id, option_letter, text, is_correct, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [opt.id, qId, opt.optionLetter, opt.text, opt.isCorrect, opt.sortOrder]
        );
      }

      resultQuestions.push({
        id: qId,
        quizId,
        questionText: data.questionText.trim(),
        imageUrl: data.imageUrl,
        explanation: data.explanation,
        difficulty,
        categoryId: data.categoryId,
        correctOptionId: correctOptionId || undefined,
        detectionMethod,
        confidence,
        requiresReview: data.requiresReview || false,
        version: 1,
        options: optionsList,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    return resultQuestions;
  }

  public static async updateQuestion(
    id: string,
    data: {
      questionText?: string;
      imageUrl?: string;
      explanation?: string;
      difficulty?: QuizDifficulty;
      categoryId?: string;
      options?: { id?: string; letter: string; text: string; isCorrect: boolean }[];
      correctOptionId?: string;
      requiresReview?: boolean;
    },
    changedByUserId?: string
  ): Promise<Question> {
    const existing = await this.getQuestionById(id);
    if (!existing) {
      throw new Error('Question not found');
    }

    // Save snapshot in question_versions
    const versionId = uuidv4();
    await db.query(
      `INSERT INTO question_versions (id, question_id, question_text, image_url, explanation, options_json, changed_by)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)`,
      [
        versionId,
        existing.id,
        existing.questionText,
        existing.imageUrl || null,
        existing.explanation || null,
        JSON.stringify(existing.options),
        changedByUserId || null
      ]
    );

    // Update options if provided
    let finalCorrectOptionId = data.correctOptionId || existing.correctOptionId;

    if (data.options && data.options.length > 0) {
      await db.query(`DELETE FROM question_options WHERE question_id = $1`, [id]);
      for (let i = 0; i < data.options.length; i++) {
        const opt = data.options[i];
        const optId = opt.id || uuidv4();
        if (opt.isCorrect) {
          finalCorrectOptionId = optId;
        }
        await db.query(
          `INSERT INTO question_options (id, question_id, option_letter, text, is_correct, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [optId, id, opt.letter.toUpperCase(), opt.text.trim(), opt.isCorrect, i]
        );
      }
    } else if (data.correctOptionId) {
      await db.query(
        `UPDATE question_options SET is_correct = (id = $1) WHERE question_id = $2`,
        [data.correctOptionId, id]
      );
    }

    const newVersion = existing.version + 1;
    await db.query(
      `UPDATE questions
       SET question_text = COALESCE($1, question_text),
           image_url = $2,
           explanation = COALESCE($3, explanation),
           difficulty = COALESCE($4, difficulty),
           category_id = COALESCE($5, category_id),
           correct_option_id = $6,
           requires_review = COALESCE($7, requires_review),
           version = $8,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $9`,
      [
        data.questionText ? data.questionText.trim() : null,
        data.imageUrl !== undefined ? (data.imageUrl || null) : (existing.imageUrl || null),
        data.explanation !== undefined ? data.explanation : null,
        data.difficulty || null,
        data.categoryId || null,
        finalCorrectOptionId || null,
        data.requiresReview !== undefined ? data.requiresReview : null,
        newVersion,
        id
      ]
    );

    return (await this.getQuestionById(id))!;
  }

  public static async deleteQuestion(id: string): Promise<void> {
    await db.query(`DELETE FROM questions WHERE id = $1`, [id]);
  }

  public static async duplicateQuestion(id: string): Promise<Question> {
    const existing = await this.getQuestionById(id);
    if (!existing) throw new Error('Question not found');

    const newQuestion = await this.createQuestion({
      quizId: existing.quizId,
      questionText: `${existing.questionText} (Copy)`,
      imageUrl: existing.imageUrl,
      explanation: existing.explanation,
      difficulty: existing.difficulty,
      categoryId: existing.categoryId,
      options: existing.options.map((o) => ({
        letter: o.optionLetter,
        text: o.text,
        isCorrect: o.isCorrect
      })),
      requiresReview: existing.requiresReview
    });

    return newQuestion;
  }

  private static mapQuestionRow(row: any, optionsRows: any[]): Question {
    const options: Option[] = optionsRows.map((o) => ({
      id: o.id,
      questionId: o.question_id,
      optionLetter: o.option_letter,
      text: o.text,
      isCorrect: !!o.is_correct,
      sortOrder: Number(o.sort_order || 0)
    }));

    const correctOption = options.find((o) => o.id === row.correct_option_id || o.isCorrect);

    return {
      id: row.id,
      quizId: row.quiz_id,
      quizTitle: row.quiz_title,
      questionText: row.question_text,
      imageUrl: row.image_url || undefined,
      options,
      correctOptionId: row.correct_option_id || correctOption?.id,
      detectedAnswerLetter: row.detected_answer_letter || correctOption?.optionLetter,
      detectionMethod: (row.detection_method || 'manual_required') as AnswerDetectionMethod,
      confidence: Number(row.confidence || 0),
      requiresReview: !!row.requires_review,
      duplicateWarning: !!row.duplicate_warning,
      explanation: row.explanation,
      difficulty: row.difficulty as QuizDifficulty,
      categoryId: row.category_id,
      categoryName: row.category_name,
      version: Number(row.version || 1),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}