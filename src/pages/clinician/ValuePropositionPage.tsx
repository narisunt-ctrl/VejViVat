import React from 'react';
import { Link } from 'react-router-dom';
import { Globe2, HeartHandshake, Hospital, ShieldCheck, Stethoscope, Users, Leaf } from 'lucide-react';
import { useGuidelines, useReviews } from '../../services/carebridge/evidenceReviews';
import { useConsults } from '../../services/carebridge/consults';
import { useClinicianMessages } from '../../services/yai/clinicianMessages';
import { getAllInteractionsDatabase } from '../../services/interactionMatcher';
import { HERB_OPTIONS } from '../../services/carebridge/herbEvidence';
import { GUIDELINE_SOURCES } from '../../data/carebridge/guidelineSources';

// Value proposition for presenting the project: who gains what, which feature delivers it, and what the system
// can already measure. Every number on this page is counted from data in the app, not a projection.

const STAKEHOLDERS = [
  {
    who: 'แพทย์แผนปัจจุบัน',
    icon: Stethoscope,
    pain: 'ไม่แน่ใจเรื่องหลักฐานและความปลอดภัยของยาแผนไทย และไม่มีเวลาค้นเอง',
    gain: 'เห็นหลักฐานระดับสากลและความเสี่ยงยาตีกันทันทีตอนสั่งยา อ่านสรุป 30 วินาที และส่งปรึกษาแพทย์แผนไทยได้ในคลิกเดียว',
    links: [
      { to: '/prescribe', label: 'หลักฐานในหน้าสั่งยา' },
      { to: '/clinician/followup', label: 'สรุปเฉพาะที่จำเป็น' },
    ],
  },
  {
    who: 'แพทย์แผนไทย',
    icon: Leaf,
    pain: 'หลักฐานแผนไทยกระจัดกระจาย ทำให้แพทย์แผนปัจจุบันไม่ยอมรับ',
    gain: 'มีข้อมูลผู้ป่วยแบบองค์รวม ธาตุ/สมุฏฐาน และเครื่องมือรีวิวร่วมกับแพทย์แผนปัจจุบันจนเป็น Guideline ที่ทั้งสองฝ่ายอนุมัติ',
    links: [
      { to: '/research', label: 'รีวิวหลักฐาน' },
      { to: '/guidelines', label: 'Guideline ร่วม' },
    ],
  },
  {
    who: 'โรงพยาบาล / ผู้บริหาร',
    icon: Hospital,
    pain: 'อยากเพิ่มการใช้ยาสมุนไพรในบัญชียาหลักอย่างปลอดภัย แต่กลัวความเสี่ยง',
    gain: 'มี Guideline ที่มีหลักฐานและการอนุมัติ, Clinical Handover แบบ SBAR, ส่งออก FHIR เพื่อเชื่อมระบบ และติดตามผลจากผู้ป่วยจริง',
    links: [
      { to: '/clinician/handover', label: 'Clinical Handover' },
      { to: '/holistic', label: 'ภาพรวมระบบ' },
    ],
  },
  {
    who: 'ผู้ป่วยและครอบครัว',
    icon: Users,
    pain: 'ใช้สมุนไพรร่วมกับยาโดยหมอไม่รู้ และจำยาไม่ได้',
    gain: 'เล่าด้วยเสียงก็บันทึกได้ หมอเห็นสิ่งที่กินจริง ได้รับเตือนกินยาตามคำสั่งที่ยืนยันแล้ว และหมอแจ้งเตือนได้เมื่อกินของที่อาจตีกัน',
    links: [{ to: '/yai', label: 'แอปยายพร้อม' }],
  },
];

const THAI_TO_GLOBAL = [
  { step: 'ข้อมูลไทย', text: 'บัญชียาแผนไทยของระบบ (อ้างอิงแนวทางการรักษาด้วยยาสมุนไพรระดับปฐมภูมิ), งานวิจัยไทยใน PubMed (ตัวกรอง "จากไทย"), ThaiJO และ Thai Clinical Trials Registry' },
  { step: 'ทบทวนร่วมกัน', text: 'แพทย์แผนปัจจุบันและแพทย์แผนไทยรีวิวบทความ ให้ระดับความเชื่อมั่นแบบ GRADE แล้วรวมเป็น Guideline ที่ทั้งสองฝ่ายอนุมัติ' },
  { step: 'มาตรฐานสากล', text: 'ส่งออก Guideline เป็น FHIR R4 PlanDefinition พร้อมอ้างอิง PubMed เพื่อแลกเปลี่ยนกับโรงพยาบาลและเครือข่ายต่างประเทศ' },
  { step: 'หลักฐานโลกจริง', text: 'ข้อมูลจากยายพร้อม (อาการ การใช้ยา ผลข้างเคียงที่ผู้ป่วยรายงาน) เมื่อผู้ป่วยยินยอมให้ใช้พัฒนาและไม่ระบุตัวตน ใช้เป็น real-world evidence เพื่อออกแบบงานวิจัยหลายศูนย์ต่อได้' },
];

