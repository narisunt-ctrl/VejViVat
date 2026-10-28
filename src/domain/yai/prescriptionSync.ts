// CareBridge → ยายพร้อม medication-order synchronisation (synthetic demo).
// An order the prescriber approved, a dispense the pharmacy verified, and what the patient reports she took are
// three different facts, kept apart here. Only evaluateReminderSync() may turn an order into a fixed-time reminder,
// and the sync below is idempotent (sourceSystem + sourceOrderId + sourceVersion) and version-aware.

import type { EvidenceField, MedicationPassport, MedicineKind, PatientId, ProductForm, ReminderPlan } from './models';
import { isValidTime } from './policies';

export type OrderLifecycle =
  | 'DRAFT'
  | 'AWAITING_AUTHORIZED_REVIEW'
  /** synthetic sandbox clinician action only */
  | 'APPROVED_DEMO'
  /** reserved for an authenticated production adapter; never set by this demo */
  | 'APPROVED_VERIFIED'
  | 'CANCELLED'
  | 'SUPERSEDED';

export type DispenseLifecycle = 'UNKNOWN' | 'PENDING' | 'VERIFIED_DEMO' | 'VERIFIED_REAL' | 'PARTIAL' | 'NOT_DISPENSED';
export type ReminderSyncStatus = 'NOT_ELIGIBLE' | 'PENDING_SCHEDULE_REVIEW' | 'ACTIVE' | 'PAUSED' | 'DISCONTINUED';
export type RegimenType = 'SCHEDULED' | 'PRN' | 'CONDITIONAL' | 'TAPER' | 'UNKNOWN';

export interface MedicationOrderSnapshot {
  /** e.g. 'VEJVIVAT_DEMO' */
  sourceSystem: string;
  /** stable per provider order */
  sourceOrderId: string;
  /** monotonically increasing; every change publishes a new version */
  sourceVersion: number;
  /** linked by an explicit demo mapping, never guessed from a name */
  patientId: PatientId;
  prescriberId: string | null;
  approval: OrderLifecycle;
  approvedBy: string | null;
  approvedAt: string | null;
  dispense: DispenseLifecycle;
  dispensedBy: string | null;
  dispensedAt: string | null;
  medicineIdentityVerified: boolean;
  medicineName: string | null;
  kind: MedicineKind;
  formulation: string | null;
  strengthLabel: string | null;
  dosePerAdministration: string | null;
  route: string | null;
  /** the prescriber's directions as written, e.g. "ก่อนอาหาร เช้า-กลางวัน-เย็น" */
  directions: string | null;
  /** explicit "HH:mm" clock times agreed for reminders; null until someone confirms them */
  plannedClockTimes: string[] | null;
  /** who agreed the clock times with the patient; the order itself is not changed by this */
  scheduleConfirmedBy: string | null;
  scheduleConfirmedAt: string | null;
  timeZone: 'Asia/Bangkok';
  regimenType: RegimenType;
  /** YYYY-MM-DD (Asia/Bangkok) */
  startDate: string | null;
  endDate: string | null;
  onHold: boolean;
  lastChangedAt: string;
  changeNote: string | null;
  isSynthetic: boolean;
}

export interface LinkedOrderRef {
  sourceSystem: string;
  sourceOrderId: string;
  sourceVersion: number;
  verifiedByRole: 'SIMULATED_CLINICIAN' | 'PRESCRIBER' | 'PHARMACIST';
  verifiedAt: string;
  dispensedAt: string | null;
}

/** Explicit synthetic mapping between a clinician case and a ยายพร้อม patient; never inferred from name, age or HN */
export interface DemoPatientLink {
  clinicianCaseId: string;
  yaiPatientId: PatientId;
  sourceSystem: string;
  /** consent recipient the patient grants in ยายพร้อม to receive orders / share dose reports */
  recipientId: string;
  recipientName: string;
  isSynthetic: true;
}

