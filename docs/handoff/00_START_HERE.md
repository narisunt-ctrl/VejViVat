# VejVivat × YaiPrompt × CareBridge — Claude Code Handoff
**Date:** 2026-10-29 (Asia/Bangkok)  
**Repository:** https://github.com/narisunt-ctrl/VejViVat  
**Patient app:** YaiPrompt / ยายพร้อม (`/yai/*`)  
**Clinician app:** CareBridge / VejVivat (existing clinician routes)  
**Audience:** Claude Code working inside the existing React/TypeScript repository.

## 1) What we are building
Make YaiPrompt an **elderly-first, voice-first Daily Health Journal** with a square-cell daily-record heatmap, and add **clinician-approved prescription → verified medication → patient reminder synchronization** between CareBridge and YaiPrompt. Use the team member's research/adoption strategy to shape clinical-facing workflows, not to automate prescribing.

Patient journey (4 core pages):
1. **Today** — 'วันนี้ยายเป็นอย่างไรบ้างคะ?' prominent **'กดพูด เล่าให้หนูฟัง'**, secondary **'พิมพ์เอง'** and **'ถ่ายรูป'**, daily heatmap and 'บันทึกกี่วันแล้ว'. NO category dropdown; AI/rules suggest categories.
2. **AI จัดข้อมูล** — Thai speech transcription / typed text / medicine-label OCR, source images, structured extraction, unknown-field flags.
3. **ยายตรวจสอบ** — big editable text/fields, Thai read-back when available, source of each fact, 'ไม่ทราบ' and 'มีแค่นี้' options; explicit confirmation.
4. **ผลลัพธ์และประวัติ** — time-stamped verified-user entries, Evidence Passport, past days and clinician handoff.

Supporting existing modules: multi-side medicine photo/OCR, **unlabeled medicines** (decoction, loose capsules, herbal powders), medicine cabinet, reminders, consent, clinician pre-visit. Secondary 'อาหารตามธาตุ' and element overview are **NOT part of the daily-entry gate**.

## 2) Critical repository inspection findings — verify again before editing
The linked GitHub default branch was inspected on 2026-10-29. These are **files that actually exist**, not proposed filenames:
- `src/main.tsx` uses `HashRouter`.
- `src/app/Router.tsx` routes `/yai/*` to lazy `YaiRoutes`; clinician and partner are separate.
- `src/app/YaiRoutes.tsx` declares `/yai`, `/yai/scan`, `/yai/scan/review`, `/yai/medicines`, `/yai/reminders`, etc.
- `src/pages/yai/YaiHomePage.tsx` **currently emphasizes taking a medicine photo**. This is the screen to change to voice-first daily journal.
- `src/pages/yai/ScanPage.tsx`, `ScanReviewPage.tsx` implement capture, OCR/check/review; **extend/reuse instead of rebuilding**.
- `src/services/yai/ocrPipeline.ts`, `labelParser.ts`, `photoStore.ts`, `thaiOcr.ts` and `src/domain/yai/models.ts` support photo evidence/provenance.
- `src/pages/yai/MedicinePassportPage.tsx` includes unknown fields, source verification, three voices and review.
- `src/pages/yai/RemindersPage.tsx`, `src/services/yai/reminderSchedule.ts`, `src/domain/yai/policies.ts`, `src/services/yai/yaiStore.ts` implement **in-app foreground demo reminders**, not cross-device push.
- `src/pages/PrescribePage.tsx` manages a **mock prescription cart** and navigates to print; `src/pages/PrescriptionPrintPage.tsx` exports synthetic data. **Print/confirm-cart is NOT a legally authenticated clinical signature or a verified dispense.** Do not treat it as one.
- `src/adapters/fhirStubAdapter.ts` provides a FHIR *stub*, not live hospital interoperability.
- `src/services/smutthanEngine.ts` has `calculateSmutthan()`; `data/rules/smutthan-rules.json` exists. DO NOT replace or re-implement these formulas.
- `docs/yai/IMPLEMENTATION_STATUS.md` describes work and synthetic-data limitations; some summary lines differ from later detailed OCR implementation claims. **Inspect running code and tests as the source of truth.**
- The Yai demo store uses `localStorage` (`yai-demo-v1`) and synthetic fixtures; NEVER feed real patient data into this browser-local demo store.

