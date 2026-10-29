import { Clinic, EvidenceField, Friend, HabitLog, HerbReview, Measurement, MedicationPassport, WellnessCheckin, YaiState } from '../../domain/yai/models';
import { bangkokDate, JournalCategory, JournalEntry } from '../../domain/yai/journal';

// All people, clinics and medicine records here are fictional demo data (ข้อมูลจำลอง).

const T0 = '2026-10-20T09:00:00+07:00';

export function field<T = string>(value: NoInfer<T> | null, origin: EvidenceField<T>["origin"], extra: Partial<EvidenceField<T>> = {}): EvidenceField<T> {
  return {
    value,
    origin,
    capturedAt: T0,
    verification: origin === 'PHOTO_LABEL' ? 'UNVERIFIED' : origin === 'CAREGIVER_VOICE' ? 'CAREGIVER_REPORTED' : 'PATIENT_REPORTED',
    ...extra,
  };
}

export const DEMO_PATIENT_ID = 'demo-patient-001';

export const SEED_MEDICINES: MedicationPassport[] = [
  {
    id: 'med-warfarin',
    patientId: DEMO_PATIENT_ID,
    version: 1,
    kind: 'CONVENTIONAL',
    form: field('TABLET', 'PHOTO_LABEL', { isSynthetic: true, extractionConfidence: 0.91 }),
    displayName: field('Warfarin (ยาตัวอย่าง)', 'PHOTO_LABEL', { isSynthetic: true, extractionConfidence: 0.88, rawText: 'WARFARIN 3 mg' }),
    ingredients: [field('warfarin sodium', 'PHOTO_LABEL', { isSynthetic: true, extractionConfidence: 0.84 })],
    labelStrength: field('3 mg', 'PHOTO_LABEL', { isSynthetic: true, extractionConfidence: 0.8 }),
    labelDirections: field('วันละ 1 ครั้ง ก่อนนอน', 'PHOTO_LABEL', { isSynthetic: true, extractionConfidence: 0.72 }),
    useReports: [{ origin: 'PATIENT_VOICE', value: 'วันละ 1 ครั้ง ก่อนนอน', reportedAt: T0 }],
    registrationNumber: field(null, 'PHOTO_LABEL'),
    photoIds: [],
    status: 'PATIENT_CONFIRMED',
    pendingIdentification: false,
    unresolvedQuestions: [],
    createdAt: T0,
    updatedAt: T0,
  },
  {
    id: 'med-turmeric',
    patientId: DEMO_PATIENT_ID,
    version: 1,
    kind: 'HERBAL_FORMULA',
    form: field('CAPSULE', 'PHOTO_LABEL', { isSynthetic: true, extractionConfidence: 0.86 }),
    displayName: field('ขมิ้นชันแคปซูล (ตัวอย่าง)', 'PHOTO_LABEL', { isSynthetic: true, extractionConfidence: 0.82 }),
    ingredients: [field('ขมิ้นชัน (Curcuma longa) เหง้า', 'PHOTO_LABEL', { isSynthetic: true, extractionConfidence: 0.7 })],
    labelStrength: field('500 mg / แคปซูล', 'PHOTO_LABEL', { isSynthetic: true, extractionConfidence: 0.77 }),
    labelDirections: field('ครั้งละ 2 แคปซูล วันละ 3 ครั้ง หลังอาหาร', 'PHOTO_LABEL', { isSynthetic: true, extractionConfidence: 0.65 }),
    useReports: [
      { origin: 'PATIENT_VOICE', value: 'กินวันละ 2 ครั้ง ครั้งละ 1 เม็ด', reportedAt: T0 },
      { origin: 'CAREGIVER_VOICE', value: 'เห็นกินบ้างไม่กินบ้าง', reportedAt: T0 },
    ],
    registrationNumber: field(null, 'PHOTO_LABEL'),
    manufacturer: field('บริษัทสมุนไพรตัวอย่าง จำกัด (สมมุติ)', 'PHOTO_LABEL', { isSynthetic: true, extractionConfidence: 0.6 }),
    photoIds: [],
    status: 'REQUIRES_CLINICIAN_REVIEW',
    pendingIdentification: false,
    unresolvedQuestions: ['ข้อมูลวิธีใช้จากฉลาก คุณยาย และหลานไม่ตรงกัน'],
    createdAt: T0,
    updatedAt: T0,
  },
  {
    id: 'med-decoction',
    patientId: DEMO_PATIENT_ID,
    version: 1,
    kind: 'UNKNOWN',
    form: field('DECOCTION', 'PATIENT_VOICE'),
    displayName: field(null, 'PATIENT_VOICE'),
    ingredients: [],
    labelStrength: field(null, 'PATIENT_VOICE'),
    labelDirections: field(null, 'PATIENT_VOICE'),
    useReports: [{ origin: 'PATIENT_VOICE', value: 'ยาต้มสมุนไพรที่ญาติให้มา ไม่มีฉลาก ดื่มตอนเช้า', reportedAt: T0 }],
    registrationNumber: field(null, 'PATIENT_VOICE'),
    photoIds: [],
    status: 'INSUFFICIENT_INFORMATION',
    pendingIdentification: true,
    unresolvedQuestions: ['ยังไม่ทราบว่าเป็นสมุนไพรอะไร ต้องให้เภสัชกรหรือแพทย์แผนไทยช่วยระบุ'],
    createdAt: T0,
    updatedAt: T0,
  },
];

