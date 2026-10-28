import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Camera,
  Keyboard,
  Pill,
  BellRing,
  Stethoscope,
  FileText,
  Utensils,
  ShieldCheck,
  ScanLine,
  History,
  Hospital,
  LifeBuoy,
} from 'lucide-react';
import { useYai, demoNow } from '../../services/yai/yaiStore';
import { BigLink, Card, Notice, SpeakButton } from '../../components/yai/ui';
import { nextOccurrences } from '../../services/yai/reminderSchedule';
import { DEMO_CLINICS } from '../../data/yai/fixtures';
import { DailyHeatmap } from '../../components/yai/DailyHeatmap';
import { VoiceEntryButton } from '../../components/yai/VoiceEntryButton';
import { DoctorMessagesCard } from '../../components/yai/DoctorMessagesCard';
import { CategoryChip, SourceVerificationChip } from '../../components/yai/SourceVerificationChip';
import { bangkokDate, isConfirmed } from '../../domain/yai/journal';
import { journalDraft } from '../../services/yai/journalDraft';
import { useClinicianOrderSync } from '../../services/yai/useOrderSync';

// Layout follows the familiar public-health-app pattern (profile card on top, round service tiles, white cards on a
// pale sky background) while keeping the voice-first daily journal as the main action. ยายพร้อม branding only.

