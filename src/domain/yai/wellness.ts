import type { WellnessCheckin, YaiState } from './models';
import { bangkokDate, isConfirmed } from './journal';

// Wellness overview, trends, personal baseline and goals for YaiPrompt.
// Rules: nothing is invented for a missing day (null, shown as a gap / "ยังไม่ได้บันทึก"); self-reported values are
// labelled as such; there is no composite score, biological age or "recovery" number; a baseline appears only
// with enough days; comparisons between two measures are described as observations, never as cause and effect.

export type MetricId = 'sleep' | 'energy' | 'mood' | 'activity' | 'symptoms';

export interface MetricDef {
  id: MetricId;
  label: string;
  unit: string;
  /** scale shown on the axis */
  max: number;
  describe: (v: number) => string;
}

const FIVE = ['', 'น้อยมาก', 'น้อย', 'ปานกลาง', 'ดี', 'ดีมาก'];
const MOODS = ['', 'ไม่ค่อยดี', 'เฉยๆ ค่อนข้างหม่น', 'ปกติ', 'ดี', 'ดีมาก'];

export const METRICS: Record<MetricId, MetricDef> = {
  sleep: { id: 'sleep', label: 'การนอน', unit: 'ชม.', max: 10, describe: (v) => `${v} ชั่วโมง` },
  energy: { id: 'energy', label: 'ความสดชื่น', unit: '/5', max: 5, describe: (v) => FIVE[v] ?? '' },
  mood: { id: 'mood', label: 'อารมณ์', unit: '/5', max: 5, describe: (v) => MOODS[v] ?? '' },
  activity: { id: 'activity', label: 'การเคลื่อนไหว', unit: 'นาที', max: 60, describe: (v) => `${v} นาที` },
  symptoms: { id: 'symptoms', label: 'อาการที่บันทึก', unit: 'รายการ', max: 4, describe: (v) => `${v} รายการ` },
};

export const addDays = (d: string, n: number) => bangkokDate(new Date(Date.parse(`${d}T12:00:00+07:00`) + n * 86_400_000));

export function checkinOn(s: YaiState, date: string): WellnessCheckin | undefined {
  return (s.checkins ?? []).find((c) => c.date === date);
}

export interface DayValue {
  date: string;
  value: number | null;
  synthetic: boolean;
}

function valueFor(s: YaiState, metric: MetricId, date: string): DayValue {
  if (metric === 'symptoms') {
    const entries = (s.journal ?? []).filter((e) => isConfirmed(e) && e.recordedLocalDate === date);
    if (entries.length === 0) return { date, value: null, synthetic: false };
    return { date, value: entries.flatMap((e) => e.segments.filter((x) => x.category === 'SYMPTOM')).length, synthetic: entries.every((e) => e.isSynthetic) };
  }
  const c = checkinOn(s, date);
  const raw = c ? { sleep: c.sleepHours, energy: c.energy, mood: c.mood, activity: c.activityMinutes }[metric] : undefined;
  return { date, value: raw ?? null, synthetic: !!c?.isSynthetic };
}

