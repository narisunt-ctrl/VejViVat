# Claude Code implementation roadmap, test matrix and review checklist
**Primary goal:** production-shaped architecture but explicitly synthetic Hackathon demo. Build vertical slice before optional polish.

## Phase 0 — Repository audit (no feature changes)
- [ ] Confirm branch, commit SHA, installed dependencies, current routes, actual OCR behavior, reminder policies, clinic consent and synthetic fixture mapping.
- [ ] Record baseline `npm test`, `npx tsc --noEmit`, `npm run build` with counts and any failures.
- [ ] Identify which existing types/exports can be reused; do not introduce duplicate domain models.
- [ ] Put findings in `docs/yai/JOURNAL_PRESCRIPTION_AUDIT.md`; note branch discrepancies between docs and code.

## Phase 1 — Daily Health Journal (highest priority)
- [ ] Redesign `src/pages/yai/YaiHomePage.tsx` using user's AquaWise reference: square heatmap; count unique local days; large 'กดพูด เล่าให้หนูฟัง'; secondary 'พิมพ์เอง', 'ถ่ายรูป'.
- [ ] Add journal draft/review/history pages under `/yai/journal/...` through `YaiRoutes.tsx`; keep old routes intact.
- [ ] Implement `JournalEntry` with source provenance and timestamp, versioned store for synthetic demo, patient confirmation. Avoid writing real PII to `localStorage`.
- [ ] Thai STT feature detection + manual fallback; optional TTS readback. No false 'recording' animation if mic unavailable.
- [ ] Conservative category splitter for symptoms/medicine report/actual food; multi-category supported, unknown fallback.
- [ ] Keep the 'intake category dropdown' completely out of the home screen.

**Accept if** sentence 'วันนี้ยายปวดเข่า กินยาหลังอาหารเช้า แล้วกินข้าวต้ม' produces 3 editable segments (symptom; unverified medicine-use statement; actual food) and after confirmation the heatmap/day count changes. Tapping a second record the same day should increase entry count but **not number of days**.

## Phase 2 — OCR + unknown medicine integration
- [ ] Reuse existing `ScanPage`, `ScanReviewPage`, `ocrPipeline`, `MedicinePassportPage`; no duplicate image handling pipeline.
- [ ] Multi-side label scan with front, back, directions, registration as **optional checklist**; grandfather simplification: no live coaching prompts.
- [ ] Store original photo, extracted/edited text, source, confidence, missing fields, brand, registration, ingredients, per-unit strength, package quantity separately.
- [ ] Unknown category for decoction, capsule in unmarked bag, herb powder, unlabeled pills. 'มีแค่นี้' works and leads to passport marked pending professional identification.
- [ ] Patient confirmation of the text ≠ medically verified identity; preserve raw OCR and diffs.

**Accept if** OCR disabled/unavailable yields honest pending/manual path and an unidentified item has zero eligible clinician-synced reminders.

## Phase 3 — Strict CareBridge → Yai prescription synchronization (key differentiation)
- [ ] Explicit demo mapping between clinician `SyntheticCase` and `DEMO_PATIENT_ID`; never use a name-based match.
- [ ] Add reviewed order lifecycle *separate* from `PrescribePage` cart and printing.
- [ ] Implement mock pharmacist dispense verification step to distinguish order from actually handed-over medicine.
- [ ] `evaluateReminderSync` pure function and tests. Only verified demo order + verified demo dispense + clear fixed times can become `ACTIVE`.
- [ ] Idempotent versioned sync adapter and durable demo events; preserve older dose logs, cancel future obsolete occurrences on change.
- [ ] Existing patient `RemindersPage` shows source 'คำสั่งที่ผู้สั่งใช้ยารับรอง (ข้อมูลจำลอง)', updated timestamp, pending review, and history.
- [ ] Notify in-app when doctor updates/cancels; no claim background push. Patient 'กินแล้ว' writes `TAKEN_REPORTED` only.
- [ ] Keep patient-entered use reports and clinician order separate; do not elevate OCR or grandma's dose guess to signed order.

**Accept if** one reviewed synthetic order can be synchronized, imported twice without duplicates, revised to another explicit time, canceled, and never leaves a stale active reminder.

## Phase 4 — Evidence-based clinician adoption overlay (team document)
- [ ] Add OPTIONAL small clinician 'Evidence & follow-up' card for knee OA, not a prescriber auto-suggestion.
- [ ] Display evidence provenance: source title, PubMed/DOI/official guideline if independently verified, study population, comparator, outcomes, sample size, key limitations, version, review status.
- [ ] 5C: clinical relevance, credible evidence, clinician champion, convenient workflow, continuous feedback.
- [ ] Capture VAS pain baseline/follow-up or validated WOMAC only if legitimately collected, adverse effects, medication reconciliation and clinician decision rationale. No patient score fabrication.
- [ ] Show 'Evidence awaiting source verification' for friend-supplied figures until someone locates primary source and verifies them.
- [ ] Follow-up graphs derived from recorded observations, not simulated therapeutic benefit curves passed off as real outcomes.

