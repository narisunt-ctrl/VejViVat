import React from 'react';
import { CalendarDays, ClipboardList, Hospital, Phone, ShieldCheck, Stethoscope } from 'lucide-react';
import { demoNow, useYai } from '../../services/yai/yaiStore';
import { LxCard, LxLinkRow, LxPageHeader, SourceTag } from '../../components/yai/lx/ui';
import { formatThaiDateTime } from '../../components/yai/ui';
import { DoctorMessagesCard } from '../../components/yai/DoctorMessagesCard';
import { useClinicianMessages } from '../../services/yai/clinicianMessages';
import { canRead } from '../../domain/yai/policies';
import { DEMO_CLINICS } from '../../data/yai/fixtures';
import { bangkokDate } from '../../domain/yai/journal';
import { baseline, goalProgress, METRICS } from '../../domain/yai/wellness';

// Expert Consultation through CareBridge: find an expert, see the service, prepare a wellness summary from what
// the user recorded, request a consultation and manage consent. The summary preview here is only shown to the
// user; it is shared with a clinic only through the consent step on the pre-visit page.

const APPT_STATUS: Record<string, string> = { REQUESTED: 'ส่งคำขอแล้ว รอคลินิกยืนยัน', OFFERED: 'คลินิกเสนอเวลาแล้ว', CONFIRMED: 'คลินิกยืนยันแล้ว (จำลอง)' };

export const ConsultPage: React.FC = () => {
  const state = useYai((s) => s);
  const messages = useClinicianMessages();
  const now = demoNow(state);
  const today = bangkokDate(now);
  const read = messages.filter((m) => m.patientId === state.patient.id && m.acknowledgedAt && canRead(state.consents, m.fromRecipientId, 'REMINDER_ALERTS', now));
  const openAppt = state.appointments.find((a) => ['REQUESTED', 'OFFERED', 'CONFIRMED'].includes(a.status));
  const apptClinic = openAppt && DEMO_CLINICS.find((c) => c.id === openAppt.clinicId);
  const ttm = DEMO_CLINICS.filter((c) => c.hasTtmDoctor).length;
  const summary = (['sleep', 'energy', 'mood', 'activity', 'symptoms'] as const).map((m) => ({ m, b: baseline(state, m, today) }));
  const goals = goalProgress(state, today);
  const activeConsents = state.consents.filter((c) => !c.revokedAt && (!c.expiresAt || Date.parse(c.expiresAt) > now.getTime())).length;

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <LxPageHeader back="/yai" eyebrow="Expert Consultation · CareBridge" title="ปรึกษาผู้เชี่ยวชาญ" subtitle="แพทย์แผนปัจจุบันและแพทย์แผนไทยที่เข้าร่วม CareBridge" />
      <DoctorMessagesCard />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <LxLinkRow to="/yai/clinics" icon={Stethoscope} title="1. ค้นหาคลินิกหรือผู้เชี่ยวชาญ" sub={`เรียงตามโซนและระยะทาง · มีแพทย์แผนไทย ${ttm} แห่ง`} />
          <LxLinkRow to="/yai/clinics" icon={Hospital} title="2. ดูรายละเอียดบริการ" sub="เวลาทำการ ประเภทบริการ ช่องทางติดต่อ" />
          <LxLinkRow to="/yai/previsit" icon={ClipboardList} title="3. เตรียม Wellness Summary" sub="สรุปจากสิ่งที่คุณบันทึก คุณเลือกเองว่าจะแชร์" />
          <LxLinkRow to="/yai/appointments" icon={CalendarDays} title="4. ขอคำปรึกษา / นัดหมาย" sub={openAppt ? `${apptClinic?.name ?? 'คลินิก'} · ${APPT_STATUS[openAppt.status] ?? openAppt.status}` : 'ยังไม่มีนัด'} />
          <LxLinkRow to="/yai/profile" icon={ShieldCheck} title="5. จัดการความยินยอม" sub={activeConsents ? `แบ่งปันอยู่ ${activeConsents} รายการ` : 'ยังไม่ได้แบ่งปันกับใคร'} />
        </div>

        <LxCard labelledBy="ws-title">
          <div className="flex items-start justify-between gap-2">
            <h2 id="ws-title" className="text-lg font-semibold">
              ตัวอย่าง Wellness Summary
            </h2>
            <SourceTag kind="SELF" text="Self-Reported" />
          </div>
          <p className="mt-1 text-sm text-lx-muted">เห็นเฉพาะคุณ จนกว่าจะกดยินยอมแชร์ในขั้นที่ 3</p>
          <table className="mt-3 w-full text-sm">
            <thead className="text-lx-muted">
              <tr>
                <th className="py-1 text-left font-semibold">หัวข้อ</th>
                <th className="py-1 text-right font-semibold">7 วันล่าสุด</th>
                <th className="py-1 text-right font-semibold">ค่าปกติส่วนตัว</th>
              </tr>
            </thead>
            <tbody>
              {summary.map(({ m, b }) => (
                <tr key={m} className="border-t border-lx-line">
                  <td className="py-2">{METRICS[m].label}</td>
                  <td className="num py-2 text-right">{b.recent !== null ? `${b.recent} ${METRICS[m].unit}` : <span className="text-lx-muted">ข้อมูลไม่พอ</span>}</td>
                  <td className="num py-2 text-right">{b.value !== null ? `${b.value}` : <span className="text-lx-muted">ข้อมูลไม่พอ</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {goals.length > 0 && <p className="mt-3 text-sm text-lx-muted">เป้าหมาย: {goals.map((g) => `${g.goal.title} ${g.done}/${g.target}`).join(' · ')}</p>}
        </LxCard>
      </div>

      <LxCard labelledBy="msg-title">
        <h2 id="msg-title" className="text-lg font-semibold">
          ข้อความที่อ่านแล้ว
        </h2>
        {read.length === 0 ? (
          <p className="mt-2 text-base text-lx-muted">ยังไม่มี</p>
        ) : (
          <ul className="mt-2 divide-y divide-lx-line">
            {read.slice(0, 10).map((m) => (
              <li key={m.id} className="py-2">
                <p className="font-semibold">{m.title}</p>
                <p>{m.body}</p>
                <p className="text-xs text-lx-muted">
                  {m.fromName} · {formatThaiDateTime(m.at)}
                </p>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs text-lx-muted">แอปนี้ไม่ใช่ช่องทางฉุกเฉิน และผู้เชี่ยวชาญไม่ได้ตอบทันที</p>
      </LxCard>

      <a href="tel:1669" className="flex min-h-[56px] items-center justify-center gap-2 rounded-2xl bg-lx-alertbg text-lg font-semibold text-lx-alert">
        <Phone className="h-5 w-5" aria-hidden="true" /> ฉุกเฉิน โทร 1669
      </a>
    </div>
  );
};
