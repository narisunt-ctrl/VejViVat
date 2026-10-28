import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { DEMO_CLINICS } from '../../data/yai/fixtures';
import { useYai, yaiStore, demoNow } from '../../services/yai/yaiStore';
import { canRead } from '../../domain/yai/policies';
import { BigButton, Card, DemoBadge, Field, inputCls, Notice, PageTitle } from '../../components/yai/ui';
import { SERVICE_LABEL, ACCESS_LABEL } from './ClinicsPage';
import { AppointmentStatusChip } from './AppointmentsPage';

const WINDOWS = ['ช่วงเช้า', 'ช่วงบ่าย', 'วันไหนก็ได้'];

export const ClinicDetailPage: React.FC = () => {
  const { id } = useParams();
  const state = useYai((s) => s);
  const clinic = DEMO_CLINICS.find((c) => c.id === id);
  const [window, setWindow] = useState(WINDOWS[2]);
  const [note, setNote] = useState('');
  const [share, setShare] = useState(false);

  if (!clinic) return <PageTitle title="ไม่พบคลินิกนี้" back="/yai/clinics" />;

  const open = state.appointments.find((a) => a.clinicId === clinic.id && ['REQUESTED', 'OFFERED', 'CONFIRMED'].includes(a.status));
  const shared = canRead(state.consents, clinic.id, 'PREVISIT_REPORT', demoNow(state));

  return (
    <div className="space-y-5">
      <PageTitle title={clinic.name} back="/yai/clinics" />
      <DemoBadge />
      <Card className="space-y-2">
        <p className="text-lg">{clinic.description}</p>
        <p className="text-base text-yai-ink/75">
          อ.{clinic.district} จ.{clinic.province}
        </p>
        <p className="text-base">บริการ: {clinic.services.map((s) => SERVICE_LABEL[s]).join(', ')}</p>
        <p className="text-base">การเข้าถึง: {clinic.accessibility.map((a) => ACCESS_LABEL[a]).join(', ')}</p>
        <p className="text-sm font-semibold text-yai-warn">สถานะ: รายชื่อตัวอย่าง ยังไม่ได้ตรวจสอบใบอนุญาตจริง</p>
      </Card>

      {open ? (
        <Card className="space-y-3">
          <h2 className="text-xl font-bold">คำขอนัดของคุณยาย</h2>
          <AppointmentStatusChip status={open.status} />
          {open.providerNote && <p className="text-base">คลินิก (จำลอง): {open.providerNote}</p>}
          <Link to="/yai/appointments" className="block text-lg font-bold text-yai-deep underline">
            ดูคำขอนัดทั้งหมด
          </Link>
        </Card>
      ) : (
        <Card className="space-y-4">
          <h2 className="text-xl font-bold">ขอนัด</h2>
          <Field label="ช่วงเวลาที่สะดวก" hint="ยังไม่มีตารางเวลาว่างจริงของคลินิก คลินิกจะเป็นผู้เสนอเวลา">
            <select className={inputCls} value={window} onChange={(e) => setWindow(e.target.value)}>
              {WINDOWS.map((w) => (
                <option key={w}>{w}</option>
              ))}
            </select>
          </Field>
          <Field label="เรื่องที่อยากปรึกษา (ไม่บังคับ)">
            <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <label className="flex min-h-[56px] items-start gap-3 text-lg">
            <input type="checkbox" className="mt-1 h-7 w-7 shrink-0 accent-yai-deep" checked={share || shared} disabled={shared} onChange={(e) => setShare(e.target.checked)} />
            <span>
              ส่งสรุปรายการยาให้<b>คลินิกนี้เท่านั้น</b> (7 วัน)
              {shared && <span className="block text-sm text-yai-deep">อนุญาตไว้แล้ว</span>}
            </span>
          </label>
          <BigButton
            size="lg"
            onClick={() => {
              if (share && !shared) yaiStore.grantConsent(clinic.id, clinic.name, ['PREVISIT_REPORT'], 7);
              yaiStore.requestAppointment(clinic.id, window, note);
            }}
          >
            ส่งคำขอนัด
          </BigButton>
          <Notice title="ตัวอย่างการขอนัด">คำขอจะอยู่ในสถานะ "รอคลินิกยืนยัน" จนกว่าคลินิกจะตอบ ยังไม่ได้เชื่อมกับระบบนัดของคลินิกจริง</Notice>
        </Card>
      )}
    </div>
  );
};
