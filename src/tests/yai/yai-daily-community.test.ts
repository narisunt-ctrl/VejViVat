import { describe, it, expect, beforeEach } from 'vitest';
import { greetingFor, holyDayOn, occasionOn, weekdayOf } from '../../domain/yai/dailyGreeting';
import { journalStreak, leaderboard, POINT_RULES, summarizeHerbReviews, weekPoints } from '../../domain/yai/points';
import { adForDate, eligibleAds, SPONSORED_PRODUCTS } from '../../data/yai/adsCatalog';
import { createSeedState, INVITABLE_FRIENDS } from '../../data/yai/fixtures';
import { yaiStore } from '../../services/yai/yaiStore';
import type { JournalEntry } from '../../domain/yai/journal';
import type { YaiState } from '../../domain/yai/models';

const TODAY = '2026-10-29';

function entry(date: string, category: 'SYMPTOM' | 'MOOD' | 'ACTIVITY', id = `${date}-${category}`): JournalEntry {
  return {
    id,
    patientId: 'p',
    originalText: 'x',
    reviewedText: 'x',
    inputSource: 'MANUAL_TEXT',
    capturedAt: `${date}T03:00:00Z`,
    recordedLocalDate: date,
    reviewedAt: `${date}T03:00:00Z`,
    status: 'PATIENT_CONFIRMED',
    segments: [{ id: `${id}-s`, category, text: 'x', correctedByUser: false }],
    photoIds: [],
    revision: 1,
    isSynthetic: false,
  };
}

function blank(): YaiState {
  return { ...createSeedState(), journal: [], measurements: [], herbReviews: [], doseLogs: [], friends: [] };
}

describe('daily greeting', () => {
  it('uses the Thai colour of the day and a weekday title', () => {
    expect(weekdayOf('2026-11-02')).toBe(1);
    const g = greetingFor('2026-11-02');
    expect(g.title).toBe('สวัสดีวันจันทร์');
    expect(g.quote.length).toBeGreaterThan(0);
  });

  it('marks วันพระ in October 2026 with the Buddha image and an approximate note', () => {
    const holy = ['2026-10-04', '2026-10-11', '2026-10-19', '2026-10-26'];
    for (const d of holy) {
      const o = holyDayOn(d);
      expect(o, d).not.toBeNull();
      expect(o!.art).toBe('BUDDHA');
      expect(o!.approximate).toBe(true);
      expect(greetingFor(d).art).toBe('BUDDHA');
    }
    expect(holyDayOn('2026-10-15')).toBeNull();
  });

  it('knows fixed important days', () => {
    expect(occasionOn('2026-04-13')?.id).toBe('songkran');
    expect(occasionOn('2026-08-12')).not.toBeNull();
    expect(occasionOn('2026-12-05')).not.toBeNull();
  });

  it('gives a new quote on request and never repeats a skipped one', () => {
    const a = greetingFor('2026-11-02', 0);
    const b = greetingFor('2026-11-02', 1);
    expect(b.quote).not.toBe(a.quote);
    for (let seed = 0; seed < 10; seed++) expect(greetingFor('2026-11-02', seed, [a.quote]).quote).not.toBe(a.quote);
  });
});

