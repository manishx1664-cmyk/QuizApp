export interface ParsedAnswerKey {
  keyMap: Map<number, string>;
  keySectionText: string;
}

export class AnswerKeyParser {
  // Regex headers strictly indicating an Answer Key section at the bottom of the document
  private static KEY_HEADER_REGEX = /(?:^|\n)\s*(?:(?:Answer|Solution|Correct\s*Answer)\s*(?:Keys?|Sheets?|Answers?|Solutions?)|Answers?\s*Key|Answers?\s*:|Solutions?\s*:|KEY\s*:)\s*[\:\-\.]?\s*(?:\n|$)/i;

  private static DIGIT_MAP: Record<string, string> = { '1': 'A', '2': 'B', '3': 'C', '4': 'D' };

  public static parse(rawText: string): ParsedAnswerKey {
    const keyMap = new Map<number, string>();
    let keySectionText = '';

    const matchIndex = rawText.search(this.KEY_HEADER_REGEX);
    if (matchIndex === -1) {
      return { keyMap, keySectionText: '' };
    }

    keySectionText = rawText.slice(matchIndex);
    const lines = keySectionText.split(/\r?\n/);
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

    return { keyMap, keySectionText };
  }
}