export const DEMO_CLINICS: Clinic[] = [
  {
    id: 'clinic-baitoei',
    name: 'คลินิกแผนไทยใบเตย (สมมุติ)',
    province: 'เชียงใหม่',
    district: 'เมือง',
    services: ['TTM', 'MASSAGE'],
    accessibility: ['WHEELCHAIR', 'CAREGIVER_FRIENDLY'],
    verification: 'DEMO_LISTING',
    description: 'ตัวอย่างคลินิกการแพทย์แผนไทยสำหรับสาธิตการขอนัด',
    kind: 'CLINIC',
    hasTtmDoctor: true,
    lat: 18.8,
    lng: 98.99,
    hours: 'จ.–ศ. 08:30–16:30',
  },
  {
    id: 'clinic-rakbaan',
    name: 'ร้านยารักบ้าน (สมมุติ)',
    province: 'เชียงใหม่',
    district: 'สันทราย',
    services: ['PHARMACIST'],
    accessibility: ['PARKING'],
    verification: 'DEMO_LISTING',
    description: 'ตัวอย่างร้านยาที่มีเภสัชกรช่วยทบทวนรายการยา',
    kind: 'CLINIC',
    hasTtmDoctor: false,
    lat: 18.86,
    lng: 99.05,
    hours: 'ทุกวัน 08:00–20:00',
  },
  {
    id: 'clinic-saitarn',
    name: 'คลินิกผู้สูงวัยสายธาร (สมมุติ)',
    province: 'กรุงเทพมหานคร',
    district: 'บางกอกน้อย',
    services: ['GERIATRIC', 'PHARMACIST'],
    accessibility: ['WHEELCHAIR', 'CAREGIVER_FRIENDLY', 'PARKING'],
    verification: 'DEMO_LISTING',
    description: 'ตัวอย่างคลินิกดูแลผู้สูงอายุสำหรับสาธิต',
    kind: 'CLINIC',
    hasTtmDoctor: false,
    lat: 13.77,
    lng: 100.48,
    hours: 'จ.–ส. 09:00–17:00',
  },
  {
    id: 'clinic-maifai',
    name: 'ศูนย์แผนไทยไม้ไผ่ (สมมุติ)',
    province: 'ขอนแก่น',
    district: 'เมือง',
    services: ['TTM'],
    accessibility: ['CAREGIVER_FRIENDLY'],
    verification: 'DEMO_LISTING',
    description: 'ตัวอย่างศูนย์การแพทย์แผนไทยสำหรับสาธิต',
    kind: 'CLINIC',
    hasTtmDoctor: true,
    lat: 16.43,
    lng: 102.83,
    hours: 'จ.–ศ. 08:30–16:30',
  },
  {
    id: 'clinic-tonkhao',
    name: 'คลินิกต้นข้าว (สมมุติ)',
    province: 'กรุงเทพมหานคร',
    district: 'จตุจักร',
    services: ['TTM', 'GERIATRIC'],
    accessibility: ['WHEELCHAIR'],
    verification: 'DEMO_LISTING',
    description: 'ตัวอย่างคลินิกแผนไทยร่วมกับแพทย์ผู้สูงอายุสำหรับสาธิต',
    kind: 'CLINIC',
    hasTtmDoctor: true,
    lat: 13.82,
    lng: 100.55,
    hours: 'อ.–อา. 10:00–19:00',
  },
  // hospitals with a Thai traditional medicine service and more clinics; all fictional (สมมุติ)
  {
    id: 'hosp-doisuthep',
    name: 'โรงพยาบาลดอยสุเทพ (สมมุติ)',
    province: 'เชียงใหม่',
    district: 'เมือง',
    services: ['TTM', 'PHARMACIST', 'GERIATRIC'],
    accessibility: ['WHEELCHAIR', 'CAREGIVER_FRIENDLY', 'PARKING'],
    verification: 'DEMO_LISTING',
    description: 'ตัวอย่างโรงพยาบาลที่มีคลินิกแพทย์แผนไทยและเภสัชกร',
    kind: 'HOSPITAL',
    hasTtmDoctor: true,
    lat: 18.78,
    lng: 98.96,
    hours: 'คลินิกแผนไทย จ.–ศ. 08:00–16:00',
  },
  {
    id: 'hosp-sansai',
    name: 'โรงพยาบาลสันทรายร่มเย็น (สมมุติ)',
    province: 'เชียงใหม่',
    district: 'สันทราย',
    services: ['TTM', 'PHARMACIST', 'MASSAGE'],
    accessibility: ['WHEELCHAIR', 'PARKING'],
    verification: 'DEMO_LISTING',
    description: 'ตัวอย่างโรงพยาบาลชุมชนที่มีแพทย์แผนไทยประจำ',
    kind: 'HOSPITAL',
    hasTtmDoctor: true,
    lat: 18.84,
    lng: 99.03,
    hours: 'จ.–ศ. 08:30–16:30',
  },
  {
    id: 'hosp-hangdong',
    name: 'โรงพยาบาลหางดงสายใจ (สมมุติ)',
    province: 'เชียงใหม่',
    district: 'หางดง',
    services: ['TTM', 'GERIATRIC'],
    accessibility: ['WHEELCHAIR', 'CAREGIVER_FRIENDLY'],
    verification: 'DEMO_LISTING',
    description: 'ตัวอย่างโรงพยาบาลชุมชน มีคลินิกผู้สูงอายุและแพทย์แผนไทย',
    kind: 'HOSPITAL',
    hasTtmDoctor: true,
    lat: 18.69,
    lng: 98.93,
    hours: 'จ.–ศ. 08:00–16:00',
  },
  {
    id: 'clinic-maerim',
    name: 'คลินิกแผนไทยบ้านแม่ริม (สมมุติ)',
    province: 'เชียงใหม่',
    district: 'แม่ริม',
    services: ['TTM', 'MASSAGE'],
    accessibility: ['PARKING'],
    verification: 'DEMO_LISTING',
    description: 'ตัวอย่างคลินิกการแพทย์แผนไทยเอกชน',
    kind: 'CLINIC',
    hasTtmDoctor: true,
    lat: 18.92,
    lng: 98.95,
    hours: 'ทุกวัน 09:00–18:00',
  },
  {
    id: 'hosp-chomthong',
    name: 'โรงพยาบาลจอมทองเมตตา (สมมุติ)',
    province: 'เชียงใหม่',
    district: 'จอมทอง',
    services: ['TTM', 'PHARMACIST'],
    accessibility: ['WHEELCHAIR', 'PARKING'],
    verification: 'DEMO_LISTING',
    description: 'ตัวอย่างโรงพยาบาลชุมชนนอกเมือง',
    kind: 'HOSPITAL',
    hasTtmDoctor: true,
    lat: 18.42,
    lng: 98.67,
    hours: 'จ.–ศ. 08:30–16:30',
  },
  {
    id: 'hosp-lamphun',
    name: 'โรงพยาบาลหริภุญชัยแผนไทย (สมมุติ)',
    province: 'ลำพูน',
    district: 'เมือง',
    services: ['TTM', 'PHARMACIST', 'MASSAGE'],
    accessibility: ['WHEELCHAIR', 'CAREGIVER_FRIENDLY', 'PARKING'],
    verification: 'DEMO_LISTING',
    description: 'ตัวอย่างโรงพยาบาลการแพทย์แผนไทยระดับจังหวัด',
    kind: 'HOSPITAL',
    hasTtmDoctor: true,
    lat: 18.58,
    lng: 99.0,
    hours: 'จ.–ศ. 08:00–16:00',
  },
  {
    id: 'hosp-korat',
    name: 'โรงพยาบาลโคราชสุขใจ (สมมุติ)',
    province: 'นครราชสีมา',
    district: 'เมือง',
    services: ['TTM', 'PHARMACIST', 'GERIATRIC'],
    accessibility: ['WHEELCHAIR', 'PARKING'],
    verification: 'DEMO_LISTING',
    description: 'ตัวอย่างโรงพยาบาลที่มีคลินิกข้อเข่าร่วมกับแพทย์แผนไทย',
    kind: 'HOSPITAL',
    hasTtmDoctor: true,
    lat: 14.98,
    lng: 102.11,
    hours: 'จ.–ศ. 08:00–16:00',
  },
  {
    id: 'clinic-pakchong',
    name: 'คลินิกแผนไทยปากช่องพฤกษา (สมมุติ)',
    province: 'นครราชสีมา',
    district: 'ปากช่อง',
    services: ['TTM', 'MASSAGE'],
    accessibility: ['CAREGIVER_FRIENDLY'],
    verification: 'DEMO_LISTING',
    description: 'ตัวอย่างคลินิกการแพทย์แผนไทย',
    kind: 'CLINIC',
    hasTtmDoctor: true,
    lat: 14.71,
    lng: 101.41,
    hours: 'อ.–อา. 09:00–17:00',
  },
  {
    id: 'hosp-khonkaen',
    name: 'โรงพยาบาลแก่นนครแผนไทย (สมมุติ)',
    province: 'ขอนแก่น',
    district: 'เมือง',
    services: ['TTM', 'PHARMACIST'],
    accessibility: ['WHEELCHAIR', 'PARKING'],
    verification: 'DEMO_LISTING',
    description: 'ตัวอย่างโรงพยาบาลที่มีแผนกการแพทย์แผนไทย',
    kind: 'HOSPITAL',
    hasTtmDoctor: true,
    lat: 16.45,
    lng: 102.85,
    hours: 'จ.–ศ. 08:30–16:30',
  },
  {
    id: 'hosp-nonthaburi',
    name: 'โรงพยาบาลริมน้ำนนท์ (สมมุติ)',
    province: 'นนทบุรี',
    district: 'เมือง',
    services: ['TTM', 'PHARMACIST', 'GERIATRIC'],
    accessibility: ['WHEELCHAIR', 'CAREGIVER_FRIENDLY', 'PARKING'],
    verification: 'DEMO_LISTING',
    description: 'ตัวอย่างโรงพยาบาลที่มีคลินิกแพทย์แผนไทยและแพทย์ผู้สูงอายุ',
    kind: 'HOSPITAL',
    hasTtmDoctor: true,
    lat: 13.86,
    lng: 100.52,
    hours: 'จ.–ศ. 08:00–16:00',
  },
  {
    id: 'hosp-pathumwan',
    name: 'โรงพยาบาลปทุมสมุนไพร (สมมุติ)',
    province: 'กรุงเทพมหานคร',
    district: 'ปทุมวัน',
    services: ['TTM', 'PHARMACIST'],
    accessibility: ['WHEELCHAIR'],
    verification: 'DEMO_LISTING',
    description: 'ตัวอย่างโรงพยาบาลในเมืองที่มีบริการแพทย์แผนไทย',
    kind: 'HOSPITAL',
    hasTtmDoctor: true,
    lat: 13.74,
    lng: 100.53,
    hours: 'จ.–ศ. 08:00–20:00',
  },
];

