import fs from 'fs';
import path from 'path';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

async function generateSamplePdfs() {
  const outputDir = path.resolve(__dirname, '../../../../sample-pdfs');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // --- 1. Format A: Marked Answers (Checkmarks / Inline) ---
  const docA = await PDFDocument.create();
  const font = await docA.embedFont(StandardFonts.Helvetica);
  const boldFont = await docA.embedFont(StandardFonts.HelveticaBold);
  const pageA = docA.addPage([600, 750]);

  let yA = 700;
  const drawTextA = (text: string, isBold = false, size = 12) => {
    pageA.drawText(text, {
      x: 50,
      y: yA,
      size,
      font: isBold ? boldFont : font,
      color: rgb(0.1, 0.1, 0.1)
    });
    yA -= size + 8;
  };

  drawTextA('QuizForge Sample - Format A: Marked Answers', true, 16);
  yA -= 10;

  drawTextA('Question 1. What is Java?', true);
  drawTextA('A. A database management system');
  drawTextA('B. A programming language (Correct)');
  drawTextA('C. An operating system');
  drawTextA('D. A web browser');
  drawTextA('Explanation: Java is a class-based, object-oriented language.', false, 10);
  yA -= 15;

  drawTextA('Question 2. Which keyword is used to inherit a class in Java?', true);
  drawTextA('A. implements');
  drawTextA('B. extends [x]');
  drawTextA('C. inherits');
  drawTextA('D. super');
  drawTextA('Explanation: extends creates inheritance relationship between classes.', false, 10);
  yA -= 15;

  drawTextA('Question 3. What is the scope of a private member in Java?', true);
  drawTextA('A. Visible everywhere');
  drawTextA('B. Visible only within the same class (Ans)');
  drawTextA('C. Visible within the package');
  drawTextA('D. Visible to subclasses only');
  yA -= 15;

  drawTextA('Question 4. Which of the following is a non-linear data structure?', true);
  drawTextA('A. Array');
  drawTextA('B. Stack');
  drawTextA('C. Binary Tree (Correct)');
  drawTextA('D. Queue');

  const bytesA = await docA.save({ useObjectStreams: false });
  fs.writeFileSync(path.join(outputDir, 'format_a_marked_answers.pdf'), bytesA);
  console.log('✅ Generated sample-pdfs/format_a_marked_answers.pdf');

  // --- 2. Format B: Questions followed by Answer Key at end ---
  const docB = await PDFDocument.create();
  const fontB = await docB.embedFont(StandardFonts.Helvetica);
  const boldB = await docB.embedFont(StandardFonts.HelveticaBold);
  const pageB = docB.addPage([600, 750]);

  let yB = 700;
  const drawTextB = (text: string, isBold = false, size = 12) => {
    pageB.drawText(text, {
      x: 50,
      y: yB,
      size,
      font: isBold ? boldB : fontB,
      color: rgb(0.1, 0.1, 0.1)
    });
    yB -= size + 8;
  };

  drawTextB('QuizForge Sample - Format B: Questions & Separate Answer Key', true, 16);
  yB -= 10;

  drawTextB('1. What is the primary purpose of the React virtual DOM?', true);
  drawTextB('A. To bypass browser security');
  drawTextB('B. To optimize UI re-rendering by batching DOM updates');
  drawTextB('C. To execute server-side Node.js code');
  drawTextB('D. To store database credentials');
  yB -= 10;

  drawTextB('2. Which hook is used to manage side-effects in React?', true);
  drawTextB('A. useState');
  drawTextB('B. useEffect');
  drawTextB('C. useContext');
  drawTextB('D. useReducer');
  yB -= 10;

  drawTextB('3. What does CSS flexbox layout primarily arrange?', true);
  drawTextB('A. 3D WebGL models');
  drawTextB('B. Relational tables');
  drawTextB('C. Elements in one dimension: either row or column');
  drawTextB('D. SQL database indexes');
  yB -= 10;

  drawTextB('4. Which HTTP status code indicates "Not Found"?', true);
  drawTextB('A. 200');
  drawTextB('B. 301');
  drawTextB('C. 404');
  drawTextB('D. 500');
  yB -= 25;

  drawTextB('Answer Key:', true, 14);
  drawTextB('1 - B');
  drawTextB('2 - B');
  drawTextB('3 - C');
  drawTextB('4 - C');

  const bytesB = await docB.save({ useObjectStreams: false });
  fs.writeFileSync(path.join(outputDir, 'format_b_answer_key.pdf'), bytesB);
  console.log('✅ Generated sample-pdfs/format_b_answer_key.pdf');

  // --- 3. Format C: Questions with visual markings and 1 ambiguous question ---
  const docC = await PDFDocument.create();
  const fontC = await docC.embedFont(StandardFonts.Helvetica);
  const boldC = await docC.embedFont(StandardFonts.HelveticaBold);
  const pageC = docC.addPage([600, 750]);

  let yC = 700;
  const drawTextC = (text: string, isBold = false, size = 12) => {
    pageC.drawText(text, {
      x: 50,
      y: yC,
      size,
      font: isBold ? boldFont : font,
      color: rgb(0.1, 0.1, 0.1)
    });
    yC -= size + 8;
  };

  drawTextC('QuizForge Sample - Format C: Visual Markings & Review Required', true, 16);
  yC -= 10;

  drawTextC('Q1. Which data structure operates on a Last-In, First-Out (LIFO) principle?', true);
  drawTextC('A. Queue');
  drawTextC('B. Stack *');
  drawTextC('C. Array');
  drawTextC('D. Linked List');
  yC -= 10;

  drawTextC('Q2. In SQL, which constraint uniquely identifies each record in a table?', true);
  drawTextC('A. FOREIGN KEY');
  drawTextC('B. UNIQUE');
  drawTextC('C. PRIMARY KEY (Correct)');
  drawTextC('D. NOT NULL');
  yC -= 10;

  // Ambiguous question (No answer marked -> will require manual verification!)
  drawTextC('Q3. What is the time complexity of binary search on a sorted array of size N?', true);
  drawTextC('A. O(1)');
  drawTextC('B. O(log N)');
  drawTextC('C. O(N)');
  drawTextC('D. O(N log N)');
  drawTextC('(Notice: Answer is not marked. Tests "Answer verification required" feature)', false, 9);

  const bytesC = await docC.save({ useObjectStreams: false });
  fs.writeFileSync(path.join(outputDir, 'format_c_visual_marking.pdf'), bytesC);
  console.log('✅ Generated sample-pdfs/format_c_visual_marking.pdf');
}

generateSamplePdfs().catch(console.error);
