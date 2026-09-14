import fs from 'fs';
import path from 'path';
import { TextExtractor } from '../modules/pdf-processor/TextExtractor';
import { PdfTextExtractionProvider } from '../modules/pdf-processor/providers/PdfTextExtractionProvider';
import { AnswerKeyParser } from '../modules/pdf-processor/AnswerKeyParser';
import { QuestionParser } from '../modules/pdf-processor/QuestionParser';

async function main() {
  const p = path.resolve(__dirname, '../../../../sample-pdfs/format_b_answer_key.pdf');
  const buf = fs.readFileSync(p);
  const ext = await TextExtractor.extract(buf);
  console.log('--- Raw Extracted Text ---');
  console.log(ext.text);
  console.log('---------------------------');

  const ak = AnswerKeyParser.parse(ext.text);
  console.log('Answer key keys:', Array.from(ak.keyMap.entries()));

  const provider = new PdfTextExtractionProvider();
  const qList = await provider.extractQuestions(ext.text);
  console.log('Final Questions count:', qList.length);
  for (const q of qList) {
    console.log(`Q${q.questionNumber}: ${q.questionText} -> Ans: ${q.detectedAnswerLetter} (Method: ${q.detectionMethod})`);
  }
}

main();
