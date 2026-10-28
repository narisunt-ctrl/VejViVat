import { ReminderPlan, YaiState } from '../../domain/yai/models';

// Upcoming reminder occurrences in Asia/Bangkok. Occurrence keys are stable so self-reports stay idempotent.

function bangkokParts(d: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return { date: `${get('year')}-${get('month')}-${get('day')}`, time: `${get('hour')}:${get('minute')}` };
}

export interface Occurrence {
  plan: ReminderPlan;
  date: string;
  time: string;
  /** stable key "YYYY-MM-DDTHH:mm" in Bangkok time */
  key: string;
  isPast: boolean;
}

/** Today's occurrences for active plans, sorted, with past ones flagged (for "due now"/report). */
export function todaysOccurrences(state: YaiState, now: Date): Occurrence[] {
  const { date, time: nowTime } = bangkokParts(now);
  return state.reminders
    .filter((p) => p.status === 'ACTIVE')
    .flatMap((plan) => plan.schedule.map((time) => ({ plan, date, time, key: `${date}T${time}`, isPast: time <= nowTime })))
    .sort((a, b) => a.time.localeCompare(b.time));
}

export function nextOccurrences(state: YaiState, now: Date): Occurrence[] {
  return todaysOccurrences(state, now).filter((o) => !o.isPast);
}

export function bangkokNowLabel(now: Date) {
  return bangkokParts(now);
}
