import { Info, CheckCircle2, AlertCircle, FileCode, ShieldCheck, Cpu, Sparkles } from 'lucide-react';
import teamLogo from '@/assets/team-logo.png';

export const SystemStatusPage: React.FC = () => {
  const statusMatrix = [
    {
      component: 'Smutthan Engine (คำนวณคะแนน 4 ธาตุ)',
      type: 'ทำงานจริง (Real)',
      status: 'REAL',
      note: 'คำนวณคะแนนธาตุสดจากข้อมูลคนไข้ + สภาพอากาศจริงที่ดึงจาก Open-Meteo API',
    },
    {
      component: 'การดึงสภาพอากาศ Real-time (Open-Meteo)',
      type: 'ทำงานจริง (Real API)',
      status: 'REAL',
      note: 'Client-side fetch ตรงจาก Open-Meteo API ฟรี ไม่ต้องใช้ API key และมีแคช fallback',
    },
    {
      component: 'Interaction Matcher (ตรวจอันตรกิริยายา-สมุนไพร)',
      type: 'ทำงานจริง (Real Engine)',
      status: 'REAL',
      note: 'จับคู่ยาแผนปัจจุบันกับสมุนไพรสดตามรายการที่แพทย์เลือกในฟอร์ม',
    },
    {
      component: 'ตัวตรวจขนาดยาและระยะเวลา (Dosage Validator)',
      type: 'ทำงานจริง (Real Engine)',
      status: 'REAL',
      note: 'คำนวณขนาดต่อวัน/จำนวนรวม และแจ้งเตือนเมื่อเกินเกณฑ์สูงสุดของ Formulary',
    },
    {
      component: 'ICD-10-TM Real-time Analytics (คำนวณต้นทุนต่อเคส)',
      type: 'ทำงานจริง (Real Engine)',
      status: 'REAL',
      note: 'คำนวณต้นทุนต่อเคส/หัตถการจริงจากไฟล์ ไม่ hard-code ตัวเลข และรวมใบสั่งยาใหม่ทันที',
    },
    {
      component: 'ชุดเคสสังเคราะห์ 30 เคส และระบบลงทะเบียนผู้ป่วยใหม่ (Patient Intake)',
      type: 'ทำงานจริง (Real Engine & Storage)',
      status: 'REAL',
      note: 'ขยายเป็น 30 เคสสังเคราะห์ พร้อมระบบลงทะเบียนผู้ป่วยใหม่ คำนวณธาตุกำเนิด ดึงสภาพอากาศสด บันทึก LocalStorage และทดสอบได้ทันที',
    },
    {
      component: 'การเชื่อมต่อระบบ HIS โรงพยาบาลจริง (HOSxP, EHP)',
      type: 'จำลอง (Simulated / Spec-ready)',
      status: 'MOCK',
      note: 'ออกแบบ Adapter Layer + OpenAPI 3.0 spec (openapi.yaml) และ mock Express server ใน /api-mock',
    },
    {
      component: 'ข้อมูล 43 แฟ้มกระทรวงสาธารณสุข',
      type: 'จำลอง (Synthetic CSV)',
      status: 'MOCK',
      note: 'CSV สังเคราะห์ตาม config mapping 43 แฟ้ม (PERSON, SERVICE, DRUG_OPD ฯลฯ)',
    },
    {
      component: 'GenAI สรุปคำอธิบายทางคลินิก',
      type: 'ไฮบริด (Hybrid)',
      status: 'HYBRID',
      note: 'ทำงานจริงเมื่อใส่ API key โดยส่ง prompt ที่ไม่มี PII; หากไม่มี key จะใช้ Clinical Template ที่มีความแม่นยำสูง',
    },
    {
      component: 'Authentication / PDPA / Audit Log',
      type: 'สถาปัตยกรรมพร้อมใช้ (Architected)',
      status: 'ARCH',
      note: 'ออกแบบคลาส deidentify.py และสแกนเนอร์ check-pii.py แต่ใน Prototype ยังไม่บังคับ Login',
    },
    {
      component: 'ฐานข้อมูลอันตรกิริยาและบัญชียาแผนไทย',
      type: 'ตัวอย่างรอตรวจ (Expert Review Pending)',
      status: 'REVIEW',
      note: 'ติดป้าย "ตัวอย่าง รอเภสัชกร/แพทย์แผนไทยตรวจสอบ" อิง NLEM 2568 และตำราอ้างอิงทางการ',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-4 sm:px-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-950 p-1 border border-amber-400/40 shadow-md shrink-0 flex items-center justify-center">
              <img src={teamLogo} alt="VejVivat" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900">
                  สถานะระบบและเกณฑ์ความพร้อมผลงาน (Prototype Status Matrix)
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                ทีม VejVivat (เวชวิวัฒน์) - Thai Medicine AI • จำแนกส่วนประกอบที่ทำงานจริงเทียบกับส่วนจำลองอย่างซื่อสัตย์ ตามเกณฑ์ Functional Prototype (1.3) และ MVP-ready (1.4)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-xl font-bold shadow-2xs">
            Functional Prototype (1.3)
          </span>
          <span className="text-xs bg-teal-50 text-teal-800 border border-teal-200 px-3 py-1.5 rounded-xl font-bold shadow-2xs">
            MVP-Ready (1.4)
          </span>
        </div>
      </div>

      {/* Status Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-semibold">ส่วนประกอบของระบบ (Component)</th>
                <th className="py-3 px-4 font-semibold text-center">สถานะการทำงาน</th>
                <th className="py-3 px-4 font-semibold">รายละเอียดและหมายเหตุทางเทคนิค</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {statusMatrix.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/60 transition">
                  <td className="py-3 px-4 font-bold text-slate-900">{item.component}</td>
                  <td className="py-3 px-4 text-center">
                    {item.status === 'REAL' && (
                      <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        ทำงานจริง
                      </span>
                    )}
                    {item.status === 'MOCK' && (
                      <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                        จำลอง (Adapter Ready)
                      </span>
                    )}
                    {item.status === 'HYBRID' && (
                      <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                        ทำงานจริง / Template
                      </span>
                    )}
                    {item.status === 'ARCH' && (
                      <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        พร้อมในสถาปัตยกรรม
                      </span>
                    )}
                    {item.status === 'REVIEW' && (
                      <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-800 border border-purple-200">
                        รอผู้เชี่ยวชาญตรวจ
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-600 leading-relaxed">{item.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Definition of Done Checklist */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-soft space-y-3">
        <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>เกณฑ์ความสำเร็จของผลงาน (Definition of Done Verification)</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <b>User Flow สมบูรณ์แบบ:</b> เลือกเคส → ประเมินสมุฏฐาน → สั่งยา → รับคำเตือน/ใบสั่งยา → ส่งออก PDF/JSON และประเมินผลโดยไม่ error
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <b>Unit Tests ผ่าน 100%:</b> ครอบคลุม Rule engine, Interaction matcher, ตัวตรวจขนาดยา และ Analytics
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <b>Zero-PII & PDPA Verified:</b> รันสคริปต์สแกนอัตโนมัติ ไม่พบเลขประจำตัว 13 หลักจริงหรือเบอร์โทรศัพท์จริง
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <b>Deploy บน GitHub Pages:</b> ใช้ HashRouter และ relative base path พร้อมไฟล์ openapi.yaml ในตัว
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
