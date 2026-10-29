import type { Measurement, YaiState } from './models';
import { addDays } from './wellness';

// Step activity for YaiPrompt. Steps come from the user's own entry (read off a pedometer or phone) or from a
// linked device; each day's total is its latest entry. Missing days stay empty. The goal is the user's choice,
// suggested options stay modest for older adults, and the walking challenge with friends compares weekly totals
// only, never health details.

export const STEP_GOAL_OPTIONS = [3000, 4000, 5000, 6000, 7000, 8000] as const;
/** matches the "ขยับร่างกายเป็นประจำ" goal threshold */
export const DEFAULT_STEP_GOAL = 4000;
/** plausible range for one day's typed entry; catches typing slips only */
export const STEP_ENTRY_MAX = 60000;

export interface DaySteps {
  date: string;
  value: number | null;
  source: Measurement['source'] | null;
  device?: string;
  at?: string;
  synthetic: boolean;
}

export function stepsOn(s: YaiState, date: string): DaySteps {
  const m = (s.measurements ?? []).filter((x) => x.type === 'STEPS' && x.date === date).sort((a, b) => b.at.localeCompare(a.at))[0];
  return m ? { date, value: m.value, source: m.source, device: m.device, at: m.at, synthetic: m.isSynthetic } : { date, value: null, source: null, synthetic: false };
}

/** The `days` days ending today, oldest first */
export function stepSeries(s: YaiState, today: string, days: number): DaySteps[] {
  return Array.from({ length: days }, (_, i) => stepsOn(s, addDays(today, i - days + 1)));
}

export const stepGoalOf = (s: YaiState) => s.settings.stepGoal ?? DEFAULT_STEP_GOAL;

export interface StepWeek {
  total: number;
  recordedDays: number;
  goalDays: number;
  average: number | null;
}

export function stepWeek(s: YaiState, today: string): StepWeek {
  const goal = stepGoalOf(s);
  const rec = stepSeries(s, today, 7).filter((d): d is DaySteps & { value: number } => d.value !== null);
  const total = rec.reduce((t, d) => t + d.value, 0);
  return { total, recordedDays: rec.length, goalDays: rec.filter((d) => d.value >= goal).length, average: rec.length ? Math.round(total / rec.length) : null };
}

export interface StepBoardRow {
  id: string;
  name: string;
  avatar: string;
  steps: number;
  isMe: boolean;
  isSynthetic: boolean;
}

/** Weekly walking challenge: my 7-day total next to friends' shared weekly totals, highest first */
export function stepBoard(s: YaiState, today: string): StepBoardRow[] {
  const me: StepBoardRow = { id: 'me', name: s.patient.displayName, avatar: s.settings.persona === 'PROFESSIONAL' ? '🧑' : '👵', steps: stepWeek(s, today).total, isMe: true, isSynthetic: false };
  const friends = (s.friends ?? []).filter((f) => typeof f.weeklySteps === 'number').map((f) => ({ id: f.id, name: f.name, avatar: f.avatar, steps: f.weeklySteps!, isMe: false, isSynthetic: true }));
  return [me, ...friends].sort((a, b) => b.steps - a.steps || a.name.localeCompare(b.name, 'th'));
}

/** Gentle wording; never "failed" */
export function stepWords(value: number | null, goal: number): string {
  if (value === null) return 'วันนี้ยังไม่ได้บันทึกก้าว';
  if (value >= goal) return 'ถึงเป้าวันนี้แล้ว';
  return `อีก ${(goal - value).toLocaleString('th-TH')} ก้าวถึงเป้า เดินเท่าที่ไหว`;
}
