// ยายพร้อม (YaiPrompt) domain model.
// Platform-neutral types shared by the patient app, clinician packet and partner portal.
// Every value that can be unknown is nullable: unknown is never the same as "normal" or "safe".

export type PatientId = string;

export type Verification = 'UNVERIFIED' | 'PATIENT_REPORTED' | 'CAREGIVER_REPORTED' | 'CLINICIAN_VERIFIED' | 'DEMO_REVIEW';
export type EvidenceOrigin = 'PHOTO_LABEL' | 'PATIENT_VOICE' | 'CAREGIVER_VOICE' | 'CLINICIAN' | 'MANUAL_ENTRY';
export type MedicineKind = 'CONVENTIONAL' | 'HERBAL_FORMULA' | 'BOTANICAL' | 'SUPPLEMENT' | 'UNKNOWN';
export type ProductForm = 'TABLET' | 'CAPSULE' | 'POWDER' | 'EXTRACT' | 'DECOCTION' | 'SACHET' | 'OTHER' | 'UNKNOWN';
export type MedicationStatus =
  | 'DRAFT'
  | 'INSUFFICIENT_INFORMATION'
  | 'PATIENT_CONFIRMED'
  | 'REQUIRES_CLINICIAN_REVIEW'
  | 'CLINICIAN_VERIFIED';

export interface EvidenceField<T> {
  value: T | null;
  origin: EvidenceOrigin;
  capturedAt: string;
  evidencePhotoIds?: string[];
  rawText?: string;
  /** OCR engine confidence only (0..1); says nothing about clinical correctness */
  extractionConfidence?: number;
  /** true when the value came from a simulated OCR fixture, not from the captured pixels */
  isSynthetic?: boolean;
  verification: Verification;
}

/** One source's statement about how the medicine is actually used ("Three Voices") */
export interface UseReport {
  origin: EvidenceOrigin;
  value: string;
  reportedAt: string;
}

export interface MedicationPassport {
  id: string;
  patientId: PatientId;
  version: number;
  kind: MedicineKind;
  form: EvidenceField<ProductForm>;
  displayName: EvidenceField<string>;
  ingredients: EvidenceField<string>[];
  /** Strength printed on the label; not the dose actually taken */
  labelStrength: EvidenceField<string>;
  /** Directions printed on the label */
  labelDirections: EvidenceField<string>;
  /** What each source says about real-world use; never merged automatically */
  useReports: UseReport[];
  registrationNumber: EvidenceField<string>;
  /** optional for records saved before this field existed */
  manufacturer?: EvidenceField<string>;
  photoIds: string[];
  status: MedicationStatus;
  pendingIdentification: boolean;
  unresolvedQuestions: string[];
  createdAt: string;
  updatedAt: string;
}

/** Package side the user says a photo shows; tagged by the user, not detected automatically */
export type CaptureSide = 'FRONT' | 'BACK' | 'DIRECTIONS' | 'REGISTRATION';

export interface CapturedPhoto {
  id: string;
  side?: CaptureSide;
  /** data URL kept only in this browser for the demo */
  dataUrl: string;
  capturedAt: string;
  source: 'CAMERA' | 'UPLOAD';
  quality?: { brightness: number; sharpness: number; glare: number };
}

export interface ConsentGrant {
  id: string;
  patientId: PatientId;
  recipientId: string;
  recipientName: string;
  scope: ConsentScope[];
  grantedAt: string;
  expiresAt?: string;
  revokedAt?: string;
}
export type ConsentScope = 'PREVISIT_REPORT' | 'MEDICINES' | 'APPOINTMENTS' | 'REMINDER_ALERTS';

export type AppointmentStatus = 'DRAFT' | 'REQUESTED' | 'OFFERED' | 'CONFIRMED' | 'DECLINED' | 'CANCELLED';
export interface AppointmentRequest {
  id: string;
  patientId: PatientId;
  clinicId: string;
  status: AppointmentStatus;
  requestedWindow: string;
  note: string;
  createdAt: string;
  updatedAt: string;
  /** set when a (simulated) provider changed the status */
  providerNote?: string;
  isSynthetic: true;
}

export type ReminderSource = 'CLINICIAN_ORDER' | 'PATIENT_CONFIRMED';
export interface ReminderPlan {
  id: string;
  patientId: PatientId;
  medicineId: string;
  /** "HH:mm" in Asia/Bangkok */
  schedule: string[];
  timeZone: 'Asia/Bangkok';
  source: ReminderSource;
  verifiedAt: string;
  status: 'ACTIVE' | 'PAUSED' | 'DISCONTINUED';
}

export type DoseSelfReport = 'TAKEN_REPORTED' | 'NOT_YET_REPORTED' | 'UNCERTAIN';
export interface DoseLog {
  /** occurrence id: planId + date + time, so repeated taps stay idempotent */
  id: string;
  reminderPlanId: string;
  scheduledAt: string;
  reportedAt: string;
  response: DoseSelfReport;
}

export interface Clinic {
  id: string;
  name: string;
  province: string;
  district: string;
  services: ('TTM' | 'PHARMACIST' | 'GERIATRIC' | 'MASSAGE')[];
  accessibility: ('WHEELCHAIR' | 'CAREGIVER_FRIENDLY' | 'PARKING')[];
  verification: 'DEMO_LISTING';
  description: string;
}

export type AuditAction =
  | 'CONSENT_GRANTED'
  | 'CONSENT_REVOKED'
  | 'PREVISIT_READ'
  | 'PREVISIT_READ_DENIED'
  | 'APPOINTMENT_REQUESTED'
  | 'APPOINTMENT_PROVIDER_UPDATE'
  | 'MEDICINE_SAVED'
  | 'REMINDER_CREATED'
  | 'DOSE_REPORTED'
  | 'DEMO_RESET';
export interface AuditEvent {
  id: string;
  at: string;
  actor: string;
  action: AuditAction;
  resource: string;
  isSynthetic: true;
}

export type InteractionVerdict =
  | 'MATCHED_UNREVIEWED'
  | 'NO_MATCH_IN_COVERED_PAIRS'
  | 'INSUFFICIENT_INFORMATION';

export interface YaiSettings {
  fontScale: 100 | 125 | 150;
  familyName: string;
  familyPhone: string;
  onboarded: boolean;
  role: 'PATIENT' | 'CAREGIVER';
}

export interface YaiState {
  schemaVersion: 1;
  patient: { id: PatientId; displayName: string; age: number; province: string; hn?: string };
  medicines: MedicationPassport[];
  photos: CapturedPhoto[];
  consents: ConsentGrant[];
  appointments: AppointmentRequest[];
  reminders: ReminderPlan[];
  doseLogs: DoseLog[];
  audit: AuditEvent[];
  settings: YaiSettings;
  /** demo clock offset so a presenter can jump to the next reminder; labelled in the UI */
  demoClockOffsetMinutes: number;
  /** free-text note the patient adds to the pre-visit packet */
  previsitNote?: string;
}
