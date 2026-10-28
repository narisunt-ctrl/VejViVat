# YaiPrompt (ยายพร้อม) implementation status

- **Branch / date:** `feat/yaiprompt-p0`, 2026-10-28 (base `main` @ `6fc54f8`)
- **Demo mode:** always on. All patients, clinics, medicine readings and clinic responses are synthetic and labelled "ข้อมูลจำลอง".
- **Scope delivered:** Sprints 0–4 of the master plan (P0). Sprints 5–8 (aftercare, continuity, GO transport, Safe-Med research queue, smart camera / real OCR, Playwright E2E) are **planned, not built**.

## Routes
Patient app (`/yai/*`, own shell without the clinician sidebar): `/yai`, `/yai/onboarding`, `/yai/scan`, `/yai/scan/review`, `/yai/medicines`, `/yai/medicines/:id`, `/yai/reminders`, `/yai/clinics`, `/yai/clinics/:id`, `/yai/appointments`, `/yai/previsit`, `/yai/family`, `/yai/help`, `/yai/settings`, plus a 404.
Clinician (inside the original shell): `/clinician/previsit`, `/clinician/previsit/:clinicId`.
Partner portal: `/partner`.
All original clinician routes are unchanged (`/`, `/patients`, `/smutthan`, `/prescribe`, …).

## Real / mocked / planned
| Capability | State |
|---|---|
| Camera preview, capture, torch, gallery upload | **Real** browser APIs (`getUserMedia`, file input). Tracks stop on unmount and when the tab is hidden. Not yet tested on physical phones. |
| Frame quality (brightness, sharpness, glare) | **Real** measurement on a 160px preview; thresholds are uncalibrated initial values. |
| Thai OCR | **Real, on-device** (branch `feat/thai-ocr`): Tesseract.js 5.1.1 with `tha+eng`, lazy-loaded; engine and Thai model are downloaded from jsDelivr on first use, images never leave the browser. Each photo is read right after capture. `labelParser` proposes name / strength / ingredients / directions / reg. no. / manufacturer / form with the source line and line confidence; name confidence is capped at 60%. Every field still has to be checked. The old sample-label button remains as a clearly labelled demo option. Measured once in the in-app browser on a rendered Thai label: about 6 s for the first read including model download, 87% confidence, one Thai word misread. Not yet measured on real phone photos. |
| Label edge detection + flattening | **Real, own code** (branch `feat/edge-detect`, `edgeDetector.ts`): grayscale → Otsu threshold → largest non-background blob → corner extremes → homography with bilinear warp. Outline drawn live over the preview (white = found, green = steady for 3 ticks with <2% corner drift); auto-capture waits for a steady outline; uploads are flattened too. Toggle "ตัดขอบอัตโนมัติ". Measured in the in-app browser: 3.8 ms median per 320 px frame; a tilted label on a dark surface was flattened to 753×515 (actual 760×520) and OCR read it at 93%. Works best for a box/flat label on a contrasting surface; cluttered or same-colour backgrounds return no outline and the full photo is used. OpenCV.js was tried first and dropped: its ~11 MB runtime froze the page for minutes in the browser. Only the flattened image is stored, to stay within browser storage. Not yet tested on a real phone camera. |
| Live "complete yet?" guidance | Overlay on the camera shows the side being shot, field chips ticked from real OCR, and a next step (`scanGuidance`: go to the side holding a missing field, or retake if that side was shot but not read). Optional Thai voice guidance and a vibration on capture. The overlay only appears with a live camera; the same checklist is shown below for uploads. |
| Evidence Passport, three voices, "มีแค่นี้" | Implemented. Unknown values stay `null`; disagreements are shown side by side, never auto-resolved. |
| Interaction screening | Coverage-aware: `MATCHED_UNREVIEWED` / `NO_MATCH_IN_COVERED_PAIRS` / `INSUFFICIENT_INFORMATION`. No "safe" state exists. One sample rule only. |
| Reminders | In-app only (foreground). Created only from a confirmed medicine plus explicit time confirmation; dose answers are self-reports and idempotent per occurrence. Demo clock is labelled. No background push. |
| Clinic search / appointment | 5 fictional clinics. Patient can only request/cancel; offer/confirm/decline only via the labelled simulated provider in `/partner`. Requests are idempotent per clinic. |
| Pre-visit consent | Per clinic, scoped, with expiry and revocation. Clinician view checks consent on every open; reads and denied reads are audited. Operator portal never shows medicines. |
| Caregiver consent | Scoped grants and revocation are stored; no real notifications are sent. |
| Help | `tel:` to family number if entered; separate `tel:1669`. No dispatch is claimed. |
| Storage | `localStorage` key `yai-demo-v1` (synthetic data only, max 12 photos), wipeable in Settings. |