## 3) Implementation boundaries — non-negotiable
- Do not delete/replace existing clinical pages, routes, OCR pipeline, or 4-element scoring rules.
- NO autonomous AI prescribing, dose selection, herbal drug recommendation, dispensing or diagnosis. Order suggestion is separate from prescriber approval.
- Distinguish **signed/approved order**, **dispensed/handed-over item**, **patient statement**, **OCR draft**, and **self-reported administration**.
- **No reminders from an OCR-only draft or unidentified medicine.** For clinician-sync reminders require verified identity, approved order, verified real dispense/explicit handover (for the demo simulated as such), and a clinically confirmed unambiguous schedule.
- A valid order may have **PRN, taper, conditional, meal-relative, or ambiguous directions**. Never fabricate clock times; require review/explicit patient or pharmacist agreement where applicable.
- A changed/discontinued order must de-activate obsolete reminders. Synchronization is idempotent and version-aware.
- If a provider has not verified the label or prescription, keep 'รอตรวจสอบ' visible. **Patient-confirmed OCR is not clinician-verified prescription.**
- TTS is optional Thai (`th-TH`), and AI must read back *what was captured*, not assert clinical truth.
- For everything shown in demo, display 'ข้อมูลจำลอง' when using fictional identities/orders; no claims of a real hospital integration or background notifications.
- No default health vitals, element, ingredients, drug interactions or foods inferred from absent data. Unknown ≠ normal/safe.
- No real human medical records or identifiable data in code, fixtures, public GitHub Pages or plaintext logs; obey local PDPA and security reviews for future production.

## 4) Read these companion files IN ORDER
1. `01_PRODUCT_UX.md` — Thai UI copy, screens, interactions, accessibility and food section.
2. `02_TECH_CONTRACTS.md` — data-model changes, integration boundaries, route map, order-sync state machine, element adapter.
3. `03_TASKS_TESTS.md` — staged PR plan, measurable acceptance tests and demo validation.
4. `04_TEAM_CLINICAL_STRATEGY.md` — clear extraction of teammate's supplied medical-adoption strategy and its evidence limitations.
5. `05_CLAUDE_PROMPT.md` — the exact initial assignment to paste into Claude Code.
6. `friend_summary_original.txt` — teammate's verbatim research document supplied by the project owner. Treat its quantitative clinical claims as **user-supplied, not independently validated**.

## 5) Recommended handoff workflow
At project root run:
```bash
npm ci
npm test
npx tsc --noEmit
npm run build
```
Record baseline failures *before changes*. Next, inspect `src/app/YaiRoutes.tsx`, `src/pages/yai`, `src/domain/yai`, `src/services/yai`, `src/pages/PrescribePage.tsx`, and `src/services/smutthanEngine.ts`. Create a small `feat/yai-journal-prescription-sync` branch and implement incremental testable slices. Prefer a **demo event adapter** for physician-to-Yai sync on the same simulated patient identity rather than implying any production HIS/HOSxP connectivity. Include visible pending / unavailable states and a changelog.

## 6) Product demo's golden path
**Voice** 'วันนี้ยายปวดเข่า กินยาหลังอาหารเช้า แล้วกินข้าวต้ม' → **segmented draft** (symptom, patient-mentioned medicine, food) → **ยายตรวจแก้และบันทึก** → actual **date heatmap** updated → doctor in CareBridge reviews synthetic knee-OA case and (in demo only) explicitly approves a well-defined prescription → simulated dispensing verification → **new versioned medication appears on YaiPrompt** with a clearly sourced verified schedule → grandma self-reports 'กินแล้ว' → clinician follow-up sees the self-reported event, not proof of ingestion. Add an unlabeled-capsule/decoction item as 'unidentified — no reminder'.

## 7) Definition of done for MVP
- All four core screens accessible as direct routes and by elderly-friendly nav.
- Heatmap counts **distinct real logged days** in patient-local timezone; not hard-coded activity squares.
- Voice/manual/photo path to patient review works end-to-end; unsupported voice shows honest fallback.
- Existing OCR and photo provenance preserved; label capture does not demand four sides.
- Order sync enforces patient matching, versions, dispense status, approval, and schedule gate.
- Updating/canceling order updates reminders; duplicates blocked; zero fake schedule-times.
- Unlabeled medicine and undocumented ingestion cannot trigger signed-order reminder.
- Existing `/smutthan`, `/prescribe`, `/yai/scan`, `/yai/medicines`, `/yai/reminders` still work.
- Unit/integration tests, build and responsive checks pass; any non-complete parts are visibly labeled demo/roadmap.