export type SyncDecision =
  | { kind: 'ACTIVE'; times: string[]; sourceOrderId: string; version: number }
  | { kind: 'PENDING_REVIEW'; reason: string }
  | { kind: 'REJECTED'; reason: string }
  | { kind: 'STOPPED'; reason: string };

export interface SyncContext {
  /** the ยายพร้อม patient this import is for */
  expectedPatientId: PatientId;
  /** DEMO accepts only *_DEMO states; PRODUCTION accepts only authenticated *_VERIFIED / *_REAL states */
  mode: 'DEMO' | 'PRODUCTION';
  /** the patient's consent to receive orders from this source is active */
  consentActive: boolean;
  /** YYYY-MM-DD today in Asia/Bangkok */
  today: string;
}

export const orderKey = (o: Pick<MedicationOrderSnapshot, 'sourceSystem' | 'sourceOrderId'>) => `${o.sourceSystem}::${o.sourceOrderId}`;

/**
 * The single gate from an order to a fixed-time reminder (pure; no UI may bypass it).
 * Fails closed: anything unclear becomes PENDING_REVIEW, a wrong patient or missing consent is REJECTED.
 */
export function evaluateReminderSync(order: MedicationOrderSnapshot, ctx: SyncContext): SyncDecision {
  if (order.patientId !== ctx.expectedPatientId) return { kind: 'REJECTED', reason: 'คำสั่งยานี้เป็นของผู้ป่วยรายอื่น ระบบไม่รับเข้า' };
  if (!ctx.consentActive) return { kind: 'REJECTED', reason: 'ผู้ป่วยยังไม่อนุญาตให้รับคำสั่งยาจากคลินิกนี้' };

  if (order.approval === 'CANCELLED') return { kind: 'STOPPED', reason: 'แพทย์ยกเลิกคำสั่งยานี้แล้ว' };
  if (order.approval === 'SUPERSEDED') return { kind: 'STOPPED', reason: 'มีคำสั่งยาฉบับใหม่แทนแล้ว' };
  if (order.onHold) return { kind: 'STOPPED', reason: 'แพทย์ให้พักการใช้ยานี้ไว้ก่อน' };
  if (order.dispense === 'NOT_DISPENSED') return { kind: 'STOPPED', reason: 'ไม่ได้จ่ายยานี้' };
  if (order.endDate && order.endDate < ctx.today) return { kind: 'STOPPED', reason: 'ครบกำหนดตามคำสั่งยาแล้ว' };

  const approved = ctx.mode === 'DEMO' ? order.approval === 'APPROVED_DEMO' : order.approval === 'APPROVED_VERIFIED';
  if (!approved) return { kind: 'PENDING_REVIEW', reason: 'ยังไม่มีการรับรองคำสั่งยาโดยผู้สั่งใช้ยา' };
  if (!order.approvedBy || !order.approvedAt) return { kind: 'PENDING_REVIEW', reason: 'ไม่มีบันทึกผู้รับรองคำสั่งยา' };
  if (!order.medicineIdentityVerified || !order.medicineName) return { kind: 'PENDING_REVIEW', reason: 'ยังไม่ได้ยืนยันว่าเป็นยาตัวใด' };
  if (!order.dosePerAdministration) return { kind: 'PENDING_REVIEW', reason: 'ยังไม่ระบุขนาดยาต่อครั้ง' };

  if (order.dispense === 'PARTIAL') return { kind: 'PENDING_REVIEW', reason: 'จ่ายยาไม่ครบ ต้องให้เภสัชกรทบทวนก่อน' };
  const dispensed = ctx.mode === 'DEMO' ? order.dispense === 'VERIFIED_DEMO' : order.dispense === 'VERIFIED_REAL';
  if (!dispensed || !order.dispensedAt) return { kind: 'PENDING_REVIEW', reason: 'ยังไม่ได้ยืนยันการจ่ายยาให้ผู้ป่วย' };

  if (order.regimenType === 'PRN') return { kind: 'PENDING_REVIEW', reason: 'ยาใช้เมื่อมีอาการ ไม่ตั้งเวลาเตือนประจำ' };
  if (order.regimenType !== 'SCHEDULED') return { kind: 'PENDING_REVIEW', reason: 'วิธีใช้ยาซับซ้อน ต้องให้เภสัชกรกำหนดเวลาเตือนร่วมกับผู้ป่วย' };
  if (order.timeZone !== 'Asia/Bangkok') return { kind: 'PENDING_REVIEW', reason: 'เขตเวลาไม่ชัดเจน' };

  const times = order.plannedClockTimes ?? [];
  // "หลังอาหาร" is not 08:00: without explicit, confirmed clock times there is no fixed reminder
  if (times.length === 0) return { kind: 'PENDING_REVIEW', reason: 'รอกำหนดเวลาเตือน (คำสั่งยาไม่ได้ระบุเวลาเป็นนาฬิกา)' };
  if (!times.every(isValidTime) || new Set(times).size !== times.length) return { kind: 'PENDING_REVIEW', reason: 'เวลาเตือนไม่ถูกต้องหรือซ้ำกัน' };
  if (!order.scheduleConfirmedBy || !order.scheduleConfirmedAt) return { kind: 'PENDING_REVIEW', reason: 'เวลาเตือนยังไม่ได้ยืนยันกับผู้ป่วย' };
  if (!order.startDate) return { kind: 'PENDING_REVIEW', reason: 'ยังไม่ระบุวันเริ่มใช้ยา' };
  if (order.endDate && order.endDate < order.startDate) return { kind: 'PENDING_REVIEW', reason: 'วันเริ่มและวันสิ้นสุดขัดกัน' };

  return { kind: 'ACTIVE', times: [...times].sort(), sourceOrderId: order.sourceOrderId, version: order.sourceVersion };
}

