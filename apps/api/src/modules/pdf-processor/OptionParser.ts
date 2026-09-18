import { ExtractedOption, AnswerDetectionMethod } from '@quizforge/shared';
import { MarkedAnswerDetector } from './MarkedAnswerDetector';

export interface ParsedOptionsResult {
  options: ExtractedOption[];
  detectedAnswerLetter?: string;
  detectionMethod?: AnswerDetectionMethod;
  confidence: number;
}

export class OptionParser {
  public static parse(optionsBlockText: string): ParsedOptionsResult {
    const lines = optionsBlockText.split(/\r?\n/);
    const options: ExtractedOption[] = [];
    let detectedAnswerLetter: string | undefined;
    let detectionMethod: AnswerDetectionMethod | undefined;
    let confidence = 0.0;

    let currentLetter: string | null = null;
    let currentText = '';
    let currentHasLeadingMark = false;

    const saveCurrentOption = () => {
      if (currentLetter && currentText.trim()) {
        const detection = MarkedAnswerDetector.inspectOptionText(currentText.trim(), currentHasLeadingMark);
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
    // Supports: "A. ", "A) ", "(A)", "3  A. ", "✓ A. ", "* A. ", etc.
    const lineOptionStartRegex = /^\s*(?:([\u2713\u2714\u221A\u25CF\u25C9\u25CE\*\•\d])\s+)?(?:\(([A-Da-d])\)|\[([A-Da-d])\]|([A-Da-d])[\.\:\)\-])\s*(.*)$/;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      const match = line.match(lineOptionStartRegex);
      if (match) {
        // Save previous option if any
        saveCurrentOption();

        const leadingGlyph = match[1];
        // If leading glyph was a checkmark or symbol or '3', note that it has a leading mark
        currentHasLeadingMark = !!(leadingGlyph && (['3', '*', '✓', '✔', '√', '•', '●'].includes(leadingGlyph) || /[\u2713\u2714\u221A\u25CF\u25C9\u25CE\*\•]/.test(leadingGlyph)));
        currentLetter = (match[2] || match[3] || match[4]).toUpperCase();
        currentText = match[5] || '';

        // Check if there's a second option on the SAME line (e.g. "A. Cat   B. Dog" or "A. Cat  3  B. Dog")
        const subsequentOptionRegex = /\s+(?:([\u2713\u2714\u221A\u25CF\u25C9\u25CE\*\•\d])\s+)?(?:\(([B-Db-d])\)|\[([B-Db-d])\]|([B-Db-d])[\.\:\)\-])\s+(.*)$/;
        const subMatch = currentText.match(subsequentOptionRegex);
        if (subMatch && subMatch.index !== undefined) {
          const firstOptionText = currentText.slice(0, subMatch.index).trim();
          currentText = firstOptionText;
          saveCurrentOption();

          const subLeadingGlyph = subMatch[1];
          currentHasLeadingMark = !!(subLeadingGlyph && (['3', '*', '✓', '✔', '√', '•', '●'].includes(subLeadingGlyph) || /[\u2713\u2714\u221A\u25CF\u25C9\u25CE\*\•]/.test(subLeadingGlyph)));
          currentLetter = (subMatch[2] || subMatch[3] || subMatch[4]).toUpperCase();
          currentText = subMatch[5] || '';
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