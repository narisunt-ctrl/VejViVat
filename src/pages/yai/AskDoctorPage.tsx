import React from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, ChevronRight, FileText, Hospital, Phone, ShieldCheck } from 'lucide-react';
import { demoNow, useYai } from '../../services/yai/yaiStore';
import { Card, PageTitle, formatThaiDateTime } from '../../components/yai/ui';
import { DoctorMessagesCard } from '../../components/yai/DoctorMessagesCard';
import { useClinicianMessages } from '../../services/yai/clinicianMessages';
import { canRead } from '../../domain/yai/policies';
import { DEMO_CLINICS } from '../../data/yai/fixtures';

const APPT_STATUS: Record<string, string> = {
  REQUESTED: 'ส่งคำขอแล้ว รอคลินิกยืนยัน',
  OFFERED: 'คลินิกเสนอเวลาแล้ว',
  CONFIRMED: 'คลินิกยืนยันแล้ว (จำลอง)',
};

/** Everything about talking to the care team: messages, appointment, what to bring, where to go */
export const AskDoctorPage: React.FC = () => {
  const state = useYai((s) => s);
  const messages = useClinicianMessages();
  const now = demoNow(state);
  const read = messages.filter((m) => m.patientId === state.patient.id && m.acknowledgedAt && canRead(state.consents, m.fromRecipientId, 'REMINDER_ALERTS', now));
  const openAppt = state.appointments.find((a) => ['REQUESTED', 'OFFERED', 'CONFIRMED'].includes(a.status));
  const apptClinic = openAppt && DEMO_CLINICS.find((c) => c.id === openAppt.clinicId);

  const links = [
    { to: '/yai/previsit', label: 'สรุปข้อมูลให้หมอก่อนไปตรวจ', icon: FileText },
    { to: '/yai/passport', label: 'Evidence Passport ยาและสมุนไพร', icon: ShieldCheck },
    { to: '/yai/clinics', label: 'หาหมอ/คลินิกใกล้บ้าน', icon: Hospital },
    { to: '/yai/appointments', label: 'นัดหมายของฉัน', icon: CalendarDays },
  ];

  return (
    <div className="space-y-5">
      <PageTitle title="ถามคุณหมอ" subtitle="ข้อความจากคลินิกที่ยายอนุญาต นัดหมาย และข้อมูลที่เตรียมให้หมอ" />
      <DoctorMessagesCard />

      <section className="space-y-2 rounded-3xl bg-gradient-to-r from-sky-100 to-blue-200 p-4 shadow-sm">
        <p className="text-lg font-bold">การนัดที่กำลังจะมาถึง</p>
        {openAppt ? (
          <>
            <p className="inline-flex rounded-full bg-blue-700 px-3 py-1 text-base font-bold text-white">{openAppt.requestedWindow || 'รอคลินิกเสนอเวลา'}</p>
            <p className="text-base">
              สถานพยาบาล: <b>{apptClinic?.name ?? '-'}</b>
            </p>
            <p className="text-sm text-yai-ink/70">{APPT_STATUS[openAppt.status] ?? openAppt.status}</p>
          </>
        ) : (
          <p className="text-base">ยังไม่มีนัดหมาย</p>
        )}
      </section>

      <ul className="space-y-2">
        {links.map((l) => (
          <li key={l.to}>
            <Link to={l.to} className="flex min-h-[64px] items-center gap-3 rounded-2xl border border-yai-ink/10 bg-white px-4 text-lg font-bold shadow-sm">
              <l.icon className="h-7 w-7 text-yai-green" aria-hidden="true" />
              <span className="flex-1">{l.label}</span>
              <ChevronRight className="h-5 w-5 text-yai-ink/40" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>

      <Card>
        <h2 className="text-xl font-bold">ข้อความที่อ่านแล้ว</h2>
        {read.length === 0 ? (
          <p className="mt-2 text-base text-yai-ink/60">ยังไม่มี</p>
        ) : (
          <ul className="mt-2 divide-y">
            {read.slice(0, 10).map((m) => (
              <li key={m.id} className="py-2">
                <p className="text-base font-bold">{m.title}</p>
                <p className="text-base">{m.body}</p>
                <p className="text-xs text-yai-ink/60">
                  {m.fromName} · {formatThaiDateTime(m.at)}
                </p>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-sm text-yai-ink/60">แอปนี้ไม่ใช่ช่องทางฉุกเฉิน และหมอไม่ได้ตอบทันที</p>
      </Card>

      <a href="tel:1669" className="flex min-h-[60px] items-center justify-center gap-2 rounded-2xl bg-red-600 text-xl font-bold text-white">
        <Phone className="h-6 w-6" aria-hidden="true" /> ฉุกเฉิน โทร 1669
      </a>
    </div>
  );
};
