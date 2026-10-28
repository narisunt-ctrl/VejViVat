# Copy-paste prompt for Claude Code (inside the VejViVat repository)

> IMPORTANT: Copy everything from **START PROMPT** to **END PROMPT** into Claude Code after placing this handoff folder at the project root (e.g. `docs/handoff/`).

--- START PROMPT ---

คุณเป็น Senior Full-Stack React/TypeScript Engineer + Clinical Software Safety Engineer ของโครงการ VejVivat / YaiPrompt / CareBridge กรุณา **ลงมือแก้โค้ดจริง** ใน repo ปัจจุบัน ไม่ใช่แค่เขียนแผนหรือสร้างภาพ Mockup

อ่านเอกสาร `00_START_HERE.md`, `01_PRODUCT_UX.md`, `02_TECH_CONTRACTS.md`, `03_TASKS_TESTS.md`, `04_TEAM_CLINICAL_STRATEGY.md` ในโฟลเดอร์ handoff นี้ รวมถึง `docs/yai/IMPLEMENTATION_STATUS.md`, `src/domain/yai/models.ts`, `src/domain/yai/policies.ts`, `src/services/yai/yaiStore.ts`, `src/pages/yai/YaiHomePage.tsx`, `src/app/YaiRoutes.tsx`, `src/pages/PrescribePage.tsx`, `src/pages/PrescriptionPrintPage.tsx`, `src/services/smutthanEngine.ts` ก่อนแก้ไข

**Objective:** ปรับยายพร้อมให้เป็น Voice-First Daily Health Journal ตามแนวหน้าจอ AquaWise ที่ผู้ใช้เคยส่ง (Heatmap ช่องสี่เหลี่ยม/นับจำนวนวันที่บันทึก) และเชื่อม CareBridge clinician-reviewed prescription + verified dispense (synthetic demo only) กลับไปสร้างเตือนยายพร้อมแบบมี version, idempotent, safe

### งานที่ต้องทำเรียงลำดับ
1. Audit repository และรัน baseline `npm test`, `npx tsc --noEmit`, `npm run build` บันทึกผลจริง อย่าแก้สูตร Smutthan เดิมหรือทำลาย route เดิม
2. ปรับ `/yai` เป็นหน้าแรกผู้สูงอายุ เน้นปุ่มใหญ่ `กดพูด เล่าให้หนูฟัง` มี `พิมพ์เอง` `ถ่ายรูป` เป็นรอง ไม่มี dropdown เลือกหมวดบังคับ มี Heatmap รายวันแบบ square-cell และแสดงจำนวน **unique recorded days** ของเดือนนี้จาก entry ที่ยืนยันแล้ว (Asia/Bangkok) พร้อมแสดงตัวอย่างข้อมูลอย่างชัดเจนเมื่อใช้ fixtures
3. เพิ่ม flow `/yai/journal/process` → `/yai/journal/review` → `/yai/journal/history` ใช้ typed journal model มี provenance และการตรวจทาน user confirmed; STT/TTS ภาษาไทยเมื่อ browser รองรับ มี manual fallback เมื่อไม่รองรับ; แยกอาการ/ยา/อาหารโดย AI หรือ fallback ที่ conservative; คำบอกเล่าเรื่องยาไม่ใช่คำสั่งยา
4. Reuse OCR/photo flow ที่มีอยู่ `/yai/scan` รองรับหลายภาพและยาไม่มีฉลาก (ยาต้ม แคปซูลในซอง ยาผง) อย่าเขียน OCR ใหม่ทับเดิม; ภาพ/OCR/field corrections เก็บ provenance; ไม่บังคับมีรูปครบทุกด้าน; กรณีอ่านไม่ออกให้บันทึก unknown ได้
5. เพิ่ม **prescription sync domain** แยก reviewed order, dispense confirmation, schedule, dose self-report. อย่าใช้ event `พิมพ์ใบสั่งยา` เป็นการเซ็นรับรอง. ต้องมี synthetic explicit prescriber approval และ synthetic pharmacist/dispense verification ก่อน sync; รายการยังไม่อนุมัติ/ไม่จ่ายจริง/ไม่รู้ชื่อ/เวลาไม่ชัด/PRN ห้ามสร้าง fixed reminders โดยอัตโนมัติ
6. เชื่อม Demo clinician selected case ↔ ยายพร้อมผ่าน explicit synthetic patient ID mapping (ห้ามเดาจากชื่อ) ใช้ adapter เดโมจำลองบนเบราว์เซอร์ใน repo ปัจจุบัน ไม่อ้างว่าเชื่อม HIS/HOSxP จริง; import idempotent ผ่าน sourceOrderId+version, change/cancel ต้องหยุด future reminders เก่าแต่คงประวัติ
7. แสดงยาที่แพทย์รับรองไว้ใน `/yai/reminders` โดยแยก `สั่งใช้แล้ว`, `จ่ายยาแล้ว`, `รอกำหนดเวลา`, `ยกเลิก`, และ `ยายรายงานว่ากินแล้ว` อย่างถูกต้อง. เก็บ origin/version/date. ไม่เปิด push background โดยแอบอ้าง
8. อาหารตามธาตุย้ายเป็นส่วนเสริม; ทำ adapter อ่านผลจาก `calculateSmutthan()` เดิมเฉพาะข้อมูลครบและ patient linked; ถ้าข้อมูลไม่ครบแสดง `รอข้อมูลประเมิน` ไม่สร้างสูตรใหม่; แยกเมนูเสนอจากอาหารที่กินจริง
9. ทำ clinician optional Knee OA Evidence/Follow-up card จากสรุปเพื่อน โดยเน้น 5C, provenance, safety, patient reported VAS/WOMAC (หากมีข้อมูลจริง) และ human approval; งานวิจัยจากเพื่อนยังไม่ verified จึงแสดงสถานะรอตรวจแหล่งอ้างอิง ห้ามสร้าง DOI/PMID เอง
10. เพิ่ม Unit tests + E2E smoke ถ้าทำได้ตาม test matrix P01-P10, J01-J06, O01-O03, S01-S03 ใน `03_TASKS_TESTS.md` แล้วรัน TS/Vitest/build และตรวจ responsive 390px; แจ้งข้อจำกัดจริง

### Architectural constraints
- React 18 / TypeScript / Vite / existing Tailwind and HashRouter; reuse current components and store interface where possible
- No real patient data in synthetic/demo localStorage or public deployment
- No AI autonomous medical decisions, no medication orders or reminders from raw OCR/unverified handwriting
- No false reassurance about herb–drug interaction; incomplete coverage remains unknown
- No guessed medication times (`หลังอาหาร` does NOT equal `08:00`), dosage, vitals, pregnancy/allergies, or Thai elements
- Always explicit demo data label on synthetic prescriber/dispense, clinical evidence and patient diary
- Doctor's signed order ≠ pharmacy dispense ≠ patient's self-report
- Consent and audit checked at cross-role data boundary; secure backend required before production

### Deliver code incrementally
First show a compact audit and propose changed paths. Then implement **Phase 1** and run checks before proceeding to **Phase 2/3**. Do not stop after the plan unless a major blocker requires a question. Make code changes, tests, and documentation. Keep existing files functional.

When finished report:
- Files changed and exact diff summary
- URLs/routes to test and synthetic demo steps
- Test command results and failures
- Which actions are real code vs mocked demo vs future integrations
- Any unverified literature/safety points needing clinician/pharmacist review
- Screenshots *only if actually captured*, with path

--- END PROMPT ---