/**
 * Example journal entries a few days before "now", so the calendar is not empty in a demo. Every one is marked
 * isSynthetic and the UI labels it "ตัวอย่าง"; they are fictional statements, not anyone's health record.
 */
export function seedJournal(now: Date = new Date()): JournalEntry[] {
  const examples: { daysAgo: number; text: string; parts: [JournalCategory, string][] }[] = [
    { daysAgo: 1, text: 'เช้านี้ปวดเข่าขวานิดหน่อย กินข้าวต้มปลา', parts: [['SYMPTOM', 'เช้านี้ปวดเข่าขวานิดหน่อย'], ['FOOD_CONSUMED', 'กินข้าวต้มปลา']] },
    { daysAgo: 1, text: 'กินขมิ้นชันหลังอาหารเย็น', parts: [['MEDICINE_USE_REPORT', 'กินขมิ้นชันหลังอาหารเย็น']] },
    { daysAgo: 3, text: 'นอนไม่ค่อยหลับ ไปวัดกับหลาน', parts: [['SYMPTOM', 'นอนไม่ค่อยหลับ'], ['OTHER', 'ไปวัดกับหลาน']] },
    { daysAgo: 6, text: 'เดินแล้วเข่าขัด กินแกงจืดผักกาด', parts: [['SYMPTOM', 'เดินแล้วเข่าขัด'], ['FOOD_CONSUMED', 'กินแกงจืดผักกาด']] },
  ];
  return examples.map((ex, i) => {
    const at = new Date(now.getTime() - ex.daysAgo * 86_400_000 - i * 3_600_000).toISOString();
    return {
      id: `journal-seed-${i + 1}`,
      patientId: DEMO_PATIENT_ID,
      originalText: ex.text,
      reviewedText: ex.text,
      inputSource: 'MANUAL_TEXT',
      capturedAt: at,
      recordedLocalDate: bangkokDate(at),
      reviewedAt: at,
      status: 'PATIENT_CONFIRMED',
      segments: ex.parts.map(([category, text], j) => ({ id: `seg-seed-${i}-${j}`, category, text, correctedByUser: false })),
      photoIds: [],
      revision: 1,
      isSynthetic: true,
    };
  });
}

