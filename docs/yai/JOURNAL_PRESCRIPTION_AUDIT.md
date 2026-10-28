# YaiPrompt journal + CareBridge prescription sync: audit, changes and results

Branch `feat/yai-journal-prescription-sync`, based on `main` at `ea6501a` (handoff placeholder) / `a97f12a`.
Source documents: `docs/handoff/00_START_HERE.md` … `05_CLAUDE_PROMPT.md`. Everything below uses synthetic data only.

## Phase 0: audit before changes (2026-10-29)

Environment: Node 24.22.1, npm 11.19.1, Windows 10.

| Check | Before changes | After changes |
|---|---|---|
| `npx tsc --noEmit` | pass | pass |
| `npm test` (Vitest) | 11 files, 70 tests pass | 13 files, 96 tests pass |
| `npm run build` | pass | pass (YaiRoutes chunk 132.5 kB, gzip 42.9 kB) |

Findings that differ from the handoff text or need noting:
- `docs/handoff` on GitHub `main` was an empty *file* (commit `ea6501a`); the branch replaces it with the handoff folder.
- `YaiHomePage` was photo-first, as the handoff said. Routes, OCR pipeline, photo store and reminder policies matched.
- `canCreateReminder(m, 'CLINICIAN_ORDER')` only checked `status === 'CLINICIAN_VERIFIED'`, which the demo "review" button sets.
  There was no order, approval or dispense concept, so a clinician-sourced reminder could not be told apart from a demo review.
  `yaiStore.createReminder(…, 'CLINICIAN_ORDER')` is now refused; clinician reminders come only from the order sync gate.
- The patient-set reminder form pre-filled `08:00`; it now starts empty so no time is guessed.
- The Yai demo patient (`demo-patient-001`, คุณยายสมศรี) and clinician case `C11` (นางทองใบ, knee OA) are different fictional
  people. They are linked only through the explicit table `src/data/yai/demoLinks.ts`, never by name/age/HN.
- `calculateSmutthan()` uses `currentTime.getHours()` in the device time zone; the adapter passes the case's encounter time and
  does not change the engine.

## What changed

### Patient app (ยายพร้อม)
| Area | Files |
|---|---|
| Voice-first Today page: greeting, big "กดพูด เล่าให้หนูฟัง", "พิมพ์เอง" / "ถ่ายรูป", square daily heatmap with distinct confirmed days, today's notes, next verified reminder, extras | `src/pages/yai/YaiHomePage.tsx`, `src/components/yai/DailyHeatmap.tsx`, `src/components/yai/VoiceEntryButton.tsx` |
| Journal flow `/yai/journal/process` → `/review` → `/history` | `src/pages/yai/JournalProcessPage.tsx`, `JournalReviewPage.tsx`, `JournalHistoryPage.tsx`, `src/services/yai/journalDraft.ts` |
| Journal model, Bangkok dates, heatmap grid | `src/domain/yai/journal.ts` |
| Thai keyword splitter (symptom / medicine statement / food / other) | `src/services/yai/healthTextClassifier.ts` |
| Thai speech-to-text with honest fallback, Thai read-back | `src/services/yai/thaiVoiceJournal.ts` |
| Evidence Passport `/yai/passport` | `src/pages/yai/EvidencePassportPage.tsx` |
| Food by element `/yai/food` (supplementary) | `src/pages/yai/FoodPage.tsx`, `src/services/yai/elementSummaryAdapter.ts` |
| Clinician orders in reminders, consent to the demo clinic, status chips, history, notices | `src/pages/yai/RemindersPage.tsx`, `src/services/yai/useOrderSync.ts` |
| Source / category chips | `src/components/yai/SourceVerificationChip.tsx` |
| Store: `saveJournalEntry`, `editJournalEntry` (version history), `syncClinicianOrders`, consent-gated `readDoseReportsForClinician` | `src/services/yai/yaiStore.ts` |
| Model additions (all optional, old stores still load): `journal`, `syncedOrders`, `orderNotices`, `ReminderPlan.orderRef`, `MedicationPassport.linkedOrderKey`, audit actions | `src/domain/yai/models.ts` |
| Labelled synthetic journal examples | `src/data/yai/fixtures.ts` |

### Order sync (shared)
| Area | Files |
|---|---|
| Order / dispense / schedule states, `evaluateReminderSync()` (the only gate), idempotent versioned `importOrderSnapshot()` | `src/domain/yai/prescriptionSync.ts` |
| Same-browser demo outbox (append-only versions + events) | `src/services/yai/prescriptionSyncAdapter.ts` |
| Explicit synthetic patient link C11 ↔ demo-patient-001 | `src/data/yai/demoLinks.ts` |

