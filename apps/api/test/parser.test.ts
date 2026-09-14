import { describe, it, expect } from 'vitest';
import { AnswerKeyParser } from '../src/modules/pdf-processor/AnswerKeyParser';
import { MarkedAnswerDetector } from '../src/modules/pdf-processor/MarkedAnswerDetector';
import { OptionParser } from '../src/modules/pdf-processor/OptionParser';
import { QuestionParser } from '../src/modules/pdf-processor/QuestionParser';
import { ExtractionValidator } from '../src/modules/pdf-processor/ExtractionValidator';

describe('PDF Processor & Extraction Engine', () => {
  describe('AnswerKeyParser', () => {
    it('should parse end-of-document answer keys formatted with dashes and dots', () => {
      const rawText = `
        1. What is Java?
        A. Database
        B. Programming Language

        2. Which keyword inherits a class?
        A. implements
        B. extends

        Answer Key:
        1 - B
        2 - B
        3. C
        4) D
      `;

      const result = AnswerKeyParser.parse(rawText);
      expect(result.keyMap.size).toBe(4);
      expect(result.keyMap.get(1)).toBe('B');
      expect(result.keyMap.get(2)).toBe('B');
      expect(result.keyMap.get(3)).toBe('C');
      expect(result.keyMap.get(4)).toBe('D');
    });

    it('should return empty map if no answer key header is present', () => {
      const text = 'Just regular questions with no answer key footer';
      const result = AnswerKeyParser.parse(text);
      expect(result.keyMap.size).toBe(0);
    });
  });

  describe('MarkedAnswerDetector', () => {
    it('should detect checkmarks and clean option text', () => {
      const result1 = MarkedAnswerDetector.inspectOptionText('A programming language ✓');
      expect(result1.hasMarking).toBe(true);
      expect(result1.method).toBe('marked_checkmark');
      expect(result1.cleanText).toBe('A programming language');

      const result2 = MarkedAnswerDetector.inspectOptionText('[x] An operating system');
      expect(result2.hasMarking).toBe(true);
      expect(result2.method).toBe('marked_checkmark');
      expect(result2.cleanText).toBe('An operating system');
    });

    it('should detect explicit markers like (Correct) or [Ans]', () => {
      const result = MarkedAnswerDetector.inspectOptionText('Binary Tree (Correct)');
      expect(result.hasMarking).toBe(true);
      expect(result.method).toBe('explicit_label');
      expect(result.cleanText).toBe('Binary Tree');
    });

    it('should detect circles and asterisk markings', () => {
      const result = MarkedAnswerDetector.inspectOptionText('Stack *');
      expect(result.hasMarking).toBe(true);
      expect(result.cleanText).toBe('Stack');
    });
  });

  describe('OptionParser', () => {
    it('should parse A., B., C., D. options properly', () => {
      const block = `
        A. Database
        B. Programming Language (Correct)
        C. Operating System
        D. Web Browser
      `;

      const parsed = OptionParser.parse(block);
      expect(parsed.options.length).toBe(4);
      expect(parsed.options[0].letter).toBe('A');
      expect(parsed.options[0].text).toBe('Database');
      expect(parsed.detectedAnswerLetter).toBe('B');
      expect(parsed.confidence).toBeGreaterThan(0.8);
    });

    it('should parse inline multi-options like A. Cat  B. Dog', () => {
      const block = `
        A. Dog   B. Cat
        C. Bird  D. Fish
      `;
      const parsed = OptionParser.parse(block);
      expect(parsed.options.length).toBe(4);
      expect(parsed.options.map((o) => o.letter)).toEqual(['A', 'B', 'C', 'D']);
    });
  });

  describe('QuestionParser & ExtractionValidator', () => {
    it('should extract questions and assign confidence, flagging unmarked questions as review required', () => {
      const content = `
        Question 1. What is Java?
        A. A database
        B. A programming language (Correct)
        C. An operating system
        D. A web browser
        Explanation: Java is high-level.

        Question 2. What is HTML?
        A. Programming language
        B. Markup language
        C. Database
        D. Operating System
      `;

      const rawQuestions = QuestionParser.parseQuestions(content);
      expect(rawQuestions.length).toBe(2);

      const validated = ExtractionValidator.validateAndEnrich(rawQuestions, {
        keyMap: new Map(),
        keySectionText: ''
      });

      // Question 1 had (Correct)
      expect(validated[0].detectedAnswerLetter).toBe('B');
      expect(validated[0].requiresReview).toBe(false);
      expect(validated[0].explanation).toBe('Java is high-level.');

      // Question 2 had NO answer marked -> MUST require review! Never guess!
      expect(validated[1].detectedAnswerLetter).toBeUndefined();
      expect(validated[1].requiresReview).toBe(true);
      expect(validated[1].detectionMethod).toBe('manual_required');
    });

    it('should detect duplicate questions', () => {
      const content = `
        1. What is Java?
        A. OS
        B. Language (Correct)

        2. What is Java?
        A. Database
        B. Language (Correct)
      `;

      const rawQuestions = QuestionParser.parseQuestions(content);
      const validated = ExtractionValidator.validateAndEnrich(rawQuestions, {
        keyMap: new Map(),
        keySectionText: ''
      });

      expect(validated[1].duplicateWarning).toBe(true);
    });
  });
});