export const YaiHomePage: React.FC = () => {
  const state = useYai((s) => s);
  const navigate = useNavigate();
  useClinicianOrderSync();
  const now = demoNow(state);
  const today = bangkokDate(now);
  const journal = state.journal ?? [];
  const todays = journal.filter((e) => isConfirmed(e) && e.recordedLocalDate === today);
  const question = 'วันนี้เป็นอย่างไรบ้างคะ?';
  const name = state.patient.displayName.replace(/\s*\(.*\)\s*$/, '');

  const next = useMemo(() => nextOccurrences(state, now)[0], [state, now]);
  const nextMed = next && state.medicines.find((m) => m.id === next.plan.medicineId);
  const openAppt = state.appointments.find((a) => ['REQUESTED', 'OFFERED', 'CONFIRMED'].includes(a.status));
  const pendingCount = state.medicines.filter((m) => m.status !== 'PATIENT_CONFIRMED' && m.status !== 'CLINICIAN_VERIFIED').length;
  const latestNotice = (state.orderNotices ?? [])[0];
  const home = state.settings.home;

  const startDraft = (text: string, source: 'VOICE_TRANSCRIPT' | 'MANUAL_TEXT', mode: string) => {
    journalDraft.set({ originalText: text, inputSource: source, capturedAt: demoNow().toISOString(), photoIds: [], photoTags: {} });
    navigate(`/yai/journal/process?mode=${mode}`);
  };

  const services: { to: string; label: string; icon: React.ReactNode; tint: string; sub?: string }[] = [
    { to: '/yai/journal/history', label: 'บันทึกสุขภาพ', icon: <History className="h-7 w-7" />, tint: 'bg-emerald-100 text-emerald-800' },
    { to: '/yai/medicines', label: 'สมุดยา', icon: <Pill className="h-7 w-7" />, tint: 'bg-violet-100 text-violet-800', sub: pendingCount ? `${pendingCount} รอตรวจ` : undefined },
    { to: '/yai/reminders', label: 'เตือนกินยา', icon: <BellRing className="h-7 w-7" />, tint: 'bg-amber-100 text-amber-800' },
    { to: '/yai/clinics', label: 'หาหมอใกล้บ้าน', icon: <Hospital className="h-7 w-7" />, tint: 'bg-sky-100 text-sky-800' },
    { to: '/yai/previsit', label: 'ข้อมูลให้หมอ', icon: <FileText className="h-7 w-7" />, tint: 'bg-teal-100 text-teal-800' },
    { to: '/yai/passport', label: 'Evidence Passport', icon: <ShieldCheck className="h-7 w-7" />, tint: 'bg-indigo-100 text-indigo-800' },
    { to: '/yai/scan', label: 'สแกนฉลากยา', icon: <ScanLine className="h-7 w-7" />, tint: 'bg-rose-100 text-rose-800' },
    { to: '/yai/food', label: 'อาหารตามธาตุ', icon: <Utensils className="h-7 w-7" />, tint: 'bg-lime-100 text-lime-800', sub: 'ส่วนเสริม' },
    { to: '/yai/help', label: 'ขอความช่วยเหลือ', icon: <LifeBuoy className="h-7 w-7" />, tint: 'bg-red-100 text-red-800' },
  ];

  return (
    <div className="-mx-4 -mt-4 space-y-5 bg-yai-sky px-4 pb-4 pt-4">
      {!state.settings.onboarded && (
        <Notice title="ใช้ครั้งแรกใช่ไหมคะ?">
          <Link to="/yai/onboarding" className="font-bold text-yai-deep underline">
            เริ่มตั้งค่าแบบง่าย (1 นาที)
          </Link>
        </Notice>
      )}

      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-yai-blue to-yai-teal text-white shadow-md">
        <div className="flex items-center gap-3 p-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white text-2xl font-bold text-yai-blue" aria-hidden="true">
            {name.replace(/^คุณยาย/, '').trim().charAt(0) || 'ย'}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-lg text-white/90">สวัสดีค่ะ</p>
            <p className="truncate text-2xl font-bold">{name}</p>
            <p className="text-sm text-white/85">
              อายุ {state.patient.age} ปี · {home ? `อ.${home.district} จ.${home.province}` : `จ.${state.patient.province}`} · ข้อมูลจำลอง
            </p>
          </div>
        </div>
        <div className="space-y-3 bg-white/10 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-2xl font-bold">{question}</p>
            <span className="shrink-0 rounded-xl bg-white/90">
              <SpeakButton text={`สวัสดีค่ะ ${question}`} />
            </span>
          </div>
          <VoiceEntryButton
            onTranscript={(text) => startDraft(text, 'VOICE_TRANSCRIPT', 'voice')}
            onFallback={(problem) => {
              journalDraft.set({ originalText: '', inputSource: 'MANUAL_TEXT', capturedAt: demoNow().toISOString(), photoIds: [], photoTags: {}, voiceProblem: problem });
              navigate('/yai/journal/process?mode=text');
            }}
          />
          <div className="grid grid-cols-2 gap-3">
            <BigLink to="/yai/journal/process?mode=text" size="lg" variant="secondary" className="!bg-white !text-yai-blue" icon={<Keyboard className="h-7 w-7" />}>
              พิมพ์เอง
            </BigLink>
            <BigLink to="/yai/journal/process?mode=photo" size="lg" variant="secondary" className="!bg-white !text-yai-blue" icon={<Camera className="h-7 w-7" />}>
              ถ่ายรูป
            </BigLink>
          </div>
          <p className="text-base text-white/90">ไม่ต้องเลือกหมวด หนูช่วยจัดให้ และยายตรวจก่อนบันทึกทุกครั้งค่ะ</p>
        </div>
      </section>

      <DoctorMessagesCard />

      {latestNotice && (
        <Notice title="แจ้งจากคลินิก (ข้อมูลจำลองภายในแอป)">
          {latestNotice.text}{' '}
          <Link to="/yai/reminders" className="font-bold text-yai-deep underline">
            ดูการเตือน
          </Link>
        </Notice>
      )}

      <section aria-labelledby="services">
        <h2 id="services" className="mb-2 text-xl font-bold">
          บริการ
        </h2>
        <ul className="grid grid-cols-3 gap-2 rounded-3xl bg-white p-3 shadow-sm">
          {services.map((s) => (
            <li key={s.to}>
              <Link to={s.to} className="flex min-h-[112px] flex-col items-center justify-start gap-1.5 rounded-2xl p-2 text-center hover:bg-yai-sky focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-200">
                <span className={`flex h-14 w-14 items-center justify-center rounded-full ${s.tint}`} aria-hidden="true">
                  {s.icon}
                </span>
                <span className="text-base font-bold leading-tight text-yai-ink">{s.label}</span>
                {s.sub && <span className="text-xs font-semibold text-yai-warn">{s.sub}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <Card>
        <DailyHeatmap entries={journal} today={today} onSelect={(d) => navigate(`/yai/journal/history?date=${d}`)} />
        <p className="mt-2 text-sm text-yai-ink/70">นับเฉพาะวันที่ยายยืนยันบันทึกแล้ว ไม่ได้บอกว่าสุขภาพดีหรือไม่ดี ไม่ต้องบันทึกทุกวันก็ได้ค่ะ</p>
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xl font-bold">วันนี้</h2>
          <Link to="/yai/journal/history" className="inline-flex min-h-[44px] items-center gap-1 text-base font-bold text-yai-blue underline">
            <History className="h-5 w-5" aria-hidden="true" /> ดูประวัติ / แก้ไข
          </Link>
        </div>
        {todays.length === 0 ? (
          <p className="mt-2 text-lg text-yai-ink/70">วันนี้ยังไม่มีบันทึก</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {todays.slice(0, 3).map((e) => (
              <li key={e.id} className="rounded-2xl bg-yai-sky p-3">
                <SourceVerificationChip source={e.inputSource} status={e.status} synthetic={e.isSynthetic} />
                <p className="mt-1 text-lg">{e.reviewedText || 'บันทึกรูป'}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {[...new Set(e.segments.map((s) => s.category))].map((c) => (
                    <CategoryChip key={c} category={c} />
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
        <ul className="mt-3 space-y-2 border-t border-yai-ink/10 pt-3 text-lg">
          <li className="flex items-start gap-2">
            <BellRing className="mt-1 h-5 w-5 shrink-0 text-yai-blue" aria-hidden="true" />
            {next && nextMed ? (
              <span>
                เตือนกินยา <b>{nextMed.displayName.value}</b> เวลา <b>{next.time} น.</b>
                <span className="block text-sm text-yai-ink/70">
                  {next.plan.source === 'CLINICIAN_ORDER' ? 'ตามคำสั่งยาที่แพทย์รับรองและจ่ายยาแล้ว (ข้อมูลจำลอง)' : 'ตามเวลาที่คุณยายตั้งเอง ไม่ใช่คำสั่งแพทย์'}
                </span>
              </span>
            ) : (
              <span>ยังไม่มีการเตือนกินยาที่ยืนยันแล้ว</span>
            )}
          </li>
          <li className="flex items-start gap-2">
            <Stethoscope className="mt-1 h-5 w-5 shrink-0 text-yai-blue" aria-hidden="true" />
            {openAppt ? (
              <span>
                {DEMO_CLINICS.find((c) => c.id === openAppt.clinicId)?.name}:{' '}
                <b>{openAppt.status === 'CONFIRMED' ? 'คลินิกยืนยันแล้ว (จำลอง)' : 'ส่งคำขอนัดแล้ว ยังรอคลินิกยืนยัน'}</b>
              </span>
            ) : (
              <span>
                ยังไม่มีคำขอนัด ·{' '}
                <Link to="/yai/clinics" className="font-bold text-yai-blue underline">
                  หาหมอใกล้บ้าน
                </Link>
              </span>
            )}
          </li>
        </ul>
      </Card>

      <p className="text-center text-sm text-yai-ink/60">
        ต้นแบบเพื่อการสาธิต ไม่ใช่การวินิจฉัยหรือสั่งยา · <Link to="/" className="underline">สำหรับบุคลากร</Link> ·{' '}
        <Link to="/partner" className="underline">คลินิกเข้าร่วม</Link>
      </p>
    </div>
  );
};
