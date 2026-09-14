import { ExtractedOption, AnswerDetectionMethod } from '@quizforge/shared';
import { MarkedAnswerDetector } from './MarkedAnswerDetector';

export interface ParsedOptionsResult {
  options: ExtractedOption[];
  detectedAnswerLetter?: string;
  detectionMethod?: AnswerDetectionMethod;
  confidence: number;
}

export class OptionParser {
  // Option start markers:
  // "A. ", "A) ", "(A) ", "a. ", "a) ", "(a) "
  private static OPTION_PREFIX_REGEX = /(?:^|\n)\s*(?:\(?([A-Da-d])\)?[\.\:\)\-]?)\s+/;
  private static INLINE_MULTI_OPTION_REGEX = /(?:^|\s+)(?:\(?([A-Da-d])\)?[\.\:\)\-]\s+)/g;

  public static parse(optionsBlockText: string): ParsedOptionsResult {
    const lines = optionsBlockText.split(/\r?\n/);
    const options: ExtractedOption[] = [];
    let detectedAnswerLetter: string | undefined;
    let detectionMethod: AnswerDetectionMethod | undefined;
    let confidence = 0.0;

    let currentLetter: string | null = null;
    let currentText = '';

    const saveCurrentOption = () => {
      if (currentLetter && currentText.trim()) {
        const detection = MarkedAnswerDetector.inspectOptionText(currentText.trim());
        options.push({
          letter: currentLetter.toUpperCase(),
          text: detection.cleanText
        });

        if (detection.hasMarking && (!detectedAnswerLetter || detection.confidence > confidence)) {
          detectedAnswerLetter = currentLetter.toUpperCase();
          detectionMethod = detection.method;
          confidence = detection.confidence;
        }
      }
    };

    // Regex to match start of an option on a line:
    // Matches: "A. ", "A) ", "(A)", "a.", etc.
    const lineOptionStartRegex = /^\s*(?:\(([A-Da-d])\)|([A-Da-d])[\.\:\)\-])\s*(.*)$/;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      const match = line.match(lineOptionStartRegex);
      if (match) {
        // Save previous option if any
        saveCurrentOption();

        currentLetter = (match[1] || match[2]).toUpperCase();
        currentText = match[3] || '';

        // Check if there's a second option on the SAME line (e.g. "A. Cat   B. Dog")
        const subsequentOptionRegex = /\s+(?:\(([B-Db-d])\)|([B-Db-d])[\.\:\)\-])\s+(.*)$/;
        const subMatch = currentText.match(subsequentOptionRegex);
        if (subMatch && subMatch.index !== undefined) {
          const firstOptionText = currentText.slice(0, subMatch.index).trim();
          currentText = firstOptionText;
          saveCurrentOption();

          currentLetter = (subMatch[1] || subMatch[2]).toUpperCase();
          currentText = subMatch[3] || '';
        }
      } else if (currentLetter) {
        // Continuation of current option text
        currentText += ' ' + line;
      }
    }

    // Save final option
    saveCurrentOption();

    return {
      options,
      detectedAnswerLetter,
      detectionMethod,
      confidence
    };
  }
}
