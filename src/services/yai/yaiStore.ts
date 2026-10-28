import { useSyncExternalStore } from 'react';
import {
  AppointmentStatus,
  AuditAction,
  CapturedPhoto,
  ConsentScope,
  DoseSelfReport,
  EvidenceOrigin,
  MedicationPassport,
  ReminderSource,
  YaiSettings,
  YaiState,
} from '../../domain/yai/models';
import { canCreateReminder, canTransitionAppointment, isValidTime } from '../../domain/yai/policies';
import { createSeedState, field } from '../../data/yai/fixtures';

// Synthetic, browser-local demo store. Not a health record database:
// it holds fictional data only and can be wiped from Settings.

const STORAGE_KEY = 'yai-demo-v1';
const MAX_PHOTOS = 12;

function load(): YaiState {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as YaiState;
      if (parsed.schemaVersion === 1) return parsed;
    }
  } catch {
    // storage unavailable or corrupt: fall back to the seed
  }
  return createSeedState();
}

let state: YaiState = load();
const listeners = new Set<() => void>();

function persist() {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // quota or private mode: keep working in memory
  }
}

function set(next: YaiState) {
  state = next;
  persist();
  listeners.forEach((l) => l());
}

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function demoNow(s: YaiState = state): Date {
  return new Date(Date.now() + s.demoClockOffsetMinutes * 60_000);
}

function audit(s: YaiState, action: AuditAction, resource: string, actor = 'ผู้ใช้สาธิต'): YaiState {
  const event = { id: uid('audit'), at: demoNow(s).toISOString(), actor, action, resource, isSynthetic: true as const };
  return { ...s, audit: [event, ...s.audit].slice(0, 200) };
}

