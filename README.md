# TTM Smutthan Engine Platform 🌿🩺
<p align="center">
  <img src="public/team-logo.png" alt="VejVivat Thai Medicine AI Crest" width="160" />
  <br />
  <b>พัฒนาโดย ทีม VejVivat (เวชวิวัฒน์) — Thai Medicine AI Innovation</b><br />
  <i>ระบบสนับสนุนการตัดสินใจทางคลินิกแพทย์แผนไทย เชื่อมโยงสารสนเทศสุขภาพ และตรวจจับอันตรกิริยาสมุนไพร-ยาแผนปัจจุบัน</i><br />
  <b>TTM Hackathon 2026</b> — สาขา Health Informatics & Thai Traditional Medicine Innovation
</p>

[![Tests](https://img.shields.io/badge/tests-35%2F35%20passing-brightgreen.svg)](src/tests)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](tsconfig.json)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](package.json)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8.svg)](tailwind.config.js)
[![Maturity Level](https://img.shields.io/badge/Maturity-Level%201.5%20(Advanced%20Clinical%20Hub)-teal.svg)](docs/00-prototype-status.md)
[![NLEM Formulary](https://img.shields.io/badge/NLEM%20Conventional-1%2C080%20Drugs%20(17%20Systems)-blue.svg)](docs/07-formulary-and-prescribing.md)
[![Dual Diagnosis](https://img.shields.io/badge/Dual%20Diagnosis-ICD--10%20%E2%86%94%20ICD--10--TM-purple.svg)](docs/04-ai-explainability.md)
[![Voice AI](https://img.shields.io/badge/Voice%20AI-Speech--to--Text%20Symptom%20Model-rose.svg)](docs/04-ai-explainability.md)
[![Cohort Size](https://img.shields.io/badge/Cohort-30%20Synthetic%20Cases-amber.svg)](data/synthetic/cases.json)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-success.svg)](https://narisunt-ctrl.github.io/VejViVat/)

---

## 🎬 วิดีโอจำลองการทำงานจริงของระบบ (Program Simulation Video)

<p align="center">
  <a href="https://narisunt-ctrl.github.io/VejViVat/videos/ttm-vejvivat-demo.mp4">
    <img src="public/videos/demo-preview.gif" alt="TTM Smutthan Engine Simulation Walkthrough" width="720" style="border-radius: 14px; box-shadow: 0 8px 30px rgba(0,0,0,0.2);" />
  </a>
  <br />
  <b>▶️ <a href="https://narisunt-ctrl.github.io/VejViVat/videos/ttm-vejvivat-demo.mp4">คลิกที่นี่เพื่อรับชมหรือดาวน์โหลดวิดีโอตัวเต็ม (.mp4 720p HD ความยาว 1:11 นาที)</a></b> | <b><a href="https://narisunt-ctrl.github.io/VejViVat/">เข้าสู่ระบบ Live Web App</a></b><br />
  <i>วิดีโอบันทึกสาธิตการทำงานครบ 5 ขั้นตอน: 1. ลงทะเบียนผู้ป่วยใหม่ (Intake) → 2. ประเมินสมุฏฐานธาตุ AI & Override → 3. สั่งยาสมุนไพรและตรวจจับอันตรกิริยา HDI → 4. พิมพ์ใบสั่งยาอิเล็กทรอนิกส์ & FHIR → 5. แผนการรักษาและแดชบอร์ดแนวโน้มการฟื้นฟูรายบุคคล</i>
</p>

---

> ### ⚠️ ข้อความปฏิเสธความรับผิดชอบทางการแพทย์และข้อมูลส่วนบุคคล (Clinical & Data Disclaimer)
> 1. **ข้อมูลสังเคราะห์เพื่อการสาธิต (100% Synthetic Data):** ข้อมูลผู้ป่วยทั้งหมด (30 เคส C01–C30 และระบบลงทะเบียนผู้ป่วยใหม่) ในระบบนี้เป็น **ข้อมูลที่ถูกสร้างขึ้นเพื่อการจำลองทางวิชาการในการแข่งขัน Hackathon 2026 เท่านั้น** มิใช่ข้อมูลผู้ป่วยจริงจากสถานพยาบาลใดๆ
> 2. **ระบบสนับสนุนการตัดสินใจ (Clinical Decision Support):** ระบบนี้ทำหน้าที่เป็นเครื่องมือสนับสนุนการตัดสินใจ (Decision Support) มิใช่การวินิจฉัยโรคหรือสั่งการรักษาแทนแพทย์แผนไทยผู้ประกอบวิชาชีพ
> 3. **สถานะรายการยาและอันตรกิริยา:** ข้อมูลบัญชียาแผนไทยและคู่ยาอันตรกิริยาในระบบจัดอยู่ในสถานะ **"ตัวอย่าง รอเภสัชกร/แพทย์แผนไทยตรวจสอบ"**

---

## 🎯 วิสัยทัศน์ของระบบ (4 เสาหลักการพัฒนา)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        TTM Smutthan Engine Platform — VejVivat                         │
├─────────────────────┬──────────────────────────┬───────────────────────┬───────────────┤
│ 1. Smutthan Engine  │ 2. Centralized HDI       │ 3. Clinical Care Plan │ 4. ICD-10-TM  │
│    (AI-Assisted)    │    Safety Screening      │    & Trajectory       │    Analytics  │
├─────────────────────┼──────────────────────────┼───────────────────────┼───────────────┤
│ • สภาพอากาศ Live    │ • ตรวจจับ 14+ คู่ยาเสี่ยง│ • แผนติดตามผลรายเดือน │ • ต้นทุนเคสจริง│
│ • คำนวณธาตุ 4 โปร่งใส│ • Evidence Level A-D     │ • อิง สธ. & WHO       │ • สถิติรหัส U │
│ • อธิบายได้ทุกกฎ    │ • Override + ตรวจโดส     │ • แดชบอร์ดแนวโน้มกราฟ │ • คุณภาพข้อมูล│
└─────────────────────┴──────────────────────────┴───────────────────────┴───────────────┘
```

1. **Smutthan Engine:** เครื่องมือช่วยประเมินสมุฏฐานวินิจฉัย (AI-assisted) รวบรวมสภาวะแวดล้อม สภาพอากาศ (อุณหภูมิ, ความชื้น) จาก Open-Meteo API แบบ Real-time ประมวลผลร่วมกับกาลสมุฏฐาน (เวลา), อายุสมุฏฐาน (วัย), สัญญาณชีพ และอาการสำคัญ เพื่อคำนวณและคาดการณ์ความแปรปรวนของธาตุประธานอย่างโปร่งใส ตรวจสอบย้อนหลังได้ 100% ลดความเหลื่อมล้ำของการวิเคราะห์โรคระหว่างผู้ประกอบวิชาชีพ
2. **Centralized Herb-Drug Interaction (HDI) Database:** ฐานข้อมูลกลางตรวจอันตรกิริยาระหว่างยาแผนปัจจุบันกับสมุนไพร รองรับ API กับระบบ HIS ทุกระดับ (HOSxP, EHP, SSB, Himpro) แจ้งเตือนความปลอดภัยทันทีเมื่อมีการสั่งยาร่วมกัน พร้อมระบบรับทราบและบันทึกเหตุผลทางคลินิก (Clinician Override)
3. **Evidence-Based Clinical Care Plan & Trajectory Dashboard:** แผนการรักษาและตารางติดตามผลรายบุคคลตามหลักวิชาการของกระทรวงสาธารณสุขและ WHO Herbal Pharmacovigilance (ความถี่รายเดือน 4 ครั้ง/เดือนสำหรับกลุ่มเสี่ยงสูง) พร้อมแดชบอร์ดกราฟแนวโน้มการลดระดับความปวด (VAS), การฟื้นฟูสมดุลตรีธาตุ และคะแนน PROM
4. **ICD-10-TM Real-time Analytics:** ยกระดับการบันทึก ICD-10-TM (กลุ่มรหัส U) ให้ประมวลผลการจ่ายยาและหัตถการไทยแบบ Real-time เพื่อประเมินต้นทุนต่อเคส ความคุ้มค่าทางเศรษฐศาสตร์สาธารณสุข และตรวจสอบคุณภาพข้อมูลตามมาตรฐาน 43 แฟ้มกระทรวงสาธารณสุข (สนย. 2568)

---

## 🚀 ฟังก์ชันเด่นในการสาธิต (Demo Highlights)

- 🌟 **เคสทดสอบไฮไลท์ C02 (นางสมจิตต์ อายุ 68 ปี - Warfarin + ขมิ้นชัน):**  
  ผู้ป่วยมีโรคประจำตัว Atrial Fibrillation รับประทานยาละลายลิ่มเลือด Warfarin อยู่เดิม เมื่อมารับบริการแผนไทยและระบบแนะนำให้ใช้ยาขับลม/แก้ปวด หากเลือกสั่ง "ยาแคปซูลขมิ้นชัน" ระบบจะแสดงการแจ้งเตือน **ระดับความเสี่ยงสูง (HIGH Severity - Evidence Level B)** ทันที เนื่องจากขมิ้นชันยับยั้ง CYP2C9 และต้านการเกาะกลุ่มเกล็ดเลือด ทำให้ค่า INR ยืดผิดปกติและเสี่ยงต่อภาวะเลือดออกในทางเดินอาหาร พร้อมแนะนำทางเลือกอื่นที่ปลอดภัย เช่น การนวดประคบสมุนไพร
- 🌤️ **Live Environmental Fetching:**  
  เชื่อมต่อ Open-Meteo REST API เพื่อดึงอุณหภูมิและความชื้นสัมพัทธ์ตามพิกัด รพ.สต. จริง พร้อมระบบ Fallback หากออฟไลน์
- 📊 **Element Radar Chart & Explainable Breakdown:**  
  แสดงสมดุลธาตุดิน น้ำ ลม ไฟ พร้อมตารางแจกแจงน้ำหนักคะแนนทุกข้ออย่างโปร่งใส
- 🧑‍⚕️ **Interactive Patient Intake Modal:**  
  ระบบลงทะเบียนผู้ป่วยใหม่สดในห้องตรวจ คำนวณธาตุกำเนิดอัตโนมัติจากวันเดือนปีเกิด ดึงสภาพอากาศสด และบันทึกข้อมูลอย่างปลอดภัย
- 📈 **Longitudinal Trajectory Dashboard (Recharts):**  
  แสดงผลกราฟแนวโน้มการฟื้นฟูสุขภาพรายบุคคล 4 มิติ (ความปวด, สมดุลตรีธาตุ, สัญญาณชีพ, PROM) และตารางนัดรายเดือนตามเกณฑ์วิชาการ
- 📑 **HL7 FHIR & 43-Folders Interoperability:**  
  ส่งออกใบสั่งยาในรูปแบบ **HL7 FHIR R4 MedicationRequest** และไฟล์ CSV ตามมาตรฐาน 43 แฟ้ม (DRUG_OPD, DIAGNOSIS_OPD, PROCEDURE_OPD)

---

## 📂 โครงสร้างไดเรกทอรีโครงการ (Project Structure)

```
ttm-smutthan-engine/
├── .github/workflows/deploy.yml   # GitHub Actions อัตโนมัติ Deploy สู่ GitHub Pages
├── config/
│   └── mapping-43folders.json     # คอนฟิก Mapping ฟิลด์มาตรฐาน 43 แฟ้ม และรหัสยา 24 หลัก
├── data/
│   ├── formulary/                 # บัญชียาสมุนไพร 21 รายการ (NLEM 2568, รหัส 24 หลัก)
│   ├── hdi/                       # ฐานข้อมูล 14 คู่ยาอันตรกิริยา (C01-C30)
│   ├── master/                    # รหัสยาแผนปัจจุบัน 12 รายการ และ ICD-10-TM Master
│   ├── rules/                     # กฎการคำนวณสมุฏฐานธาตุ และอภิธานศัพท์ (Glossary)
│   └── synthetic/                 # เคสจำลอง C01-C30 และชุดข้อมูล 43 แฟ้มย้อนหลัง 51 Visits
├── docs/                          # เอกสารข้อกำหนดและการวิเคราะห์ฉบับสมบูรณ์ 10 บท
├── pitch/                         # สไลด์นำเสนอและบทพูด Pitching (5 นาที / 10 นาที)
├── public/
│   ├── openapi.yaml               # OpenAPI 3.0 Specification สำหรับ HIS REST Gateway
│   └── videos/                    # วิดีโอสาธิตระบบ MP4, WebM, Poster และ Animated GIF
├── scripts/
│   ├── check-pii.py               # สคริปต์สแกนตรวจจับข้อมูลส่วนบุคคล (PII)
│   ├── deidentify.py              # สคริปต์ De-identification สำหรับชุดข้อมูล
│   └── record-simulation.mjs      # สคริปต์บันทึกวิดีโอจำลองการทำงานจริงอัตโนมัติ
├── src/
│   ├── adapters/                  # Clean Architecture Adapter Pattern (Mock, 43-Files, FHIR)
│   ├── components/                # UI Components (Intake, Radar, Safety Alert, Cart)
│   ├── pages/                     # 8 หน้าจอหลักของระบบ (รวม CarePlanPage & Video Modal)
│   ├── services/                  # Core Engines (Smutthan, HDI, Dosage, Analytics, CarePlan)
│   ├── tests/                     # 5 ชุดการทดสอบ Vitest (25 Tests Passed 100%)
│   └── types/                     # TypeScript Domain Model Interfaces
└── package.json
```

---

## 🛠️ วิธีการติดตั้งและรันระบบ (Quickstart Guide)

### 1. ความต้องการของระบบ (Prerequisites)
- Node.js version 18.0 ขึ้นไป
- npm หรือ yarn

### 2. ติดตั้ง Dependencies
```bash
npm install
```

### 3. รัน Unit Tests (ทดสอบความถูกต้องของกฎและการคำนวณ)
```bash
npm test
```
*ผลการทดสอบ: 7 Test Suites, 35 Tests Passed (100% Passing)*

### 4. รันระบบในโหมด Development
```bash
npm run dev
```
เปิดบราวเซอร์ที่ `http://localhost:5173`

### 5. Build สำหรับ Production และ Deployment
```bash
npm run build
```
ไฟล์ Bundle ที่ผ่านการคอมไพล์จะถูกสร้างไว้ในโฟลเดอร์ `dist/` พร้อมนำไป Deploy บน Web Server หรือ Vercel ได้ทันที

---

## 📚 ดัชนีเอกสารโครงการ (Documentation Index)

| เอกสาร | หัวข้อเนื้อหา |
|---|---|
| [docs/00-prototype-status.md](docs/00-prototype-status.md) | สถานะความพร้อมของโปรโตไทป์ (Maturity Level 1.5 Advanced Clinical Hub & Dual Formulary) |
| [docs/01-system-overview.md](docs/01-system-overview.md) | ที่มา ปัญหา 5 เสาหลักเทคโนโลยี 5 ขั้นตอนการทำงาน และตัวชี้วัดความสำเร็จ (KPIs) |
| [docs/02-input-process-output.md](docs/02-input-process-output.md) | ข้อกำหนด IPO, โมเดลเสียง AI, Dual Diagnosis, SBAR Referral, และ NLEM 1,080 ยา |
| [docs/03-architecture.md](docs/03-architecture.md) | สถาปัตยกรรมระบบ ผัง Mermaid, Adapter Pattern และมาตรฐาน FHIR |
| [docs/04-ai-explainability.md](docs/04-ai-explainability.md) | ความโปร่งใสของ AI, สูตรคำนวณธาตุ, AI Speech-to-Text, Dual Diagnosis, และ SBAR |
| [docs/05-technical-feasibility.md](docs/05-technical-feasibility.md) | ความเป็นไปได้ทางเทคนิค ผลการทดสอบ 35/35 การบริหารความเสี่ยง และ NLEM Performance |
| [docs/06-health-economics.md](docs/06-health-economics.md) | การประเมินความคุ้มค่าทางเศรษฐศาสตร์สาธารณสุข, RDU NLEM 1,080 ยา และต้นทุนต่อเคส |
| [docs/07-formulary-and-prescribing.md](docs/07-formulary-and-prescribing.md) | คู่มือบัญชียาคู่ขนาน TTM & NLEM 1,080 ยาใน 17 กลุ่มโรค, HDI และข้อห้ามนวดไทย |
| [docs/08-pilot-plan.md](docs/08-pilot-plan.md) | แผนงานการนำร่องในพื้นที่จริง 4 ระยะ, การทดสอบโมเดลเสียง, และความถี่การติดตามผล |
| [docs/09-known-limitations.md](docs/09-known-limitations.md) | ข้อจำกัดของระบบในปัจจุบัน และ Roadmap การพัฒนาสู่เวอร์ชัน 2.0 / 3.0 |

---

## 👥 ข้อมูลทีมพัฒนาและการแข่งขัน
- **ทีมพัฒนา:** ทีม VejVivat (เวชวิวัฒน์) — Thai Medicine AI Innovation
- **โครงการ:** TTM Smutthan Engine Platform
- **เวที:** TTM Hackathon 2026
- **Repository:** [https://github.com/narisunt-ctrl/VejViVat](https://github.com/narisunt-ctrl/VejViVat)
- **Live Production Website:** [https://narisunt-ctrl.github.io/VejViVat/](https://narisunt-ctrl.github.io/VejViVat/)

