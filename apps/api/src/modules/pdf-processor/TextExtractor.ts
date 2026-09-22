export interface ExtractedTextResult {
  text: string;
  pageCount: number;
  info?: any;
  requiresOcr: boolean;
}

export class TextExtractor {
  public static async extract(buffer: Buffer): Promise<ExtractedTextResult> {
    // 1. Try PDF.js visual highlight & layout extractor first (detects green highlight boxes)
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
      let hasVisualHighlights = false;

      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdfDocument.getPage(pageNum);
        const opList = await page.getOperatorList();
        const textContent = await page.getTextContent();

        // Detect green background rectangles from operator list
        const greenBoxes: { minX: number; minY: number; maxX: number; maxY: number }[] = [];
        let currentFillRGB: [number, number, number] = [0, 0, 0];

        const isGreenColor = (r: number, g: number, b: number) => {
          const rn = r > 1 ? r / 255 : r;
          const gn = g > 1 ? g / 255 : g;
          const bn = b > 1 ? b / 255 : b;
          // Green dominant color (light green pastel #dcfce7, lime, dark green, etc.)
          return gn > 0.35 && (gn > rn * 1.05 && gn > bn * 1.04);
        };

        for (let i = 0; i < opList.fnArray.length; i++) {
          const fn = opList.fnArray[i];
          const args = opList.argsArray[i];

          if (fn === pdfjs.OPS.setFillRGBColor && args && args.length >= 3) {
            currentFillRGB = [args[0], args[1], args[2]];
          } else if (
            (fn === pdfjs.OPS.constructPath || fn === pdfjs.OPS.fill || fn === pdfjs.OPS.fillStroke || fn === pdfjs.OPS.rectangle) &&
            isGreenColor(currentFillRGB[0], currentFillRGB[1], currentFillRGB[2])
          ) {
            if (fn === pdfjs.OPS.constructPath && args) {
              const minX = args[2];
              const minY = args[3];
              const maxX = args[4];
              const maxY = args[5];
              if (typeof minX === 'number' && typeof minY === 'number' && typeof maxX === 'number' && typeof maxY === 'number') {
                greenBoxes.push({ minX, minY, maxX, maxY });
              }
            } else if (fn === pdfjs.OPS.rectangle && args && args.length >= 4) {
              const [x, y, w, h] = args;
              greenBoxes.push({
                minX: Math.min(x, x + w),
                minY: Math.min(y, y + h),
                maxX: Math.max(x, x + w),
                maxY: Math.max(y, y + h)
              });
            }
          }
        }

        // Process text items and check if they sit inside a green highlight box
        const pageItems = textContent.items as any[];
        let lastY: number | null = null;
        let pageText = '';
        let currentLineIsHighlighted = false;

        for (const item of pageItems) {
          const itemX = item.transform ? item.transform[4] : 0;
          const itemY = item.transform ? item.transform[5] : 0;
          const itemW = item.width || 0;
          const itemH = item.height || 10;

          const isItemInGreenBox = greenBoxes.some((box) => {
            return (
              itemX + itemW >= box.minX - 15 &&
              itemX <= box.maxX + 15 &&
              itemY + itemH >= box.minY - 15 &&
              itemY <= box.maxY + 15
            );
          });

          if (lastY !== null && Math.abs(itemY - lastY) > 5) {
            if (currentLineIsHighlighted) {
              pageText += ' (Correct Answer)';
              hasVisualHighlights = true;
            }
            pageText += '\n';
            currentLineIsHighlighted = false;
          } else if (pageText.length > 0 && !pageText.endsWith(' ') && !pageText.endsWith('\n')) {
            pageText += ' ';
          }

          if (isItemInGreenBox) {
            currentLineIsHighlighted = true;
          }

          pageText += item.str;
          lastY = itemY;
        }

        if (currentLineIsHighlighted) {
          pageText += ' (Correct Answer)';
          hasVisualHighlights = true;
        }

        fullText += pageText + '\n\n';
      }

      const text = fullText.trim();
      if (text.length > 50 && (hasVisualHighlights || numPages > 1)) {
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