export function syncStatusOf(decision: SyncDecision): ReminderSyncStatus {
  return decision.kind === 'ACTIVE' ? 'ACTIVE' : decision.kind === 'PENDING_REVIEW' ? 'PENDING_SCHEDULE_REVIEW' : decision.kind === 'STOPPED' ? 'DISCONTINUED' : 'NOT_ELIGIBLE';
}

export interface SyncedOrderRecord {
  key: string;
  /** latest accepted snapshot */
  snapshot: MedicationOrderSnapshot;
  decision: SyncDecision;
  status: ReminderSyncStatus;
  medicineId: string;
  activePlanId: string | null;
  importedAt: string;
  history: { version: number; status: ReminderSyncStatus; reason: string | null; importedAt: string }[];
}

export interface OrderNotice {
  id: string;
  at: string;
  orderKey: string;
  version: number;
  text: string;
}

export interface SyncSlice {
  medicines: MedicationPassport[];
  reminders: ReminderPlan[];
  syncedOrders: SyncedOrderRecord[];
  orderNotices: OrderNotice[];
}

export type ImportOutcome = 'IMPORTED' | 'DUPLICATE' | 'STALE' | 'REJECTED';

const planIdFor = (key: string, version: number) => `plan-order-${key.replace(/[^A-Za-z0-9]+/g, '-')}-v${version}`;
const medicineIdFor = (key: string) => `med-order-${key.replace(/[^A-Za-z0-9]+/g, '-')}`;

function clinicianField<T>(value: T | null, at: string, demo: boolean): EvidenceField<T> {
  return { value, origin: 'CLINICIAN', capturedAt: at, verification: demo ? 'DEMO_REVIEW' : 'CLINICIAN_VERIFIED', isSynthetic: demo || undefined };
}

function noticeText(prev: SyncedOrderRecord | undefined, s: MedicationOrderSnapshot, d: SyncDecision): string {
  const name = s.medicineName ?? 'ยา';
  if (d.kind === 'STOPPED') return `${name}: ${d.reason} หยุดการเตือนแล้ว (ประวัติเดิมยังอยู่)`;
  if (d.kind === 'PENDING_REVIEW') return `${name}: ${d.reason}`;
  if (d.kind === 'ACTIVE') {
    if (prev?.decision.kind === 'ACTIVE' && prev.decision.times.join(',') !== d.times.join(',')) {
      return `${name}: แพทย์/เภสัชกรปรับเวลาเตือนเป็น ${d.times.join(', ')} น. (ฉบับที่ ${s.sourceVersion})`;
    }
    return `${name}: เริ่มเตือนตามคำสั่งยาที่รับรองแล้ว เวลา ${d.times.join(', ')} น.`;
  }
  return `${name}: ${d.reason}`;
}