### Clinician app (CareBridge, `/prescribe`)
| Area | Files |
|---|---|
| Separate steps: 1 approve (demo), 2 pharmacist dispense (demo), 3 agreed clock times, cancel; gate preview; version history; consent-gated patient self-report view | `src/components/carebridge/CareBridgePrescriptionSyncPanel.tsx` |
| Optional knee-OA evidence & follow-up card: 5C, references all `RESEARCH_REVIEW_PENDING` (no DOI/PMID), follow-up only from recorded patient statements, approve/reject note | `src/components/carebridge/KneeOAEvidencePanel.tsx` |
| Panels added under the existing page; cart, print, HDI and Smutthan logic unchanged | `src/pages/PrescribePage.tsx` |

## Routes and demo steps

1. Reset: Settings → reset demo (or clear `yai-demo-v1` and `carebridge-demo-orders-v1` in localStorage).
2. `#/yai` (390 px): press "กดพูด" (Chrome/Edge/Safari with a microphone) or "พิมพ์เอง" → "ใช้ประโยคตัวอย่าง (ข้อมูลจำลอง)".
3. `#/yai/journal/process`: 3 suggested parts (อาการ / ยา-สมุนไพร / อาหารที่กิน) → "ต่อไป: ให้ยายตรวจ".
4. `#/yai/journal/review`: edit, "ไม่ทราบ", read back, "✅ ถูกต้อง บันทึกเลย" → `#/yai/journal/history` and the heatmap count rises by one day.
5. "ถ่ายรูป" → tag "ยาไม่มีฉลาก" → save: a pending-identification medicine is created, no reminder.
6. Clinician `#/patients` → choose นางทองใบ (C11) → `#/prescribe` → panel at the bottom: "1. รับรองคำสั่งยา (จำลอง)" →
   "2. เภสัชกรยืนยันจ่ายยาแล้ว (จำลอง)" → enter a time, tick "เภสัชกรตกลงเวลานี้กับผู้ป่วยแล้ว" → "บันทึกเวลาเตือน".
   The gate preview says "ไม่รับเข้า" until the patient consents.
7. `#/yai/reminders`: "อนุญาต 90 วัน" → the order appears with สั่งใช้แล้ว / จ่ายยาแล้ว / เตือนตามเวลาแล้ว and today's reminder.
   Use "เลื่อนเวลา +1 ชม." until it is due, answer "กินแล้ว" (stored as TAKEN_REPORTED only).
8. Back in `#/prescribe`: "ดูรายงานการกินยาจากผู้ป่วย" shows the self-report labelled "ไม่ใช่หลักฐานว่ากินยาจริง";
   change the time (new version) or "ยกเลิกคำสั่งยานี้" → the old reminder stops, history stays.
9. `#/yai/passport`, `#/yai/food`.

Checked in the in-app browser on 2026-10-29: steps 2–4 and 6–9 (390 px wide and desktop), no console errors, no horizontal
scroll at 375 px; `/yai/scan`, `/smutthan`, `/prescribe` still load. Not checked: real microphone input (no microphone in
the test browser), physical Android/iOS phones, step 5 with a real camera. Screenshots were viewed in the browser pane only,
none were saved to the repository.

## Automated test matrix

`src/tests/yai/yai-journal.test.ts`, `src/tests/yai/yai-prescription-sync.test.ts`:

| ID | Covered by |
|---|---|
| J01 | no SpeechRecognition → `UNSUPPORTED`, empty transcript; error mapping |
| J02 | 3 segments with exact source offsets; also without spaces; "ยาย" ≠ "ยา" |
| J03 | drafts are not counted; nothing is stored until save |
| J04 | 2 entries same Bangkok date = 1 day, cell count 2 |
| J05 | 17:30 UTC → next Bangkok date |
| J06 | edit keeps original text, photos, previous version |
| O02 | unlabeled medicine pending, no reminder possible |
| P01–P09, P11 | pure gate + import tests (approval, dispense, duplicate/stale, version change, cancel, wrong patient, consent, PRN/meal-relative, unconfirmed times, partial dispense, identity, demo-vs-real states) |
| P10 | repeated self-report = one log; survives order version change |
| S01 | linked C11 → existing engine result; missing link or vitals → UNKNOWN |
| S03 | clinician read denied without consent and after revocation, both audited |
| S02, R01 | existing tests (`screenInteractions` never "safe"); routes checked manually |

Not automated: O01/O03 (OCR failure and `1/2` vs `1-2` are covered by the existing OCR tests and the rule that OCR never
creates a schedule), Playwright E2E (not installed).

## Real vs demo vs future

