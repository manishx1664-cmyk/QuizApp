import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';

async function test() {
  const files = [
    'sample-pdfs/format_a_marked_answers.pdf',
    'sample-pdfs/format_b_answer_key.pdf',
    'sample-pdfs/format_c_visual_marking.pdf'
  ];

  for (const f of files) {
    const p = path.resolve(__dirname, '../../../../', f);
    const buf = fs.readFileSync(p);
    try {
      const data = await pdfParse(buf);
      console.log(`[${f}] Text extracted (${data.text?.length} chars):\n`, data.text?.slice(0, 100));
    } catch (err: any) {
      console.error(`[${f}] Failed to parse:`, err.message);
    }
  }
}

test();
