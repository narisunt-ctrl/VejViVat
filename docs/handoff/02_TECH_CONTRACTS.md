# Engineering design / contracts for Claude Code
These are **proposed additions** to an existing repository. Inspect every actual type/export before coding; do not copy these contracts blindly if stronger types already exist.

## A. Existing code to reuse
| Area | Existing path | Action |
|---|---|---|
| React routing | `src/app/Router.tsx`, `src/app/YaiRoutes.tsx` | Add journal routes inside existing patient shell; no route replacement |
| Patient home | `src/pages/yai/YaiHomePage.tsx` | Re-design voice-first; retain existing useful reminders / onboarding links |
| Existing OCR + provenance | `src/pages/yai/ScanPage.tsx`, `ScanReviewPage.tsx`, `src/services/yai/ocrPipeline.ts`, `labelParser.ts`, `photoStore.ts` | Reuse capture/read; remove burdensome live-camera coaching, keep optional static hints |
| Medicine passport | `src/domain/yai/models.ts`, `src/services/yai/yaiStore.ts`, `src/pages/yai/MedicinePassportPage.tsx` | Extend with origin-linked verified prescription, don't overwrite reported use |
| Reminders | `src/domain/yai/policies.ts`, `src/services/yai/reminderSchedule.ts`, `src/pages/yai/RemindersPage.tsx` | Extend source gate, versioning and status; keep existing self-reports |
| Clinician prescribing | `src/pages/PrescribePage.tsx`, `src/pages/PrescriptionPrintPage.tsx`, `src/types/drug.ts`, `src/services/mockDataService.ts` | Add **explicit reviewed-order demo flow**; printed cart is not a signed order |
| Element calculator | `src/services/smutthanEngine.ts` + `data/rules/smutthan-rules.json` | Call existing function with verified available inputs; no formula rewrite |
| Existing FHIR stub | `src/adapters/fhirStubAdapter.ts` | Extend mapping only after inspecting actual implementation; do not call it a live FHIR API |
| Yai fixture data | `src/data/yai/fixtures.ts` | Synthetic only. Map demo clinician case and grandma explicitly |

## B. Proposed module structure
Add only if not already present:
```
src/domain/yai/journal.ts                    // JournalEntry, provenance, review states
src/domain/yai/prescriptionSync.ts           // order, dispense, versioned sync policies
src/services/yai/journalStore.ts             // browser-only demo store (synthetic only)
src/services/yai/thaiVoiceJournal.ts         // STT capability detection + fallback
src/services/yai/healthTextClassifier.ts     // conservative draft splitter
src/services/yai/prescriptionSyncAdapter.ts  // demo bridge, production interface boundary
src/services/yai/elementSummaryAdapter.ts   // read existing calc result or unknown
src/pages/yai/JournalProcessPage.tsx
src/pages/yai/JournalReviewPage.tsx
src/pages/yai/JournalHistoryPage.tsx
src/components/yai/DailyHeatmap.tsx
src/components/yai/VoiceEntryButton.tsx
src/components/yai/SourceVerificationChip.tsx
src/tests/yai-journal.test.ts
src/tests/yai-prescription-sync.test.ts
```
Do not build a new app shell. Preserve `HashRouter` URLs. Build responsive 390px and desktop views.

## C. Journal models (example TypeScript)
```ts
export type JournalInputSource = 'VOICE_TRANSCRIPT' | 'MANUAL_TEXT' | 'PHOTO_OCR' | 'CAREGIVER_TEXT';
export type JournalCategory = 'SYMPTOM' | 'MEDICINE_USE_REPORT' | 'FOOD_CONSUMED' | 'OTHER';
export type JournalReviewStatus = 'DRAFT' | 'PATIENT_CONFIRMED' | 'CAREGIVER_CONFIRMED';

export interface SuggestedSegment {
  id: string;
  category: JournalCategory;
  /** User/AI wording, never a medical diagnosis */
  text: string;
  sourceStart?: number;
  sourceEnd?: number;
  confidence?: number; // classification confidence, NOT clinical confidence
  correctedByUser: boolean;
}

export interface JournalEntry {
  id: string;
  patientId: string;
  originalText: string;
  reviewedText: string;
  inputSource: JournalInputSource;
  capturedAt: string;           // ISO timestamp
  recordedLocalDate: string;    // YYYY-MM-DD, Asia/Bangkok at actual capture
  reviewedAt: string | null;
  status: JournalReviewStatus;
  segments: SuggestedSegment[];
  photoIds: string[];
  /** Version history must preserve original text and photo references */
  revision: number;
  isSynthetic: boolean;
}
```
Rules: journal draft is not counted before save. Date heatmap counts a distinct local date with >=1 user-confirmed entry. Multiple fields/symptoms in one entry are still one entry; multiple entries in one day are 1 recorded day. Prefer calendar code that determines weekday offset correctly and uses local midnight; no hard-coded Oct 2026 date.