/** Example measurements a few days ago, labelled ตัวอย่าง in the UI */
/**
 * 21 days of SYNTHETIC self-reported check-ins ending yesterday (today is left empty so the home screen shows
 * "ยังไม่ได้บันทึก"). A few days are skipped on purpose; values are deterministic so the demo is stable.
 */
export function seedCheckins(now: Date = new Date()): WellnessCheckin[] {
  const rows: WellnessCheckin[] = [];
  for (let d = 21; d >= 1; d--) {
    if (d % 6 === 0) continue;
    const at = new Date(now.getTime() - d * 86_400_000).toISOString();
    const k = (d * 7) % 5;
    rows.push({
      id: `checkin-seed-${d}`,
      date: bangkokDate(at),
      at,
      sleepHours: [6, 6.5, 7, 7.5, 8][k],
      sleepQuality: ([2, 3, 4, 4, 5] as const)[k],
      energy: ([2, 3, 3, 4, 4] as const)[(k + (d % 2)) % 5],
      mood: ([3, 3, 4, 4, 5] as const)[(k + 1) % 5],
      activityMinutes: [10, 20, 30, 15, 40][(d * 3) % 5],
      source: 'SELF_REPORTED',
      isSynthetic: true,
    });
  }
  return rows;
}

export function seedHabitLogs(now: Date = new Date()): HabitLog[] {
  const at = (d: number) => new Date(now.getTime() - d * 86_400_000).toISOString();
  return [
    { goalId: 'STRENGTH', d: 2 },
    { goalId: 'RELAX', d: 1 },
    { goalId: 'RELAX', d: 3 },
  ].map(({ goalId, d }) => ({ goalId, date: bangkokDate(at(d)), at: at(d), isSynthetic: true }));
}