/**
 * Apply one order snapshot to the patient's data (pure).
 * - same version again → DUPLICATE, nothing changes; older version → STALE
 * - another patient or no consent → REJECTED, nothing is stored (fails closed)
 * - a new version replaces the schedule: the old plan is discontinued (dose logs are never touched) and a new plan
 *   with a deterministic id is created only when the gate says ACTIVE
 */
export function importOrderSnapshot(
  slice: SyncSlice,
  snapshot: MedicationOrderSnapshot,
  ctx: SyncContext,
  now: string
): { slice: SyncSlice; outcome: ImportOutcome; decision: SyncDecision } {
  const decision = evaluateReminderSync(snapshot, ctx);
  if (decision.kind === 'REJECTED') return { slice, outcome: 'REJECTED', decision };

  const key = orderKey(snapshot);
  const prev = slice.syncedOrders.find((r) => r.key === key);
  if (prev && snapshot.sourceVersion === prev.snapshot.sourceVersion) return { slice, outcome: 'DUPLICATE', decision: prev.decision };
  if (prev && snapshot.sourceVersion < prev.snapshot.sourceVersion) return { slice, outcome: 'STALE', decision: prev.decision };

  const demo = ctx.mode === 'DEMO';
  const medicineId = prev?.medicineId ?? medicineIdFor(key);
  const approved = snapshot.approval === 'APPROVED_DEMO' || snapshot.approval === 'APPROVED_VERIFIED';
  const existingMed = slice.medicines.find((m) => m.id === medicineId);
  const medicine: MedicationPassport = {
    id: medicineId,
    patientId: snapshot.patientId,
    version: (existingMed?.version ?? 0) + 1,
    kind: snapshot.kind,
    form: clinicianField<ProductForm>(null, now, demo),
    displayName: clinicianField(snapshot.medicineName, now, demo),
    ingredients: [],
    labelStrength: clinicianField(snapshot.strengthLabel, now, demo),
    // the order's directions are the clinician's voice, not text printed on a label
    labelDirections: { value: null, origin: 'CLINICIAN', capturedAt: now, verification: 'UNVERIFIED' },
    useReports: [
      ...(existingMed?.useReports.filter((r) => r.origin !== 'CLINICIAN') ?? []),
      {
        origin: 'CLINICIAN',
        value: `คำสั่งยา${demo ? ' (จำลอง)' : ''} ฉบับที่ ${snapshot.sourceVersion}: ${snapshot.dosePerAdministration ?? '-'} ${snapshot.directions ?? ''}`.trim(),
        reportedAt: snapshot.lastChangedAt,
      },
    ],
    registrationNumber: clinicianField<string>(null, now, demo),
    photoIds: existingMed?.photoIds ?? [],
    status: approved && snapshot.medicineIdentityVerified ? 'CLINICIAN_VERIFIED' : 'REQUIRES_CLINICIAN_REVIEW',
    pendingIdentification: !snapshot.medicineIdentityVerified,
    unresolvedQuestions: decision.kind === 'PENDING_REVIEW' ? [decision.reason] : [],
    createdAt: existingMed?.createdAt ?? now,
    updatedAt: now,
    linkedOrderKey: key,
  };
  const medicines = existingMed ? slice.medicines.map((m) => (m.id === medicineId ? medicine : m)) : [...slice.medicines, medicine];

  const newPlanId = decision.kind === 'ACTIVE' ? planIdFor(key, snapshot.sourceVersion) : null;
  let reminders = slice.reminders.map((r) =>
    r.medicineId === medicineId && r.status === 'ACTIVE' && r.id !== newPlanId ? { ...r, status: 'DISCONTINUED' as const } : r
  );
  if (decision.kind === 'ACTIVE' && newPlanId && !reminders.some((r) => r.id === newPlanId)) {
    reminders = [
      ...reminders,
      {
        id: newPlanId,
        patientId: snapshot.patientId,
        medicineId,
        schedule: decision.times,
        timeZone: 'Asia/Bangkok',
        source: 'CLINICIAN_ORDER',
        verifiedAt: snapshot.scheduleConfirmedAt ?? now,
        status: 'ACTIVE',
        orderRef: {
          sourceSystem: snapshot.sourceSystem,
          sourceOrderId: snapshot.sourceOrderId,
          sourceVersion: snapshot.sourceVersion,
          verifiedByRole: demo ? 'SIMULATED_CLINICIAN' : 'PRESCRIBER',
          verifiedAt: snapshot.approvedAt ?? now,
          dispensedAt: snapshot.dispensedAt,
        },
      },
    ];
  }

  const status = syncStatusOf(decision);
  const reason = decision.kind === 'ACTIVE' ? null : decision.reason;
  const record: SyncedOrderRecord = {
    key,
    snapshot,
    decision,
    status,
    medicineId,
    activePlanId: newPlanId,
    importedAt: now,
    history: [...(prev?.history ?? []), { version: snapshot.sourceVersion, status, reason, importedAt: now }],
  };
  const syncedOrders = prev ? slice.syncedOrders.map((r) => (r.key === key ? record : r)) : [...slice.syncedOrders, record];
  const notice: OrderNotice = { id: `notice-${key}-v${snapshot.sourceVersion}`, at: now, orderKey: key, version: snapshot.sourceVersion, text: noticeText(prev, snapshot, decision) };
  return {
    slice: { medicines, reminders, syncedOrders, orderNotices: [notice, ...slice.orderNotices].slice(0, 30) },
    outcome: 'IMPORTED',
    decision,
  };
}