## MEDSIGHT mockup gaps (branch `feat/medsight-gaps`)
| Mockup item | State |
|---|---|
| Step 3 next view + side checklist (front / back / directions / reg. no.) | Implemented as a **user-tagged** checklist with a fixed-priority suggestion (`nextRecommendedSide`). Not image recognition. |
| Step 4 fields: form, registration no., manufacturer + completeness grid | Implemented (`fieldCompleteness`, 7 fields). Sample OCR never fills a registration number. |
| Step 5 edit after saving | Every label field on the passport is editable; edits are recorded as `MANUAL_ENTRY` and bump the version. |
| Step 6 summary tiles + extra note | Count tiles (medicines / incomplete / questions) and a patient note included in the packet. |
| Clinician packet tabs, label photos, HN, appointment, actions | Tabs สรุปก่อนนัด / รายการยา / ความเสี่ยง / คำถามแนะนำ / ภาพฉลาก; links to HDI admin, Smutthan and partner portal; research evidence button visibly disabled. |
| Auto label-edge detection, real OCR, AI-generated questions | Still not built. Questions come from rules, and the UI says so. |

## Sprint 0 safety fixes in the existing app
- `InteractionAlerts`: an empty match list now reads "ไม่พบคู่อันตรกิริยาในฐานข้อมูลตัวอย่าง … ยืนยันว่าปลอดภัยไม่ได้" in neutral colours, not green.
- `herbRecommendationService`: `hdiRisk: 'SAFE'` renamed to `NO_MATCH_IN_COVERED_PAIRS` with coverage-limited wording; herb cards no longer show "ปลอดภัย ไม่พบ HDI".
- `redFlagService`: missing vitals are no longer filled in as 120/80, 36.6 °C, etc. Missing values raise `RF-VITALS-MISSING` (warning), SBAR says "ไม่ได้วัด", and measured crises are still detected. The rule thresholds themselves are unchanged.
- `PrescribePage` badge "ปลอดภัยต่อการนวดและสั่งยา" changed to "ไม่พบข้อห้ามจากกฎคัดกรอง".

## Tests run
- `npx tsc --noEmit`: clean.
- `npm test`: **67/67 passed** with edge-detector/homography tests (60/60 with Thai OCR ; 52/52 after the mockup gaps, 49/49 before) (35 original + 2 red-flag regressions + 12 YaiPrompt policy/store/frame-quality tests mapped to T05–T09, T11, T14–T16, T22).
- `npm run build`: succeeds; the patient app is a separate lazy chunk (~60 kB, ~19 kB gzip).
- Manual browser checks (dev server, in-app browser): full scan → review → save → "มีแค่นี้" flow; clinic request → partner confirm → clinician packet → revoke → denied; reminders with demo clock; no horizontal overflow on all 19 routes at 390px; `/smutthan` and `/prescribe` still render. Screenshots were inspected during the session but **not saved** to the repo.

## Known gaps / blockers
- No real Thai OCR, barcode, notifications, clinic or transport integrations.
- No Playwright E2E suite yet (`playwright` is a dependency but browsers aren't installed).
- Not tested on real iOS/Android cameras.
- Clinical content (sample rule, wording) needs pharmacist / TTM clinician review before any real use.

## Next 3 smallest tasks
1. Playwright E2E for the demo walkthrough at 390×844 and 1440×900, saving screenshots.
2. Aftercare page (`/yai/aftercare`) showing one demo-reviewed care plan with version and reviewer label.
3. Test camera capture and quality thresholds on two real phones and record the results here.
