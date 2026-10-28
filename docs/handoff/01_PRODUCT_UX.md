# Product requirements / User journeys — ยายพร้อม
**Design reference:** owner-provided AquaWise screenshot: simple greeting, square calendar heatmap, 'how many days recorded', daily record CTA. Adapt the information hierarchy, not the original brand styling or its images.

## UX principle
**One-screen grandmother promise:** 'ยายไม่ต้องรู้ว่าจะกรอกช่องไหน แค่เล่า พิมพ์ หรือถ่ายภาพ แล้วหนูช่วยเก็บให้ค่ะ'.
- Strong contrast, simple Thai, minimum 18px normal text when practical; major action text 20–24px; tap target ≥48×48px (prefer 56–64px); large spaces.
- NO mandatory dropdown for symptoms/medicine/food. AI classification occurs after input; patient can correct.
- No 'camera coach' that continuously tells her to tilt/rotate a package. A gentle static checklist (ชื่อยา, เลขทะเบียน, ส่วนประกอบ, ความแรง, จำนวน) suffices.
- No punishing missing-days/streak, no pressure to use all features daily.
- Respect reduced motion, keyboard focus, screen-reader labels, Thai Buddhist calendar presentation without altering ISO storage.

## IA (the 4 primary screens)
| Route proposal (verify conflicts) | UI | Key interactions | Records |
|---|---|---|---|
| `/yai` | Today dashboard | speak big CTA, type, photo, square daily heatmap, count days | read journal + reminders summary |
| `/yai/journal/process` | Input process | text from STT, typed note, image OCR progress and draft grouping | draft only |
| `/yai/journal/review` | Grandmother confirms | edit source text and extracted fields, mark unknown/none available, TTS readback | persist only on confirm |
| `/yai/journal/history` | Results/history | timeline, per-day counts, filters only if needed, Evidence Passport links | confirmed notes, audit |

Keep existing `/yai/scan`, `/yai/scan/review`, `/yai/medicines`, `/yai/reminders`, `/yai/previsit`. Use the existing shell/layout. The journal router can refer to these rather than duplicating OCR pages.

### Screen 1: Today (`YaiHomePage.tsx`)
Screen ordering:
1. Header 'ยายพร้อม' and accessible help/volume toggle.
2. 'สวัสดีค่ะคุณยาย วันนี้เป็นอย่างไรบ้างคะ?' Use demo name only if synthetic or current patient profile.
3. Huge green primary button '🎙 กดพูด เล่าให้หนูฟัง', speech permission on tap, explicit listening indicator, start/stop.
4. Secondary large button pair: 'พิมพ์เอง' / 'ถ่ายรูป'. For 'ถ่ายรูป', allow 'ฉลากยา', 'ยาไม่มีฉลาก', 'อาหาร', 'อื่น ๆ' **AFTER** taking photo or via very simple optional tags. Do not force category first.
5. Heatmap square 7-column calendar anchored correctly to each day-of-week. Display total distinct days recorded, and per-day number of entries. Count not reward compliance. Three colour levels optional based on entry counts. No false 'completed health' claim.
6. Compact 'ข้อมูลวันนี้' recent note snippets and 'แก้ไข / ดูประวัติ'. Optional preview of synced verified prescription next reminder.
7. Small 'บริการเพิ่มเติม': สมุดยา, เตือนกินยา, อาหารตามธาตุ, ข้อมูลให้หมอ.

Main CTA must be above heatmap on narrow phones if the screen height requires scrolling; don't bury voice behind the calendar. Date/count example: 'เดือนนี้บันทึกแล้ว 8 วัน' (computed). Compute in Asia/Bangkok, preserve UTC timestamps.

### Screen 2: Processing
- Show actual transcript of recognized Thai audio; no generated text claimed as recorded audio.
- For photo, display thumbnails; reuse `src/services/yai/ocrPipeline.ts` and photo provenance.
- Structured *suggestion* categories: 'อาการ', 'ยา/สมุนไพร', 'อาหารที่กิน', 'เรื่องอื่น ๆ'. Note that a single sentence may contain 3 categories.
- Uncertain data or missing names: explicit 'ยังไม่ทราบ'. OCR engine confidence ≠ reliability of a medicine identity.
- Never invent a medicine identity from capsule appearance, or infer dosage from disease/symptoms.
- If voice recognition is not supported/permission denied, let grandma type; if offline OCR missing models, show upload/manual fallback.

