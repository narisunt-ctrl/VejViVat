import { describe, it, expect, beforeEach } from 'vitest';
import { baseline, BASELINE_MIN_DAYS, goalProgress, OBSERVATION_MIN_PER_GROUP, progressWords, series, sleepEnergyObservation, weekOf } from '../../domain/yai/wellness';
import { FORBIDDEN_CLAIMS, HERB_CARDS, herbOfTheDay, interactionsWithMyMedicines, searchHerbs } from '../../domain/yai/herbDiscovery';
import { createSeedState } from '../../data/yai/fixtures';
import { demoNow, yaiStore } from '../../services/yai/yaiStore';
import { bangkokDate } from '../../domain/yai/journal';
import type { WellnessCheckin, YaiState } from '../../domain/yai/models';

const TODAY = '2026-10-29';
const day = (n: number) => bangkokDate(new Date(Date.parse(`${TODAY}T12:00:00+07:00`) - n * 86_400_000));
const ci = (n: number, f: Partial<WellnessCheckin>): WellnessCheckin => ({ id: `c${n}`, date: day(n), at: `${day(n)}T02:00:00Z`, source: 'SELF_REPORTED', isSynthetic: false, ...f });
const empty = (): YaiState => ({ ...createSeedState(), checkins: [], habitLogs: [], journal: [], measurements: [] });

describe('wellness data integrity', () => {
  it('leaves missing days empty instead of filling them', () => {
    const s = empty();
    s.checkins = [ci(0, { sleepHours: 7 }), ci(2, { sleepHours: 6 })];
    const v = series(s, 'sleep', TODAY, 7).map((d) => d.value);
    expect(v).toEqual([null, null, null, null, 6, null, 7]);
    expect(series(s, 'energy', TODAY, 7).every((d) => d.value === null)).toBe(true);
  });

  it('shows a personal baseline only with enough recorded days', () => {
    const s = empty();
    s.checkins = Array.from({ length: BASELINE_MIN_DAYS - 1 }, (_, i) => ci(8 + i, { energy: 3 }));
    expect(baseline(s, 'energy', TODAY).value).toBeNull();
    s.checkins.push(ci(30, { energy: 4 }));
    const b = baseline(s, 'energy', TODAY);
    expect(b.days).toBe(BASELINE_MIN_DAYS);
    expect(b.value).toBe(3.1);
  });

  it('reports an observation only with enough days in both groups, worded as observation', () => {
    const s = empty();
    s.checkins = Array.from({ length: OBSERVATION_MIN_PER_GROUP }, (_, i) => ci(i, { sleepHours: 8, energy: 4 }));
    expect(sleepEnergyObservation(s, TODAY)).toBeNull();
    s.checkins.push(...Array.from({ length: OBSERVATION_MIN_PER_GROUP }, (_, i) => ci(10 + i, { sleepHours: 5, energy: 2 })));
    const o = sleepEnergyObservation(s, TODAY)!;
    expect(o.groupA.mean).toBe(4);
    expect(o.groupB.mean).toBe(2);
    expect(o.text).not.toMatch(/ทำให้|เพราะ|สาเหตุ/);
  });

  it('counts goal progress from check-ins and habit ticks within this week', () => {
    const s = empty();
    const week = weekOf(TODAY);
    expect(week).toHaveLength(7);
    expect(new Date(`${week[0]}T12:00:00+07:00`).getUTCDay()).toBe(1);
    s.checkins = week.filter((d) => d <= TODAY).map((d, i) => ({ ...ci(0, {}), id: `w${i}`, date: d, sleepHours: 7.5, activityMinutes: 25 }));
    s.habitLogs = [{ date: TODAY, goalId: 'STRENGTH', at: TODAY, isSynthetic: false }];
    const g = Object.fromEntries(goalProgress(s, TODAY).map((p) => [p.goal.id, p]));
    expect(g.SLEEP.done).toBe(week.filter((d) => d <= TODAY).length);
    expect(g.ACTIVE.done).toBe(week.filter((d) => d <= TODAY).length);
    expect(g.STRENGTH.done).toBe(1);
    expect(g.STRENGTH.tickedToday).toBe(true);
    expect(progressWords(0, 3)).not.toMatch(/ล้มเหลว|ไม่ผ่าน/);
  });
});

