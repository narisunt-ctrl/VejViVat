import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookCheck, CheckCircle2, ClipboardCheck, FlaskConical, Scale, ShieldCheck } from 'lucide-react';

// Entry point for the holistic-care MVP: the five pieces and how data flows between ยายพร้อม and CareBridge.

const ITEMS = [
  {
    title: 'Evidence Passport ฝั่งยายพร้อม',
    what: 'ยา สมุนไพร อาการ และแหล่งที่มาของทุกข้อมูล (ฉลาก/ยายเล่า/ผู้ดูแล/บุคลากร) พร้อมสถานะการยืนยัน',
    links: [
      { to: '/yai/passport', label: 'เปิด Evidence Passport (มุมผู้ป่วย)' },
      { to: '/clinician/followup', label: 'ติดตามผู้ป่วย (มุมแพทย์)' },
    ],
    icon: ShieldCheck,
  },
  {
    title: 'Integrated Guideline Viewer',
    what: 'แผนไทย แผนปัจจุบัน และแผนจีนเทียบกัน แต่ละช่องมีที่มา แผนไทยดึงจากบัญชียาของระบบ ช่องอื่นต้องมีลิงก์หรือ DOI',
    links: [{ to: '/guidelines', label: 'Guideline ที่แพทย์ร่วมทบทวน' }],
    icon: BookCheck,
  },
  {
    title: 'Benefit–Harm Comparison',
    what: 'ประสิทธิผลจากการรีวิวของแพทย์ ผลข้างเคียงและข้อห้ามจากบัญชียาและฐานข้อมูลยาตีกัน และข้อจำกัดของหลักฐาน',
    links: [{ to: '/guidelines', label: 'อยู่ในหน้า Guideline แต่ละฉบับ' }],
    icon: Scale,
  },
  {
    title: 'Automatic Heuristic Engine',
    what: 'ค้น PubMed ตามสมุนไพรและจัดอันดับตามระดับหลักฐาน ฝังอยู่ในหน้าสั่งยาเดิม เลือกสมุนไพรแล้วเห็นหลักฐานทันที และมีสรุปย่อจากบทคัดย่อ',
    links: [
      { to: '/prescribe', label: 'หน้าสั่งยา (เห็นหลักฐานอัตโนมัติ)' },
      { to: '/research', label: 'คลังงานวิจัย + รีวิว' },
    ],
    icon: FlaskConical,
  },
  {
    title: 'Clinical Handover',
    what: 'สรุปแบบ SBAR จากข้อมูลที่ผู้ป่วยอนุญาต ระบบรวบรวม S/B/A พร้อมที่มา แพทย์เขียน R และกดตรวจทาน',
    links: [{ to: '/clinician/handover', label: 'สร้างสรุปส่งต่อ' }],
    icon: ClipboardCheck,
  },
];

const FLOW = ['ยายเล่า/ถ่าย/พิมพ์ในยายพร้อม', 'ยายยืนยัน → Evidence Passport', 'ยายอนุญาตคลินิก', 'แพทย์เห็นสรุปเฉพาะที่จำเป็น', 'ค้นหลักฐาน + รีวิว → Guideline', 'แพทย์สั่งยา → เภสัชกรจ่ายยา', 'เตือนกินยาในยายพร้อม', 'ติดตามและ Handover'];

export const HolisticHubPage: React.FC = () => (
  <div className="mx-auto max-w-5xl space-y-4 py-4 sm:px-6">
    <header>
      <h1 className="text-xl font-bold text-slate-900">Holistic Care MVP: เชื่อมยายพร้อมกับ CareBridge</h1>
      <p className="text-sm text-slate-600">
        ดูแลแบบองค์รวม: กาย จิตใจ พฤติกรรม และบริบทชีวิต · เป้าหมายคือให้แพทย์แผนปัจจุบันเห็นหลักฐานและความเสี่ยงชัดพอจะลองใช้ยาแผนไทยอย่างปลอดภัย
      </p>
    </header>
    <ol className="flex flex-wrap items-center gap-1 rounded-2xl border border-slate-200 bg-white p-3 text-xs">
      {FLOW.map((f, i) => (
        <li key={f} className="flex items-center gap-1">
          <span className="rounded-full bg-emerald-50 px-2 py-1 font-semibold text-emerald-900">{f}</span>
          {i < FLOW.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-slate-400" />}
        </li>
      ))}
    </ol>
    <ul className="grid gap-3 md:grid-cols-2">
      {ITEMS.map((it) => (
        <li key={it.title} className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4">
          <p className="flex items-center gap-2 font-bold text-slate-900">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <it.icon className="h-5 w-5 text-slate-600" /> {it.title}
          </p>
          <p className="text-sm text-slate-700">{it.what}</p>
          <div className="flex flex-wrap gap-2">
            {it.links.map((l) => (
              <Link key={l.to + l.label} to={l.to} className="rounded-lg border border-emerald-300 px-2 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-50">
                {l.label}
              </Link>
            ))}
          </div>
        </li>
      ))}
    </ul>
    <p className="text-xs text-slate-500">ต้นแบบด้วยข้อมูลจำลอง · การอนุมัติและรีวิวเก็บในเบราว์เซอร์นี้ · ใช้งานจริงต้องมีระบบยืนยันตัวตน ฐานข้อมูลกลาง และคณะกรรมการ PTC</p>
  </div>
);
