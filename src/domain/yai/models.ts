// ยายพร้อม (YaiPrompt) domain model.
// Platform-neutral types shared by the patient app, clinician packet and partner portal.
// Every value that can be unknown is nullable: unknown is never the same as "normal" or "safe".

import type { JournalEntry } from './journal';
import type { LinkedOrderRef, OrderNotice, SyncedOrderRecord } from './prescriptionSync';
import type { HomeLocation } from './facilityRanking';

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
  /** OCR engine/model that produced the value (field-level provenance) */
  ocrEngine?: string;
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
  /** set when this record mirrors a clinician order synced from CareBridge (sourceSystem::sourceOrderId) */
  linkedOrderKey?: string;
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
  /** full-resolution original saved in IndexedDB (see photoStore) */
  originalStored?: boolean;
  quality?: { brightness: number; sharpness: number; glare: number };
  /** on-device OCR result for this photo, if it has been read */
  ocr?: {
    status: 'DONE' | 'FAILED';
    text: string;
    lines: { text: string; confidence: number | null }[];
    /** 0..100, or null when the engine reports none (Typhoon) */
    confidence: number | null;
    engine: string;
    at: string;
    provider?: 'server' | 'on-device';
    model?: string;
    preprocess?: string;
    fallbackReason?: string;
    /** SHA-256 of the exact bytes the server read */
    imageSha256?: string;
    /** text after the patient/caregiver checked or corrected it */
    editedText?: string;
    /** the patient/caregiver confirmed this text matches the label */
    verified?: boolean;
  };
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
  /** for CLINICIAN_ORDER plans: the exact order version this schedule came from */
  orderRef?: LinkedOrderRef;
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
  /** HOSPITAL = hospital with a Thai traditional medicine service; CLINIC = clinic / TTM centre / pharmacy */
  kind?: 'HOSPITAL' | 'CLINIC';
  /** a licensed Thai traditional medicine practitioner works here (demo listing, not verified) */
  hasTtmDoctor?: boolean;
  lat?: number;
  lng?: number;
  hours?: string;
}

/** Health measurements grandma (or a linked device) records; values are shown as recorded, never judged by the app */
export type MeasurementType = 'WEIGHT' | 'GLUCOSE' | 'BP' | 'STEPS';
export interface Measurement {
  id: string;
  type: MeasurementType;
  value: number;
  /** diastolic for BP */
  value2?: number;
  at: string;
  /** YYYY-MM-DD Asia/Bangkok */
  date: string;
  source: 'MANUAL' | 'DEVICE_DEMO';
  device?: string;
  isSynthetic: boolean;
}

/** A user's own experience with a herb: patient-reported, not clinical evidence */
export interface HerbReview {
  id: string;
  author: string;
  isSelf: boolean;
  herbName: string;
  /** how much it helped, 1..5, in the user's view */
  rating: 1 | 2 | 3 | 4 | 5;
  sideEffects: 'NONE' | 'MILD' | 'BOTHERSOME';
  sideEffectNote: string;
  weeksUsed: number;
  wouldRecommend: boolean;
  note: string;
  at: string;
  /** agreed that this review may be used, de-identified, for research */
  consentResearch: boolean;
  isSynthetic: boolean;
}

/** A linked friend on the points board; only display name and points are shared, never health details */
export interface Friend {
  id: string;
  name: string;
  avatar: string;
  weeklyPoints: number;
  /** total steps in the last 7 days, shared only as a weekly total */
  weeklySteps?: number;
  streak: number;
  isSynthetic: true;
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
  | 'DEMO_RESET'
  | 'JOURNAL_SAVED'
  | 'JOURNAL_EDITED'
  | 'ORDER_SYNCED'
  | 'ORDER_SYNC_REJECTED'
  | 'DOSE_REPORTS_READ'
  | 'DOSE_REPORTS_READ_DENIED'
  | 'MEASUREMENT_ADDED'
  | 'DEVICE_LINKED'
  | 'HERB_REVIEWED'
  | 'FRIEND_ADDED'
  | 'CHECKIN_SAVED'
  | 'HABIT_LOGGED'
  | 'GOALS_UPDATED';
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
  /** spoken scan guidance; off unless the user turns it on */
  voiceGuide?: boolean;
  /** agreed to send label photos to the OCR server (and Typhoon); undefined = not asked yet */
  cloudOcrConsent?: boolean;
  /** home area used to sort hospitals/clinics nearest first; stays in this browser */
  home?: HomeLocation;
  /** step source; DEMO values are simulated (a web app cannot read Health Connect / HealthKit directly) */
  deviceLink?: 'NONE' | 'PHONE_DEMO' | 'WATCH_DEMO';
  /** show my weekly points (not health data) to linked friends */
  shareScore?: boolean;
  /** ads the user chose to hide */
  hiddenAds?: string[];
  /** greeting quotes grandma did not like */
  greetingSkips?: string[];
  /** YaiPrompt colour theme; dark is the default premium look */
  theme?: 'dark' | 'light';
  /** wellness goals the user chose (ids from WELLNESS_GOALS) */
  goals?: string[];
  /** daily step goal the user picked (steps/day) */
  stepGoal?: number;
  /** which synthetic demo user is loaded (absent = the retiree, คุณยายสมศรี) */
  persona?: DemoPersona;
}

/** Synthetic demo users for presentations: an active retiree (68) and an active professional (48) */
export type DemoPersona = 'RETIREE' | 'PROFESSIONAL';

/** One self-reported daily wellness check-in; every field is optional and nothing is filled in for the user */
export interface WellnessCheckin {
  id: string;
  /** Asia/Bangkok local date, one check-in per date (saving again updates it) */
  date: string;
  at: string;
  sleepHours?: number;
  /** 1..5 how rested the user feels */
  sleepQuality?: 1 | 2 | 3 | 4 | 5;
  energy?: 1 | 2 | 3 | 4 | 5;
  mood?: 1 | 2 | 3 | 4 | 5;
  activityMinutes?: number;
  source: 'SELF_REPORTED';
  isSynthetic: boolean;
}

/** User ticked a habit for a goal on a date (self-reported) */
export interface HabitLog {
  date: string;
  goalId: string;
  at: string;
  isSynthetic: boolean;
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
  /** confirmed daily journal entries (optional so stores saved before the journal existed still load) */
  journal?: JournalEntry[];
  /** clinician orders received through the demo CareBridge adapter */
  syncedOrders?: SyncedOrderRecord[];
  /** in-app notices about order changes (no background push) */
  orderNotices?: OrderNotice[];
  measurements?: Measurement[];
  herbReviews?: HerbReview[];
  friends?: Friend[];
  checkins?: WellnessCheckin[];
  habitLogs?: HabitLog[];
}
