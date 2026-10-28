import React from 'react';
import { MessageCircleWarning } from 'lucide-react';
import { useYai, demoNow } from '../../services/yai/yaiStore';
import { clinicianMessages, useClinicianMessages } from '../../services/yai/clinicianMessages';
import { canRead } from '../../domain/yai/policies';
import { BigButton, SpeakButton, formatThaiDateTime } from './ui';

/** Messages from the patient's linked clinic, shown only while her consent to that clinic is active */
export const DoctorMessagesCard: React.FC = () => {
  const state = useYai((s) => s);
  const all = useClinicianMessages();
  const now = demoNow(state);
  const visible = all.filter((m) => m.patientId === state.patient.id && canRead(state.consents, m.fromRecipientId, 'REMINDER_ALERTS', now));
  const unread = visible.filter((m) => !m.acknowledgedAt);
  if (unread.length === 0) return null;

  return (
    <section className="space-y-3 rounded-3xl border-2 border-amber-400 bg-amber-50 p-4" role="alert" aria-live="polite">
      <h2 className="flex items-center gap-2 text-xl font-bold text-amber-950">
        <MessageCircleWarning className="h-7 w-7" aria-hidden="true" /> ข้อความจากคุณหมอ
      </h2>
      {unread.map((m) => (
        <div key={m.id} className="space-y-2 rounded-2xl bg-white p-3">
          <p className="text-lg font-bold">{m.title}</p>
          <p className="text-lg leading-relaxed">{m.body}</p>
          <p className="text-sm text-yai-ink/70">
            จาก {m.fromName} · {formatThaiDateTime(m.at)} · ข้อมูลจำลองภายในแอป
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <SpeakButton text={`${m.title} ${m.body}`} />
          </div>
          <BigButton onClick={() => clinicianMessages.acknowledge(m.id)}>รับทราบแล้ว</BigButton>
        </div>
      ))}
    </section>
  );
};
