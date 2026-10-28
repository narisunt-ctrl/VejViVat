import {
  CaptureSide,
  AppointmentRequest,
  AppointmentStatus,
  ConsentGrant,
  ConsentScope,
  InteractionVerdict,
  MedicationPassport,
  ReminderSource,
} from './models';

// Pure safety invariants for ยายพร้อม. These functions are the single place
// the UI asks "is this allowed?", so they are covered by unit tests.

/** A reminder can only start from a medicine the patient (or a clinician) confirmed, never from raw OCR. */
export function canCreateReminder(medicine: MedicationPassport, source: ReminderSource): { ok: boolean; reason?: string } {
  if (medicine.pendingIdentification || medicine.status === 'INSUFFICIENT_INFORMATION') {
    return { ok: false, reason: 'ยังระบุยานี้ไม่ได้ ต้องให้เภสัชกรตรวจสอบก่อนตั้งเตือน' };
  }
  if (source === 'CLINICIAN_ORDER') {
    return medicine.status === 'CLINICIAN_VERIFIED'
      ? { ok: true }
      : { ok: false, reason: 'ยังไม่มีแพทย์หรือเภสัชกรยืนยันรายการยานี้' };
  }
  if (medicine.status === 'PATIENT_CONFIRMED' || medicine.status === 'CLINICIAN_VERIFIED') return { ok: true };
  return { ok: false, reason: 'ต้องยืนยันรายการยาก่อน ระบบจะไม่ตั้งเตือนจากข้อความบนฉลากเอง' };
}

export function isConsentActive(consent: ConsentGrant, now: Date): boolean {
  if (consent.revokedAt) return false;
  if (consent.expiresAt && new Date(consent.expiresAt).getTime() <= now.getTime()) return false;
  return true;
}

/** Only a recipient holding an active grant with the scope may read; sharing with one clinic never shares with others. */
export function canRead(consents: ConsentGrant[], recipientId: string, scope: ConsentScope, now: Date): boolean {
  return consents.some((c) => c.recipientId === recipientId && c.scope.includes(scope) && isConsentActive(c, now));
}

export type AppointmentActor = 'PATIENT' | 'SIMULATED_PROVIDER';

const PATIENT_TRANSITIONS: Partial<Record<AppointmentStatus, AppointmentStatus[]>> = {
  DRAFT: ['REQUESTED', 'CANCELLED'],
  REQUESTED: ['CANCELLED'],
  OFFERED: ['CANCELLED'],
  CONFIRMED: ['CANCELLED'],
};
const PROVIDER_TRANSITIONS: Partial<Record<AppointmentStatus, AppointmentStatus[]>> = {
  REQUESTED: ['OFFERED', 'CONFIRMED', 'DECLINED'],
  OFFERED: ['CONFIRMED', 'DECLINED'],
};

/** A patient can request or cancel; only the clinic side can offer, confirm or decline. */
export function canTransitionAppointment(
  appointment: Pick<AppointmentRequest, 'status'>,
  to: AppointmentStatus,
  actor: AppointmentActor
): boolean {
  const table = actor === 'PATIENT' ? PATIENT_TRANSITIONS : PROVIDER_TRANSITIONS;
  return (table[appointment.status] ?? []).includes(to);
}

/** Sample rule set for the demo; deliberately tiny and labelled as unreviewed. */
export const SAMPLE_INTERACTION_RULES: { a: string; b: string; note: string }[] = [
  {
    a: 'warfarin',
    b: 'ขมิ้นชัน',
    note: 'คู่นี้อยู่ในฐานข้อมูลตัวอย่าง: มีรายงานว่าขมิ้นชันอาจเพิ่มผลของยาต้านการแข็งตัวของเลือด ผลขึ้นกับสูตรและขนาด ต้องให้เภสัชกรทบทวน',
  },
];
export const SAMPLE_RULES_COVERAGE = 'กฎตัวอย่าง 1 คู่ (ข้อมูลจำลอง ยังไม่ผ่านการทบทวนโดยผู้เชี่ยวชาญ)';

function nameOf(m: MedicationPassport): string {
  return [m.displayName.value ?? '', ...m.ingredients.map((i) => i.value ?? '')].join(' ').toLowerCase();
}

/**
 * Coverage-aware screening. Never returns "safe": zero matches only means
 * "no match among the few pairs we cover", and any unidentified item makes the
 * whole list insufficient.
 */
