import { ExtractedQuestion } from '@quizforge/shared';
import { QuestionExtractionProvider, ExtractionContext } from './QuestionExtractionProvider';
import { AnswerKeyParser } from '../AnswerKeyParser';
import { QuestionParser } from '../QuestionParser';
import { ExtractionValidator } from '../ExtractionValidator';

export class PdfTextExtractionProvider implements QuestionExtractionProvider {
  public name = 'PdfTextExtractionProvider';

  public async extractQuestions(
    rawText: string,
    _context?: ExtractionContext
  ): Promise<ExtractedQuestion[]> {
    // 1. Parse Answer Key (if any) at the end of the text
    const answerKeyResult = AnswerKeyParser.parse(rawText);

    // 2. Separate question content from answer key section
    let questionContent = rawText;
    if (answerKeyResult.keySectionText) {
      const idx = rawText.indexOf(answerKeyResult.keySectionText);
      if (idx !== -1) {
        questionContent = rawText.slice(0, idx);
      }
    }

    // 3. Parse questions & options
    const rawQuestions = QuestionParser.parseQuestions(questionContent);

    // 4. Validate & enrich questions
    const enriched = ExtractionValidator.validateAndEnrich(rawQuestions, answerKeyResult);

    return enriched;
  }
}
