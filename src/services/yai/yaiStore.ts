import { useSyncExternalStore } from 'react';
import {
  AppointmentStatus,
  AuditAction,
  CapturedPhoto,
  ConsentScope,
  DemoPersona,
  DoseSelfReport,
  EvidenceOrigin,
  Friend,
  HabitLog,
  HerbReview,
  Measurement,
  MedicationPassport,
  ReminderSource,
  YaiSettings,
  WellnessCheckin,
  YaiState,
} from '../../domain/yai/models';
import { canCreateReminder, canRead, canTransitionAppointment, isValidTime } from '../../domain/yai/policies';
import { bangkokDate, JournalEntry, SuggestedSegment } from '../../domain/yai/journal';
import { importOrderSnapshot, ImportOutcome, MedicationOrderSnapshot } from '../../domain/yai/prescriptionSync';
import { createSeedState, field, seedCheckins, seedHabitLogs } from '../../data/yai/fixtures';
import { linkForPatient } from '../../data/yai/demoLinks';
import { createPersonaSeedState } from '../../data/yai/personas';
import { photoStore } from './photoStore';

// Synthetic, browser-local demo store. Not a health record database:
// it holds fictional data only and can be wiped from Settings.

const STORAGE_KEY = 'yai-demo-v1';
const MAX_PHOTOS = 12;

