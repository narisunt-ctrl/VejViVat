# YaiPrompt (ยายพร้อม) implementation status

- **Updated:** 2026-10-29, matches the live site (main `3f4578a`, gh-pages `3d2ff4d`).
- **Live:** https://narisunt-ctrl.github.io/VejViVat/#/yai (patient) · https://narisunt-ctrl.github.io/VejViVat/#/doctor (CareBridge)
- **Demo mode:** always on. Patients, clinics, friends, check-ins, device steps and clinic responses are synthetic and labelled "ข้อมูลจำลอง". There is no login and no server database; data stays in the browser (`localStorage` key `yai-demo-v1`, photos in IndexedDB) and can be wiped in Settings.
- **Change history:** branch-by-branch notes are in `JOURNAL_PRESCRIPTION_AUDIT.md`.

## Design system

"Premium Longevity" tokens (`lx-*` CSS variables in `src/index.css`, scoped to the patient app so CareBridge styles are untouched). Dark theme by default, light theme in Profile, Noto Sans Thai, touch targets ≥ 48 px, three text sizes (100/125/150 %). Screens that were not redesigned (medicines, OCR, reminders, journal, clinics, etc.) keep their existing light layout; the shell switches to the light theme on those routes. Chart colour: one validated hue per theme (`#168B71` light, `#2BA88E` dark).

## Routes

Bottom navigation (side rail on desktop): **Home** `/yai` · **Insights** `/yai/insights` · **Discover** `/yai/discover` · **My Journey** `/yai/journey` · **Profile** `/yai/profile`.

| Area | Routes |
|---|---|
| Daily check-in | `/yai/checkin`, journal flow `/yai/journal/process`, `/yai/journal/review`, `/yai/journal/history` |
| Steps | `/yai/steps` |
| Thai herbs | `/yai/discover`, `/yai/discover/:id` (formulary code, or `mp-<id>` for herbs only in the Mahidol database), user reviews `/yai/herb-reviews` |
| Journey | `/yai/journey`, `/yai/exercise`, `/yai/leaderboard` |
| Expert consultation | `/yai/consult` (`/yai/ask` redirects here), `/yai/clinics`, `/yai/clinics/:id`, `/yai/appointments`, `/yai/previsit` |
| Medicine & care | `/yai/care`, `/yai/scan`, `/yai/scan/review`, `/yai/medicines`, `/yai/medicines/:id`, `/yai/reminders`, `/yai/passport`, `/yai/food` |
| Profile & other | `/yai/profile`, `/yai/health`, `/yai/family`, `/yai/settings`, `/yai/help`, `/yai/onboarding` |

CareBridge (clinician shell): `/doctor`, `/patients`, `/smutthan`, `/prescribe`, `/clinician/previsit`, `/clinician/followup`, `/clinician/handover`, `/research`, `/guidelines`, `/holistic`, `/value`, `/business`, `/feasibility`, `/admin-hdi`, `/status`. Partner portal: `/partner`.

## Real / demo / planned

