import { describe, it, expect, beforeEach } from 'vitest';
import { canCreateReminder, canRead, canTransitionAppointment, screenInteractions, useDiscrepancy, missingFields } from '../../domain/yai/policies';
import { SEED_MEDICINES } from '../../data/yai/fixtures';
import { yaiStore } from '../../services/yai/yaiStore';
import { measureFrame } from '../../services/yai/frameQuality';
import { draftFromOcr, MockOCRAdapter } from '../../services/yai/ocrAdapter';
import { ConsentGrant } from '../../domain/yai/models';

const [warfarin, turmeric, decoction] = SEED_MEDICINES;

describe('ยายพร้อม safety policies', () => {
  beforeEach(() => yaiStore.reset());

  it('T09: never reports safe; zero matches only means no match in covered pairs', () => {
    expect(screenInteractions([warfarin]).verdict).toBe('NO_MATCH_IN_COVERED_PAIRS');
    expect(screenInteractions([warfarin, turmeric]).verdict).toBe('MATCHED_UNREVIEWED');
  });

  it('T08: an unidentified decoction makes the screening insufficient', () => {
    const res = screenInteractions([warfarin, decoction]);
    expect(res.verdict).toBe('INSUFFICIENT_INFORMATION');
    expect(res.unidentifiedCount).toBe(1);
  });

  it('T11: unconfirmed OCR draft cannot start a reminder', async () => {
    const ocr = await new MockOCRAdapter().extract();
    const draft = draftFromOcr(ocr, 'p', [], new Date().toISOString(), 'draft-1');
    expect(draft.status).toBe('DRAFT');
    expect(canCreateReminder(draft, 'PATIENT_CONFIRMED').ok).toBe(false);
    expect(canCreateReminder(decoction, 'PATIENT_CONFIRMED').ok).toBe(false);
    expect(canCreateReminder(warfarin, 'PATIENT_CONFIRMED').ok).toBe(true);
    expect(canCreateReminder(warfarin, 'CLINICIAN_ORDER').ok).toBe(false);
  });

  it('T05: mock OCR output is always flagged synthetic', async () => {
    const ocr = await new MockOCRAdapter().extract();
    expect(ocr.isSynthetic).toBe(true);
    const draft = draftFromOcr(ocr, 'p', ['photo-1'], new Date().toISOString(), 'draft-2');
    expect(draft.displayName.isSynthetic).toBe(true);
    expect(draft.displayName.verification).toBe('UNVERIFIED');
  });

  it('T06: unknown strength stays null and is listed as missing', async () => {
    const adapter = new MockOCRAdapter();
    await adapter.extract();
    const second = await adapter.extract();
    const draft = draftFromOcr(second, 'p', [], new Date().toISOString(), 'draft-3');
    expect(draft.labelStrength.value).toBeNull();
    expect(missingFields(draft)).toContain('ความแรงบนฉลาก');
  });

  it('T07: label, patient and caregiver disagreement is detected, not resolved', () => {
    expect(useDiscrepancy(turmeric)).toBe(true);
    expect(turmeric.useReports).toHaveLength(2);
    expect(useDiscrepancy(warfarin)).toBe(false);
  });

  it('T14: patient cannot confirm an appointment; only the clinic side can', () => {
    expect(canTransitionAppointment({ status: 'REQUESTED' }, 'CONFIRMED', 'PATIENT')).toBe(false);
    expect(canTransitionAppointment({ status: 'REQUESTED' }, 'CONFIRMED', 'SIMULATED_PROVIDER')).toBe(true);
    expect(canTransitionAppointment({ status: 'CANCELLED' }, 'CONFIRMED', 'SIMULATED_PROVIDER')).toBe(false);
  });

  it('T15/T16: consent is per recipient, scoped, and revocation blocks reads', () => {
    const now = new Date('2026-10-28T10:00:00+07:00');
    const grant: ConsentGrant = {
      id: 'c1',
      patientId: 'p',
      recipientId: 'clinic-a',
      recipientName: 'A',
      scope: ['PREVISIT_REPORT'],
      grantedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 86_400_000).toISOString(),
    };
    expect(canRead([grant], 'clinic-a', 'PREVISIT_REPORT', now)).toBe(true);
    expect(canRead([grant], 'clinic-b', 'PREVISIT_REPORT', now)).toBe(false);
    expect(canRead([grant], 'clinic-a', 'MEDICINES', now)).toBe(false);
    expect(canRead([{ ...grant, revokedAt: now.toISOString() }], 'clinic-a', 'PREVISIT_REPORT', now)).toBe(false);
    expect(canRead([grant], 'clinic-a', 'PREVISIT_REPORT', new Date(now.getTime() + 2 * 86_400_000))).toBe(false);
  });
});

describe('ยายพร้อม demo store', () => {
  beforeEach(() => yaiStore.reset());

  it('T22: repeated appointment requests and dose reports stay idempotent', () => {
    const a = yaiStore.requestAppointment('clinic-baitoei', 'เช้า', '');
    const b = yaiStore.requestAppointment('clinic-baitoei', 'เช้า', '');
    expect(a).toBe(b);
    expect(yaiStore.getState().appointments).toHaveLength(1);
    expect(yaiStore.getState().appointments[0].status).toBe('REQUESTED');

    yaiStore.reportDose('plan-warfarin', '2026-10-28T20:00', 'TAKEN_REPORTED');
    yaiStore.reportDose('plan-warfarin', '2026-10-28T20:00', 'UNCERTAIN');
    const logs = yaiStore.getState().doseLogs;
    expect(logs).toHaveLength(1);
    expect(logs[0].response).toBe('UNCERTAIN');
  });

  it('"มีแค่นี้" creates a pending item without blocking and it cannot be confirmed as identified', () => {
    const id = yaiStore.addPendingMedicine('ยาลูกกลอนห่อกระดาษ');
    yaiStore.confirmMedicine(id);
    const med = yaiStore.getState().medicines.find((m) => m.id === id)!;
    expect(med.pendingIdentification).toBe(true);
    expect(med.status).toBe('INSUFFICIENT_INFORMATION');
    expect(yaiStore.createReminder(id, ['08:00'], 'PATIENT_CONFIRMED').ok).toBe(false);
  });

  it('revoking consent writes an audit event', () => {
    const id = yaiStore.grantConsent('clinic-baitoei', 'ใบเตย', ['PREVISIT_REPORT'], 7);
    yaiStore.revokeConsent(id);
    const s = yaiStore.getState();
    expect(s.consents[0].revokedAt).toBeTruthy();
    expect(s.audit.some((e) => e.action === 'CONSENT_REVOKED')).toBe(true);
  });
});

describe('frame quality', () => {
  const frame = (fn: (x: number, y: number) => number, w = 32, h = 32) => {
    const data = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const v = fn(x, y);
        data.set([v, v, v, 255], (y * w + x) * 4);
      }
    return { data, width: w, height: h };
  };

  it('flags dark, flat and sharp frames from measurements', () => {
    expect(measureFrame(frame(() => 20)).status).toBe('TOO_DARK');
    expect(measureFrame(frame(() => 128)).status).toBe('BLURRY');
    expect(measureFrame(frame((x) => (x % 2 ? 60 : 200))).status).toBe('OK');
    expect(measureFrame(frame(() => 255)).status).toBe('GLARE');
  });
});
