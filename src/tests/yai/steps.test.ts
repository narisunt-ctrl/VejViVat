import { describe, it, expect, beforeEach } from 'vitest';
import { DEFAULT_STEP_GOAL, stepBoard, stepGoalOf, stepSeries, stepsOn, stepWeek, stepWords } from '../../domain/yai/steps';
import { weekPoints } from '../../domain/yai/points';
import { createSeedState } from '../../data/yai/fixtures';
import { demoNow, yaiStore } from '../../services/yai/yaiStore';
import { bangkokDate } from '../../domain/yai/journal';
import type { Measurement, YaiState } from '../../domain/yai/models';

const TODAY = '2026-10-29';
const step = (date: string, value: number, at: string, source: Measurement['source'] = 'MANUAL'): Measurement => ({ id: `${date}-${at}`, type: 'STEPS', value, at, date, source, isSynthetic: false });
const blank = (): YaiState => ({ ...createSeedState(), measurements: [] });

describe('step activity', () => {
  it('uses the latest entry of a day as its total and leaves missing days empty', () => {
    const s = blank();
    s.measurements = [step(TODAY, 3000, `${TODAY}T03:00:00Z`), step(TODAY, 2500, `${TODAY}T09:00:00Z`)];
    expect(stepsOn(s, TODAY).value).toBe(2500);
    const v = stepSeries(s, TODAY, 7).map((d) => d.value);
    expect(v).toEqual([null, null, null, null, null, null, 2500]);
    expect(weekPoints(s, TODAY).days[6].byRule.steps).toBe(2);
  });

  it('counts goal days and averages only recorded days', () => {
    const s = blank();
    s.settings.stepGoal = 5000;
    s.measurements = [step('2026-10-27', 6000, '2026-10-27T10:00:00Z'), step('2026-10-28', 4000, '2026-10-28T10:00:00Z')];
    const w = stepWeek(s, TODAY);
    expect(w).toEqual({ total: 10000, recordedDays: 2, goalDays: 1, average: 5000 });
    expect(stepGoalOf(blank())).toBe(DEFAULT_STEP_GOAL);
  });

  it('words progress gently', () => {
    expect(stepWords(null, 4000)).toMatch(/ยังไม่ได้บันทึก/);
    expect(stepWords(5000, 4000)).toMatch(/ถึงเป้า/);
    expect(stepWords(1000, 4000)).not.toMatch(/ล้มเหลว|ไม่ผ่าน/);
  });

  it('ranks the walking challenge by weekly totals with friends marked as examples', () => {
    const s = createSeedState();
    s.measurements = [step(TODAY, 40000, `${TODAY}T10:00:00Z`)];
    const board = stepBoard(s, TODAY);
    expect(board[0].isMe).toBe(true);
    expect(board.filter((r) => !r.isMe).every((r) => r.isSynthetic)).toBe(true);
    for (let i = 1; i < board.length; i++) expect(board[i - 1].steps).toBeGreaterThanOrEqual(board[i].steps);
  });
});

describe('step entry in the store', () => {
  beforeEach(() => yaiStore.reset());

  it('saves a typed entry as a manual, non-synthetic step count for today', () => {
    yaiStore.addMeasurement({ type: 'STEPS', value: 4321 });
    const t = stepsOn(yaiStore.getState(), bangkokDate(demoNow()));
    expect(t).toMatchObject({ value: 4321, source: 'MANUAL', synthetic: false });
  });
});