**Accept if** clinician can review an evidence card, see uncertainty and explicitly approve/reject a proposed complementary care plan; no autonomous herbal prescription.

## Phase 5 — Element summary and food extras
- [ ] Link the **same patient** to existing Smutthan calculation and available inputs; add unknown/missing-data result.
- [ ] Display only relevant element name on Yai side, no four-score radar, clear date and 'according to Thai traditional medicine' framing.
- [ ] Move daily menu examples into `/yai/food` or supplement link, not mandatory homepage process.
- [ ] Filter/flag food allergy, kidney/diabetes/HTN restrictions where known; no clinical nutritional promise.
- [ ] Store suggested meals and actual foods consumed separately.

## Test matrix — automated
| ID | Scenario | Expected |
|---|---|---|
| J01 | Voice permission denied | Show typed-input fallback, no fabricated transcript |
| J02 | Thai voice statement has symptom + medicine + food | 3 editable draft categories, all linked to original text |
| J03 | User cancels review | No confirmed journal entry; no heatmap increment |
| J04 | Two confirmed entries same local date | 2 entries, 1 unique recorded day |
| J05 | Time close to UTC midnight in Bangkok | Date derived in `Asia/Bangkok`, not UTC date |
| J06 | Patient edits extraction | Store confirmed correction and original transcription/photo provenance |
| O01 | OCR unreadable/denied remote | Manual review path, no false OCR results |
| O02 | Unlabeled capsule/decoction | `pendingIdentification`, no active synced medication reminder |
| O03 | Dosage `1/2` is misread as `1-2` | Review flagged; never auto-create dosage schedule from OCR |
| P01 | Clinician cart printed but no explicit approval | No synced reminder |
| P02 | Approved order, no dispense verification | No active synced reminder |
| P03 | Approved + dispensed + fixed time + correct patient | One active reminder, explicit synthetic status |
| P04 | Same order/version imported twice | No duplicates / same active occurrence keys |
| P05 | Source order version 2 changes clock time | Old future reminders canceled; new version active, dose history intact |
| P06 | Order canceled/discontinued | Zero future active reminders, display cancellation |
| P07 | Orders for different synthetic patient IDs | Cross-patient sync denied |
| P08 | PRN or meal-relative directions without clock time | Pending schedule review; no invented 08:00 |
| P09 | Partial dispense or unclear identity | Pending review, not silently active |
| P10 | Self-report taken twice on same occurrence | Idempotent update, one record, marked self-reported |
| P11 | Clinician review simulated (not real auth) | UI never says 'authentic signed hospital prescription' |
| S01 | Missing vitals or missing patient linkage | Element result unknown, no fabricated score |
| S02 | No match in small HDI demo rules | NOT displayed 'ยาปลอดภัย' |
| S03 | Consent revoked | Subsequent clinician read denied and audited |
| R01 | Existing `/smutthan`, `/prescribe`, `/yai/scan` | Existing functionality still works |

### E2E demo check
At 390×844 and 1440×900 run manually and preferably Playwright: Home → Speak OR typed fallback → draft → review → save → heatmap → unlabeled medicine → reviewed order → verified dispense → sync → reminder → self report → clinician read; save actual screenshots to `artifacts` or document exact screenshot location, don't claim screenshots captured if not.

## Launch quality gates
```bash
npm ci
npx tsc --noEmit
npm test
npm run build
```
Run in a clean clone; if tests fail due to baseline, document before changes and fix. On a physical Android and iOS phone, check camera permissions/Thai recognition; if unable, record 'not tested'. Verify large-button accessibility and no horizontal scroll at 390px.

## Prioritization when time is short
**P0 hackathon:** working Today + heatmap + typed/voice transcript → review → history; reuse real OCR; explicit synthetic clinician-approved order → verified demo dispense → versioned patient reminder sync; tests J02–J05/P01–P08.  
**P1:** better TTS, caregiver, real device testing, evidence card, independent evidence verification, food extras.  
**P2:** HOSxP/EMR production connector, push notifications, actual clinic dispensing, authenticated users, clinical pilot and regulatory/security approvals.

## Done means code, not a design-only PR
Claude should report changed files, which screens work, exact commands/tests and outputs, screenshots if truly made, known limitations, security/medical disclaimers, and steps to demo. Make small, reviewable commits; do not silently rewrite existing Smutthan formulas or pass mocked data off as real clinical results.
