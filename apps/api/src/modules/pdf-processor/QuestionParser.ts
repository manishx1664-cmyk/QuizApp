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
  private static QUESTION_START_REGEX = /(?:^|\n)\s*(?:(?:Question|Q)\s*)?(\d+)[\.\:\)\-]\s+/i;
  private static EXPLANATION_REGEX = /(?:Solution|Sol|Explanation|Exp|Reason|Rationale|Note)\s*[\:\-]\s*(.+)$/is;
  private static ANSWER_LINE_REGEX = /(?:^|\n)\s*(?:Correct\s*(?:Option|Answer)?|Ans(?:wer)?|Right\s*Answer|Key)\s*[\:\-\.]\s*\(?([A-Da-d])\)?(?:\s|$)/i;

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
      let block = text.slice(current.headerEndIndex, nextIndex).trim();

      // Check if block contains an explicit answer line: "Answer: B" or "Ans: C"
      let explicitAnswerLetter: string | undefined;
      const answerMatch = block.match(this.ANSWER_LINE_REGEX);
      if (answerMatch && answerMatch[1]) {
        explicitAnswerLetter = answerMatch[1].toUpperCase();
        block = block.replace(this.ANSWER_LINE_REGEX, '\n').trim();
      }

      // Check if block contains an explanation / solution
      let explanation: string | undefined;
      const expMatch = block.match(this.EXPLANATION_REGEX);
      if (expMatch && expMatch.index !== undefined) {
        explanation = expMatch[1].trim();
        block = block.slice(0, expMatch.index).trim();
      }

      // In remaining block, separate question prompt from options
      // Matches: "A. ", "A) ", "(A)", "3  A. ", "✓ A. ", "* A. "
      const optionStartRegex = /(?:^|\n)\s*(?:[\u2713\u2714\u221A\u25CF\u25C9\u25CE\*\•\d]\s+)?(?:\([A-Da-d]\)|\[[A-Da-d]\]|[A-Da-d][\.\:\)\-])\s+/;
      const optionMatch = block.match(optionStartRegex);

      let questionPrompt = block;
      let optionsBlock = '';

      if (optionMatch && optionMatch.index !== undefined) {
        questionPrompt = block.slice(0, optionMatch.index).trim();
        optionsBlock = block.slice(optionMatch.index).trim();
      }

      // Parse options using OptionParser
      const parsedOptions = OptionParser.parse(optionsBlock);

      const finalAnswerLetter = explicitAnswerLetter || parsedOptions.detectedAnswerLetter;
      const finalMethod: AnswerDetectionMethod = explicitAnswerLetter
        ? 'explicit_label'
        : (parsedOptions.detectionMethod || 'manual_required');
      const finalConfidence = explicitAnswerLetter ? 1.0 : parsedOptions.confidence;

      rawQuestions.push({
        questionNumber: current.qNum,
        questionText: questionPrompt.replace(/\s+/g, ' ').trim(),
        options: parsedOptions.options,
        detectedAnswerLetter: finalAnswerLetter,
        detectionMethod: finalMethod,
        confidence: finalConfidence,
        explanation
      });
    }

    return rawQuestions;
  }
}