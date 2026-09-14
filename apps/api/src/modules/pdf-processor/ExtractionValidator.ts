import { v4 as uuidv4 } from 'uuid';
import { ExtractedQuestion, AnswerDetectionMethod } from '@quizforge/shared';
import { RawParsedQuestion } from './QuestionParser';
import { ParsedAnswerKey } from './AnswerKeyParser';

export class ExtractionValidator {
  public static validateAndEnrich(
    rawQuestions: RawParsedQuestion[],
    answerKeyResult: ParsedAnswerKey
  ): ExtractedQuestion[] {
    const enrichedQuestions: ExtractedQuestion[] = [];
    const questionTextMap = new Map<string, number>(); // normalizedText -> count

    for (const raw of rawQuestions) {
      const qNum = raw.questionNumber;
      let finalAnswerLetter = raw.detectedAnswerLetter;
      let finalMethod: AnswerDetectionMethod = raw.detectionMethod || 'manual_required';
      let finalConfidence = raw.confidence;

      // Rule: Explicit Answer Key takes highest priority
      if (answerKeyResult.keyMap.has(qNum)) {
        finalAnswerLetter = answerKeyResult.keyMap.get(qNum);
        finalMethod = 'answer_key';
        finalConfidence = 1.0;
      }

      // Check if answer is valid among options
      const hasValidAnswer =
        finalAnswerLetter &&
        raw.options.some((opt) => opt.letter.toUpperCase() === finalAnswerLetter?.toUpperCase());

      let requiresReview = false;

      if (!finalAnswerLetter || !hasValidAnswer) {
        finalAnswerLetter = undefined;
        finalMethod = 'manual_required';
        finalConfidence = 0.0;
        requiresReview = true;
      } else if (finalConfidence < 0.8) {
        requiresReview = true;
      }

      // Check options count (MCQ usually needs >= 2 options)
      if (raw.options.length < 2) {
        requiresReview = true;
      }

      // Duplicate question detection (normalize text)
      const normalizedText = this.normalizeText(raw.questionText);
      const prevCount = questionTextMap.get(normalizedText) || 0;
      questionTextMap.set(normalizedText, prevCount + 1);
      const duplicateWarning = prevCount > 0;

      enrichedQuestions.push({
        tempId: uuidv4(),
        questionNumber: qNum,
        questionText: raw.questionText,
        options: raw.options,
        detectedAnswerLetter: finalAnswerLetter,
        detectionMethod: finalMethod,
        confidence: Number(finalConfidence.toFixed(2)),
        requiresReview,
        explanation: raw.explanation,
        duplicateWarning
      });
    }

    return enrichedQuestions;
  }

  private static normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .trim();
  }
}
