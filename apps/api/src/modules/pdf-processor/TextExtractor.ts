export interface ExtractedTextResult {
  text: string;
  pageCount: number;
  info?: any;
  requiresOcr: boolean;
}

export class TextExtractor {
  public static isGreenColor(val: any): boolean {
    if (!val) return false;
    if (typeof val === 'string') {
      let hex = val.replace('#', '').trim();
      if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
      if (hex.length === 6) {
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        // Light pastel green (#dcfce7), dark green (#166534), emerald (#22c55e), lime, etc.
        return g > 40 && g > r * 1.05 && g > b * 1.05;
      }
      const match = val.match(/rgb[a]?\((\d+),\s*(\d+),\s*(\d+)/i);
      if (match) {
        const r = parseInt(match[1], 10);
        const g = parseInt(match[2], 10);
        const b = parseInt(match[3], 10);
        return g > 40 && g > r * 1.05 && g > b * 1.05;
      }
    } else if (Array.isArray(val) && val.length >= 3) {
      const r = val[0] > 1 ? val[0] : val[0] * 255;
      const g = val[1] > 1 ? val[1] : val[1] * 255;
      const b = val[2] > 1 ? val[2] : val[2] * 255;
      return g > 40 && g > r * 1.05 && g > b * 1.05;
    }
    return false;
  }

  private static async getPdfjsLib(): Promise<any> {
    try {
      return await import('pdfjs-dist/legacy/build/pdf.mjs');
    } catch {}
    try {
      return require('pdfjs-dist/legacy/build/pdf.mjs');
    } catch {}
    try {
      return await import('pdfjs-dist');
    } catch {}
    try {
      return require('pdfjs-dist');
    } catch {}
    throw new Error('pdfjs-dist library not found');
  }

  public static async extract(buffer: Buffer): Promise<ExtractedTextResult> {
    // 1. Try PDF.js visual highlight & operator text stream extractor first
    try {
      const pdfjs = await this.getPdfjsLib();
      const uint8Array = new Uint8Array(buffer);
      const loadingTask = pdfjs.getDocument({
        data: uint8Array,
        useSystemFonts: true,
        disableFontFace: true
      });

      const pdfDocument = await loadingTask.promise;
      const numPages = pdfDocument.numPages;
      let fullDocText = '';

      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdfDocument.getPage(pageNum);
        const opList = await page.getOperatorList();

        let currentFill: any = null;
        let pageLines: string[] = [];
        let currentLine = '';
        let currentLineIsGreen = false;

        const flushLine = () => {
          if (currentLine.trim().length > 0) {
            let line = currentLine.trim();
            if (currentLineIsGreen && !line.includes('(Correct Answer)')) {
              line += ' (Correct Answer)';
            }
            pageLines.push(line);
          }
          currentLine = '';
          currentLineIsGreen = false;
        };

        for (let i = 0; i < opList.fnArray.length; i++) {
          const fn = opList.fnArray[i];
          const args = opList.argsArray[i];

          if (fn === pdfjs.OPS.setFillRGBColor && args) {
            currentFill = args[0];
          } else if (fn === pdfjs.OPS.setFillCMYKColor && args && args.length >= 4) {
            const c = args[0], m = args[1], y = args[2], k = args[3];
            const r = 255 * (1 - c) * (1 - k);
            const g = 255 * (1 - m) * (1 - k);
            const b = 255 * (1 - y) * (1 - k);
            currentFill = [r, g, b];
          } else if (fn === pdfjs.OPS.showText && args && args[0]) {
            let str = '';
            for (const g of args[0]) {
              if (g && g.unicode) str += g.unicode;
              else if (typeof g === 'string') str += g;
            }

            if (str.trim().length > 0) {
              const isChunkGreen = this.isGreenColor(currentFill);
              const trimmed = str.trim();

              // Check if this chunk starts a new question or option
              const isNewQuestionOrOption = /^(?:Q\d+[\.:\)]|[A-D]\.|\([A-D]\)|\([0-9]+\)|Question\s+\d+)/i.test(trimmed);

              if (isNewQuestionOrOption && currentLine.trim().length > 0) {
                flushLine();
              }

              if (isChunkGreen) {
                currentLineIsGreen = true;
              }

              if (
                currentLine.length > 0 &&
                !currentLine.endsWith(' ') &&
                !str.startsWith(' ') &&
                !str.startsWith('>') &&
                !currentLine.endsWith('<')
              ) {
                currentLine += ' ';
              }
              currentLine += str;
            }
          }
        }
        flushLine();

        if (pageLines.length > 0) {
          fullDocText += pageLines.join('\n') + '\n\n';
        } else {
          // Fallback to textContent if operator showText had no glyphs
          const textContent = await page.getTextContent();
          const items = (textContent.items as any[]).map(item => item.str).join(' ');
          fullDocText += items + '\n\n';
        }
      }

      const text = fullDocText.trim();
      if (text.length > 50) {
        return {
          text,
          pageCount: numPages,
          requiresOcr: false
        };
      }
    } catch (pdfjsErr: any) {
      console.warn('PDF.js text & highlight extraction fallback:', pdfjsErr.message);
    }

    // 2. Direct pdf-parse fallback (fastest standard stream parser)
    try {
      const pdfParse = require('pdf-parse');
      const data = await pdfParse(buffer);
      const text = data.text ? data.text.trim() : '';
      const pageCount = data.numpages || 1;

      if (text.length > 50) {
        return {
          text,
          pageCount,
          info: data.info,
          requiresOcr: false
        };
      }
    } catch (parseErr: any) {
      console.warn('pdf-parse extraction fallback error:', parseErr.message);
    }

    return {
      text: '',
      pageCount: 1,
      requiresOcr: true
    };
  }
}