For classifications, a deterministic conservative fallback is acceptable for the hackathon; if using LLM, keep a typed schema, validated output, explicit timeouts, and never use any result as clinical instruction. The user can edit/remove each segment. Unknown text is always recordable as `OTHER`. Do not assert 'AI recognized' when it is only a keyword demo.

## D. Prescription Sync — separation of concerns
A mock prescribing cart currently exists; it is NOT synonymous with approved order. Implement these **new explicit states** in an isolated domain rather than abusing `MedicationPassport.status`:

```ts
export type OrderLifecycle =
  | 'DRAFT'
  | 'AWAITING_AUTHORIZED_REVIEW'
  | 'APPROVED_DEMO'    // synthetic sandbox clinician action only
  | 'APPROVED_VERIFIED' // reserved for authenticated production adapter
  | 'CANCELLED'
  | 'SUPERSEDED';

export type DispenseLifecycle = 'UNKNOWN' | 'PENDING' | 'VERIFIED_DEMO' | 'VERIFIED_REAL' | 'PARTIAL' | 'NOT_DISPENSED';
export type ReminderSyncStatus = 'NOT_ELIGIBLE' | 'PENDING_SCHEDULE_REVIEW' | 'ACTIVE' | 'PAUSED' | 'DISCONTINUED';

export interface MedicationOrderSnapshot {
  sourceSystem: string;       // e.g. 'VEJVIVAT_DEMO'
  sourceOrderId: string;      // stable per provider order
  sourceVersion: number;     // monotonically increasing
  patientId: string;         // linked by explicit demo mapping, not guessed by name
  prescriberId: string | null;
  approval: OrderLifecycle;
  dispense: DispenseLifecycle;
  medicineIdentityVerified: boolean;
  medicineName: string | null;
  formulation: string | null;
  strengthLabel: string | null;
  dosePerAdministration: string | null;
  route: string | null;
  directions: string | null;
  plannedClockTimes: string[] | null; // must be explicit, validated HH:mm
  regimenType: 'SCHEDULED' | 'PRN' | 'CONDITIONAL' | 'TAPER' | 'UNKNOWN';
  startDate: string | null;
  endDate: string | null;
  lastChangedAt: string;
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
```

### Eligibility gate for a **CLINICIAN_ORDER** reminder
All checks must pass:
- Explicit mapped `patientId` is correct, and patient/clinic access permissions allow sync.
- `approval` is `APPROVED_DEMO` *only in clearly isolated synthetic demo* OR real authenticated `APPROVED_VERIFIED` in future production.
- `medicineIdentityVerified === true`, name and dose/directions have clinically reviewed provenance.
- Dispense is `VERIFIED_DEMO` *in demo* or `VERIFIED_REAL` *in production*. Partial dispense must require review, not silently activate full original schedule.
- Regimen is `SCHEDULED`, times are **explicit, checked and unambiguous**, timezone `Asia/Bangkok` unless verified otherwise, and applicable start/end bounds known.
- No active cancellation/supersession/hold; no unresolved conflicting instructions that affect schedule.
- Do not accept timestamps set by the patient as `clinicianVerifiedAt` or `dispensedAt`.

Expected decision function:
```ts
export type SyncDecision =
  | { kind: 'ACTIVE'; times: string[]; sourceOrderId: string; version: number }
  | { kind: 'PENDING_REVIEW'; reason: string }
  | { kind: 'REJECTED'; reason: string }
  | { kind: 'STOPPED'; reason: string };

export function evaluateReminderSync(order: MedicationOrderSnapshot): SyncDecision {
  // IMPLEMENT AS PURE FUNCTION + UNIT TESTS.
  // No ad-hoc UI conditional is allowed to bypass this gate.
  throw new Error('IMPLEMENT');
}
```

