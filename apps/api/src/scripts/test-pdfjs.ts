import fs from 'fs';
import path from 'path';

async function main() {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');

  async function extractText(buffer: Buffer): Promise<string> {
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

    return fullText.trim();
  }

  const files = [
    'sample-pdfs/format_a_marked_answers.pdf',
    'sample-pdfs/format_b_answer_key.pdf',
    'sample-pdfs/format_c_visual_marking.pdf'
  ];

  for (const f of files) {
    const p = path.resolve(__dirname, '../../../../', f);
    const buf = fs.readFileSync(p);
    try {
      const text = await extractText(buf);
      console.log(`[${f}] SUCCESS! (${text.length} chars):\n`, text.slice(0, 100), '\n---');
    } catch (err: any) {
      console.error(`[${f}] ERROR:`, err.message);
    }
  }
}

main();
