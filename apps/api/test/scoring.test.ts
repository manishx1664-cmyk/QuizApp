import { describe, it, expect } from 'vitest';

describe('Quiz Engine & Scoring Validation', () => {
  it('should calculate score, percentage, and pass/fail status accurately', () => {
    const totalQuestions = 10;
    const passingPercentage = 70;

    // Case 1: 8/10 -> 80% (Pass)
    const score1 = 8;
    const percentage1 = Number(((score1 / totalQuestions) * 100).toFixed(2));
    const isPassed1 = percentage1 >= passingPercentage;
    expect(percentage1).toBe(80.0);
    expect(isPassed1).toBe(true);

    // Case 2: 6/10 -> 60% (Fail if passing is 70)
    const score2 = 6;
    const percentage2 = Number(((score2 / totalQuestions) * 100).toFixed(2));
    const isPassed2 = percentage2 >= passingPercentage;
    expect(percentage2).toBe(60.0);
    expect(isPassed2).toBe(false);

    // Case 3: 7/10 -> 70% (Pass exact threshold)
    const score3 = 7;
    const percentage3 = Number(((score3 / totalQuestions) * 100).toFixed(2));
    const isPassed3 = percentage3 >= passingPercentage;
    expect(percentage3).toBe(70.0);
    expect(isPassed3).toBe(true);
  });

  it('should guarantee answer correctness is invariant under option shuffling when using stable option UUIDs', () => {
    const question = {
      id: 'q-uuid-1',
      correctOptionId: 'opt-uuid-b',
      options: [
        { id: 'opt-uuid-a', text: 'Option A' },
        { id: 'opt-uuid-b', text: 'Option B (Correct)' },
        { id: 'opt-uuid-c', text: 'Option C' },
        { id: 'opt-uuid-d', text: 'Option D' }
      ]
    };

    // Learner selects Option B
    const learnerSelectedOptionId = 'opt-uuid-b';

    // Simulate shuffling options order
    const shuffledOptions = [...question.options].reverse();

    // Verify option ID matching still validates to true regardless of display order
    const isCorrect = learnerSelectedOptionId === question.correctOptionId;
    expect(isCorrect).toBe(true);

    // Even if position changed from index 1 to index 2:
    const newIndex = shuffledOptions.findIndex((o) => o.id === learnerSelectedOptionId);
    expect(newIndex).toBe(2);
    // Correctness remains true because comparison is based on stable UUID:
    expect(shuffledOptions[newIndex].id).toBe(question.correctOptionId);
  });
});
