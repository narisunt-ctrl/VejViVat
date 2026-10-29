import type { DemoPersona, Friend, HabitLog, Measurement, WellnessCheckin, YaiState } from '../../domain/yai/models';
import { bangkokDate, JournalCategory, JournalEntry } from '../../domain/yai/journal';
import { createSeedState, SEED_FRIEND_REVIEWS } from './fixtures';

// Synthetic demo users for presenting the two target groups in one demo. Everything here is fictional and labelled.
// RETIREE: คุณยายสมศรี, 68, takes warfarin, linked to CareBridge case C11 (the original seed).
// PROFESSIONAL: คุณเอ, 48, office executive, no regular medicines, sleep and stress pattern, watch steps.
// Not linked to a clinic assessment, so the element card honestly says no assessment yet.

export const PROFESSIONAL_PATIENT_ID = 'demo-patient-002';

export interface PersonaInfo {
  id: DemoPersona;
  name: string;
  age: number;
  avatar: string;
  summary: string;
}

export const PERSONAS: PersonaInfo[] = [
  { id: 'RETIREE', name: 'คุณยายสมศรี', age: 68, avatar: '👵', summary: 'วัยเกษียณ ใช้ยาละลายลิ่มเลือด สนใจสมุนไพร เดินกับเพื่อน เชื่อมกับคลินิกแล้ว' },
  { id: 'PROFESSIONAL', name: 'คุณเอ', age: 48, avatar: '🧑', summary: 'ผู้บริหารวัยทำงาน นอนน้อยช่วงงานยุ่ง ใส่นาฬิกานับก้าว ยังไม่มียาประจำ' },
];

export const personaOf = (s: YaiState): DemoPersona => s.settings.persona ?? 'RETIREE';
export const personaAvatar = (s: YaiState) => PERSONAS.find((p) => p.id === personaOf(s))!.avatar;

const daysAgoIso = (now: Date, d: number, hour = 9) => {
  const t = new Date(now.getTime() - d * 86_400_000);
  t.setUTCHours(hour - 7, 0, 0, 0);
  return t.toISOString();
};

/** Weekday nights are short, weekends longer; energy follows sleep loosely (deterministic) */
function professionalCheckins(now: Date): WellnessCheckin[] {
  const rows: WellnessCheckin[] = [];
  for (let d = 21; d >= 1; d--) {
    if (d === 9 || d === 16) continue;
    const at = daysAgoIso(now, d, 7);
    const date = bangkokDate(at);
    const dow = new Date(`${date}T12:00:00+07:00`).getUTCDay();
    const weekend = dow === 0 || dow === 6;
    const k = d % 3;
    const sleepHours = weekend ? [7.5, 8, 7][k] : [5.5, 6, 6.5][k];
    rows.push({
      id: `checkin-pro-${d}`,
      date,
      at,
      sleepHours,
      sleepQuality: (sleepHours >= 7 ? 4 : sleepHours >= 6 ? 3 : 2) as 2 | 3 | 4,
      energy: (sleepHours >= 7 ? [4, 4, 5][k] : [2, 3, 3][k]) as 2 | 3 | 4 | 5,
      mood: (weekend ? 4 : [3, 3, 2][k]) as 2 | 3 | 4,
      activityMinutes: weekend ? [45, 60, 30][k] : [10, 20, 15][k],
      source: 'SELF_REPORTED',
      isSynthetic: true,
    });
  }
  return rows;
}

function professionalSteps(now: Date): Measurement[] {
  const values = [3900, 4800, 9200, 10400, 5100, 4300, 3600, 6200, 4700, 8800, 11200, 5600, 4100, 5400];
  return values.map((value, i) => {
    const at = daysAgoIso(now, i + 1, 21);
    return { id: `steps-pro-${i + 1}`, type: 'STEPS', value, at, date: bangkokDate(at), source: 'DEVICE_DEMO', device: 'สมาร์ทวอทช์ (จำลอง)', isSynthetic: true };
  });
}

