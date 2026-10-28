import { describe, it, expect, beforeEach } from 'vitest';
import {
  evaluateReminderSync,
  importOrderSnapshot,
  MedicationOrderSnapshot,
  orderStatusLabels,
  SyncContext,
  SyncSlice,
} from '../../domain/yai/prescriptionSync';
import { canCreateReminder } from '../../domain/yai/policies';
import { yaiStore } from '../../services/yai/yaiStore';
import { DEMO_PATIENT_ID } from '../../data/yai/fixtures';
import { CAREBRIDGE_RECIPIENT_ID, CAREBRIDGE_RECIPIENT_NAME, CAREBRIDGE_SOURCE } from '../../data/yai/demoLinks';
import { getElementSummaryForPatient, summarizeCase } from '../../services/yai/elementSummaryAdapter';
import { MockDataService } from '../../services/mockDataService';

const NOW = '2026-10-29T02:00:00.000Z';
const ctx: SyncContext = { expectedPatientId: 'p1', mode: 'DEMO', consentActive: true, today: '2026-10-29' };

function order(p: Partial<MedicationOrderSnapshot> = {}): MedicationOrderSnapshot {
  return {
    sourceSystem: 'VEJVIVAT_DEMO',
    sourceOrderId: 'RX-1',
    sourceVersion: 1,
    patientId: 'p1',
    prescriberId: 'DEMO-DR-01',
    approval: 'APPROVED_DEMO',
    approvedBy: 'แพทย์สาธิต',
    approvedAt: NOW,
    dispense: 'VERIFIED_DEMO',
    dispensedBy: 'เภสัชกรสาธิต',
    dispensedAt: NOW,
    medicineIdentityVerified: true,
    medicineName: 'ยาสหัศธารา',
    kind: 'HERBAL_FORMULA',
    formulation: null,
    strengthLabel: '500 มก.',
    dosePerAdministration: 'ครั้งละ 2 แคปซูล',
    route: 'รับประทาน',
    directions: 'ก่อนอาหาร เช้า-กลางวัน-เย็น',
    plannedClockTimes: ['07:30', '11:30', '17:30'],
    scheduleConfirmedBy: 'เภสัชกรสาธิต',
    scheduleConfirmedAt: NOW,
    timeZone: 'Asia/Bangkok',
    regimenType: 'SCHEDULED',
    startDate: '2026-10-29',
    endDate: '2026-11-04',
    onHold: false,
    lastChangedAt: NOW,
    changeNote: null,
    isSynthetic: true,
    ...p,
  };
}

const empty = (): SyncSlice => ({ medicines: [], reminders: [], syncedOrders: [], orderNotices: [] });
const active = (s: SyncSlice) => s.reminders.filter((r) => r.status === 'ACTIVE');