| Capability | State |
|---|---|
| Home dashboard | **Real code.** Today's sleep, energy, mood, activity from the user's check-in or device; empty days show "ยังไม่ได้บันทึก". One-tap voice check-in, steps card, 7-day mini trends, weekly goals, herb of the day, CareBridge links, one line of daily wisdom (colour of the day, Buddha icon on approximate วันพระ). |
| Check-in | **Real code.** Tap answers (all optional, never defaulted; one check-in per day, editable). Voice/text goes to the journal flow: Thai speech-to-text when the browser supports it, keyword category suggestions (not AI diagnosis), user review before saving. |
| Insights | **Real code.** 7/30-day charts per measure with table view and gaps for missing days; personal baseline only with ≥ 10 recorded days in the previous 4 weeks; sleep–energy observation only with ≥ 5 days per group, worded as observation. No recovery score, biological age or pace of aging. |
| Steps | **Real code; device data simulated.** Goal 3,000–8,000 steps/day (default 4,000), typed entry (latest entry of the day is the total), demo phone/watch link (7 labelled days), 7-day chart with goal line and table, weekly walking challenge (friends see weekly totals only). A real device link needs a native app (Health Connect / Apple Health). |
| Thai herbal discovery | **Real code; data pending expert review.** 21 formulary herbs (listed indications, contraindications, precautions, source reference; no dosing shown) + 70 herbs from the Mahidol Herb-Drug database. Live PubMed search counted by study type (A/B/C/preclinical, by type only). Interactions from the project table and the Mahidol records, each with an article link; "no effect reported" rows kept apart from cautions. Warning when a herb conflicts with a medicine in the user's list. |
| Herbs and element | **Real code, synthetic assessment.** Compares the tastes the existing Smutthan engine gives for the clinic-linked case (unchanged formula) with formulary herb tastes. Herbs with a caution against the user's medicines are listed separately; the fire-element advice against hot remedies is followed; nothing is matched without an assessment. Information for a Thai traditional medicine doctor, not a recommendation; no ranking or dosing. |
| Journey | **Real code.** Chosen goals (sleep ≥ 7 h, activity ≥ 20 min or ≥ 4,000 steps, strength, relaxation) with weekly progress, habit ticks, follow-up plan, general WHO 2020 / AASM-SRS 2015 guidance. |
| Points, friends, herb reviews | **Real code, synthetic friends.** Daily caps on every rule, steps count up to 6,000, medicine answers score the same whatever the answer, review bonus whatever the rating. Herb reviews have a separate research consent and are shown as user experience, not evidence. |
| Certified ads | **Real rules, fictional products.** Only products with FDA registration, ad licence and GMP and no cure claims; labelled, hideable, rotated by date only, shown on Discover, never on medicine or doctor pages. |
| Expert consultation | Five steps (find expert, service details, wellness summary, request, consent) and a wellness-summary preview the user alone sees until they consent on the pre-visit page. |
| Medicine & care | OCR label scan, unlabelled medicines (identity never guessed), Evidence Passport, reminders (in-app only), verified CareBridge orders, self-reported dose history. |
| CareBridge → ยายพร้อม order sync | **Simulated approval/dispense, real gate.** `evaluateReminderSync()` requires approval, dispense, confirmed clock times, right patient and consent; versioned and idempotent. Same-browser demo channel; no HIS/FHIR live link, no push. |
| Consent and access history | **Real code, local only.** Scoped consents with expiry and revocation; every read, denied read, share and revocation is in the audit log shown on Profile. |
| Nearest facility finder | Real ranking (zone first, then straight-line distance) over 16 fictional facilities. |
| Thai OCR | On-device Tesseract.js (`tha+eng`) with a two-pass pipeline; results stay "รอตรวจสอบ" until the user checks the text. Optional server (`ocr-server/`, PaddleOCR + Typhoon OCR 1.5 2B, Apache-2.0) is **not deployed** (GitHub Pages cannot host Python). Measurements and caveats: `OCR_NOTES.md` and `ocr-bench/`. Typhoon can invent text, so its output is always a draft. |

## Tests

- `npx tsc --noEmit`: clean.
- `npm test`: **174 passed in 23 files** (2026-10-29).
- `npm run build`: succeeds.
- Browser checks with Playwright (Edge, headless) at 390×844, 430×932, 768×1024 and 1440×900: no horizontal overflow, no page errors on the patient routes; check-in, steps entry, device link, theme switch and empty states exercised. Screenshot sets were reviewed in the session; they are not committed (about 17 MB).

## Known gaps

- No accounts, authentication or server database; the two apps talk only inside one browser.
- No native app, so no real Health Connect / Apple Health data; no push notifications.
- Herb data and interactions are waiting for pharmacist / Thai traditional medicine review; publication permission for the Mahidol data is in progress.
- No HIS integration in production; FHIR is export only.
- Not yet tested with older users or on a range of real phones and cameras.

## Next steps

1. Accounts and a PDPA-compliant backend (encryption, role-based access, server-side audit log).
2. Expert review of herb and interaction data, and written permission for the Mahidol data.
3. One-province pilot with Thai traditional medicine clinics and a community hospital, including usability testing with older adults.