function professionalJournal(now: Date): JournalEntry[] {
  const examples: { daysAgo: number; text: string; parts: [JournalCategory, string][] }[] = [
    { daysAgo: 1, text: 'ประชุมถึงสามทุ่ม เครียดเรื่องงาน นอนดึก', parts: [['LIFE_CONTEXT', 'ประชุมถึงสามทุ่ม'], ['MOOD', 'เครียดเรื่องงาน'], ['SLEEP', 'นอนดึก']] },
    { daysAgo: 2, text: 'ท้องอืดหลังมื้อเย็น กินอาหารมันๆ', parts: [['SYMPTOM', 'ท้องอืดหลังมื้อเย็น'], ['FOOD_CONSUMED', 'กินอาหารมันๆ']] },
    { daysAgo: 4, text: 'วิ่งเบาๆ ในสวน 30 นาที รู้สึกสดชื่น', parts: [['ACTIVITY', 'วิ่งเบาๆ ในสวน 30 นาที'], ['MOOD', 'รู้สึกสดชื่น']] },
    { daysAgo: 7, text: 'ปวดคอบ่าจากนั่งทำงานนาน', parts: [['SYMPTOM', 'ปวดคอบ่าจากนั่งทำงานนาน']] },
  ];
  return examples.map((ex, i) => {
    const at = daysAgoIso(now, ex.daysAgo, 22 - i);
    return {
      id: `journal-pro-${i + 1}`,
      patientId: PROFESSIONAL_PATIENT_ID,
      originalText: ex.text,
      reviewedText: ex.text,
      inputSource: 'MANUAL_TEXT',
      capturedAt: at,
      recordedLocalDate: bangkokDate(at),
      reviewedAt: at,
      status: 'PATIENT_CONFIRMED',
      segments: ex.parts.map(([category, text], j) => ({ id: `seg-pro-${i}-${j}`, category, text, correctedByUser: false })),
      photoIds: [],
      revision: 1,
      isSynthetic: true,
    };
  });
}

const PROFESSIONAL_FRIENDS: Friend[] = [
  { id: 'friend-pro-bee', name: 'คุณบี เพื่อนร่วมงาน (ตัวอย่าง)', avatar: '🧑', weeklyPoints: 188, weeklySteps: 48200, streak: 6, isSynthetic: true },
  { id: 'friend-pro-noi', name: 'คุณน้อย (ตัวอย่าง)', avatar: '👩', weeklyPoints: 154, weeklySteps: 41500, streak: 4, isSynthetic: true },
  { id: 'friend-pro-chai', name: 'คุณชัย (ตัวอย่าง)', avatar: '🧔', weeklyPoints: 121, weeklySteps: 30900, streak: 2, isSynthetic: true },
];

function professionalHabits(now: Date): HabitLog[] {
  return [3, 5].map((d) => ({ goalId: 'RELAX', date: bangkokDate(daysAgoIso(now, d)), at: daysAgoIso(now, d), isSynthetic: true }));
}

export function createProfessionalSeedState(now: Date = new Date()): YaiState {
  const base = createSeedState();
  return {
    ...base,
    patient: { id: PROFESSIONAL_PATIENT_ID, displayName: 'คุณเอ (ข้อมูลจำลอง)', age: 48, province: 'กรุงเทพมหานคร', hn: 'DEMO-0002' },
    medicines: [],
    reminders: [],
    doseLogs: [],
    consents: [],
    appointments: [],
    journal: professionalJournal(now),
    syncedOrders: [],
    orderNotices: [],
    measurements: [
      ...professionalSteps(now),
      { id: 'meas-pro-w', type: 'WEIGHT', value: 76, at: daysAgoIso(now, 2), date: bangkokDate(daysAgoIso(now, 2)), source: 'MANUAL', isSynthetic: true },
      { id: 'meas-pro-bp', type: 'BP', value: 132, value2: 84, at: daysAgoIso(now, 2), date: bangkokDate(daysAgoIso(now, 2)), source: 'MANUAL', isSynthetic: true },
    ],
    herbReviews: structuredClone(SEED_FRIEND_REVIEWS),
    friends: structuredClone(PROFESSIONAL_FRIENDS),
    checkins: professionalCheckins(now),
    habitLogs: professionalHabits(now),
    settings: {
      ...base.settings,
      persona: 'PROFESSIONAL',
      onboarded: true,
      fontScale: 100,
      goals: ['SLEEP', 'ACTIVE', 'RELAX'],
      stepGoal: 7000,
      deviceLink: 'WATCH_DEMO',
    },
  };
}

export function createPersonaSeedState(persona: DemoPersona): YaiState {
  if (persona === 'PROFESSIONAL') return createProfessionalSeedState();
  const s = createSeedState();
  return { ...s, settings: { ...s.settings, persona: 'RETIREE' } };
}