describe('CareBridge → ยายพร้อม reminder gate (P01–P11)', () => {
  it('P01: a printed/confirmed cart without explicit approval gives no reminder', () => {
    const r = importOrderSnapshot(empty(), order({ approval: 'AWAITING_AUTHORIZED_REVIEW', approvedBy: null, approvedAt: null }), ctx, NOW);
    expect(r.decision.kind).toBe('PENDING_REVIEW');
    expect(active(r.slice)).toHaveLength(0);
  });

  it('P02: approved but not dispensed gives no reminder', () => {
    const r = importOrderSnapshot(empty(), order({ dispense: 'PENDING', dispensedBy: null, dispensedAt: null }), ctx, NOW);
    expect(r.decision.kind).toBe('PENDING_REVIEW');
    expect(active(r.slice)).toHaveLength(0);
  });

  it('P03: approved + dispensed + confirmed fixed times + right patient gives one active, labelled reminder', () => {
    const r = importOrderSnapshot(empty(), order(), ctx, NOW);
    expect(r.decision).toEqual({ kind: 'ACTIVE', times: ['07:30', '11:30', '17:30'], sourceOrderId: 'RX-1', version: 1 });
    const plans = active(r.slice);
    expect(plans).toHaveLength(1);
    expect(plans[0].source).toBe('CLINICIAN_ORDER');
    expect(plans[0].orderRef).toMatchObject({ sourceOrderId: 'RX-1', sourceVersion: 1, verifiedByRole: 'SIMULATED_CLINICIAN' });
    expect(r.slice.medicines[0].displayName.verification).toBe('DEMO_REVIEW');
  });

  it('P04: importing the same order version twice adds nothing', () => {
    const once = importOrderSnapshot(empty(), order(), ctx, NOW);
    const twice = importOrderSnapshot(once.slice, order(), ctx, NOW);
    expect(twice.outcome).toBe('DUPLICATE');
    expect(twice.slice).toBe(once.slice);
    expect(twice.slice.reminders).toHaveLength(1);
    // an older version is stale
    const v2 = importOrderSnapshot(once.slice, order({ sourceVersion: 2 }), ctx, NOW);
    expect(importOrderSnapshot(v2.slice, order({ sourceVersion: 1 }), ctx, NOW).outcome).toBe('STALE');
  });

  it('P05: version 2 with new times discontinues the old plan and activates the new one', () => {
    const v1 = importOrderSnapshot(empty(), order(), ctx, NOW);
    const v2 = importOrderSnapshot(v1.slice, order({ sourceVersion: 2, plannedClockTimes: ['08:00', '18:00'] }), ctx, NOW);
    expect(v2.slice.reminders).toHaveLength(2);
    expect(v2.slice.reminders.find((r) => r.orderRef?.sourceVersion === 1)?.status).toBe('DISCONTINUED');
    expect(active(v2.slice)).toHaveLength(1);
    expect(active(v2.slice)[0].schedule).toEqual(['08:00', '18:00']);
    expect(v2.slice.syncedOrders[0].history.map((h) => h.version)).toEqual([1, 2]);
    expect(v2.slice.orderNotices[0].text).toContain('ปรับเวลาเตือน');
  });

  it('P06: a cancelled order leaves no active reminder but keeps its history', () => {
    const v1 = importOrderSnapshot(empty(), order(), ctx, NOW);
    const v2 = importOrderSnapshot(v1.slice, order({ sourceVersion: 2, approval: 'CANCELLED' }), ctx, NOW);
    expect(v2.decision.kind).toBe('STOPPED');
    expect(active(v2.slice)).toHaveLength(0);
    expect(v2.slice.reminders).toHaveLength(1);
    expect(v2.slice.syncedOrders[0].history).toHaveLength(2);
    expect(orderStatusLabels(v2.slice.syncedOrders[0]).map((l) => l.label)).toContain('ยกเลิก (จำลอง)');
  });

  it('P07: an order for another patient is rejected and nothing is stored', () => {
    const start = empty();
    const r = importOrderSnapshot(start, order({ patientId: 'someone-else' }), ctx, NOW);
    expect(r.outcome).toBe('REJECTED');
    expect(r.slice).toBe(start);
    // and without the patient's consent nothing is imported either
    expect(importOrderSnapshot(start, order(), { ...ctx, consentActive: false }, NOW).outcome).toBe('REJECTED');
  });

  it('P08: PRN or meal-relative directions without clock times never get an invented 08:00', () => {
    const mealOnly = importOrderSnapshot(empty(), order({ plannedClockTimes: null, scheduleConfirmedBy: null, scheduleConfirmedAt: null }), ctx, NOW);
    expect(mealOnly.decision.kind).toBe('PENDING_REVIEW');
    expect(mealOnly.decision.kind === 'PENDING_REVIEW' && mealOnly.decision.reason).toContain('รอกำหนดเวลาเตือน');
    expect(mealOnly.slice.reminders).toHaveLength(0);
    expect(mealOnly.slice.syncedOrders[0].status).toBe('PENDING_SCHEDULE_REVIEW');
    const prn = evaluateReminderSync(order({ regimenType: 'PRN' }), ctx);
    expect(prn.kind).toBe('PENDING_REVIEW');
    // times typed but not confirmed with the patient are not enough
    expect(evaluateReminderSync(order({ scheduleConfirmedBy: null, scheduleConfirmedAt: null }), ctx).kind).toBe('PENDING_REVIEW');
    expect(evaluateReminderSync(order({ plannedClockTimes: ['8:00'] }), ctx).kind).toBe('PENDING_REVIEW');
  });

  it('P09: partial dispense or unverified identity stays pending', () => {
    expect(evaluateReminderSync(order({ dispense: 'PARTIAL' }), ctx).kind).toBe('PENDING_REVIEW');
    const unclear = importOrderSnapshot(empty(), order({ medicineIdentityVerified: false }), ctx, NOW);
    expect(unclear.decision.kind).toBe('PENDING_REVIEW');
    expect(unclear.slice.medicines[0].pendingIdentification).toBe(true);
    expect(active(unclear.slice)).toHaveLength(0);
  });

  it('P11: the demo can never present an order as authentically signed', () => {
    // a demo-mode sync does not accept the production states, and every label says (จำลอง)
    expect(evaluateReminderSync(order({ approval: 'APPROVED_VERIFIED' }), ctx).kind).toBe('PENDING_REVIEW');
    expect(evaluateReminderSync(order({ dispense: 'VERIFIED_REAL' }), ctx).kind).toBe('PENDING_REVIEW');
    const r = importOrderSnapshot(empty(), order(), ctx, NOW);
    expect(orderStatusLabels(r.slice.syncedOrders[0]).filter((l) => l.key !== 'schedule').every((l) => l.label.includes('(จำลอง)'))).toBe(true);
  });

  it('ended, held or not-dispensed orders stop reminders', () => {
    expect(evaluateReminderSync(order({ endDate: '2026-10-20', startDate: '2026-10-10' }), ctx).kind).toBe('STOPPED');
    expect(evaluateReminderSync(order({ onHold: true }), ctx).kind).toBe('STOPPED');
    expect(evaluateReminderSync(order({ dispense: 'NOT_DISPENSED' }), ctx).kind).toBe('STOPPED');
  });
});