### Idempotency / update handling
- Composite id `sourceSystem + sourceOrderId` identifies an order; `sourceVersion` is monotonic. Same version re-imported = zero new reminders; older version = reject as stale.
- New approved version changes an existing schedule atomically: discontinue old *future* reminders, preserve prior `DoseLog` and revisions; create new future occurrences only for the new regimen.
- `CANCELLED`, `SUPERSEDED`, held, or `NOT_DISPENSED` status disables future reminders, retains history, and displays a meaningful update notice.
- A PRN or meal-relative instruction without verified times remains visible in medicine information but cannot generate fixed HH:mm reminders.
- Reconcile item by order ID + medication identity; do not collapse different products simply because their names match.
- Distinguish order state, dispense state, medicine identity, and patient-reported consumption.
- Existing `canCreateReminder(medicine, 'PATIENT_CONFIRMED')` may allow a manual/demo reminder for a confirmed medication. DO NOT silently relabel that as a synchronized clinician order; either preserve legacy path with visible `patient-defined demo reminder` wording or gate it separately. Synchronization must use its stricter policy.

## E. Consent, trust, account linking
The demo currently has a Yai `DEMO_PATIENT_ID` and clinician case IDs such as `C01`. These are NOT inherently the same patient. Create an explicit synthetic `DemoPatientLink` mapping; never match on age, nickname, phone, HN or approximate name.
- For production, use authenticated identity binding, role-based access, scoped grants, secure backend with event outbox and immutable audit, not browser `localStorage`.
- Consent to send data to clinic is distinct from receiving a reviewed order/notifications; design user-facing transparency and permissions accordingly.
- Read/update access to another patient's data must fail closed.
- For the hackathon, a **same-origin browser-only demo adapter** can read approved synthetic order snapshots, and the UI must label it 'เชื่อมข้อมูลจำลองภายในแอป'. No claim of real hospital sync, external pharmacy integration, or background push.

## F. Concrete doctor workflow (minimal effort)
`/prescribe`: retain current formulary/search/HDI UI. Add a small separate 'ดูตัวอย่างการส่งคำสั่งยาไปยายพร้อม' reviewed-order panel or a `CareBridgePrescriptionSyncPanel` at the end. Demo clinician clicks explicit 'รับรองคำสั่งยา (จำลอง)' — separate from printing — and a simulated pharmacist handover action verifies dispense. Then adapter publishes versioned snapshot.

Do not auto-sign by clicking 'พิมพ์ใบสั่งยา'. Do not auto-review interactions or assert no risks from tiny rule database. Clearly identify who acted and the synthetic nature.

## G. Existing Smutthan Engine integration
1. Inspect `src/services/smutthanEngine.ts` input types (`PatientInfo`, `Vitals`, `AmbientContext`) and `src/types/smutthan.ts` output fields; preserve the current formula.
2. Define `getElementSummaryForPatient(patientId): ElementSummary | {status:'UNKNOWN', missingInputs:string[]}` as an adapter. Retrieve **same linked patient ID** used for journal/order; do not assume every Yai demo patient maps to an existing 30-case clinician fixture.
3. Distinguish stable **birth element** from dynamic **Smutthan imbalance** based on five input groups. If data don't support both, show only supported category.
4. For missing vitals/weather/birth element, do not silently insert 'normal' values. Existing service uses numeric inputs; guard the call and show 'รอข้อมูลประเมิน'.
5. Store assessment timestamp, calc/rule version, input completeness, who confirmed, source. Do not render random element values in a real patient view.
6. Food is supplementary, requires dietary restrictions review; no automatic medicinal prescribing. Food suggestions need provenance references and clinician/nutritionist content review before production.

## H. Reuse current OC​​R and TTS/STT
- Existing pipeline from `ocrPipeline.ts` may use on-device Tesseract and an optional remote OCR server; respect the user's remote-OCR consent setting.
- Keep raw photo, OCR output, corrections, `EvidenceField` origin and confidence, plus source photo IDs.
- Keep OCR readout non-directive: 'อ่านได้ว่า...' / 'ยังไม่แน่ใจ' / 'ช่วยตรวจความถูกต้อง'. Never say 'ยานี้ปลอดภัย'.
- Voice `SpeechRecognition`/`webkitSpeechRecognition` feature-detect, Thai `th-TH`, handle denied permission/offline/unsupported without fake transcript. TTS `speechSynthesis` fallback if supported, `lang='th-TH'`, stop/cancel on route change.
- Avoid externally sending speech/photo without permission, especially through third-party model/API; never put keys in Vite frontend env.

## I. Later production interoperability (out of MVP)
FHIR `MedicationRequest` for order intent, `MedicationDispense` for actual dispense, `MedicationStatement` or `MedicationAdministration` where appropriate for self-report (do not equate self-report with confirmed administration). `Provenance`, `AuditEvent`, `Consent` and patient identifiers need conformant profiling. Actual HOSxP/HIS integration, clinician authentication, API hardening, encrypted storage, PDPA controls, and service/device regulation evaluation are **post-hackathon** pending institutional agreements.
