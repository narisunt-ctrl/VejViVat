import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import { useYai, yaiStore } from '../../services/yai/yaiStore';
import { DEMO_CLINICS } from '../../data/yai/fixtures';
import { canTransitionAppointment } from '../../domain/yai/policies';
import { AppointmentStatus } from '../../domain/yai/models';

// Clinic partner portal demo. The operator sees appointment logistics only, never medicines;
// clinical packets live in the clinician view and require patient consent.

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  DRAFT: 'ร่าง',
  REQUESTED: 'รอคลินิกตอบ',
  OFFERED: 'เสนอเวลาแล้ว',
  CONFIRMED: 'ยืนยันแล้ว',
  DECLINED: 'ปฏิเสธ',
  CANCELLED: 'ผู้ป่วยยกเลิก',
};

const ACTIONS: { to: AppointmentStatus; label: string; note: string; cls: string }[] = [
  { to: 'OFFERED', label: 'จำลอง: เสนอเวลา', note: 'เสนอวันพฤหัสบดี 10:00 น. (ตัวอย่าง)', cls: 'border-sky-300 bg-sky-50 text-sky-900' },
  { to: 'CONFIRMED', label: 'จำลอง: ยืนยันนัด', note: 'ยืนยันนัดแล้ว (คลินิกจำลอง)', cls: 'border-teal-300 bg-teal-50 text-teal-900' },
  { to: 'DECLINED', label: 'จำลอง: รับนัดไม่ได้', note: 'ช่วงนี้คิวเต็ม (ตัวอย่าง)', cls: 'border-rose-300 bg-rose-50 text-rose-900' },
];

const PartnerDashboardPage: React.FC = () => {
  const appointments = useYai((s) => s.appointments);
  const patientName = useYai((s) => s.patient.displayName);
  const [clinicId, setClinicId] = useState(DEMO_CLINICS[0].id);
  const mine = appointments.filter((a) => a.clinicId === clinicId);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-teal-700" />
            <div>
              <p className="font-bold">พอร์ทัลคลินิกเข้าร่วม · ยายพร้อม</p>
              <p className="text-xs text-amber-700">โหมดสาธิต ข้อมูลจำลองทั้งหมด ไม่มีการรับนัดหรือชำระเงินจริง</p>
            </div>
          </div>
          <nav className="flex gap-3 text-sm font-semibold text-teal-800">
            <Link to="/yai" className="underline">แอปผู้ป่วย</Link>
            <Link to="/clinician/previsit" className="underline">มุมมองแพทย์</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-5 px-4 py-5">
        <label className="block max-w-sm">
          <span className="text-sm font-semibold">ดูในฐานะคลินิก</span>
          <select className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5" value={clinicId} onChange={(e) => setClinicId(e.target.value)}>
            {DEMO_CLINICS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h1 className="text-lg font-bold">คำขอนัด ({mine.length})</h1>
          <p className="text-sm text-slate-600">ผู้ดูแลคลินิกเห็นเฉพาะข้อมูลนัดหมาย รายการยาเปิดดูได้ในมุมมองแพทย์เมื่อผู้ป่วยอนุญาตเท่านั้น</p>
          {mine.length === 0 && <p className="mt-4 text-slate-500">ยังไม่มีคำขอ ลองส่งคำขอนัดจากแอปผู้ป่วยที่ /yai/clinics</p>}
          <ul className="mt-4 space-y-3">
            {mine.map((a) => (
              <li key={a.id} className="rounded-xl border border-slate-200 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{patientName}</p>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold">{STATUS_LABEL[a.status]}</span>
                </div>
                <p className="text-sm text-slate-600">
                  ช่วงเวลาที่ขอ: {a.requestedWindow}
                  {a.note ? ` · เรื่อง: ${a.note}` : ''}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {ACTIONS.filter((x) => canTransitionAppointment(a, x.to, 'SIMULATED_PROVIDER')).map((x) => (
                    <button
                      key={x.to}
                      onClick={() => yaiStore.simulateProviderResponse(a.id, x.to, x.note)}
                      className={`min-h-[40px] rounded-lg border px-3 text-sm font-bold ${x.cls}`}
                    >
                      {x.label}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="font-bold">การตรวจสอบคลินิก</h2>
            <p className="mt-1 text-sm text-slate-600">สถานะ: รายชื่อตัวอย่าง (ยังไม่มีขั้นตอนตรวจใบอนุญาตจริง — วางแผนไว้)</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="font-bold">แพ็กเกจ</h2>
            <p className="mt-1 text-sm text-slate-600">ยังไม่เปิดใช้ ไม่มีการเก็บเงินในต้นแบบนี้ และการจ่ายเงินจะไม่มีผลต่อการแนะนำคลินิก</p>
          </div>
        </section>
      </main>
    </div>
  );
};

export default PartnerDashboardPage;
