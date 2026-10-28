import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Camera, Pill, BellRing, Stethoscope, FileText, Users } from 'lucide-react';
import { useYai, demoNow } from '../../services/yai/yaiStore';
import { BigLink, Card, Notice, SpeakButton } from '../../components/yai/ui';
import { nextOccurrences } from '../../services/yai/reminderSchedule';
import { DEMO_CLINICS } from '../../data/yai/fixtures';

export const YaiHomePage: React.FC = () => {
  const state = useYai((s) => s);
  const now = demoNow(state);
  const greeting = 'สวัสดีค่ะคุณยาย วันนี้เรามาเตรียมข้อมูลยากันนะคะ';

  const next = useMemo(() => nextOccurrences(state, now)[0], [state, now]);
  const nextMed = next && state.medicines.find((m) => m.id === next.plan.medicineId);
  const openAppt = state.appointments.find((a) => ['REQUESTED', 'OFFERED', 'CONFIRMED'].includes(a.status));
  const pendingCount = state.medicines.filter((m) => m.status !== 'PATIENT_CONFIRMED' && m.status !== 'CLINICIAN_VERIFIED').length;

  return (
    <div className="space-y-5">
      {!state.settings.onboarded && (
        <Notice title="ใช้ครั้งแรกใช่ไหมคะ?">
          <Link to="/yai/onboarding" className="font-bold text-yai-deep underline">
            เริ่มตั้งค่าแบบง่าย (1 นาที)
          </Link>
        </Notice>
      )}

      <Card className="bg-gradient-to-br from-yai-deep to-yai-teal text-white">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xl font-bold leading-snug sm:text-2xl">{greeting}</p>
          <span className="shrink-0 rounded-xl bg-white/90">
            <SpeakButton text={greeting} />
          </span>
        </div>
        <p className="mt-2 text-lg text-white/90">ถ่ายรูปยาและสมุนไพรที่ใช้อยู่ แล้วเราจะช่วยเตรียมข้อมูลให้คุณหมอค่ะ</p>
        <BigLink to="/yai/scan" size="lg" variant="secondary" className="mt-4 !bg-white !text-yai-deep" icon={<Camera className="h-7 w-7" />}>
          ถ่ายรูปยาและสมุนไพรของยาย
        </BigLink>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <QuickLink to="/yai/medicines" icon={<Pill className="h-7 w-7" />} label="ดูยาที่บันทึก" sub={pendingCount ? `${pendingCount} รายการรอตรวจ` : undefined} />
        <QuickLink to="/yai/reminders" icon={<BellRing className="h-7 w-7" />} label="เตือนกินยา" />
        <QuickLink to="/yai/clinics" icon={<Stethoscope className="h-7 w-7" />} label="ไปหาหมอ" />
        <QuickLink to="/yai/previsit" icon={<FileText className="h-7 w-7" />} label="สรุปให้คุณหมอ" />
      </div>

      <Card>
        <h2 className="text-xl font-bold">วันนี้มีอะไรต้องทำ</h2>
        <ul className="mt-3 space-y-3 text-lg">
          <li className="flex items-start gap-2">
            <BellRing className="mt-1 h-5 w-5 shrink-0 text-yai-deep" aria-hidden="true" />
            {next && nextMed ? (
              <span>
                เตือนกินยา <b>{nextMed.displayName.value}</b> เวลา <b>{next.time} น.</b>
                <span className="block text-sm text-yai-ink/70">ตามตารางที่คุณยายยืนยันไว้</span>
              </span>
            ) : (
              <span>ยังไม่มีการเตือนกินยาที่ยืนยันแล้ว</span>
            )}
          </li>
          <li className="flex items-start gap-2">
            <Stethoscope className="mt-1 h-5 w-5 shrink-0 text-yai-deep" aria-hidden="true" />
            {openAppt ? (
              <span>
                {DEMO_CLINICS.find((c) => c.id === openAppt.clinicId)?.name}:{' '}
                <b>{openAppt.status === 'CONFIRMED' ? 'คลินิกยืนยันแล้ว (จำลอง)' : 'ส่งคำขอนัดแล้ว ยังรอคลินิกยืนยัน'}</b>
              </span>
            ) : (
              <span>ยังไม่มีคำขอนัด</span>
            )}
          </li>
        </ul>
      </Card>

      <Card className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-yai-deep" aria-hidden="true" />
          <span className="text-lg font-semibold">ต้องการให้หลานช่วยไหม?</span>
        </div>
        <Link to="/yai/help" className="min-h-[48px] rounded-2xl bg-yai-mint px-4 py-3 text-base font-bold text-yai-deep">
          ขอความช่วยเหลือ
        </Link>
      </Card>

      <Card>
        <h2 className="text-lg font-bold">ยายพร้อม ดูแลตั้งแต่บ้านถึงหมอ</h2>
        <ol className="mt-2 grid gap-2 text-base sm:grid-cols-3">
          <li className="rounded-2xl bg-yai-mint p-3"><b>1. ที่บ้าน</b><br />ถ่ายรูปยา บอกว่าใช้อย่างไร</li>
          <li className="rounded-2xl bg-yai-mint p-3"><b>2. ก่อนพบหมอ</b><br />ส่งสรุปให้คลินิกที่เลือก</li>
          <li className="rounded-2xl bg-yai-mint p-3"><b>3. กลับบ้าน</b><br />เตือนกินยาตามที่ยืนยันแล้ว</li>
        </ol>
      </Card>

      <p className="text-center text-sm text-yai-ink/60">
        ต้นแบบเพื่อการสาธิต ไม่ใช่การวินิจฉัยหรือสั่งยา · <Link to="/" className="underline">สำหรับบุคลากร</Link> ·{' '}
        <Link to="/partner" className="underline">คลินิกเข้าร่วม</Link>
      </p>
    </div>
  );
};

const QuickLink: React.FC<{ to: string; icon: React.ReactNode; label: string; sub?: string }> = ({ to, icon, label, sub }) => (
  <Link to={to} className="flex min-h-[96px] flex-col items-start justify-center gap-1 rounded-3xl border border-yai-ink/10 bg-white p-4 text-yai-deep shadow-sm hover:border-yai-teal">
    {icon}
    <span className="text-lg font-bold text-yai-ink">{label}</span>
    {sub && <span className="text-sm font-semibold text-yai-warn">{sub}</span>}
  </Link>
);
