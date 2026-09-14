import { ExtractedQuestion } from '@quizforge/shared';

export interface ExtractionContext {
  filename?: string;
  filesize?: number;
  useOcr?: boolean;
}

export interface QuestionExtractionProvider {
  name: string;
  extractQuestions(rawText: string, context?: ExtractionContext): Promise<ExtractedQuestion[]>;
}