describe('ยายพร้อม store integration', () => {
  beforeEach(() => yaiStore.reset());
  const snap = (p: Partial<MedicationOrderSnapshot> = {}) => order({ sourceSystem: CAREBRIDGE_SOURCE, patientId: DEMO_PATIENT_ID, startDate: '2026-01-01', endDate: null, ...p });

  it('sync requires the patient consent; with it the order becomes a clinician reminder', () => {
    expect(yaiStore.syncClinicianOrders([snap()])[0].outcome).toBe('REJECTED');
    expect(yaiStore.getState().audit[0].action).toBe('ORDER_SYNC_REJECTED');
    yaiStore.grantConsent(CAREBRIDGE_RECIPIENT_ID, CAREBRIDGE_RECIPIENT_NAME, ['REMINDER_ALERTS', 'MEDICINES'], 90);
    expect(yaiStore.syncClinicianOrders([snap()])[0].outcome).toBe('IMPORTED');
    expect(yaiStore.syncClinicianOrders([snap()])[0].outcome).toBe('DUPLICATE');
    expect(yaiStore.getState().reminders.filter((r) => r.source === 'CLINICIAN_ORDER' && r.status === 'ACTIVE')).toHaveLength(1);
  });

  it('P05/P10: dose self-reports are idempotent and survive an order change', () => {
    yaiStore.grantConsent(CAREBRIDGE_RECIPIENT_ID, CAREBRIDGE_RECIPIENT_NAME, ['REMINDER_ALERTS', 'MEDICINES'], 90);
    yaiStore.syncClinicianOrders([snap()]);
    const plan = yaiStore.getState().reminders.find((r) => r.source === 'CLINICIAN_ORDER')!;
    yaiStore.reportDose(plan.id, '2026-10-29T07:30', 'TAKEN_REPORTED');
    yaiStore.reportDose(plan.id, '2026-10-29T07:30', 'TAKEN_REPORTED');
    expect(yaiStore.getState().doseLogs.filter((l) => l.reminderPlanId === plan.id)).toHaveLength(1);
    expect(yaiStore.getState().doseLogs[0].response).toBe('TAKEN_REPORTED');
    yaiStore.syncClinicianOrders([snap({ sourceVersion: 2, plannedClockTimes: ['09:00'] })]);
    expect(yaiStore.getState().doseLogs.filter((l) => l.reminderPlanId === plan.id)).toHaveLength(1);
  });

  it('a clinician-order reminder cannot be created by hand', () => {
    const res = yaiStore.createReminder('med-warfarin', ['08:00'], 'CLINICIAN_ORDER');
    expect(res.ok).toBe(false);
  });

  it('O02: an unlabeled capsule is pending identification and gets no reminder', () => {
    const id = yaiStore.addPendingMedicine('แคปซูลในถุงพลาสติก ญาติให้มา', []);
    const med = yaiStore.getState().medicines.find((m) => m.id === id)!;
    expect(med.pendingIdentification).toBe(true);
    expect(canCreateReminder(med, 'PATIENT_CONFIRMED').ok).toBe(false);
    expect(yaiStore.createReminder(id, ['08:00'], 'PATIENT_CONFIRMED').ok).toBe(false);
  });

  it('S03: clinician read is denied without consent and after revocation, and audited', () => {
    expect(yaiStore.readDoseReportsForClinician(CAREBRIDGE_RECIPIENT_ID).allowed).toBe(false);
    expect(yaiStore.getState().audit[0].action).toBe('DOSE_REPORTS_READ_DENIED');
    const grant = yaiStore.grantConsent(CAREBRIDGE_RECIPIENT_ID, CAREBRIDGE_RECIPIENT_NAME, ['REMINDER_ALERTS', 'MEDICINES'], 90);
    expect(yaiStore.readDoseReportsForClinician(CAREBRIDGE_RECIPIENT_ID).allowed).toBe(true);
    yaiStore.revokeConsent(grant);
    const after = yaiStore.readDoseReportsForClinician(CAREBRIDGE_RECIPIENT_ID);
    expect(after.allowed).toBe(false);
    expect(after.journal).toEqual([]);
    expect(yaiStore.getState().audit[0].action).toBe('DOSE_REPORTS_READ_DENIED');
  });
});

describe('element summary adapter (S01)', () => {
  it('uses the existing engine only for the linked patient with complete inputs', () => {
    const s = getElementSummaryForPatient(DEMO_PATIENT_ID);
    expect(s.status).toBe('AVAILABLE');
    if (s.status === 'AVAILABLE') {
      expect(s.birthElement).toContain('ปถวี');
      expect(s.dynamic.recommendedTaste.length).toBeGreaterThan(0);
      expect(s.ruleVersion).toContain('smutthan-rules');
    }
  });

  it('missing linkage or missing vitals gives UNKNOWN, never a made-up score', () => {
    expect(getElementSummaryForPatient('not-linked').status).toBe('UNKNOWN');
    const c11 = structuredClone(MockDataService.getCases().find((c) => c.case_id === 'C11')!);
    (c11.current_encounter as { vitals: unknown }).vitals = { btemp: null, sbp: 0, dbp: 0, pr: 0, rr: 0 };
    const s = summarizeCase(c11);
    expect(s.status).toBe('UNKNOWN');
    if (s.status === 'UNKNOWN') expect(s.missingInputs).toContain('สัญญาณชีพ');
  });
});
