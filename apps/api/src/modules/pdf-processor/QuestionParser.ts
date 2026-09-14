import { OptionParser } from './OptionParser';
import { ExtractedOption, AnswerDetectionMethod } from '@quizforge/shared';

export interface RawParsedQuestion {
  questionNumber: number;
  questionText: string;
  options: ExtractedOption[];
  detectedAnswerLetter?: string;
  detectionMethod?: AnswerDetectionMethod;
  confidence: number;
  explanation?: string;
}

export class QuestionParser {
  // Regex to detect start of a question:
  // "1. ", "1) ", "Q1. ", "Q1: ", "Question 1. ", "Question 1: ", "1 - "
  private static QUESTION_START_REGEX = /(?:^|\n)\s*(?:(?:Question|Q)\s*)?(\d+)[\.\:\)\-]\s+/i;
  private static EXPLANATION_REGEX = /(?:Explanation|Exp|Reason|Rationale|Note)\s*[\:\-]\s*(.+)$/i;

  public static parseQuestions(contentWithoutAnswerKey: string): RawParsedQuestion[] {
    const rawQuestions: RawParsedQuestion[] = [];
    const text = contentWithoutAnswerKey.trim();
    if (!text) return [];

    // Find all question header matches and their indices
    const regex = /(?:^|\n)\s*(?:(?:Question|Q)\s*)?(\d+)[\.\:\)\-]\s+/gi;
    const matches: { startIndex: number; headerEndIndex: number; qNum: number }[] = [];
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      matches.push({
        startIndex: match.index,
        headerEndIndex: match.index + match[0].length,
        qNum: parseInt(match[1], 10)
      });
    }

    if (matches.length === 0) {
      return [];
    }

    for (let i = 0; i < matches.length; i++) {
      const current = matches[i];
      const nextIndex = i + 1 < matches.length ? matches[i + 1].startIndex : text.length;
      const block = text.slice(current.headerEndIndex, nextIndex).trim();

      // In this block, separate question prompt from options and explanation
      // Options typically start with A. or (A) or a)
      const optionStartRegex = /(?:^|\n)\s*(?:\([A-Da-d]\)|[A-Da-d][\.\:\)\-])\s+/;
      const optionMatch = block.match(optionStartRegex);

      let questionPrompt = block;
      let optionsBlock = '';
      let explanation: string | undefined;

      if (optionMatch && optionMatch.index !== undefined) {
        questionPrompt = block.slice(0, optionMatch.index).trim();
        optionsBlock = block.slice(optionMatch.index).trim();

        // Check if options block contains an explanation at the bottom
        const expMatch = optionsBlock.match(this.EXPLANATION_REGEX);
        if (expMatch && expMatch.index !== undefined) {
          explanation = expMatch[1].trim();
          optionsBlock = optionsBlock.slice(0, expMatch.index).trim();
        }
      }

      // Check if question prompt itself had an explanation (rare)
      const promptExpMatch = questionPrompt.match(this.EXPLANATION_REGEX);
      if (promptExpMatch && promptExpMatch.index !== undefined) {
        explanation = promptExpMatch[1].trim();
        questionPrompt = questionPrompt.slice(0, promptExpMatch.index).trim();
      }

      // Parse options using OptionParser
      const parsedOptions = OptionParser.parse(optionsBlock);

      rawQuestions.push({
        questionNumber: current.qNum,
        questionText: questionPrompt.replace(/\s+/g, ' ').trim(),
        options: parsedOptions.options,
        detectedAnswerLetter: parsedOptions.detectedAnswerLetter,
        detectionMethod: parsedOptions.detectionMethod,
        confidence: parsedOptions.confidence,
        explanation
      });
    }

    return rawQuestions;
  }
}
