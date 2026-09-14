import { AnswerDetectionMethod } from '@quizforge/shared';

export interface MarkedAnswerDetectionResult {
  hasMarking: boolean;
  cleanText: string;
  method?: AnswerDetectionMethod;
  confidence: number;
}

export class MarkedAnswerDetector {
  // Checkmark symbols
  private static CHECKMARK_REGEX = /[\u2713\u2714\u221A]|\[x\]|\[X\]|\(x\)|\(X\)/;
  
  // Circle symbols (filled circle)
  private static CIRCLE_REGEX = /[\u25CF\u25C9\u25CE]|\[\•\]|\(\•\)/;

  // Explicit label: (Correct), [Correct], (Ans: B)
  private static EXPLICIT_LABEL_REGEX = /\(?\[?(?:Correct|Ans|Answer|Right)\]?\)?/i;

  // Markdown bold or asterisks wrapping option: **text** or * at end
  private static BOLD_REGEX = /\*\*(.+?)\*\*|__(.+?)__/;
  private static ASTERISK_MARK_REGEX = /(?:^\s*\*|\*\s*$)/;

  public static inspectOptionText(rawOptionText: string): MarkedAnswerDetectionResult {
    let cleanText = rawOptionText;
    let hasMarking = false;
    let method: AnswerDetectionMethod | undefined;
    let confidence = 0.0;

    // Check checkmarks
    if (this.CHECKMARK_REGEX.test(cleanText)) {
      hasMarking = true;
      method = 'marked_checkmark';
      confidence = 0.95;
      cleanText = cleanText.replace(this.CHECKMARK_REGEX, '').trim();
    }
    // Check circles
    else if (this.CIRCLE_REGEX.test(cleanText)) {
      hasMarking = true;
      method = 'marked_circle';
      confidence = 0.90;
      cleanText = cleanText.replace(this.CIRCLE_REGEX, '').trim();
    }
    // Check explicit labels: (Correct), [Correct]
    else if (this.EXPLICIT_LABEL_REGEX.test(cleanText)) {
      hasMarking = true;
      method = 'explicit_label';
      confidence = 0.95;
      cleanText = cleanText.replace(this.EXPLICIT_LABEL_REGEX, '').trim();
    }
    // Check markdown bold or asterisk marker
    else if (this.BOLD_REGEX.test(cleanText) || this.ASTERISK_MARK_REGEX.test(cleanText)) {
      hasMarking = true;
      method = 'marked_bold';
      confidence = 0.85;
      cleanText = cleanText.replace(/\*\*/g, '').replace(/__/g, '').replace(this.ASTERISK_MARK_REGEX, '').trim();
    }

    return {
      hasMarking,
      cleanText,
      method,
      confidence
    };
  }
}
