export interface ParsedAnswerKey {
  keyMap: Map<number, string>;
  keySectionText: string;
}

export class AnswerKeyParser {
  // Regex headers indicating answer key section at line start
  private static KEY_HEADER_REGEX = /(?:^|\n)\s*(?:Answer\s*Key|Answers\s*Sheet|Answers\s*:|Solutions\s*:|KEY\s*:)/i;

  public static parse(rawText: string): ParsedAnswerKey {
    const keyMap = new Map<number, string>();
    let keySectionText = '';

    const matchIndex = rawText.search(this.KEY_HEADER_REGEX);
    if (matchIndex === -1) {
      return { keyMap, keySectionText };
    }

    keySectionText = rawText.slice(matchIndex);

    // Line-by-line parser to prevent regex overlap
    const lines = keySectionText.split(/\r?\n/);
    const entryRegex = /(?:Q\s*)?(\d+)\s*[\.\:\-\)]\s*\(?([A-Da-d])\)?/gi;

    for (const line of lines) {
      // Skip header line itself
      if (this.KEY_HEADER_REGEX.test(line)) continue;

      let entryMatch: RegExpExecArray | null;
      entryRegex.lastIndex = 0;

      while ((entryMatch = entryRegex.exec(line)) !== null) {
        const qNum = parseInt(entryMatch[1], 10);
        const answerLetter = entryMatch[2].toUpperCase();
        if (!keyMap.has(qNum)) {
          keyMap.set(qNum, answerLetter);
        }
      }
    }

    return { keyMap, keySectionText };
  }
}