export function screenInteractions(medicines: MedicationPassport[]): {
  verdict: InteractionVerdict;
  matches: { rule: (typeof SAMPLE_INTERACTION_RULES)[number]; medicineIds: [string, string] }[];
  unidentifiedCount: number;
} {
  const matches: { rule: (typeof SAMPLE_INTERACTION_RULES)[number]; medicineIds: [string, string] }[] = [];
  for (const rule of SAMPLE_INTERACTION_RULES) {
    const a = medicines.find((m) => nameOf(m).includes(rule.a.toLowerCase()));
    const b = medicines.find((m) => nameOf(m).includes(rule.b.toLowerCase()));
    if (a && b && a.id !== b.id) matches.push({ rule, medicineIds: [a.id, b.id] });
  }
  const unidentifiedCount = medicines.filter((m) => m.pendingIdentification || m.displayName.value === null).length;
  const verdict: InteractionVerdict =
    matches.length > 0 ? 'MATCHED_UNREVIEWED' : unidentifiedCount > 0 ? 'INSUFFICIENT_INFORMATION' : 'NO_MATCH_IN_COVERED_PAIRS';
  return { verdict, matches, unidentifiedCount };
}

/** Distinct use statements from different sources; shown side by side, never auto-resolved. */
export function useDiscrepancy(medicine: MedicationPassport): boolean {
  const values = new Set<string>();
  if (medicine.labelDirections.value) values.add(medicine.labelDirections.value.trim());
  medicine.useReports.forEach((r) => values.add(r.value.trim()));
  return values.size > 1;
}

/** Fields that are still unknown, so the pre-visit packet can say what is missing. */
export function missingFields(medicine: MedicationPassport): string[] {
  const missing: string[] = [];
  if (!medicine.displayName.value) missing.push('ชื่อยา');
  if (medicine.ingredients.length === 0 || medicine.ingredients.every((i) => !i.value)) missing.push('ส่วนประกอบ');
  if (!medicine.labelStrength.value) missing.push('ความแรงบนฉลาก');
  if (!medicine.form.value || medicine.form.value === 'UNKNOWN') missing.push('รูปแบบยา');
  if (medicine.useReports.length === 0) missing.push('วิธีใช้จริง');
  return missing;
}

export function isValidTime(hhmm: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(hhmm);
}

/** Label fields the pre-visit packet tries to cover, in the order shown to the patient */
export function fieldCompleteness(m: MedicationPassport): { key: string; label: string; done: boolean }[] {
  const has = (v: string | null | undefined) => !!v && v.trim().length > 0;
  return [
    { key: 'name', label: 'ชื่อผลิตภัณฑ์', done: has(m.displayName.value) },
    { key: 'form', label: 'รูปแบบ', done: !!m.form.value && m.form.value !== 'UNKNOWN' },
    { key: 'strength', label: 'ความแรง', done: has(m.labelStrength.value) },
    { key: 'ingredients', label: 'ส่วนประกอบ', done: m.ingredients.some((i) => has(i.value)) },
    { key: 'directions', label: 'วิธีใช้', done: has(m.labelDirections.value) },
    { key: 'registration', label: 'เลข อย.', done: has(m.registrationNumber.value) },
    { key: 'manufacturer', label: 'ผู้ผลิต', done: has(m.manufacturer?.value) },
  ];
}

export const SIDE_INFO: Record<CaptureSide, { label: string; why: string }> = {
  FRONT: { label: 'ด้านหน้า', why: 'เพื่อให้เห็นชื่อยาและความแรง' },
  BACK: { label: 'ด้านหลัง', why: 'เพื่อให้เห็นส่วนประกอบ เภสัชกรจะตรวจได้ครบขึ้น' },
  DIRECTIONS: { label: 'วิธีใช้', why: 'เพื่อเทียบกับวิธีที่คุณยายใช้อยู่จริง' },
  REGISTRATION: { label: 'เลข อย./บาร์โค้ด', why: 'เพื่อช่วยยืนยันว่าเป็นผลิตภัณฑ์ใด' },
};
export const SIDE_ORDER: CaptureSide[] = ['FRONT', 'BACK', 'DIRECTIONS', 'REGISTRATION'];

/**
 * Advisory next view: the first side not yet photographed, in a fixed priority order.
 * It is a checklist helper, not image recognition, and it never blocks stopping early.
 */
export function nextRecommendedSide(captured: CaptureSide[]): CaptureSide | null {
  return SIDE_ORDER.find((s) => !captured.includes(s)) ?? null;
}
