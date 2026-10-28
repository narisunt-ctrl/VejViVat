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
| Daily health journal + heatmap | **Real code, synthetic data** (branch `feat/yai-journal-prescription-sync`): voice-first home, Thai speech-to-text when the browser supports it (honest typing fallback), keyword category suggestions (not AI diagnosis), patient review before saving, version history, square-cell heatmap counting distinct confirmed Asia/Bangkok days. See `JOURNAL_PRESCRIPTION_AUDIT.md`. |
| CareBridge → ยายพร้อม order sync | **Simulated approval/dispense, real gate**: `evaluateReminderSync()` requires demo approval, demo dispense, confirmed explicit clock times, right patient and patient consent; versioned and idempotent; cancel/change stops old reminders and keeps history. Same-browser demo adapter only, no HIS/FHIR, no push. |
| Evidence Passport, food by element | Passport lists orders, medicines, statements and self-reports with sources. Food page reads the existing `calculateSmutthan()` for the linked synthetic case only; unknown when inputs are missing; menu examples unreviewed. |
| Camera preview, capture, torch, gallery upload | **Real** browser APIs (`getUserMedia`, file input). Tracks stop on unmount and when the tab is hidden. Not yet tested on physical phones. |
| Frame quality (brightness, sharpness, glare) | **Real** measurement on a 160px preview; thresholds are uncalibrated initial values. |
| Thai OCR (on-device fallback) | **Real, on-device** (branch `feat/thai-ocr`): Tesseract.js 5.1.1 with `tha+eng`, lazy-loaded; engine and Thai model are downloaded from jsDelivr on first use, images never leave the browser. Each photo is read right after capture. `labelParser` proposes name / strength / ingredients / directions / reg. no. / manufacturer / form with the source line and line confidence; name confidence is capped at 60%. Every field still has to be checked. The old sample-label button remains as a clearly labelled demo option. Measured once in the in-app browser on a rendered Thai label: about 6 s for the first read including model download, 87% confidence, one Thai word misread. Not yet measured on real phone photos. |
| Label edge detection | **Removed** (branch `feat/ocr-verify`) after real-phone feedback: jars, capsule strips and decoction bags have no clean outline. The camera now advises close-ups of the text instead. |
| OCR robustness (phone photos) | OCR reads a 2400 px copy (stored photo stays 1600 px). Pass 1: contrast-stretched grayscale, page mode. If confidence < 70 or little text (or "อ่านใหม่ (ละเอียด)"): pass 2 on a 1600 px adaptive-threshold copy (blurred, despeckled, inverted for white-on-dark) in sparse-text mode, capped at 30 s; the better-scoring result wins. On a synthetic hard image (yellow/red box, white title, light falloff, blur, noise, JPEG q55): plain Tesseract missed the title and garbled most lines (conf 82); the new pipeline read every line with minor slips (conf 91) in 2.8 s, thorough 5.3 s. Still to be measured on real phone photos. |
| OCR server + benchmark | `ocr-server/` (FastAPI): `fast` = PaddleOCR PP-OCRv5 Thai (`th_PP-OCRv5_mobile_rec`), `accurate` = Typhoon OCR 1.5 (`typhoon-ocr`, task v1.5), `auto` = Paddle then Typhoon below 0.80 confidence. Typhoon key only in the server env; CORS allow-list, 8 MB limit, per-IP rate limit, no image storage, SHA-256 provenance. Tested locally end to end (app → server → PaddleOCR, fallback to on-device when the server is down). **Not deployed** (GitHub Pages cannot host Python). `ocr-bench/`: CER, name exact, ingredients, strength+unit, latency p50/p95, API cost. Run 2026-10-28 on 24 synthetic images: PaddleOCR raw CER 0.036, name 87.5%, ingredients 92.4%, strength 100%, p50 4.1 s CPU; with CLAHE CER 0.074 (worse), so the server defaults to raw. Typhoon OCR 1.5 run locally without a key (`typhoon-local`, Ollama `scb10x/typhoon-ocr1.5-3b`, 1024 px): CER 0.021, name 91.7%, ingredients 97.9%, strength 100%, p50 58 s/image on a 4 GB Quadro M1200. Both engines miss the name on curved-bottle photos; Typhoon's errors are plausible-looking Thai. The server's `accurate` mode (the app's "อ่านละเอียด" re-read) uses the Typhoon API when a key is set, otherwise local Typhoon OCR 1.5 **2B** through Ollama (Apache-2.0; the 3B build has a non-commercial base model and is benchmark-only). 2B: synthetic CER 0.020, real labels 3/4 names, ~30–40 s/image, but it invented an ingredient list on one box (tested end to end with 3B earlier: 137 s for one label; the app waits up to 240 s and says it may take 1–2 minutes). `auto` does not escalate to local Typhoon. On real turmeric labels Typhoon read every product name but also invented text (one run read a herbal capsule box as a pork snack), so its output stays a draft the patient must check. |
| OpenCV.js preprocessing | Implemented (CLAHE + median) but **off by default** (`VITE_ENABLE_OPENCV=true` to enable). In the app's browser OpenCV.js never finished starting when bundled or in a Web Worker, and froze the app page when loaded as a script (fine on a bare page, ~0.7 s). Falls back to a JS contrast stretch. Server-side OpenCV (cv2) preprocessing is available as `OCR_PREPROCESS=clahe`. |
| Source images + provenance | Full-resolution originals (camera frame or the uploaded file, byte-identical) are kept in IndexedDB and wiped with the demo data. Each photo records provider, engine/model, preprocessing, fallback reason and server SHA-256; each OCR field records the exact photo, engine and verbatim source line. |
| Patient text check | Each photo shows the text read from it in an editable box: "ถูกต้องแล้ว" / "บันทึกข้อความที่แก้", "อ่านใหม่ (ละเอียด)", "ลบรูปนี้", tap photo to enlarge. Checked text replaces the raw OCR for that photo and fields from it are recorded as `PATIENT_REPORTED` with a "✓ ตรวจกับฉลากแล้ว" chip; unchecked photos are flagged. |
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
- `npm test`: **68/68 passed** (edge-detector tests removed with the feature; OCR enhancement, checked-text and OCR-slip tests added)
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
