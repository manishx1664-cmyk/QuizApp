export interface ExtractedTextResult {
  text: string;
  pageCount: number;
  info?: any;
  requiresOcr: boolean;
}

export class TextExtractor {
  public static async extract(buffer: Buffer): Promise<ExtractedTextResult> {
    // 1. Try modern Mozilla PDF.js extractor first (100% compliant with all streams)
    try {
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
      const uint8Array = new Uint8Array(buffer);
      const loadingTask = pdfjs.getDocument({
        data: uint8Array,
        useSystemFonts: true,
        disableFontFace: true
      });

      const pdfDocument = await loadingTask.promise;
      const numPages = pdfDocument.numPages;
      let fullText = '';

      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdfDocument.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageItems = textContent.items as any[];

        let lastY: number | null = null;
        let pageText = '';

        for (const item of pageItems) {
          if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
            pageText += '\n';
          } else if (pageText.length > 0 && !pageText.endsWith(' ') && !pageText.endsWith('\n')) {
            pageText += ' ';
          }
          pageText += item.str;
          lastY = item.transform[5];
        }

        fullText += pageText + '\n\n';
      }

      const text = fullText.trim();
      if (text.length > 0) {
        return {
          text,
          pageCount: numPages,
          requiresOcr: false
        };
      }
    } catch (pdfjsErr: any) {
      console.warn('PDF.js text extraction encountered issue, attempting fallback:', pdfjsErr.message);
    }

    // 2. Fallback to pdf-parse if needed
    try {
      const pdfParse = require('pdf-parse');
      const data = await pdfParse(buffer);
      const text = data.text ? data.text.trim() : '';
      const pageCount = data.numpages || 1;

      return {
        text,
        pageCount,
        info: data.info,
        requiresOcr: text.length === 0
      };
    } catch (error: any) {
      console.warn('Direct PDF text extraction failed:', error.message);
      return {
        text: '',
        pageCount: 1,
        requiresOcr: true
      };
    }
  }
}
