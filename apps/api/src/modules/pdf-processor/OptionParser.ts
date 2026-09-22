import { ExtractedOption, AnswerDetectionMethod } from '@quizforge/shared';
import { MarkedAnswerDetector } from './MarkedAnswerDetector';

export interface ParsedOptionsResult {
  options: ExtractedOption[];
  detectedAnswerLetter?: string;
  detectionMethod?: AnswerDetectionMethod;
  confidence: number;
}

export class OptionParser {
  private static DIGIT_MAP: Record<string, string> = { '1': 'A', '2': 'B', '3': 'C', '4': 'D' };
  private static ROMAN_MAP: Record<string, string> = { 'i': 'A', 'ii': 'B', 'iii': 'C', 'iv': 'D', 'I': 'A', 'II': 'B', 'III': 'C', 'IV': 'D' };

  // Matches any option marker: (A), [A], A., A), A:, 3 A., ✓ A., (1), 1., (i), i., etc.
  private static OPTION_TOKEN_REGEX = /(?:^|\s+)(?:([\u2713\u2714\u221A\u25CF\u25C9\u25CE\*\•\d])\s+)?(?:\(([A-Da-d1-4]|i{1,4}|I{1,4}|iv|IV)\)|\[([A-Da-d1-4]|i{1,4}|I{1,4}|iv|IV)\]|([A-Da-d]|i{1,4}|I{1,4}|iv|IV)\s*[\.\:\)\-\]])\s*/gi;

  public static parse(optionsBlockText: string): ParsedOptionsResult {
    const text = optionsBlockText.trim();
    if (!text) return { options: [], confidence: 0 };

    const matches: { index: number; length: number; letter: string; hasLeadingMark: boolean }[] = [];
    let m: RegExpExecArray | null;
    this.OPTION_TOKEN_REGEX.lastIndex = 0;

    while ((m = this.OPTION_TOKEN_REGEX.exec(text)) !== null) {
      const rawLetter = m[2] || m[3] || m[4];
      const leadingGlyph = m[1];
      const hasLeadingMark = !!(leadingGlyph && (['3', '*', '✓', '✔', '√', '•', '●'].includes(leadingGlyph) || /[\u2713\u2714\u221A\u25CF\u25C9\u25CE\*\•]/.test(leadingGlyph)));

      let letter = 'A';
      if (rawLetter) {
        const u = rawLetter.trim();
        letter = this.DIGIT_MAP[u] || this.ROMAN_MAP[u] || u.toUpperCase();
      }

      matches.push({
        index: m.index,
        length: m[0].length,
        letter,
        hasLeadingMark
      });
    }

    if (matches.length === 0) return { options: [], confidence: 0 };

    const options: ExtractedOption[] = [];
    let detectedAnswerLetter: string | undefined;
    let detectionMethod: AnswerDetectionMethod | undefined;
    let confidence = 0.0;

    for (let i = 0; i < matches.length; i++) {
      const curr = matches[i];
      const nextStart = i + 1 < matches.length ? matches[i + 1].index : text.length;
      const rawContent = text.slice(curr.index + curr.length, nextStart).trim();

      const detection = MarkedAnswerDetector.inspectOptionText(rawContent, curr.hasLeadingMark);
      options.push({
        letter: curr.letter,
        text: detection.cleanText
      });

      if (detection.hasMarking && (!detectedAnswerLetter || detection.confidence > confidence)) {
        detectedAnswerLetter = curr.letter;
        detectionMethod = detection.method;
        confidence = detection.confidence;
      }
    }

    return {
      options,
      detectedAnswerLetter,
      detectionMethod,
      confidence
    };
  }
}