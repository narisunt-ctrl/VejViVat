import type { YaiState } from './models';
import { bangkokDate, isConfirmed } from './journal';

// Points for ยายพร้อม, designed for older adults:
// - reward regular, gentle habits, with a daily cap on every rule (no pressure to overdo it);
// - steps count only up to an age-appropriate amount (6,000 steps/day) so walking further earns nothing more;
// - answering a medicine reminder earns the same points whatever the answer, so nobody is nudged to report
//   "taken" when they did not take it;
// - a herb review earns bonus points whatever the rating, so reviews are not biased toward praise.
// Friends see only the weekly total, never health details.

export interface PointRule {
  id: string;
  label: string;
  per: string;
  points: number;
  dailyCap: number;
}

export const POINT_RULES: PointRule[] = [
  { id: 'journal', label: 'บันทึกสุขภาพประจำวัน', per: 'ต่อวัน', points: 10, dailyCap: 10 },
  { id: 'mood', label: 'บอกอารมณ์วันนี้', per: 'ต่อวัน', points: 3, dailyCap: 3 },
  { id: 'dose', label: 'ตอบการเตือนกินยา (ตอบแบบไหนก็ได้คะแนนเท่ากัน)', per: 'ต่อครั้ง', points: 2, dailyCap: 8 },
  { id: 'steps', label: 'เดิน 1,000 ก้าว (นับถึง 6,000 ก้าว)', per: 'ต่อ 1,000 ก้าว', points: 1, dailyCap: 6 },
  { id: 'activity', label: 'ออกกำลังกาย/ขยับร่างกาย', per: 'ต่อวัน', points: 5, dailyCap: 5 },
  { id: 'measure', label: 'บันทึกน้ำหนัก ความดัน หรือน้ำตาล', per: 'ต่อวัน', points: 3, dailyCap: 3 },
  { id: 'review', label: 'รีวิวสมุนไพรที่ใช้ (คะแนนพิเศษ ให้ดาวเท่าไรก็ได้)', per: 'ต่อรีวิว', points: 15, dailyCap: 15 },
];

export const STREAK_BONUS = { days: 7, points: 20 };

export interface DayPoints {
  date: string;
  byRule: Record<string, number>;
  total: number;
}

function dayPoints(s: YaiState, date: string): DayPoints {
  const journal = (s.journal ?? []).filter((e) => isConfirmed(e) && e.recordedLocalDate === date);
  const steps = (s.measurements ?? []).filter((m) => m.type === 'STEPS' && m.date === date).reduce((max, m) => Math.max(max, m.value), 0);
  const measured = (s.measurements ?? []).some((m) => m.type !== 'STEPS' && m.date === date && m.source === 'MANUAL');
  const doses = s.doseLogs.filter((l) => bangkokDate(l.scheduledAt) === date).length;
  const reviews = (s.herbReviews ?? []).filter((r) => r.isSelf && bangkokDate(r.at) === date).length;
  const raw: Record<string, number> = {
    journal: journal.some((e) => e.segments.some((x) => x.category !== 'MOOD')) ? 10 : 0,
    mood: journal.some((e) => e.segments.some((x) => x.category === 'MOOD')) ? 3 : 0,
    dose: doses * 2,
    steps: Math.floor(steps / 1000),
    activity: journal.some((e) => e.segments.some((x) => x.category === 'ACTIVITY')) ? 5 : 0,
    measure: measured ? 3 : 0,
    review: reviews * 15,
  };
  const byRule: Record<string, number> = {};
  let total = 0;
  for (const r of POINT_RULES) {
    byRule[r.id] = Math.min(raw[r.id] ?? 0, r.dailyCap);
    total += byRule[r.id];
  }
  return { date, byRule, total };
}

/** Consecutive days up to today with a confirmed journal entry (today not yet recorded does not break it) */
export function journalStreak(s: YaiState, today: string): number {
  const days = new Set((s.journal ?? []).filter(isConfirmed).map((e) => e.recordedLocalDate));
  const back = (d: string, n: number) => bangkokDate(new Date(Date.parse(`${d}T12:00:00+07:00`) - n * 86_400_000));
  let start = days.has(today) ? today : back(today, 1);
  let streak = 0;
  while (days.has(start)) {
    streak++;
    start = back(start, 1);
  }
  return streak;
}

export interface WeekPoints {
  days: DayPoints[];
  streakBonus: number;
  total: number;
}

/** Points for the 7 days ending today (Asia/Bangkok) */
export function weekPoints(s: YaiState, today: string): WeekPoints {
  const days = Array.from({ length: 7 }, (_, i) => dayPoints(s, bangkokDate(new Date(Date.parse(`${today}T12:00:00+07:00`) - (6 - i) * 86_400_000))));
  const streakBonus = journalStreak(s, today) >= STREAK_BONUS.days ? STREAK_BONUS.points : 0;
  return { days, streakBonus, total: days.reduce((t, d) => t + d.total, 0) + streakBonus };
}

export interface BoardRow {
  id: string;
  name: string;
  avatar: string;
  points: number;
  isMe: boolean;
  isSynthetic: boolean;
}

/** Weekly board: me plus linked friends, highest first; ties keep a stable order */
export function leaderboard(s: YaiState, today: string): BoardRow[] {
  const me: BoardRow = { id: 'me', name: s.patient.displayName, avatar: '👵', points: weekPoints(s, today).total, isMe: true, isSynthetic: false };
  return [me, ...(s.friends ?? []).map((f) => ({ id: f.id, name: f.name, avatar: f.avatar, points: f.weeklyPoints, isMe: false, isSynthetic: true }))].sort(
    (a, b) => b.points - a.points || a.name.localeCompare(b.name, 'th')
  );
}

export interface HerbReviewSummary {
  herb: string;
  count: number;
  avgRating: number;
  recommend: number;
  sideEffectShare: number;
  researchConsented: number;
}

/** Per-herb summary of user reviews (patient-reported experience, not evidence of effect) */
export function summarizeHerbReviews(reviews: YaiState['herbReviews'] = []): HerbReviewSummary[] {
  const by = new Map<string, NonNullable<YaiState['herbReviews']>>();
  for (const r of reviews ?? []) by.set(r.herbName, [...(by.get(r.herbName) ?? []), r]);
  return [...by.entries()]
    .map(([herb, rs]) => ({
      herb,
      count: rs.length,
      avgRating: rs.reduce((t, r) => t + r.rating, 0) / rs.length,
      recommend: rs.filter((r) => r.wouldRecommend).length,
      sideEffectShare: rs.filter((r) => r.sideEffects !== 'NONE').length / rs.length,
      researchConsented: rs.filter((r) => r.consentResearch).length,
    }))
    .sort((a, b) => b.count - a.count);
}