export function seedMeasurements(now: Date = new Date()): Measurement[] {
  const at = (daysAgo: number) => new Date(now.getTime() - daysAgo * 86_400_000).toISOString();
  const m = (id: string, type: Measurement['type'], value: number, daysAgo: number, value2?: number): Measurement => ({
    id,
    type,
    value,
    value2,
    at: at(daysAgo),
    date: bangkokDate(at(daysAgo)),
    source: 'MANUAL',
    isSynthetic: true,
  });
  return [m('meas-seed-w', 'WEIGHT', 64, 1), m('meas-seed-g', 'GLUCOSE', 103, 1), m('meas-seed-bp', 'BP', 122, 1, 78)];
}

export const SEED_FRIENDS: Friend[] = [
  { id: 'friend-boonma', name: 'ยายบุญมา (ตัวอย่าง)', avatar: '👵', weeklyPoints: 212, streak: 9, isSynthetic: true },
  { id: 'friend-sommai', name: 'ตาสมหมาย (ตัวอย่าง)', avatar: '👴', weeklyPoints: 168, streak: 5, isSynthetic: true },
  { id: 'friend-chan', name: 'ยายจันทร์ (ตัวอย่าง)', avatar: '👵', weeklyPoints: 131, streak: 3, isSynthetic: true },
  { id: 'friend-thongkham', name: 'ยายทองคำ (ตัวอย่าง)', avatar: '👵', weeklyPoints: 96, streak: 2, isSynthetic: true },
];