describe('check-in store', () => {
  beforeEach(() => yaiStore.reset());

  it('saves only the fields the user tapped and updates the same day', () => {
    yaiStore.saveCheckin({ energy: 4 });
    const today = bangkokDate(demoNow());
    let c = yaiStore.getState().checkins!.filter((x) => x.date === today);
    expect(c).toHaveLength(1);
    expect(c[0]).toMatchObject({ energy: 4, source: 'SELF_REPORTED', isSynthetic: false });
    expect(c[0].sleepHours).toBeUndefined();
    yaiStore.saveCheckin({ sleepHours: 7, energy: undefined });
    c = yaiStore.getState().checkins!.filter((x) => x.date === today);
    expect(c).toHaveLength(1);
    expect(c[0]).toMatchObject({ energy: 4, sleepHours: 7 });
  });

  it('seeds no check-in for today, labels seeded days as demo, and can clear them', () => {
    const s = yaiStore.getState();
    const today = bangkokDate(demoNow());
    expect(s.checkins!.some((c) => c.date === today)).toBe(false);
    expect(s.checkins!.length).toBeGreaterThan(0);
    expect(s.checkins!.every((c) => c.isSynthetic)).toBe(true);
    yaiStore.clearDemoWellness();
    expect(yaiStore.getState().checkins).toHaveLength(0);
  });

  it('toggles a habit tick for today', () => {
    yaiStore.toggleHabit('RELAX');
    const today = bangkokDate(demoNow());
    expect(yaiStore.getState().habitLogs!.some((l) => l.goalId === 'RELAX' && l.date === today)).toBe(true);
    yaiStore.toggleHabit('RELAX');
    expect(yaiStore.getState().habitLogs!.some((l) => l.goalId === 'RELAX' && l.date === today)).toBe(false);
  });
});

describe('Thai herbal discovery', () => {
  it('builds a card for every formulary entry with its source reference', () => {
    expect(HERB_CARDS.length).toBeGreaterThanOrEqual(20);
    for (const c of HERB_CARDS) {
      expect(c.thaiName).toBeTruthy();
      expect(c.scientificName).toBeTruthy();
      expect(c.reviewStatus).toBeTruthy();
    }
  });

  it('never carries a cure claim in what it shows', () => {
    for (const c of HERB_CARDS) {
      const text = [...c.listedIndications, ...c.contraindications, ...c.precautions.map((p) => p.text), ...c.interactions.map((i) => i.advice)].join(' ');
      expect(text, c.thaiName).not.toMatch(FORBIDDEN_CLAIMS);
    }
  });

  it('links interactions from the HDI table and finds herbs by any name', () => {
    const turmeric = HERB_CARDS.find((c) => c.thaiName.includes('ขมิ้นชัน'))!;
    expect(turmeric.interactions.some((i) => /warfarin/i.test(i.drug) && i.severity === 'HIGH')).toBe(true);
    expect(searchHerbs('curcuma').some((c) => c.id === turmeric.id)).toBe(true);
    expect(searchHerbs('ginger').length).toBeGreaterThan(0);
    expect(searchHerbs('ไม่มีสมุนไพรนี้')).toHaveLength(0);
    expect(herbOfTheDay(TODAY)).toBe(herbOfTheDay(TODAY));
  });

  it('matches interactions against the user medicine list without guessing unnamed medicines', () => {
    const turmeric = HERB_CARDS.find((c) => c.thaiName.includes('ขมิ้นชัน'))!;
    const meds = createSeedState().medicines;
    const hits = interactionsWithMyMedicines(turmeric, meds);
    expect(hits.some((h) => /warfarin/i.test(h.medicine))).toBe(true);
    expect(interactionsWithMyMedicines(turmeric, [{ displayName: { value: null }, ingredients: [] }])).toHaveLength(0);
  });
});
