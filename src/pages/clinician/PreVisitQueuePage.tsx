import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ShieldAlert, FileText, Pill, Compass, BookOpen, CalendarPlus } from 'lucide-react';
import { useYai, yaiStore, demoNow } from '../../services/yai/yaiStore';
import { DEMO_CLINICS } from '../../data/yai/fixtures';
import { canRead, isConsentActive } from '../../domain/yai/policies';
import {
  PatientHeader,
  PacketStats,
  MedicinesSection,
  RiskSection,
  QuestionsSection,
  NoteSection,
  PhotosSection,
} from '../../components/yai/PreVisitReport';

// Clinician-side demo of the ยายพร้อม pre-visit packet. Each clinic only sees packets the
// patient explicitly shared with that clinic, and every read or denied read is audited.

export const PreVisitQueuePage: React.FC = () => {
  const state = useYai((s) => s);
  const now = demoNow(state);

  return (
    <div className="mx-auto max-w-4xl space-y-5 py-4 sm:px-6">
      <header>
        <h1 className="text-xl font-bold text-slate-900">สรุปก่อนพบแพทย์จากแอปยายพร้อม</h1>
        <p className="text-sm text-slate-600">ข้อมูลจำลอง · เลือกคลินิกที่จะดูในฐานะ คลินิกจะเห็นเฉพาะสรุปที่ผู้ป่วยอนุญาต</p>
      </header>
      <div className="grid gap-3 sm:grid-cols-2">
        {DEMO_CLINICS.map((c) => {
          const allowed = canRead(state.consents, c.id, 'PREVISIT_REPORT', now);
          const grant = state.consents.find((g) => g.recipientId === c.id && g.scope.includes('PREVISIT_REPORT') && isConsentActive(g, now));
          return (
            <Link
              key={c.id}
              to={`/clinician/previsit/${c.id}`}
              className={`rounded-2xl border p-4 transition hover:shadow-md ${allowed ? 'border-teal-300 bg-teal-50/60' : 'border-slate-200 bg-white'}`}
            >
              <p className="font-bold text-slate-900">{c.name}</p>
              <p className={`mt-1 text-sm font-semibold ${allowed ? 'text-teal-800' : 'text-slate-500'}`}>
                {allowed ? `มีสรุป 1 ราย (ถึง ${new Date(grant!.expiresAt!).toLocaleDateString('th-TH')})` : 'ยังไม่มีผู้ป่วยอนุญาต'}
              </p>
            </Link>
          );
        })}
      </div>
      <p className="text-xs text-slate-500">
        ทดลองฝั่งผู้ป่วยได้ที่ <Link to="/yai/previsit" className="underline">/yai/previsit</Link>
      </p>
    </div>
  );
};

type Tab = 'summary' | 'medicines' | 'risk' | 'questions' | 'photos';
const TABS: { id: Tab; label: string }[] = [
  { id: 'summary', label: 'สรุปก่อนนัด' },
  { id: 'medicines', label: 'รายการยา' },
  { id: 'risk', label: 'ความเสี่ยง' },
  { id: 'questions', label: 'คำถามแนะนำ' },
  { id: 'photos', label: 'ภาพฉลาก' },
];

const actionCls = 'inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-sm font-semibold hover:bg-slate-50';

export const PreVisitDetailPage: React.FC = () => {
  const { clinicId = '' } = useParams();
  const state = useYai((s) => s);
  const [tab, setTab] = useState<Tab>('summary');
  const clinic = DEMO_CLINICS.find((c) => c.id === clinicId);
  const allowed = canRead(state.consents, clinicId, 'PREVISIT_REPORT', demoNow(state));
  const appointment = state.appointments.find((a) => a.clinicId === clinicId && ['REQUESTED', 'OFFERED', 'CONFIRMED'].includes(a.status));

  useEffect(() => {
    if (clinic) yaiStore.recordPrevisitAccess(clinic.id, allowed);
    // log once per page open and on consent change
  }, [clinic, allowed]);

  const appointmentText = !appointment
    ? 'ยังไม่มีคำขอนัดกับคลินิกนี้'
    : appointment.status === 'CONFIRMED'
    ? `ยืนยันแล้ว (จำลอง)${appointment.providerNote ? ` · ${appointment.providerNote}` : ''}`
    : `ขอนัด${appointment.requestedWindow} · รอคลินิกยืนยัน`;

  return (
    <div className="mx-auto max-w-5xl space-y-4 py-4 sm:px-6">
      <Link to="/clinician/previsit" className="text-sm font-semibold text-teal-800 underline">
        ← กลับรายการ
      </Link>
      <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900">
        <FileText className="h-5 w-5 text-teal-700" />
        {clinic?.name ?? 'ไม่พบคลินิก'}
      </h1>
      {!clinic ? null : allowed ? (
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <PatientHeader state={state} />
            <div className="text-sm">
              <span className="rounded-full bg-teal-50 px-2.5 py-1 font-semibold text-teal-800">เตรียมข้อมูลแล้ว</span>
              <p className="mt-1 text-slate-600">นัด: {appointmentText}</p>
            </div>
          </div>

          <div role="tablist" aria-label="ส่วนของสรุป" className="flex gap-1 overflow-x-auto border-b border-slate-200">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`shrink-0 border-b-2 px-3 py-2 text-sm font-semibold ${tab === t.id ? 'border-teal-700 text-teal-800' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div role="tabpanel" className="text-base">
            {tab === 'summary' && (
              <div className="space-y-4">
                <PacketStats state={state} />
                <RiskSection state={state} audience="clinician" />
                <NoteSection state={state} />
              </div>
            )}
            {tab === 'medicines' && <MedicinesSection state={state} audience="clinician" onDemoReview={(id) => yaiStore.demoReviewMedicine(id)} />}
            {tab === 'risk' && <RiskSection state={state} audience="clinician" />}
            {tab === 'questions' && <QuestionsSection state={state} />}
            {tab === 'photos' && <PhotosSection state={state} />}
          </div>

          <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-3">
            <Link to="/admin-hdi" className={actionCls}>
              <Pill className="h-4 w-4" /> พิจารณาอันตรกิริยา (ฐานข้อมูล HDI)
            </Link>
            <Link to="/smutthan" className={actionCls}>
              <Compass className="h-4 w-4" /> ประเมินสมุฏฐาน
            </Link>
            <button
              disabled
              title="ยังไม่เปิดใช้ในต้นแบบนี้"
              className="inline-flex min-h-[40px] cursor-not-allowed items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-400"
            >
              <BookOpen className="h-4 w-4" /> หลักฐานวิจัย (ยังไม่เปิดใช้)
            </button>
            <Link to="/partner" className={actionCls}>
              <CalendarPlus className="h-4 w-4" /> จัดการนัด (พอร์ทัลคลินิก)
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-900">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-bold">ไม่มีสิทธิ์ดูสรุปนี้</p>
            <p className="text-sm">ผู้ป่วยยังไม่ได้อนุญาต หรือยกเลิก/หมดอายุแล้ว ระบบบันทึกการพยายามเปิดอ่านนี้ไว้ในประวัติของผู้ป่วย</p>
          </div>
        </div>
      )}
    </div>
  );
};