/** Friends that can be added with a demo invite code */
export const INVITABLE_FRIENDS: Record<string, Friend> = {
  'YAI-1234': { id: 'friend-somjit', name: 'ยายสมจิต (ตัวอย่าง)', avatar: '👵', weeklyPoints: 150, streak: 4, isSynthetic: true },
};

export const SEED_FRIEND_REVIEWS: HerbReview[] = [
  { id: 'rv-1', author: 'ยายบุญมา (ตัวอย่าง)', isSelf: false, herbName: 'ขมิ้นชัน', rating: 4, sideEffects: 'NONE', sideEffectNote: '', weeksUsed: 8, wouldRecommend: true, note: 'ท้องอืดน้อยลง', at: T0, consentResearch: true, isSynthetic: true },
  { id: 'rv-2', author: 'ตาสมหมาย (ตัวอย่าง)', isSelf: false, herbName: 'ขมิ้นชัน', rating: 3, sideEffects: 'MILD', sideEffectNote: 'แสบท้องนิดหน่อยถ้ากินตอนท้องว่าง', weeksUsed: 4, wouldRecommend: true, note: '', at: T0, consentResearch: true, isSynthetic: true },
  { id: 'rv-3', author: 'ยายจันทร์ (ตัวอย่าง)', isSelf: false, herbName: 'ไพล', rating: 4, sideEffects: 'NONE', sideEffectNote: '', weeksUsed: 2, wouldRecommend: true, note: 'ทาเข่าแล้วสบายขึ้น', at: T0, consentResearch: true, isSynthetic: true },
  { id: 'rv-4', author: 'ยายทองคำ (ตัวอย่าง)', isSelf: false, herbName: 'ฟ้าทะลายโจร', rating: 3, sideEffects: 'MILD', sideEffectNote: 'ขมมาก', weeksUsed: 1, wouldRecommend: false, note: '', at: T0, consentResearch: false, isSynthetic: true },
  { id: 'rv-5', author: 'ยายบุญมา (ตัวอย่าง)', isSelf: false, herbName: 'ขิง', rating: 5, sideEffects: 'NONE', sideEffectNote: '', weeksUsed: 12, wouldRecommend: true, note: 'ช่วยเรื่องคลื่นไส้', at: T0, consentResearch: true, isSynthetic: true },
];

export function createSeedState(): YaiState {
  return {
    schemaVersion: 1,
    patient: { id: DEMO_PATIENT_ID, displayName: 'คุณยายสมศรี (ข้อมูลจำลอง)', age: 68, province: 'เชียงใหม่', hn: 'DEMO-0001' },
    medicines: structuredClone(SEED_MEDICINES),
    photos: [],
    consents: [],
    appointments: [],
    reminders: [
      {
        id: 'plan-warfarin',
        patientId: DEMO_PATIENT_ID,
        medicineId: 'med-warfarin',
        schedule: ['20:00'],
        timeZone: 'Asia/Bangkok',
        source: 'PATIENT_CONFIRMED',
        verifiedAt: T0,
        status: 'ACTIVE',
      },
    ],
    doseLogs: [],
    audit: [],
    settings: { fontScale: 125, familyName: '', familyPhone: '', onboarded: false, role: 'PATIENT', theme: 'dark', goals: ['SLEEP', 'ACTIVE', 'STRENGTH', 'RELAX'] },
    demoClockOffsetMinutes: 0,
    journal: seedJournal(),
    syncedOrders: [],
    orderNotices: [],
    measurements: seedMeasurements(),
    herbReviews: structuredClone(SEED_FRIEND_REVIEWS),
    friends: structuredClone(SEED_FRIENDS),
    checkins: seedCheckins(),
    habitLogs: seedHabitLogs(),
  };
}