function load(): YaiState {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as YaiState;
      // stores saved before the wellness redesign get the labelled demo check-ins once
      if (parsed.schemaVersion === 1) return parsed.checkins ? parsed : { ...parsed, checkins: seedCheckins(), habitLogs: parsed.habitLogs ?? seedHabitLogs() };
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
    // a reset reloads the demo user that is currently selected
    set(audit(createPersonaSeedState(state.settings.persona ?? 'RETIREE'), 'DEMO_RESET', 'all'));
    if (photoStore.available()) photoStore.clear().catch(() => undefined);
  },

  /** Load another synthetic demo user (presentations); keeps the viewer's theme and text size */
  switchPersona(persona: DemoPersona) {
    const next = createPersonaSeedState(persona);
    set(audit({ ...next, settings: { ...next.settings, theme: state.settings.theme, fontScale: state.settings.fontScale } }, 'DEMO_RESET', `persona:${persona}`));
    if (photoStore.available()) photoStore.clear().catch(() => undefined);
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

  setPhotoMeta(photoId: string, patch: Partial<Pick<CapturedPhoto, 'originalStored'>>) {
    set({ ...state, photos: state.photos.map((p) => (p.id === photoId ? { ...p, ...patch } : p)) });
  },

  removePhoto(photoId: string) {
    set({ ...state, photos: state.photos.filter((p) => p.id !== photoId) });
    if (photoStore.available()) photoStore.remove(photoId).catch(() => undefined);
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

  /**
   * Save a journal entry the patient (or caregiver) has just confirmed. Drafts are never stored, so a cancelled
   * review leaves no trace on the calendar. The local date is taken in Asia/Bangkok from the capture time.
   */
  saveJournalEntry(draft: Pick<JournalEntry, 'originalText' | 'reviewedText' | 'inputSource' | 'capturedAt' | 'segments' | 'photoIds'> &
    Partial<Pick<JournalEntry, 'photoTags' | 'ocrEngine' | 'linkedMedicineIds' | 'patientSaidComplete' | 'isSynthetic'>>): string {
    const id = uid('journal');
    const entry: JournalEntry = {
      ...draft,
      id,
      patientId: state.patient.id,
      recordedLocalDate: bangkokDate(draft.capturedAt),
      reviewedAt: demoNow().toISOString(),
      status: state.settings.role === 'CAREGIVER' ? 'CAREGIVER_CONFIRMED' : 'PATIENT_CONFIRMED',
      revision: 1,
      isSynthetic: draft.isSynthetic ?? false,
    };
    set(audit({ ...state, journal: [entry, ...(state.journal ?? [])] }, 'JOURNAL_SAVED', id));
    return id;
  },

  /** Edit a saved entry: the previous version goes to history; original text and photos are never changed */
  editJournalEntry(id: string, reviewedText: string, segments: SuggestedSegment[]) {
    const now = demoNow().toISOString();
    set(
      audit(
        {
          ...state,
          journal: (state.journal ?? []).map((e) =>
            e.id === id
              ? {
                  ...e,
                  history: [...(e.history ?? []), { revision: e.revision, reviewedText: e.reviewedText, segments: e.segments, editedAt: e.reviewedAt ?? e.capturedAt }],
                  reviewedText,
                  segments,
                  revision: e.revision + 1,
                  reviewedAt: now,
                }
              : e
          ),
        },
        'JOURNAL_EDITED',
        id
      )
    );
  },

  /**
   * Import clinician order snapshots from the demo CareBridge adapter. Every snapshot goes through
   * evaluateReminderSync(); re-importing the same version changes nothing.
   */
  syncClinicianOrders(snapshots: MedicationOrderSnapshot[]): { orderKey: string; outcome: ImportOutcome }[] {
    const link = linkForPatient(state.patient.id);
    const now = demoNow();
    const results: { orderKey: string; outcome: ImportOutcome }[] = [];
    let slice = { medicines: state.medicines, reminders: state.reminders, syncedOrders: state.syncedOrders ?? [], orderNotices: state.orderNotices ?? [] };
    let next = state;
    for (const snap of [...snapshots].sort((a, b) => a.sourceVersion - b.sourceVersion)) {
      const ctx = {
        expectedPatientId: state.patient.id,
        mode: 'DEMO' as const,
        consentActive: !!link && link.sourceSystem === snap.sourceSystem && canRead(state.consents, link.recipientId, 'REMINDER_ALERTS', now),
        today: bangkokDate(now),
      };
      const res = importOrderSnapshot(slice, snap, ctx, now.toISOString());
      results.push({ orderKey: `${snap.sourceSystem}::${snap.sourceOrderId}`, outcome: res.outcome });
      if (res.outcome === 'IMPORTED') {
        slice = res.slice;
        next = audit(next, 'ORDER_SYNCED', `${snap.sourceOrderId}@v${snap.sourceVersion}:${res.decision.kind}`, 'CareBridge (จำลอง)');
      } else if (res.outcome === 'REJECTED') {
        next = audit(next, 'ORDER_SYNC_REJECTED', `${snap.sourceOrderId}@v${snap.sourceVersion}`, 'CareBridge (จำลอง)');
      }
    }
    if (results.some((r) => r.outcome === 'IMPORTED' || r.outcome === 'REJECTED')) set({ ...next, ...slice });
    return results;
  },

  /**
   * Clinician-side read of the patient's dose self-reports. Allowed only with an active consent
   * (scope MEDICINES) for that recipient; every attempt is audited, denied ones too.
   */
  readDoseReportsForClinician(recipientId: string): {
    allowed: boolean;
    logs: YaiState['doseLogs'];
    plans: YaiState['reminders'];
    journal: JournalEntry[];
    pendingMedicines: number;
    medicines?: YaiState['medicines'];
    syncedOrders?: NonNullable<YaiState['syncedOrders']>;
    patient?: YaiState['patient'];
  } {
    const allowed = canRead(state.consents, recipientId, 'MEDICINES', demoNow());
    set(audit(state, allowed ? 'DOSE_REPORTS_READ' : 'DOSE_REPORTS_READ_DENIED', recipientId, recipientId));
    return allowed
      ? {
          allowed,
          medicines: state.medicines,
          syncedOrders: state.syncedOrders ?? [],
          patient: state.patient,
          logs: state.doseLogs,
          plans: state.reminders.filter((r) => r.source === 'CLINICIAN_ORDER'),
          journal: (state.journal ?? []).filter((e) => e.status !== 'DRAFT'),
          pendingMedicines: state.medicines.filter((m) => m.pendingIdentification).length,
        }
      : { allowed, logs: [], plans: [], journal: [], pendingMedicines: 0 };
  },

  /** Grandma (or caregiver) types a measurement; the app shows it as recorded and does not interpret it */
  addMeasurement(m: Pick<Measurement, 'type' | 'value' | 'value2'>): string {
    const now = demoNow().toISOString();
    const id = uid('meas');
    const row: Measurement = { ...m, id, at: now, date: bangkokDate(now), source: 'MANUAL', isSynthetic: false };
    set(audit({ ...state, measurements: [row, ...(state.measurements ?? [])] }, 'MEASUREMENT_ADDED', `${m.type}`));
    return id;
  },

  /**
   * Simulated device link: adds step counts for the last 7 days, labelled DEVICE_DEMO. A real link needs a native
   * app (Android Health Connect / Apple HealthKit / the watch maker's SDK); the web prototype cannot read them.
   */
  connectDemoDevice(kind: 'PHONE_DEMO' | 'WATCH_DEMO') {
    const now = demoNow();
    const device = kind === 'WATCH_DEMO' ? 'สมาร์ทวอทช์ (จำลอง)' : 'โทรศัพท์ (จำลอง)';
    const steps: Measurement[] = Array.from({ length: 7 }, (_, i) => {
      const at = new Date(now.getTime() - i * 86_400_000).toISOString();
      return { id: uid('steps'), type: 'STEPS', value: [4200, 5600, 3100, 6800, 4900, 7200, 3800][i], at, date: bangkokDate(at), source: 'DEVICE_DEMO', device, isSynthetic: true };
    });
    const kept = (state.measurements ?? []).filter((m) => m.source !== 'DEVICE_DEMO');
    set(audit({ ...state, measurements: [...steps, ...kept], settings: { ...state.settings, deviceLink: kind } }, 'DEVICE_LINKED', kind));
  },

  disconnectDevice() {
    set({ ...state, measurements: (state.measurements ?? []).filter((m) => m.source !== 'DEVICE_DEMO'), settings: { ...state.settings, deviceLink: 'NONE' } });
  },

  addHerbReview(r: Omit<HerbReview, 'id' | 'at' | 'author' | 'isSelf' | 'isSynthetic'>): string {
    const id = uid('review');
    const review: HerbReview = { ...r, id, at: demoNow().toISOString(), author: state.patient.displayName, isSelf: true, isSynthetic: false };
    set(audit({ ...state, herbReviews: [review, ...(state.herbReviews ?? [])] }, 'HERB_REVIEWED', r.herbName));
    return id;
  },

  /** Demo invite code; friends see only display name and weekly points */
  addFriendByCode(code: string, invitable: Record<string, Friend>): { ok: boolean; reason?: string } {
    const f = invitable[code.trim().toUpperCase()];
    if (!f) return { ok: false, reason: 'ไม่พบรหัสนี้' };
    if ((state.friends ?? []).some((x) => x.id === f.id)) return { ok: false, reason: 'เป็นเพื่อนกันอยู่แล้ว' };
    set(audit({ ...state, friends: [...(state.friends ?? []), f] }, 'FRIEND_ADDED', f.id));
    return { ok: true };
  },

  hideAd(adId: string) {
    set({ ...state, settings: { ...state.settings, hiddenAds: [...new Set([...(state.settings.hiddenAds ?? []), adId])] } });
  },

  /** Save today's check-in; fields left empty stay empty (never defaulted). Saving again the same day updates it. */
  saveCheckin(fields: Omit<WellnessCheckin, 'id' | 'date' | 'at' | 'source' | 'isSynthetic'>): string {
    const at = demoNow().toISOString();
    const date = bangkokDate(at);
    const clean = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined && v !== null && !Number.isNaN(v)));
    const existing = (state.checkins ?? []).find((c) => c.date === date);
    const row: WellnessCheckin = { ...(existing ?? {}), ...clean, id: existing?.id ?? uid('checkin'), date, at, source: 'SELF_REPORTED', isSynthetic: false };
    set(audit({ ...state, checkins: [row, ...(state.checkins ?? []).filter((c) => c.date !== date)] }, 'CHECKIN_SAVED', date));
    return row.id;
  },

  /** Tick or untick a habit for today */
  toggleHabit(goalId: string) {
    const at = demoNow().toISOString();
    const date = bangkokDate(at);
    const logs = state.habitLogs ?? [];
    const has = logs.some((l) => l.date === date && l.goalId === goalId);
    const next: HabitLog[] = has ? logs.filter((l) => !(l.date === date && l.goalId === goalId)) : [{ date, goalId, at, isSynthetic: false }, ...logs];
    set(audit({ ...state, habitLogs: next }, 'HABIT_LOGGED', goalId));
  },

  setGoals(goals: string[]) {
    set(audit({ ...state, settings: { ...state.settings, goals } }, 'GOALS_UPDATED', goals.join(',')));
  },

  /** Remove every demo (synthetic) wellness record so the empty states can be seen */
  clearDemoWellness() {
    set({
      ...state,
      checkins: (state.checkins ?? []).filter((c) => !c.isSynthetic),
      habitLogs: (state.habitLogs ?? []).filter((l) => !l.isSynthetic),
      measurements: (state.measurements ?? []).filter((m) => !m.isSynthetic),
      journal: (state.journal ?? []).filter((e) => !e.isSynthetic),
    });
  },

  skipGreeting(quote: string) {
    set({ ...state, settings: { ...state.settings, greetingSkips: [...(state.settings.greetingSkips ?? []), quote].slice(-20) } });
  },

  createReminder(medicineId: string, schedule: string[], source: ReminderSource): { ok: boolean; reason?: string } {
    const medicine = state.medicines.find((m) => m.id === medicineId);
    if (!medicine) return { ok: false, reason: 'ไม่พบรายการยา' };
    // clinician-order reminders come only from syncClinicianOrders(), which applies the stricter order gate
    if (source === 'CLINICIAN_ORDER') return { ok: false, reason: 'การเตือนตามคำสั่งแพทย์สร้างได้จากคำสั่งยาที่รับรองและจ่ายยาแล้วเท่านั้น' };
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