describe('points for older adults', () => {
  it('caps steps at 6 points a day however far she walks', () => {
    const s = blank();
    s.measurements = [{ id: 'm', type: 'STEPS', value: 15000, at: `${TODAY}T05:00:00Z`, date: TODAY, source: 'DEVICE_DEMO', isSynthetic: true }];
    expect(weekPoints(s, TODAY).days[6].byRule.steps).toBe(6);
  });

  it('gives the same points whatever the medicine answer, capped per day', () => {
    const taken = blank();
    const missed = blank();
    const log = (i: number, response: YaiState['doseLogs'][number]['response']) => ({ id: `d${i}`, reminderPlanId: 'p', scheduledAt: `${TODAY}T0${i}:00:00+07:00`, reportedAt: `${TODAY}T0${i}:05:00+07:00`, response });
    taken.doseLogs = [log(1, 'TAKEN_REPORTED')];
    missed.doseLogs = [log(1, 'NOT_YET_REPORTED')];
    expect(weekPoints(taken, TODAY).days[6].byRule.dose).toBe(weekPoints(missed, TODAY).days[6].byRule.dose);
    taken.doseLogs = [1, 2, 3, 4, 5, 6].map((i) => log(i, 'TAKEN_REPORTED'));
    expect(weekPoints(taken, TODAY).days[6].byRule.dose).toBe(POINT_RULES.find((r) => r.id === 'dose')!.dailyCap);
  });

  it('scores journal, mood and activity once per day', () => {
    const s = blank();
    s.journal = [entry(TODAY, 'SYMPTOM', 'a'), entry(TODAY, 'SYMPTOM', 'b'), entry(TODAY, 'MOOD'), entry(TODAY, 'ACTIVITY')];
    const d = weekPoints(s, TODAY).days[6];
    expect(d.byRule.journal).toBe(10);
    expect(d.byRule.mood).toBe(3);
    expect(d.byRule.activity).toBe(5);
  });

  it('gives a review bonus whatever the rating', () => {
    const s = blank();
    const base = { author: 'me', isSelf: true, herbName: 'ขิง', sideEffects: 'NONE' as const, sideEffectNote: '', weeksUsed: 2, wouldRecommend: false, note: '', at: `${TODAY}T05:00:00Z`, consentResearch: false, isSynthetic: false };
    s.herbReviews = [{ ...base, id: 'r1', rating: 1 }];
    const low = weekPoints(s, TODAY).days[6].byRule.review;
    s.herbReviews = [{ ...base, id: 'r1', rating: 5 }];
    expect(weekPoints(s, TODAY).days[6].byRule.review).toBe(low);
    expect(low).toBe(15);
  });

  it('counts a streak without breaking on a not-yet-recorded today, and adds the 7-day bonus', () => {
    const s = blank();
    const days = ['2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25', '2026-10-26', '2026-10-27', '2026-10-28'];
    s.journal = days.map((d) => entry(d, 'SYMPTOM'));
    expect(journalStreak(s, TODAY)).toBe(7);
    expect(weekPoints(s, TODAY).streakBonus).toBe(20);
    s.journal = s.journal.filter((e) => e.recordedLocalDate !== '2026-10-25');
    expect(journalStreak(s, TODAY)).toBe(3);
  });

  it('ranks me among friends, highest first', () => {
    const s = createSeedState();
    const board = leaderboard(s, TODAY);
    expect(board.filter((r) => r.isMe)).toHaveLength(1);
    for (let i = 1; i < board.length; i++) expect(board[i - 1].points).toBeGreaterThanOrEqual(board[i].points);
    expect(board.filter((r) => !r.isMe).every((r) => r.isSynthetic)).toBe(true);
  });
});

describe('friends, devices and reviews in the store', () => {
  beforeEach(() => yaiStore.reset());

  it('adds a friend by code once', () => {
    expect(yaiStore.addFriendByCode('yai-1234', INVITABLE_FRIENDS).ok).toBe(true);
    expect(yaiStore.addFriendByCode('YAI-1234', INVITABLE_FRIENDS).ok).toBe(false);
    expect(yaiStore.addFriendByCode('NOPE', INVITABLE_FRIENDS).ok).toBe(false);
  });

  it('labels demo device steps and removes them on disconnect', () => {
    yaiStore.connectDemoDevice('WATCH_DEMO');
    const steps = (yaiStore.getState().measurements ?? []).filter((m) => m.type === 'STEPS');
    expect(steps).toHaveLength(7);
    expect(steps.every((m) => m.source === 'DEVICE_DEMO' && m.isSynthetic)).toBe(true);
    yaiStore.disconnectDevice();
    expect((yaiStore.getState().measurements ?? []).some((m) => m.source === 'DEVICE_DEMO')).toBe(false);
  });

  it('summarises reviews per herb with research consent counted separately', () => {
    yaiStore.addHerbReview({ herbName: 'ขิง', rating: 4, sideEffects: 'MILD', sideEffectNote: 'แสบท้อง', weeksUsed: 3, wouldRecommend: true, note: '', consentResearch: true });
    const ginger = summarizeHerbReviews(yaiStore.getState().herbReviews).find((x) => x.herb === 'ขิง')!;
    expect(ginger.count).toBeGreaterThanOrEqual(2);
    expect(ginger.researchConsented).toBeGreaterThanOrEqual(1);
    expect(ginger.sideEffectShare).toBeGreaterThan(0);
  });
});

describe('certified ads', () => {
  it('shows only registered, ad-licensed, GMP products without cure claims', () => {
    const ok = eligibleAds(SPONSORED_PRODUCTS);
    expect(ok.length).toBeGreaterThan(0);
    expect(ok.every((p) => p.fdaReg && p.adLicense && p.gmp)).toBe(true);
    expect(ok.some((p) => p.id === 'ad-no-licence-demo')).toBe(false);
  });

  it('respects hidden ads and rotates by date only', () => {
    const ok = eligibleAds(SPONSORED_PRODUCTS, ['ad-ginger-demo']);
    expect(ok.some((p) => p.id === 'ad-ginger-demo')).toBe(false);
    expect(adForDate(eligibleAds(SPONSORED_PRODUCTS), TODAY)).toEqual(adForDate(eligibleAds(SPONSORED_PRODUCTS), TODAY));
    expect(adForDate([], TODAY)).toBeNull();
  });
});
