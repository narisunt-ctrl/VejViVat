import { Clinic, EvidenceField, MedicationPassport, YaiState } from '../../domain/yai/models';

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
  },
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
    settings: { fontScale: 125, familyName: '', familyPhone: '', onboarded: false, role: 'PATIENT' },
    demoClockOffsetMinutes: 0,
  };
}