export const yaiStore = {
  getState: () => state,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  reset() {
    set(audit(createSeedState(), 'DEMO_RESET', 'all'));
  },

  updateSettings(patch: Partial<YaiSettings>) {
    set({ ...state, settings: { ...state.settings, ...patch } });
  },

  shiftDemoClock(minutes: number) {
    set({ ...state, demoClockOffsetMinutes: minutes === 0 ? 0 : state.demoClockOffsetMinutes + minutes });
  },

  addPhoto(photo: Omit<CapturedPhoto, 'id'>): string {
    const id = uid('photo');
    set({ ...state, photos: [{ ...photo, id }, ...state.photos].slice(0, MAX_PHOTOS) });
    return id;
  },

  setPhotoOcr(photoId: string, ocr: NonNullable<CapturedPhoto['ocr']>) {
    set({ ...state, photos: state.photos.map((p) => (p.id === photoId ? { ...p, ocr } : p)) });
  },

  /** Patient/caregiver checked or corrected the text read from one photo */
  updatePhotoText(photoId: string, text: string, verified: boolean) {
    set({
      ...state,
      photos: state.photos.map((p) =>
        p.id === photoId
          ? { ...p, ocr: { ...(p.ocr ?? { status: 'DONE' as const, text: '', lines: [], confidence: 0, engine: 'manual', at: demoNow().toISOString() }), status: 'DONE' as const, editedText: text, verified } }
          : p
      ),
    });
  },

  removePhoto(photoId: string) {
    set({ ...state, photos: state.photos.filter((p) => p.id !== photoId) });
  },

  saveMedicine(medicine: MedicationPassport) {
    const exists = state.medicines.some((m) => m.id === medicine.id);
    const now = demoNow().toISOString();
    const next = exists
      ? state.medicines.map((m) => (m.id === medicine.id ? { ...medicine, version: m.version + 1, updatedAt: now } : m))
      : [...state.medicines, { ...medicine, updatedAt: now }];
    set(audit({ ...state, medicines: next }, 'MEDICINE_SAVED', medicine.id));
  },

  /** "มีแค่นี้": record what the patient can describe, flagged for identification */
  addPendingMedicine(description: string, photoIds: string[] = []): string {
    const now = demoNow().toISOString();
    const id = uid('med');
    const medicine: MedicationPassport = {
      id,
      patientId: state.patient.id,
      version: 1,
      kind: 'UNKNOWN',
      form: field('UNKNOWN', 'PATIENT_VOICE'),
      displayName: field(null, 'PATIENT_VOICE'),
      ingredients: [],
      labelStrength: field(null, 'PATIENT_VOICE'),
      labelDirections: field(null, 'PATIENT_VOICE'),
      useReports: description.trim() ? [{ origin: 'PATIENT_VOICE', value: description.trim(), reportedAt: now }] : [],
      registrationNumber: field(null, 'PATIENT_VOICE'),
      photoIds,
      status: 'INSUFFICIENT_INFORMATION',
      pendingIdentification: true,
      unresolvedQuestions: ['ข้อมูลไม่ครบ รอผู้เชี่ยวชาญช่วยระบุ'],
      createdAt: now,
      updatedAt: now,
    };
    set(audit({ ...state, medicines: [...state.medicines, medicine] }, 'MEDICINE_SAVED', id));
    return id;
  },

  addUseReport(medicineId: string, origin: EvidenceOrigin, value: string) {
    if (!value.trim()) return;
    const now = demoNow().toISOString();
    set({
      ...state,
      medicines: state.medicines.map((m) =>
        m.id === medicineId
          ? { ...m, useReports: [...m.useReports, { origin, value: value.trim(), reportedAt: now }], version: m.version + 1, updatedAt: now }
          : m
      ),
    });
  },

  /** Correct a label field after saving; the value becomes a manual entry by the current user */
  updateLabelField(
    medicineId: string,
    key: 'displayName' | 'labelStrength' | 'labelDirections' | 'registrationNumber' | 'manufacturer' | 'ingredient' | 'form',
    value: string
  ) {
    const now = demoNow().toISOString();
    const verification = state.settings.role === 'CAREGIVER' ? ('CAREGIVER_REPORTED' as const) : ('PATIENT_REPORTED' as const);
    const v = value.trim() ? value.trim() : null;
    set({
      ...state,
      medicines: state.medicines.map((m) => {
        if (m.id !== medicineId) return m;
        const manual = <T,>(val: T | null) => ({ value: val, origin: 'MANUAL_ENTRY' as const, capturedAt: now, verification });
        const next = { ...m, version: m.version + 1, updatedAt: now };
        if (key === 'ingredient') next.ingredients = v ? [manual(v)] : [];
        else if (key === 'form') next.form = manual((v ?? 'UNKNOWN') as MedicationPassport['form']['value']);
        else next[key] = manual(v);
        // A medicine that now has a name can leave "pending identification" but still needs review
        if (key === 'displayName' && v && m.pendingIdentification) {
          next.pendingIdentification = false;
          next.status = 'REQUIRES_CLINICIAN_REVIEW';
        }
        return next;
      }),
    });
  },

  setPrevisitNote(note: string) {
    set({ ...state, previsitNote: note });
  },

  confirmMedicine(medicineId: string) {
    set({
      ...state,
      medicines: state.medicines.map((m) =>
        m.id === medicineId && !m.pendingIdentification && m.status !== 'CLINICIAN_VERIFIED'
          ? { ...m, status: 'PATIENT_CONFIRMED', version: m.version + 1, updatedAt: demoNow().toISOString() }
          : m
      ),
    });
  },

  /** Demo reviewer action; recorded as DEMO_REVIEW, never as a real clinician signature */
  demoReviewMedicine(medicineId: string) {
    set({
      ...state,
      medicines: state.medicines.map((m) =>
        m.id === medicineId && !m.pendingIdentification
          ? { ...m, status: 'CLINICIAN_VERIFIED', displayName: { ...m.displayName, verification: 'DEMO_REVIEW' }, version: m.version + 1 }
          : m
      ),
    });
  },

  deleteMedicine(medicineId: string) {
    set({
      ...state,
      medicines: state.medicines.filter((m) => m.id !== medicineId),
      reminders: state.reminders.map((r) => (r.medicineId === medicineId ? { ...r, status: 'DISCONTINUED' } : r)),
    });
  },

  createReminder(medicineId: string, schedule: string[], source: ReminderSource): { ok: boolean; reason?: string } {
    const medicine = state.medicines.find((m) => m.id === medicineId);
    if (!medicine) return { ok: false, reason: 'ไม่พบรายการยา' };
    const allowed = canCreateReminder(medicine, source);
    if (!allowed.ok) return allowed;
    const times = Array.from(new Set(schedule.filter(isValidTime))).sort();
    if (times.length === 0) return { ok: false, reason: 'กรุณาเลือกเวลาให้ถูกต้อง' };
    const reminders = state.reminders.map((r) => (r.medicineId === medicineId && r.status === 'ACTIVE' ? { ...r, status: 'DISCONTINUED' as const } : r));
    const plan = {
      id: uid('plan'),
      patientId: state.patient.id,
      medicineId,
      schedule: times,
      timeZone: 'Asia/Bangkok' as const,
      source,
      verifiedAt: demoNow().toISOString(),
      status: 'ACTIVE' as const,
    };
    set(audit({ ...state, reminders: [...reminders, plan] }, 'REMINDER_CREATED', plan.id));
    return { ok: true };
  },

  stopReminder(planId: string) {
    set({ ...state, reminders: state.reminders.map((r) => (r.id === planId ? { ...r, status: 'DISCONTINUED' } : r)) });
  },

  /** Self-report only. Re-reporting the same occurrence replaces the answer instead of adding a duplicate. */
  reportDose(planId: string, scheduledAt: string, response: DoseSelfReport) {
    const id = `${planId}@${scheduledAt}`;
    const log = { id, reminderPlanId: planId, scheduledAt, reportedAt: demoNow().toISOString(), response };
    set(audit({ ...state, doseLogs: [log, ...state.doseLogs.filter((l) => l.id !== id)] }, 'DOSE_REPORTED', id));
  },

  grantConsent(recipientId: string, recipientName: string, scope: ConsentScope[], days: number): string {
    const now = demoNow();
    const grant = {
      id: uid('consent'),
      patientId: state.patient.id,
      recipientId,
      recipientName,
      scope,
      grantedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + days * 86_400_000).toISOString(),
    };
    set(audit({ ...state, consents: [grant, ...state.consents] }, 'CONSENT_GRANTED', `${recipientId}:${scope.join(',')}`));
    return grant.id;
  },

  revokeConsent(consentId: string) {
    set(
      audit(
        { ...state, consents: state.consents.map((c) => (c.id === consentId && !c.revokedAt ? { ...c, revokedAt: demoNow().toISOString() } : c)) },
        'CONSENT_REVOKED',
        consentId
      )
    );
  },

  recordPrevisitAccess(recipientId: string, allowed: boolean) {
    set(audit(state, allowed ? 'PREVISIT_READ' : 'PREVISIT_READ_DENIED', recipientId, recipientId));
  },

  /** Idempotent: one open request per clinic */
  requestAppointment(clinicId: string, requestedWindow: string, note: string): string {
    const open = state.appointments.find((a) => a.clinicId === clinicId && ['REQUESTED', 'OFFERED', 'CONFIRMED'].includes(a.status));
    if (open) return open.id;
    const now = demoNow().toISOString();
    const appointment = {
      id: uid('appt'),
      patientId: state.patient.id,
      clinicId,
      status: 'REQUESTED' as const,
      requestedWindow,
      note,
      createdAt: now,
      updatedAt: now,
      isSynthetic: true as const,
    };
    set(audit({ ...state, appointments: [appointment, ...state.appointments] }, 'APPOINTMENT_REQUESTED', appointment.id));
    return appointment.id;
  },

  cancelAppointment(appointmentId: string) {
    const a = state.appointments.find((x) => x.id === appointmentId);
    if (!a || !canTransitionAppointment(a, 'CANCELLED', 'PATIENT')) return;
    set({ ...state, appointments: state.appointments.map((x) => (x.id === appointmentId ? { ...x, status: 'CANCELLED', updatedAt: demoNow().toISOString() } : x)) });
  },

  /** Simulated clinic response from the partner portal demo */
  simulateProviderResponse(appointmentId: string, to: AppointmentStatus, providerNote: string): boolean {
    const a = state.appointments.find((x) => x.id === appointmentId);
    if (!a || !canTransitionAppointment(a, to, 'SIMULATED_PROVIDER')) return false;
    set(
      audit(
        {
          ...state,
          appointments: state.appointments.map((x) => (x.id === appointmentId ? { ...x, status: to, providerNote, updatedAt: demoNow().toISOString() } : x)),
        },
        'APPOINTMENT_PROVIDER_UPDATE',
        `${appointmentId}:${to}`,
        'คลินิกจำลอง'
      )
    );
    return true;
  },
};

export function useYai<T>(selector: (s: YaiState) => T): T {
  return useSyncExternalStore(yaiStore.subscribe, () => selector(yaiStore.getState()), () => selector(yaiStore.getState()));
}