| | State |
|---|---|
| Journal capture, review, history, heatmap, provenance, version history | **Real code**, browser-local synthetic store |
| Thai speech-to-text / read-back | **Real browser APIs** when supported (Chrome may send audio to its speech service; the UI says so); honest fallback otherwise |
| Category suggestions | **Keyword rules**, labelled "ไม่ใช่ AI วินิจฉัย"; no language model |
| Photo OCR in the journal | **Existing pipeline** (`readLabel`): on-device Tesseract, or the OCR server with consent |
| Clinician approval, dispense, prescriber/pharmacist identities | **Simulated** (`APPROVED_DEMO`, `VERIFIED_DEMO`), labelled จำลอง everywhere |
| CareBridge ↔ ยายพร้อม link | **Same-browser demo adapter** (localStorage); not HIS/HOSxP/FHIR; no push notifications |
| Smutthan element summary | **Existing engine** on the linked synthetic case |
| Menu ideas | Static general examples, **not reviewed** by a nutritionist or clinician |
| Production identity, authenticated orders (`APPROVED_VERIFIED`, `VERIFIED_REAL`), backend, audit store, PDPA controls, FHIR MedicationRequest/Dispense | **Future**, interfaces reserved |

## Needs clinician / pharmacist review
- Knee-OA references TEAM-01/03/04 (teammate summary): no primary source checked; all shown as รอตรวจแหล่งอ้างอิง.
- Menu examples per taste in `FoodPage.tsx` and the rule "hide salty examples when hypertension is recorded".
- Wording of patient-facing statuses (สั่งใช้แล้ว / จ่ายยาแล้ว / รอกำหนดเวลา / ยกเลิก) and the "ไม่ทราบ / มีแค่นี้" flow.
- Whether a pharmacist, the prescriber, or both may confirm reminder clock times for meal-relative orders.

## Changelog
- Added daily health journal (voice / typed / photo) with patient confirmation and square-cell heatmap; home page is voice-first.
- Added Evidence Passport and supplementary food-by-element pages.
- Added CareBridge → ยายพร้อม order sync with explicit approval, dispense and schedule gate; versioned, idempotent, consent-gated.
- Added optional knee-OA evidence & follow-up card for clinicians.
- Clinician-order reminders can no longer be created by hand; patient-set reminders no longer pre-fill 08:00.

## Care network update (branch `feat/yai-care-network`, 2026-10-29)

| Feature | What it does | Files |
|---|---|---|
| Nearest hospital / clinic | 16 fictional facilities (hospitals with a Thai traditional medicine service, clinics). Patient picks province/district or uses the device location (kept in the browser). Ranked by zone first (same district → province → region → further), then straight-line distance. Filters: hospital/clinic, TTM practitioner only. | `src/domain/yai/facilityRanking.ts`, `src/data/yai/thaiAreas.ts`, `src/data/yai/fixtures.ts`, `src/pages/yai/ClinicsPage.tsx` |
| Doctor follow-up per patient | `#/clinician/followup`: summary tiles, "ต้องดูก่อน" interaction flags from the existing HDI database (journal food/medicine statements + medicine list + clinician orders), 14-day symptom timeline, medicines and dose self-reports, sent messages with acknowledgement. Consent-gated (MEDICINES), every read audited. | `src/pages/clinician/FollowUpPage.tsx`, `src/domain/yai/interactionCheck.ts` |
| Alert grandma | Doctor presses "แจ้งเตือนยาย", edits a neutral draft and sends; ยายพร้อม home shows "ข้อความจากคุณหมอ" with read-aloud and "รับทราบแล้ว"; the doctor sees when it was acknowledged. Same-browser demo channel, no push/SMS. | `src/services/yai/clinicianMessages.ts`, `src/components/yai/DoctorMessagesCard.tsx` |
| Research library | `#/research`: topics from the teammate strategy, live search links (PubMed newest first, Google Scholar last 3 years, ClinicalTrials.gov), teammate claims kept "รอตรวจแหล่งอ้างอิง", and a form to record papers a clinician has read (link or DOI required). | `src/data/carebridge/research.ts`, `src/pages/clinician/ResearchLibraryPage.tsx` |
| Patient UI style | Public-health-app pattern: profile card, round service tiles, pale sky background; voice journal stays the main action. No third-party logo or name. | `src/pages/yai/YaiHomePage.tsx`, `src/app/YaiShell.tsx`, `tailwind.config.js` |

Checked in the in-app browser: facility ranking for อ.สันทราย (same-district hospital 1.5 km first; Chom Thong 62 km before Lamphun 30 km because Lamphun is another province), follow-up page flags HDI-001 (ขมิ้นชัน + warfarin) and HDI-013 (ยาสหัศธารา order + warfarin), message → acknowledge → doctor sees acknowledgement, research links open the real databases. Tests: 14 files, 107 pass (`src/tests/yai/yai-care-network.test.ts` adds 11).

Limits: facility data, coordinates and opening hours are fictional; distance is straight-line; HDI database has 14 sample pairs and no food–drug rules beyond herbs in it; "no flag" never means safe. The research page does not fetch or summarise papers itself.