/** Values for the `days` days ending today; missing days stay null */
export function series(s: YaiState, metric: MetricId, today: string, days: number): DayValue[] {
  return Array.from({ length: days }, (_, i) => valueFor(s, metric, addDays(today, i - days + 1)));
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const round1 = (x: number) => Math.round(x * 10) / 10;

export const BASELINE_MIN_DAYS = 10;

export interface Baseline {
  /** average of the 28 days before the last 7 */
  value: number | null;
  days: number;
  /** average of the last 7 days */
  recent: number | null;
  recentDays: number;
}

/** Personal baseline: needs at least BASELINE_MIN_DAYS recorded days in the 28 days before this week */
export function baseline(s: YaiState, metric: MetricId, today: string): Baseline {
  const all = series(s, metric, today, 35);
  const before = all.slice(0, 28).flatMap((d) => (d.value === null ? [] : [d.value]));
  const recent = all.slice(28).flatMap((d) => (d.value === null ? [] : [d.value]));
  return {
    value: before.length >= BASELINE_MIN_DAYS ? round1(mean(before)) : null,
    days: before.length,
    recent: recent.length >= 3 ? round1(mean(recent)) : null,
    recentDays: recent.length,
  };
}

export interface Observation {
  text: string;
  groupA: { label: string; n: number; mean: number };
  groupB: { label: string; n: number; mean: number };
}

export const OBSERVATION_MIN_PER_GROUP = 5;

/**
 * Observation only: average energy on days after ≥7 h sleep vs < 7 h, over the last 30 days.
 * Needs at least OBSERVATION_MIN_PER_GROUP days in each group; otherwise null.
 */
export function sleepEnergyObservation(s: YaiState, today: string): Observation | null {
  const days = series(s, 'sleep', today, 30).map((d) => ({ sleep: d.value, energy: valueFor(s, 'energy', d.date).value }));
  const pairs = days.filter((d): d is { sleep: number; energy: number } => d.sleep !== null && d.energy !== null);
  const a = pairs.filter((p) => p.sleep >= 7).map((p) => p.energy);
  const b = pairs.filter((p) => p.sleep < 7).map((p) => p.energy);
  if (a.length < OBSERVATION_MIN_PER_GROUP || b.length < OBSERVATION_MIN_PER_GROUP) return null;
  const ma = round1(mean(a));
  const mb = round1(mean(b));
  const diff = ma - mb;
  const text =
    Math.abs(diff) < 0.3
      ? 'ในวันที่นอน 7 ชม.ขึ้นไป กับวันที่นอนน้อยกว่า ความสดชื่นที่คุณบันทึกใกล้เคียงกัน'
      : `ในวันที่นอน 7 ชม.ขึ้นไป คุณบันทึกความสดชื่น${diff > 0 ? 'สูงกว่า' : 'ต่ำกว่า'}วันที่นอนน้อยกว่าเล็กน้อย`;
  return { text, groupA: { label: 'นอน ≥ 7 ชม.', n: a.length, mean: ma }, groupB: { label: 'นอน < 7 ชม.', n: b.length, mean: mb } };
}

// Goals: general lifestyle habits for adults, phrased as progress, not pressure. Targets are per week.
export interface WellnessGoal {
  id: string;
  title: string;
  why: string;
  weeklyTarget: number;
  unit: string;
  /** count of days this week that meet the goal */
  progress: (s: YaiState, week: string[]) => number;
  /** can be ticked by hand on the Journey page */
  manual: boolean;
  source: string;
}

const habitDays = (s: YaiState, goalId: string, week: string[]) => new Set((s.habitLogs ?? []).filter((l) => l.goalId === goalId && week.includes(l.date)).map((l) => l.date)).size;

export const WELLNESS_GOALS: WellnessGoal[] = [
  {
    id: 'SLEEP',
    title: 'นอนให้สม่ำเสมอ',
    why: 'ผู้ใหญ่ส่วนใหญ่ควรนอนอย่างน้อย 7 ชั่วโมงต่อคืนเป็นประจำ',
    weeklyTarget: 5,
    unit: 'คืนที่นอน ≥ 7 ชม.',
    progress: (s, week) => week.filter((d) => (checkinOn(s, d)?.sleepHours ?? 0) >= 7).length,
    manual: false,
    source: 'AASM/SRS consensus statement on adult sleep duration (2015)',
  },
  {
    id: 'ACTIVE',
    title: 'ขยับร่างกายเป็นประจำ',
    why: 'กิจกรรมระดับปานกลางรวมราว 150 นาทีต่อสัปดาห์ ช่วยสุขภาพโดยรวม ทำทีละน้อยก็นับ',
    weeklyTarget: 5,
    unit: 'วันที่ขยับ ≥ 20 นาที หรือเดิน ≥ 4,000 ก้าว',
    progress: (s, week) =>
      week.filter(
        (d) =>
          (checkinOn(s, d)?.activityMinutes ?? 0) >= 20 ||
          (s.measurements ?? []).some((m) => m.type === 'STEPS' && m.date === d && m.value >= 4000) ||
          (s.journal ?? []).some((e) => isConfirmed(e) && e.recordedLocalDate === d && e.segments.some((x) => x.category === 'ACTIVITY'))
      ).length,
    manual: false,
    source: 'WHO guidelines on physical activity and sedentary behaviour (2020)',
  },
  {
    id: 'STRENGTH',
    title: 'รักษาความแข็งแรงของกล้ามเนื้อ',
    why: 'ฝึกกล้ามเนื้อสัปดาห์ละ 2 วันขึ้นไป เช่น ลุก-นั่งเก้าอี้ ยกขวดน้ำ',
    weeklyTarget: 2,
    unit: 'วันที่ฝึกกล้ามเนื้อ',
    progress: (s, week) => habitDays(s, 'STRENGTH', week),
    manual: true,
    source: 'WHO guidelines on physical activity and sedentary behaviour (2020)',
  },
  {
    id: 'RELAX',
    title: 'ผ่อนคลายและสร้างสมดุลชีวิต',
    why: 'หายใจช้าๆ สวดมนต์ นั่งสมาธิ หรือเวลาส่วนตัวสั้นๆ ที่ทำได้จริง',
    weeklyTarget: 3,
    unit: 'วันที่ได้ผ่อนคลาย',
    progress: (s, week) => habitDays(s, 'RELAX', week),
    manual: true,
    source: 'คำแนะนำทั่วไปด้านสุขภาพจิต ไม่ใช่การรักษา',
  },
];

/** Monday-to-Sunday week (Asia/Bangkok) containing `today` */
export function weekOf(today: string): string[] {
  const dow = new Date(`${today}T12:00:00+07:00`).getUTCDay();
  const monday = addDays(today, -((dow + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export interface GoalProgress {
  goal: WellnessGoal;
  done: number;
  target: number;
  /** days ticked by hand today (manual goals) */
  tickedToday: boolean;
}

export function goalProgress(s: YaiState, today: string): GoalProgress[] {
  const chosen = s.settings.goals ?? WELLNESS_GOALS.map((g) => g.id);
  const week = weekOf(today).filter((d) => d <= today);
  return WELLNESS_GOALS.filter((g) => chosen.includes(g.id)).map((goal) => ({
    goal,
    done: Math.min(goal.progress(s, week), 7),
    target: goal.weeklyTarget,
    tickedToday: (s.habitLogs ?? []).some((l) => l.goalId === goal.id && l.date === today),
  }));
}

/** Gentle wording for progress; never "failed" */
export function progressWords(done: number, target: number): string {
  if (done >= target) return 'ครบเป้าสัปดาห์นี้แล้ว';
  if (done === 0) return 'เริ่มได้ทุกวัน';
  return `อีก ${target - done} ครั้งถึงเป้า`;
}
