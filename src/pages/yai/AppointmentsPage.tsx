import React from 'react';
import { Link } from 'react-router-dom';
import { useYai, yaiStore } from '../../services/yai/yaiStore';
import { DEMO_CLINICS } from '../../data/yai/fixtures';
import { AppointmentStatus } from '../../domain/yai/models';
import { BigButton, Card, PageTitle, formatThaiDateTime } from '../../components/yai/ui';

const STATUS: Record<AppointmentStatus, { label: string; cls: string }> = {
  DRAFT: { label: 'ร่าง', cls: 'bg-slate-100 text-slate-800' },
  REQUESTED: { label: 'ส่งคำขอนัดแล้ว ยังรอคลินิกยืนยัน (ข้อมูลจำลอง)', cls: 'bg-amber-50 text-yai-warn' },
  OFFERED: { label: 'คลินิกเสนอเวลา รอคุณยายตอบ (จำลอง)', cls: 'bg-sky-50 text-sky-900' },
  CONFIRMED: { label: 'คลินิกยืนยันแล้ว (จำลอง)', cls: 'bg-yai-mint text-yai-deep' },
  DECLINED: { label: 'คลินิกรับนัดไม่ได้ (จำลอง)', cls: 'bg-red-50 text-red-900' },
  CANCELLED: { label: 'ยกเลิกแล้ว', cls: 'bg-slate-100 text-slate-700' },
};

export const AppointmentStatusChip: React.FC<{ status: AppointmentStatus }> = ({ status }) => (
  <span className={`inline-flex rounded-2xl px-3 py-1 text-base font-semibold ${STATUS[status].cls}`}>{STATUS[status].label}</span>
);

export const AppointmentsPage: React.FC = () => {
  const appointments = useYai((s) => s.appointments);

  return (
    <div className="space-y-5">
      <PageTitle title="คำขอนัดของฉัน" back="/yai/clinics" />
      {appointments.length === 0 && (
        <Card>
          <p className="text-lg">ยังไม่มีคำขอนัด</p>
          <Link to="/yai/clinics" className="mt-2 block text-lg font-bold text-yai-deep underline">
            ค้นหาคลินิก
          </Link>
        </Card>
      )}
      {appointments.map((a) => {
        const clinic = DEMO_CLINICS.find((c) => c.id === a.clinicId);
        const canCancel = ['REQUESTED', 'OFFERED', 'CONFIRMED'].includes(a.status);
        return (
          <Card key={a.id} className="space-y-2">
            <p className="text-xl font-bold">{clinic?.name}</p>
            <AppointmentStatusChip status={a.status} />
            <p className="text-base">ช่วงเวลาที่ขอ: {a.requestedWindow}</p>
            {a.providerNote && <p className="text-base">คลินิก (จำลอง): {a.providerNote}</p>}
            <p className="text-sm text-yai-ink/70">อัปเดต {formatThaiDateTime(a.updatedAt)}</p>
            {canCancel && (
              <BigButton variant="ghost" onClick={() => yaiStore.cancelAppointment(a.id)}>
                ยกเลิกคำขอ
              </BigButton>
            )}
          </Card>
        );
      })}
    </div>
  );
};