### Screen 3: Review and save
- Display original text side by side (or above) extracted summary, but keep it usable on a 390px screen.
- Source chips: 'ยายเล่า', 'พิมพ์เอง', 'OCR จากรูป', 'ผู้ดูแลให้ข้อมูล', 'บุคลากรยืนยัน'.
- Big '✅ ถูกต้อง บันทึกเลย', '✏️ แก้ไข', 'ไม่ทราบ', 'มีแค่นี้'.
- For a photo of herbal decoction or capsules in a plastic bag, store photo and free-text memory, status `UNIDENTIFIED`, **never classify clinically by image colour/shape**.
- Auto TTS optionally reads back 'หนูได้ยินว่า...' but never announces medical conclusions. Must have visible mute.
- Confirming 'กินยาหลังอาหาร' is **the patient's report**, not a verified doctor order, not a schedule trigger.

### Screen 4: Results + longitudinal records
- Daily journal timeline and calendar; tap date to review details.
- Entries can be edited with version history and provenance; edits must not overwrite source photo or initial transcript.
- Evidence Passport integrates medicine label, unlabelled item, reported symptoms/food, signed order reference and doctor's review status.
- Actual consumed foods are distinguished from suggested meals. Self-reported dose is not proof of swallowing a drug.
- Display uncertainties, incomplete medicine list and clinically reviewed flags correctly.
- Clinician handoff must require explicit scoped consent and access check, with audit and revocation.

## Existing medicine flow — simplify, not destroy
The existing OCR is functional in the repo according to `docs/yai/IMPLEMENTATION_STATUS.md`, but on-device speed/phone accuracy need testing. Reuse `ScanPage`, `ScanReviewPage`, `MedicinePassportPage`.
- Camera → front/back/other photos **as available** → OCR batch or asynchronous → patient checks text → save.
- Highlight: medicine/brand name, Thai registration number where applicable, ingredient(s), strength (per unit), package quantity (separate), form, EXP, label directions.
- A medication label does not by itself say the patient was dispensed the medicine or is following directions.
- Unlabeled options: ยาต้ม/ยาหม้อ, แคปซูลในซอง, ยาลูกกลอน, ผง/สมุนไพรแห้ง, ไม่ทราบชนิด, 'ยายมีแค่นี้'.
- Three voices always separate: label, patient, clinician/pharmacist.

## Clinician-to-patient medication reminders
CareBridge clinician order UI (in existing `/prescribe`) → explicit authorized review/sign state → pharmacy verification of dispense / handover (demo simulator) → versioned order record → consented sync → `/yai/reminders` displays medication name, dose, directions, time, source, latest version → patient may tap 'กินแล้ว', 'ยังไม่ได้กิน', 'ไม่แน่ใจ' (existing UI and types). 'เลื่อนเตือน' may be optional as a UI-only notification delay, not a dose schedule change.

Important: for ambiguous regimen such as 'หลังอาหาร' without exact time, DO NOT silently use 08:00. Display 'รอกำหนดเวลาเตือน' and allow pharmacist/patient to confirm an appropriate reminder time without altering order. PRN drugs use on-demand instructions and should not be given fixed dosing reminders unless explicitly ordered.

## Extras: Foods by element
Move food suggestions to a supplementary area accessible from home, not an intake step. Show only a short result badge ('ธาตุเจ้าเรือนตามข้อมูลที่บันทึก: ...' or 'รอผลประเมิน') and 3 meal ideas if appropriate.
- Read patient-linked result from the **existing** `calculateSmutthan` adapter in VejVivat; do not implement a competing formula. A changing five-factor imbalance score is not necessarily a stable birth element; distinguish both.
- Avoid the claim that element-aligned food cures/controls disease. Log *recommended menus* separately from *actual consumed food*.
- Safety check food allergy, kidney disease, diabetes, hypertension, medically advised diets; if unknown show a general example, not patient-specific prescription.
- Clinician facing system owns decisions on medicinal herbs. No autonomous herbal prescribing.

## Demo narrative in ~100 seconds
0–15s: today page + heatmap, grandma says 'วันนี้ปวดเข่ามาสามวัน กินยาหลังอาหารเช้า แล้วกินข้าวต้ม' (or click clearly labeled synthetic transcript if microphone unsupported).
15–35s: AI separates symptoms, patient medicine statement and food; grandma checks and saves. Heatmap updates in live demo state.
35–55s: photo of capsule with no label; save as unknown, no reminder.
55–80s: doctor reviews knee-OA synthetic case in CareBridge and an existing structured order; performs an explicit **demo clinician approval**, then simulated dispensing verification. Same synthetic linked patient receives updated order.
80–100s: YaiPrompt shows clinician-sourced reminder, grandma reports taken, physician can see patient-reported status and knows not to infer confirmed adherence.
