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
  private static QUESTION_HEADER_REGEX = /(?:^|\n|\r)\s*(?:(?:Question|Que|Qno|Q\.No|Problem|Item|MCQ)\s*[\.\:\s\-]*\s*(\d+)|Q\.?\s*(\d+)[\.\:\)\-\s]|(?:\((\d+)\)|\[(\d+)\]|(\d+))\s*[\.\:\)\-\]\}\=\.])/gi;
  private static EXPLANATION_REGEX = /(?:Solution|Sol|Explanation|Exp|Reason|Rationale|Note)\s*[\:\-]\s*(.+)$/is;
  private static ANSWER_LINE_REGEX = /(?:^|\n)\s*(?:(?:Correct\s*(?:Option|Answer)?|Ans(?:wer)?|Right\s*(?:Option|Answer)?|Key|Sol(?:ution)?)\s*(?:is|was|[\:\-\.\=])\s*(?:Option\s*)?\(?([A-Da-d1-4])\)?|Option\s*\(?([A-Da-d1-4])\)?\s*(?:is|was)\s*(?:the\s*)?correct)/i;
  private static OPTION_START_REGEX = /(?:^|\n|\s+)(?:([\u2713\u2714\u221A\u25CF\u25C9\u25CE\*\•\d])\s+)?(?:\(([A-Da-d1-4]|i{1,4}|I{1,4}|iv|IV)\)|\[([A-Da-d1-4]|i{1,4}|I{1,4}|iv|IV)\]|([A-Da-d]|i{1,4}|I{1,4}|iv|IV)\s*[\.\:\)\-\]])\s*/i;

  public static parseQuestions(contentWithoutAnswerKey: string): RawParsedQuestion[] {
    const rawQuestions: RawParsedQuestion[] = [];
    const text = contentWithoutAnswerKey.trim();
    if (!text) return [];

    // Digit to letter map (1->A, 2->B, 3->C, 4->D)
    const digitToLetter: Record<string, string> = { '1': 'A', '2': 'B', '3': 'C', '4': 'D' };

    // Find all question header matches and their indices
    const matches: { startIndex: number; headerEndIndex: number; qNum: number }[] = [];
    let match: RegExpExecArray | null;
    this.QUESTION_HEADER_REGEX.lastIndex = 0;

    while ((match = this.QUESTION_HEADER_REGEX.exec(text)) !== null) {
      const rawNum = match[1] || match[2] || match[3] || match[4] || match[5];
      matches.push({
        startIndex: match.index,
        headerEndIndex: match.index + match[0].length,
        qNum: parseInt(rawNum, 10)
      });
    }

    if (matches.length === 0) {
      return [];
    }

    for (let i = 0; i < matches.length; i++) {
      const current = matches[i];
      const nextIndex = i + 1 < matches.length ? matches[i + 1].startIndex : text.length;
      let block = text.slice(current.headerEndIndex, nextIndex).trim();

      // Check if block contains an explicit answer line: "Answer: B" or "Ans: Option (C)"
      let explicitAnswerLetter: string | undefined;
      const answerMatch = block.match(this.ANSWER_LINE_REGEX);
      if (answerMatch) {
        const rawAns = answerMatch[1] || answerMatch[2];
        if (rawAns) {
          explicitAnswerLetter = digitToLetter[rawAns] || rawAns.toUpperCase();
          block = block.replace(this.ANSWER_LINE_REGEX, '\n').trim();
        }
      }

      // Check if block contains an explanation / solution
      let explanation: string | undefined;
      const expMatch = block.match(this.EXPLANATION_REGEX);
      if (expMatch && expMatch.index !== undefined) {
        explanation = expMatch[1].trim();
        block = block.slice(0, expMatch.index).trim();
      }

      // In remaining block, separate question prompt from options
      const optionMatch = block.match(this.OPTION_START_REGEX);
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