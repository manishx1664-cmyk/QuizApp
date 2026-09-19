export interface ParsedAnswerKey {
  keyMap: Map<number, string>;
  keySectionText: string;
}

export class AnswerKeyParser {
  // Regex headers indicating answer key section at line start
  private static KEY_HEADER_REGEX = /(?:^|\n)\s*(?:(?:Answer|Solution|Key|Correct\s*Answer)\s*(?:Keys?|Sheets?|Answers?|Solutions?)?|Answers?|Solutions?|KEYS?)\s*[\:\-\.]?\s*(?:\n|$)/i;

  private static DIGIT_MAP: Record<string, string> = { '1': 'A', '2': 'B', '3': 'C', '4': 'D' };

  public static parse(rawText: string): ParsedAnswerKey {
    const keyMap = new Map<number, string>();
    let keySectionText = '';

    const matchIndex = rawText.search(this.KEY_HEADER_REGEX);
    let searchContent = rawText;
    if (matchIndex !== -1) {
      keySectionText = rawText.slice(matchIndex);
      searchContent = keySectionText;
    }

    const lines = searchContent.split(/\r?\n/);
    // Matches: 1. A, 1-A, 1: A, 1) A, 1 (A), 1 [A], 1. (A), 1 A, Q1. A, Q.1 (A), 1. 1, 1 (1)
    const entryRegex = /(?:Q\.?\s*)?(\d+)\s*[\.\:\-\)\s\,\|\t]*\s*(?:\(([A-Da-d1-4])\)|\[([A-Da-d1-4])\]|([A-Da-d1-4]))(?=[\s\,\.\|\;\)\-\n]|$)/gi;

    for (const line of lines) {
      if (this.KEY_HEADER_REGEX.test(line)) continue;

      let entryMatch: RegExpExecArray | null;
      entryRegex.lastIndex = 0;

      while ((entryMatch = entryRegex.exec(line)) !== null) {
        const qNum = parseInt(entryMatch[1], 10);
        const rawAns = entryMatch[2] || entryMatch[3] || entryMatch[4];
        if (rawAns) {
          const answerLetter = (this.DIGIT_MAP[rawAns] || rawAns).toUpperCase();
          if (!keyMap.has(qNum)) {
            keyMap.set(qNum, answerLetter);
          }
        }
      }
    }

    // Fallback: If no explicit header was found but we found >= 3 consecutive answer entries, treat as answer section
    if (matchIndex === -1 && keyMap.size >= 3) {
      keySectionText = rawText.slice(Math.floor(rawText.length * 0.7));
    }

    return { keyMap, keySectionText };
  }
}
