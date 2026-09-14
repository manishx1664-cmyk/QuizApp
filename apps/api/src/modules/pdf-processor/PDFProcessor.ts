import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { PdfProcessingJob, ExtractedQuestion } from '@quizforge/shared';
import { db } from '../../db/client';
import { TextExtractor } from './TextExtractor';
import { OCRProcessor } from './OCRProcessor';
import { QuestionExtractionProvider } from './providers/QuestionExtractionProvider';
import { PdfTextExtractionProvider } from './providers/PdfTextExtractionProvider';

export class PDFProcessor {
  private static provider: QuestionExtractionProvider = new PdfTextExtractionProvider();

  public static setProvider(provider: QuestionExtractionProvider) {
    this.provider = provider;
  }

  public static async createJob(filename: string, filesize: number): Promise<PdfProcessingJob> {
    const id = uuidv4();
    const sql = `
      INSERT INTO pdf_jobs (id, filename, filesize, status, progress, questions_found, answers_detected, requires_review_count, duplicates_count, questions_json)
      VALUES ($1, $2, $3, 'queued', 0, 0, 0, 0, 0, '[]'::jsonb)
      RETURNING *
    `;
    const res = await db.query(sql, [id, filename, filesize]);
    return this.mapJobRow(res.rows[0]);
  }

  public static async getJob(id: string): Promise<PdfProcessingJob | null> {
    const res = await db.query(`SELECT * FROM pdf_jobs WHERE id = $1`, [id]);
    if (!res.rows[0]) return null;
    return this.mapJobRow(res.rows[0]);
  }

  public static async processPdf(jobId: string, filePath: string): Promise<void> {
    try {
      // Step 1: Update progress (10%)
      await this.updateJobStatus(jobId, 'processing', 15);

      const buffer = fs.readFileSync(filePath);

      // Step 2: Extract text (35%)
      await this.updateJobStatus(jobId, 'processing', 35);
      const textResult = await TextExtractor.extract(buffer);
      let rawText = textResult.text;

      // OCR Fallback if text is empty/sparse
      if (textResult.requiresOcr) {
        await this.updateJobStatus(jobId, 'processing', 50);
        console.log(`Document [${jobId}] requires OCR, attempting fallback...`);
        const ocrText = await OCRProcessor.recognizeImageBuffer(buffer);
        if (ocrText.trim()) {
          rawText = ocrText;
        }
      }

      // Step 3: Question parsing & validation (75%)
      await this.updateJobStatus(jobId, 'processing', 75);
      const questions = await this.provider.extractQuestions(rawText, {
        filename: filePath,
        filesize: buffer.length
      });

      const questionsFound = questions.length;
      const answersDetected = questions.filter((q) => !!q.detectedAnswerLetter).length;
      const requiresReviewCount = questions.filter((q) => q.requiresReview).length;
      const duplicatesCount = questions.filter((q) => q.duplicateWarning).length;

      // Final status: if any question requires review, status is 'requires_review', else 'completed'
      const finalStatus = requiresReviewCount > 0 ? 'requires_review' : 'completed';

      await db.query(
        `UPDATE pdf_jobs 
         SET status = $1, progress = 100, questions_found = $2, answers_detected = $3, 
             requires_review_count = $4, duplicates_count = $5, questions_json = $6::jsonb, 
             completed_at = CURRENT_TIMESTAMP
         WHERE id = $7`,
        [
          finalStatus,
          questionsFound,
          answersDetected,
          requiresReviewCount,
          duplicatesCount,
          JSON.stringify(questions),
          jobId
        ]
      );
    } catch (err: any) {
      console.error(`PDF processing failed for job ${jobId}:`, err);
      await db.query(
        `UPDATE pdf_jobs 
         SET status = 'failed', progress = 100, error_message = $1, completed_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [err.message || 'Unknown processing error', jobId]
      );
    }
  }

  private static async updateJobStatus(id: string, status: string, progress: number): Promise<void> {
    await db.query(`UPDATE pdf_jobs SET status = $1, progress = $2 WHERE id = $3`, [
      status,
      progress,
      id
    ]);
  }

  public static async updateJobQuestions(id: string, questions: ExtractedQuestion[]): Promise<void> {
    const questionsFound = questions.length;
    const answersDetected = questions.filter((q) => !!q.detectedAnswerLetter).length;
    const requiresReviewCount = questions.filter((q) => q.requiresReview).length;
    const duplicatesCount = questions.filter((q) => q.duplicateWarning).length;

    await db.query(
      `UPDATE pdf_jobs 
       SET questions_found = $1, answers_detected = $2, requires_review_count = $3, 
           duplicates_count = $4, questions_json = $5::jsonb
       WHERE id = $6`,
      [
        questionsFound,
        answersDetected,
        requiresReviewCount,
        duplicatesCount,
        JSON.stringify(questions),
        id
      ]
    );
  }

  private static mapJobRow(row: any): PdfProcessingJob {
    return {
      id: row.id,
      filename: row.filename,
      filesize: Number(row.filesize),
      status: row.status,
      progress: Number(row.progress),
      questionsFound: Number(row.questions_found),
      answersDetected: Number(row.answers_detected),
      requiresReviewCount: Number(row.requires_review_count),
      duplicatesCount: Number(row.duplicates_count),
      errorMessage: row.error_message,
      questions: (typeof row.questions_json === 'string' ? JSON.parse(row.questions_json) : row.questions_json) || [],
      createdAt: row.created_at,
      completedAt: row.completed_at
    };
  }
}