export const ValuePropositionPage: React.FC = () => {
  const reviews = useReviews();
  const gl = useGuidelines();
  const consultList = useConsults();
  const messages = useClinicianMessages();
  const acked = messages.filter((m) => m.acknowledgedAt).length;
  const metrics = [
    { label: 'สมุนไพรที่ค้นหลักฐานได้อัตโนมัติ', value: HERB_OPTIONS.length },
    { label: 'คู่ยาตีกันในฐานข้อมูลที่ตรวจให้อัตโนมัติ', value: getAllInteractionsDatabase().length },
    { label: 'รีวิวบทความโดยแพทย์', value: reviews.length },
    { label: 'Guideline อนุมัติแล้ว / ร่าง', value: `${gl.filter((g) => g.status === 'APPROVED').length} / ${gl.filter((g) => g.status === 'DRAFT').length}` },
    { label: 'คำขอปรึกษาแผนปัจจุบัน → แผนไทย', value: consultList.length },
    { label: 'ข้อความแจ้งเตือนที่ผู้ป่วยรับทราบ', value: `${acked} / ${messages.length}` },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-5 py-4 sm:px-6">
      <header className="space-y-2 rounded-3xl bg-gradient-to-br from-emerald-700 to-teal-600 p-6 text-white">
        <p className="text-sm font-semibold text-white/80">Value Proposition</p>
        <h1 className="text-2xl font-bold leading-snug">ยาแผนไทยที่เหมาะกับผู้ป่วย ในเวลาที่เหมาะ มีหลักฐานรองรับ และปลอดภัย โดยไม่เพิ่มงานให้แพทย์</h1>
        <p className="text-white/90">
          ยายพร้อมเก็บข้อมูลสุขภาพแบบองค์รวมจากบ้าน → CareBridge แปลงเป็นข้อมูลที่แพทย์แผนปัจจุบันเชื่อถือได้ (หลักฐานสากล ความเสี่ยงยาตีกัน Guideline ที่ร่วมกันอนุมัติ) → แพทย์ลองสั่งยาแผนไทยได้อย่างมั่นใจ
        </p>
      </header>

      <section className="grid gap-3 md:grid-cols-2">
        {STAKEHOLDERS.map((s) => (
          <div key={s.who} className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4">
            <p className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <s.icon className="h-5 w-5 text-emerald-700" /> {s.who}
            </p>
            <p className="text-sm">
              <b className="text-rose-700">ปัญหา:</b> {s.pain}
            </p>
            <p className="text-sm">
              <b className="text-emerald-700">ได้อะไร:</b> {s.gain}
            </p>
            <div className="flex flex-wrap gap-2">
              {s.links.map((l) => (
                <Link key={l.to} to={l.to} className="rounded-lg border border-emerald-300 px-2 py-1 text-xs font-semibold text-emerald-800">
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-2 rounded-2xl border border-rose-200 bg-rose-50/60 p-4">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
          <ShieldCheck className="h-5 w-5 text-rose-700" /> "ผลข้างเคียงน้อยกว่า": พิสูจน์เป็นรายยา ไม่พูดเหมารวม
        </h2>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li>ในคลังงานวิจัย เลือก "เทียบกับยาแผนปัจจุบัน" (เช่น diclofenac, NSAIDs, omeprazole) แล้วกด "ดูสรุปย่อ" ระบบดึงประโยคเรื่องผลข้างเคียงจากบทคัดย่อของงานที่เทียบกันจริงมาวางคู่กัน</li>
          <li>หน้า Guideline มี Benefit–Harm: ข้อห้ามจากบัญชียา คู่ยาที่อาจตีกัน และสัญญาณอันตรายที่ผู้รีวิวพบ</li>
          <li>ระบบไม่สรุปเองว่า "ปลอดภัยกว่า" เพราะสมุนไพรบางตัวมีความเสี่ยงสูงกับยาบางกลุ่ม เช่น ขมิ้นชันหรือยาสหัศธารากับ warfarin การแสดงตามหลักฐานจริงทำให้แพทย์แผนปัจจุบันเชื่อมากกว่า</li>
        </ul>
        <Link to="/research" className="inline-block text-sm font-semibold text-rose-800 underline">
          ลองเทียบผลข้างเคียงในคลังงานวิจัย
        </Link>
      </section>

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
          <Globe2 className="h-5 w-5 text-sky-700" /> Evidence-based knowledge ของไทย → ต่อยอดระดับโลก
        </h2>
        <ol className="grid gap-2 md:grid-cols-4">
          {THAI_TO_GLOBAL.map((t, i) => (
            <li key={t.step} className="rounded-xl bg-sky-50 p-3 text-sm">
              <p className="font-bold text-sky-900">
                {i + 1}. {t.step}
              </p>
              <p className="text-slate-700">{t.text}</p>
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap gap-2 text-xs">
          {GUIDELINE_SOURCES.THAI.map((s) => (
            <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="rounded border border-slate-300 px-2 py-1 underline">
              {s.name}
            </a>
          ))}
        </div>
      </section>

      <section className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
          <HeartHandshake className="h-5 w-5 text-emerald-700" /> วัดได้จากระบบตอนนี้
        </h2>
        <ul className="grid grid-cols-2 gap-2 md:grid-cols-3">
          {metrics.map((m) => (
            <li key={m.label} className="rounded-xl border border-slate-200 p-3">
              <p className="text-2xl font-bold text-slate-900">{m.value}</p>
              <p className="text-xs text-slate-600">{m.label}</p>
            </li>
          ))}
        </ul>
        <p className="text-xs text-slate-500">
          นับจากข้อมูลในเบราว์เซอร์นี้ (สาธิต) · ตัวชี้วัดที่ควรวัดในการนำร่องจริง: อัตราการสั่งยาแผนไทยที่เหมาะสม เหตุการณ์ไม่พึงประสงค์ ความคลาดเคลื่อนทางยา
          ภาระงานแพทย์ และผลลัพธ์ที่ผู้ป่วยรายงาน (ไม่ใช่แค่จำนวนใบสั่งยาที่เพิ่มขึ้น)
        </p>
      </section>
    </div>
  );
};
