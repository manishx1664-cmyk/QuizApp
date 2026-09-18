import { AnswerDetectionMethod } from '@quizforge/shared';

export interface MarkedAnswerDetectionResult {
  hasMarking: boolean;
  cleanText: string;
  method?: AnswerDetectionMethod;
  confidence: number;
}

export class MarkedAnswerDetector {
  // 1. Bracketed tags: (Correct), [Correct], (Correct Answer), [Correct Answer], (Ans), [Ans], {Correct}
  private static BRACKETED_LABEL_REGEX = /\(?\[\s*(?:Correct(?:\s*Answer)?|Right\s*Answer|Ans(?:wer)?)\s*\]\)?|\(\s*(?:Correct(?:\s*Answer)?|Right\s*Answer|Ans(?:wer)?)\s*\)/i;

  // 2. Trailing labels: '3 Correct Answer', '✓ Correct Answer', 'Correct Answer', 'Right Answer', '- Correct'
  private static TRAILING_LABEL_REGEX = /(?:\s*(?:[\u2713\u2714\u221A\*\d]|\(?[✓✔xX]\)?|\[[✓✔xX]\])?\s*(?:Correct\s*Answer|Right\s*Answer|Correct\s*Option)\s*$)|(?:\s*[\-\–\:]\s*Correct\s*$)/i;

  // 3. Checkmarks / asterisk markings
  private static CHECKMARK_END_REGEX = /\s*(?:[\u2713\u2714\u221A]|\*|\[[xX✓✔]\]|\([xX✓✔]\))\s*$/;
  private static CHECKMARK_START_REGEX = /^\s*(?:[\u2713\u2714\u221A]|\*|\[[xX✓✔]\]|\([xX✓✔]\))\s*/;

  // 4. Whole option bolded
  private static WHOLE_BOLD_REGEX = /^\s*(?:\*\*(.+?)\*\*|__(.+?)__)\s*$/;

  public static inspectOptionText(rawOptionText: string, hasLeadingMark = false): MarkedAnswerDetectionResult {
    let cleanText = rawOptionText.trim();
    let hasMarking = hasLeadingMark;
    let method: AnswerDetectionMethod | undefined = hasLeadingMark ? 'marked_checkmark' : undefined;
    let confidence = hasLeadingMark ? 0.95 : 0.0;

    // Check bracketed explicit tags: (Correct Answer), [Correct], (Ans)
    if (this.BRACKETED_LABEL_REGEX.test(cleanText)) {
      hasMarking = true;
      method = 'explicit_label';
      confidence = 0.98;
      cleanText = cleanText.replace(this.BRACKETED_LABEL_REGEX, '').trim();
    }
    // Check trailing labels: '3 Correct Answer', 'Correct Answer', '- Correct'
    else if (this.TRAILING_LABEL_REGEX.test(cleanText)) {
      hasMarking = true;
      method = 'explicit_label';
      confidence = 0.95;
      cleanText = cleanText.replace(this.TRAILING_LABEL_REGEX, '').trim();
    }
    // Check checkmark or asterisk at end of text
    else if (this.CHECKMARK_END_REGEX.test(cleanText)) {
      hasMarking = true;
      method = 'marked_checkmark';
      confidence = 0.90;
      cleanText = cleanText.replace(this.CHECKMARK_END_REGEX, '').trim();
    }
    // Check checkmark or asterisk at start of text
    else if (this.CHECKMARK_START_REGEX.test(cleanText)) {
      hasMarking = true;
      method = 'marked_checkmark';
      confidence = 0.90;
      cleanText = cleanText.replace(this.CHECKMARK_START_REGEX, '').trim();
    }
    // Check whole option bold
    else if (this.WHOLE_BOLD_REGEX.test(cleanText)) {
      hasMarking = true;
      method = 'marked_bold';
      confidence = 0.85;
      cleanText = cleanText.replace(/\*\*/g, '').replace(/__/g, '').trim();
    }

    // Strip any lingering trailing icons or numbers left by font glyphs (like trailing ' 3')
    cleanText = cleanText.replace(/\s+3\s*$/, '').trim();

    return {
      hasMarking,
      cleanText: cleanText.trim(),
      method,
      confidence
    };
  }
}