import { describe, it, expect, beforeEach } from 'vitest';
import { herbShortName, makeQuiz, QUIZ_HERBS, roundWords } from '../../domain/yai/herbQuiz';
import { weekPoints } from '../../domain/yai/points';
import type { YaiState } from '../../domain/yai/models';
import { createSeedState } from '../../data/yai/fixtures';
import { demoNow, yaiStore } from '../../services/yai/yaiStore';
import { bangkokDate } from '../../domain/yai/journal';

describe('herb quiz', () => {
  it('uses one card per plant from the formulary', () => {
    expect(QUIZ_HERBS.length).toBeGreaterThanOrEqual(8);
    const sci = QUIZ_HERBS.map((c) => c.scientificName);
    expect(new Set(sci).size).toBe(sci.length);
    expect(QUIZ_HERBS.every((c) => c.taste && c.listedIndications.length)).toBe(true);
  });

  it('is the same for the same date and round, and changes with the round', () => {
    const a = makeQuiz('2026-10-30', 0, 'EASY').map((q) => q.answer.id);
    expect(makeQuiz('2026-10-30', 0, 'EASY').map((q) => q.answer.id)).toEqual(a);
    expect(makeQuiz('2026-10-30', 1, 'EASY').map((q) => q.answer.id)).not.toEqual(a);
  });

  it('gives unique options with exactly one right answer', () => {
    for (const [level, n] of [['EASY', 3], ['HARD', 4]] as const) {
      for (let round = 0; round < 10; round++) {
        const qs = makeQuiz('2026-10-30', round, level);
        expect(qs).toHaveLength(5);
        expect(new Set(qs.map((q) => q.answer.id)).size).toBe(5);
        for (const q of qs) {
          expect(q.options).toHaveLength(n);
          expect(new Set(q.options.map(herbShortName)).size).toBe(n);
          expect(q.options.filter((o) => o.scientificName === q.answer.scientificName)).toHaveLength(1);
          // the clue never names the answer
          expect(q.clue).not.toContain(herbShortName(q.answer));
        }
      }
    }
  });

  it('words clues as listed information without cure or prevention claims', () => {
    const text = [0, 1, 2].flatMap((r) => [...makeQuiz('2026-10-30', r, 'EASY'), ...makeQuiz('2026-10-30', r, 'HARD')]).map((q) => q.clue + q.explain).join(' ');
    expect(text).not.toMatch(/รักษาหาย|ป้องกันสมองเสื่อม|ปลอดภัย 100|ปลอดภัยแน่นอน/);
    expect(makeQuiz('2026-10-30', 0, 'EASY').every((q) => q.clue.includes('ตามบัญชียาหลัก'))).toBe(true);
    expect(roundWords(1, 5)).not.toMatch(/ตก|แพ้/);
  });
});

const todayPoints = (s: YaiState, today: string) => weekPoints(s, today).days.find((d) => d.date === today)!;

describe('quiz record and points', () => {
  beforeEach(() => yaiStore.reset());

  it('records the round with an audit row and gives 3 points once a day', () => {
    const today = bangkokDate(demoNow(yaiStore.getState()));
    const before = todayPoints(yaiStore.getState(), today).total;
    yaiStore.saveQuizResult({ level: 'EASY', correct: 2, total: 5 });
    const s = yaiStore.getState();
    expect(s.quizResults?.[0]).toMatchObject({ level: 'EASY', correct: 2, total: 5, date: today });
    expect(s.audit[0].action).toBe('QUIZ_COMPLETED');
    const after = todayPoints(s, today).byRule.quiz + todayPoints(s, today).total - todayPoints(s, today).byRule.quiz;
    expect(after - before).toBe(3);
    yaiStore.saveQuizResult({ level: 'HARD', correct: 5, total: 5 });
    expect(todayPoints(yaiStore.getState(), today).total).toBe(after);
  });

  it('gives no quiz points on a day without a finished round', () => {
    expect(createSeedState().quizResults ?? []).toHaveLength(0);
  });
});