/** Patient-facing status labels; the four facts are shown separately, never merged */
export function orderStatusLabels(r: SyncedOrderRecord): { key: string; label: string; tone: 'ok' | 'wait' | 'stop' }[] {
  const s = r.snapshot;
  const demo = s.isSynthetic ? ' (จำลอง)' : '';
  const out: { key: string; label: string; tone: 'ok' | 'wait' | 'stop' }[] = [];
  if (s.approval === 'CANCELLED' || s.approval === 'SUPERSEDED') out.push({ key: 'cancel', label: `ยกเลิก${demo}`, tone: 'stop' });
  else if (s.approval === 'APPROVED_DEMO' || s.approval === 'APPROVED_VERIFIED') out.push({ key: 'approved', label: `สั่งใช้แล้ว${demo}`, tone: 'ok' });
  else out.push({ key: 'approved', label: 'รอแพทย์รับรอง', tone: 'wait' });
  if (s.dispense === 'VERIFIED_DEMO' || s.dispense === 'VERIFIED_REAL') out.push({ key: 'dispensed', label: `จ่ายยาแล้ว${demo}`, tone: 'ok' });
  else if (s.dispense === 'NOT_DISPENSED') out.push({ key: 'dispensed', label: 'ไม่ได้จ่ายยา', tone: 'stop' });
  else out.push({ key: 'dispensed', label: 'ยังไม่ยืนยันการจ่ายยา', tone: 'wait' });
  if (r.status === 'PENDING_SCHEDULE_REVIEW') out.push({ key: 'schedule', label: 'รอกำหนดเวลา', tone: 'wait' });
  if (r.status === 'ACTIVE') out.push({ key: 'schedule', label: 'เตือนตามเวลาแล้ว', tone: 'ok' });
  if (r.status === 'DISCONTINUED' && out[0].key !== 'cancel') out.push({ key: 'schedule', label: 'หยุดเตือนแล้ว', tone: 'stop' });
  return out;
}
