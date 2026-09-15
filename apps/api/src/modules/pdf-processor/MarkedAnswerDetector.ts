import { AnswerDetectionMethod } from '@quizforge/shared';

export interface MarkedAnswerDetectionResult {
  hasMarking: boolean;
  cleanText: string;
  method?: AnswerDetectionMethod;
  confidence: number;
}

export class MarkedAnswerDetector {
  // Checkmark symbols (explicit checkmarks like ✓, ✔, √, [x], (x) only)
  private static CHECKMARK_REGEX = /(?:^|\s+)[\u2713\u2714\u221A]|\b\[[xX✓✔]\]|\b\([xX✓✔]\)|[\u2713\u2714\u221A]\s*$/;
  
  // Circle symbols (explicit filled circle markers)
  private static CIRCLE_REGEX = /(?:^|\s+)[\u25CF\u25C9\u25CE]|\b\[\•\]|\b\(\•\)|[\u25CF\u25C9\u25CE]\s*$/;

  // Explicit label: (Correct), [Correct], (Ans), [Ans], {Correct}, - Correct
  private static EXPLICIT_LABEL_REGEX = /(?:\[|\(|\{)\s*(?:correct|ans|answer|right|correct\s*answer)\s*(?:\]|\)|\})|\s*(?:-\s*|–\s*|\:\s*)(?:correct|answer)\s*$/i;

  // Whole option bolded or marked with leading/trailing asterisk
  private static WHOLE_BOLD_REGEX = /^\s*(?:\*\*(.+?)\*\*|__(.+?)__)\s*$/;
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
    // Check explicit bracketed/tagged labels: (Correct), [Correct], (Ans)
    else if (this.EXPLICIT_LABEL_REGEX.test(cleanText)) {
      hasMarking = true;
      method = 'explicit_label';
      confidence = 0.95;
      cleanText = cleanText.replace(this.EXPLICIT_LABEL_REGEX, '').trim();
    }
    // Check whole option bold or asterisk marker
    else if (this.WHOLE_BOLD_REGEX.test(cleanText) || this.ASTERISK_MARK_REGEX.test(cleanText)) {
      hasMarking = true;
      method = 'marked_bold';
      confidence = 0.85;
      cleanText = cleanText.replace(/\*\*/g, '').replace(/__/g, '').replace(this.ASTERISK_MARK_REGEX, '').trim();
    }

    return {
      hasMarking,
      cleanText: cleanText.trim(),
      method,
      confidence
    };
  }
}