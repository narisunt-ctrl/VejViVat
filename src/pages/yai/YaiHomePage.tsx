import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Camera,
  Keyboard,
  Pill,
  BellRing,
  FileText,
  Utensils,
  ShieldCheck,
  ScanLine,
  History,
  Hospital,
  LifeBuoy,
  Phone,
  Users,
  CalendarDays,
  ChevronRight,
  NotebookPen,
  Stethoscope,
} from 'lucide-react';
import { useYai, demoNow } from '../../services/yai/yaiStore';
import { Card, Notice, SpeakButton } from '../../components/yai/ui';
import { nextOccurrences, todaysOccurrences } from '../../services/yai/reminderSchedule';
import { DEMO_CLINICS } from '../../data/yai/fixtures';
import { DailyHeatmap } from '../../components/yai/DailyHeatmap';
import { VoiceEntryButton } from '../../components/yai/VoiceEntryButton';
import { DoctorMessagesCard } from '../../components/yai/DoctorMessagesCard';
import { MoodTapCard } from '../../components/yai/MoodTapCard';
import { CategoryChip, SourceVerificationChip } from '../../components/yai/SourceVerificationChip';
import { bangkokDate, isConfirmed, recordedDaysInMonth, thaiDateLabel } from '../../domain/yai/journal';
import { journalDraft } from '../../services/yai/journalDraft';
import { useClinicianOrderSync } from '../../services/yai/useOrderSync';

// Home layout follows the familiar public-health-app pattern (green header with profile, emergency and caregiver
// buttons, an upcoming-appointment card, a row of summary tiles, a service menu) with ยายพร้อม's own branding.
// Summary tiles only show what the patient actually recorded; nothing is filled in when there is no data.

const APPT_STATUS: Record<string, string> = {
  REQUESTED: 'ส่งคำขอแล้ว รอคลินิกยืนยัน',
  OFFERED: 'คลินิกเสนอเวลาแล้ว',
  CONFIRMED: 'คลินิกยืนยันแล้ว (จำลอง)',
};

export const YaiHomePage: React.FC = () => {
  const state = useYai((s) => s);
  const navigate = useNavigate();
  useClinicianOrderSync();
  const [allMenus, setAllMenus] = useState(false);
  const now = demoNow(state);
  const today = bangkokDate(now);
  const journal = state.journal ?? [];
  const confirmed = journal.filter(isConfirmed);
  const todays = confirmed.filter((e) => e.recordedLocalDate === today);
  const name = state.patient.displayName.replace(/\s*\(.*\)\s*$/, '');
  const home = state.settings.home;

  const next = useMemo(() => nextOccurrences(state, now)[0], [state, now]);
  const nextMed = next && state.medicines.find((m) => m.id === next.plan.medicineId);
  const todayOcc = todaysOccurrences(state, now);
  const dueToday = todayOcc.filter((o) => o.isPast);
  const reportedToday = dueToday.filter((o) => state.doseLogs.some((l) => l.id === `${o.plan.id}@${o.key}` && l.response === 'TAKEN_REPORTED')).length;
  const openAppt = state.appointments.find((a) => ['REQUESTED', 'OFFERED', 'CONFIRMED'].includes(a.status));
  const apptClinic = openAppt && DEMO_CLINICS.find((c) => c.id === openAppt.clinicId);
  const pendingCount = state.medicines.filter((m) => m.status !== 'PATIENT_CONFIRMED' && m.status !== 'CLINICIAN_VERIFIED').length;
  const lastSymptom = confirmed.flatMap((e) => e.segments.filter((s) => s.category === 'SYMPTOM').map((s) => ({ s, e })))[0];
  const latestNotice = (state.orderNotices ?? [])[0];

  const startDraft = (text: string, source: 'VOICE_TRANSCRIPT' | 'MANUAL_TEXT', mode: string) => {
    journalDraft.set({ originalText: text, inputSource: source, capturedAt: demoNow().toISOString(), photoIds: [], photoTags: {} });
    navigate(`/yai/journal/process?mode=${mode}`);
  };

  const menus: { to: string; label: string; icon: React.ReactNode; tint: string; sub?: string }[] = [
    { to: '/yai/clinics', label: 'หาหมอใกล้บ้าน', icon: <Hospital className="h-8 w-8" />, tint: 'text-sky-700' },
    { to: '/yai/journal/history', label: 'สมุดบันทึกสุขภาพ', icon: <NotebookPen className="h-8 w-8" />, tint: 'text-emerald-700' },
    { to: '/yai/medicines', label: 'สมุดยา', icon: <Pill className="h-8 w-8" />, tint: 'text-violet-700', sub: pendingCount ? `${pendingCount} รอตรวจ` : undefined },
    { to: '/yai/reminders', label: 'เตือนกินยา', icon: <BellRing className="h-8 w-8" />, tint: 'text-amber-600' },
    { to: '/yai/previsit', label: 'ข้อมูลให้หมอ', icon: <FileText className="h-8 w-8" />, tint: 'text-teal-700' },
    { to: '/yai/passport', label: 'Evidence Passport', icon: <ShieldCheck className="h-8 w-8" />, tint: 'text-indigo-700' },
    { to: '/yai/scan', label: 'สแกนฉลากยา', icon: <ScanLine className="h-8 w-8" />, tint: 'text-rose-700' },
    { to: '/yai/food', label: 'อาหารตามธาตุ', icon: <Utensils className="h-8 w-8" />, tint: 'text-lime-700' },
    { to: '/yai/appointments', label: 'นัดหมายของฉัน', icon: <CalendarDays className="h-8 w-8" />, tint: 'text-sky-700' },
    { to: '/yai/help', label: 'ขอความช่วยเหลือ', icon: <LifeBuoy className="h-8 w-8" />, tint: 'text-red-700' },
  ];

  const tiles: { label: string; value: string; unit?: string; date?: string; to: string; icon: React.ReactNode }[] = [
    { label: 'บันทึกเดือนนี้', value: String(recordedDaysInMonth(journal, today.slice(0, 7))), unit: 'วัน', to: '/yai/journal/history', icon: <History className="h-6 w-6 text-emerald-700" /> },
    {
      label: 'อาการล่าสุด',
      value: lastSymptom ? lastSymptom.s.text : 'ยังไม่มีบันทึก',
      date: lastSymptom ? thaiDateLabel(lastSymptom.e.recordedLocalDate) : undefined,
      to: '/yai/journal/history',
      icon: <Stethoscope className="h-6 w-6 text-rose-600" />,
    },
    {
      label: 'กินยาตามเตือนวันนี้',
      value: dueToday.length ? `${reportedToday}/${dueToday.length}` : '-',
      unit: dueToday.length ? 'ครั้ง (ยายบอกเอง)' : 'ยังไม่ถึงเวลา',
      to: '/yai/reminders',
      icon: <BellRing className="h-6 w-6 text-amber-600" />,
    },
    { label: 'ยารอตรวจสอบ', value: String(pendingCount), unit: 'รายการ', to: '/yai/medicines', icon: <Pill className="h-6 w-6 text-violet-700" /> },
  ];

  return (
    <div className="-mx-4 -mt-4 space-y-5 bg-yai-sky pb-4">
      {/* green header */}
      <section className="space-y-4 rounded-b-[2rem] bg-yai-green px-4 pb-5 pt-3 text-white">
        <div className="flex items-center justify-between gap-2">
          <Link to="/yai/journal/history" className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-3 text-base font-bold text-yai-greendeep shadow-sm">
            <History className="h-5 w-5 text-amber-500" aria-hidden="true" />
            เดือนนี้บันทึก {recordedDaysInMonth(journal, today.slice(0, 7))} วัน
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-4 border-white/70 bg-white text-2xl font-bold text-yai-green" aria-hidden="true">
            {name.replace(/^คุณยาย/, '').trim().charAt(0) || 'ย'}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-base text-white/90">สวัสดีค่ะ,</p>
            <p className="break-words text-xl font-bold leading-tight">{name}</p>
            <p className="mt-1 inline-flex rounded-full bg-emerald-400/90 px-3 py-0.5 text-sm font-semibold">
              อายุ {state.patient.age} ปี · {home ? `อ.${home.district}` : `จ.${state.patient.province}`}
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-2">
            <a href="tel:1669" className="inline-flex min-h-[44px] items-center gap-1 rounded-full border-2 border-white bg-red-600 px-3 text-base font-bold text-white" aria-label="โทร 1669 ฉุกเฉิน">
              <Phone className="h-5 w-5" aria-hidden="true" /> 1669
            </a>
            <Link to="/yai/family" className="inline-flex min-h-[44px] items-center justify-center gap-1 rounded-full bg-white px-3 text-base font-bold text-yai-greendeep">
              <Users className="h-5 w-5" aria-hidden="true" /> ผู้ดูแล
            </Link>
          </div>
        </div>

        <div className="space-y-3 rounded-3xl bg-white p-4 text-yai-ink shadow-md">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xl font-bold text-yai-greendeep">วันนี้เป็นอย่างไรบ้างคะ?</p>
            <SpeakButton text="สวัสดีค่ะ วันนี้เป็นอย่างไรบ้างคะ" />
          </div>
          <VoiceEntryButton
            onTranscript={(text) => startDraft(text, 'VOICE_TRANSCRIPT', 'voice')}
            onFallback={(problem) => {
              journalDraft.set({ originalText: '', inputSource: 'MANUAL_TEXT', capturedAt: demoNow().toISOString(), photoIds: [], photoTags: {}, voiceProblem: problem });
              navigate('/yai/journal/process?mode=text');
            }}
          />
          <div className="grid grid-cols-2 gap-3">
            <Link to="/yai/journal/process?mode=text" className="flex min-h-[60px] items-center justify-center gap-2 rounded-2xl border-2 border-yai-green/30 bg-yai-mint text-lg font-bold text-yai-greendeep">
              <Keyboard className="h-6 w-6" aria-hidden="true" /> พิมพ์เอง
            </Link>
            <Link to="/yai/journal/process?mode=photo" className="flex min-h-[60px] items-center justify-center gap-2 rounded-2xl border-2 border-yai-green/30 bg-yai-mint text-lg font-bold text-yai-greendeep">
              <Camera className="h-6 w-6" aria-hidden="true" /> ถ่ายรูป
            </Link>
          </div>
          <p className="text-sm text-yai-ink/70">ไม่ต้องเลือกหมวด หนูช่วยจัดให้ และยายตรวจก่อนบันทึกทุกครั้ง</p>
        </div>
      </section>

      <div className="space-y-5 px-4">
        {!state.settings.onboarded && (
          <Notice title="ใช้ครั้งแรกใช่ไหมคะ?">
            <Link to="/yai/onboarding" className="font-bold text-yai-deep underline">
              เริ่มตั้งค่าแบบง่าย (1 นาที)
            </Link>
          </Notice>
        )}
        <DoctorMessagesCard />
        <MoodTapCard />

        {/* upcoming: appointment and next reminder, side by side on a swipe row */}
        <section aria-label="สิ่งที่กำลังจะมาถึง" className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1">
          <div className="w-[88%] shrink-0 snap-start space-y-2 rounded-3xl bg-gradient-to-r from-sky-100 to-blue-200 p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="text-lg font-bold">การนัดที่กำลังจะมาถึง</p>
              <Link to="/yai/appointments" className="inline-flex min-h-[40px] items-center rounded-full bg-white px-3 text-sm font-bold">
                นัดทั้งหมด <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            {openAppt ? (
              <>
                <p className="inline-flex rounded-full bg-blue-700 px-3 py-1 text-base font-bold text-white">{openAppt.requestedWindow || 'รอคลินิกเสนอเวลา'}</p>
                <p className="text-base">
                  สถานพยาบาล: <b>{apptClinic?.name ?? '-'}</b>
                </p>
                <p className="text-sm text-yai-ink/70">{APPT_STATUS[openAppt.status] ?? openAppt.status}</p>
              </>
            ) : (
              <>
                <p className="text-base">ยังไม่มีนัดหมาย</p>
                <Link to="/yai/clinics" className="inline-flex min-h-[44px] items-center gap-1 rounded-full bg-yai-green px-4 text-base font-bold text-white">
                  <Hospital className="h-5 w-5" aria-hidden="true" /> หาหมอใกล้บ้าน
                </Link>
              </>
            )}
          </div>
          <div className="w-[88%] shrink-0 snap-start space-y-2 rounded-3xl bg-gradient-to-r from-amber-50 to-amber-100 p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="text-lg font-bold">เตือนกินยาครั้งถัดไป</p>
              <Link to="/yai/reminders" className="inline-flex min-h-[40px] items-center rounded-full bg-white px-3 text-sm font-bold">
                ดูทั้งหมด <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            {next && nextMed ? (
              <>
                <p className="inline-flex rounded-full bg-amber-600 px-3 py-1 text-base font-bold text-white">วันนี้ {next.time} น.</p>
                <p className="text-base">
                  <b>{nextMed.displayName.value}</b>
                </p>
                <p className="text-sm text-yai-ink/70">
                  {next.plan.source === 'CLINICIAN_ORDER' ? 'ตามคำสั่งยาที่แพทย์รับรองและจ่ายยาแล้ว (ข้อมูลจำลอง)' : 'ตามเวลาที่คุณยายตั้งเอง ไม่ใช่คำสั่งแพทย์'}
                </p>
              </>
            ) : (
              <p className="text-base">วันนี้ไม่มีการเตือนที่เหลืออยู่</p>
            )}
          </div>
        </section>

        {latestNotice && (
          <Notice title="แจ้งจากคลินิก (ข้อมูลจำลองภายในแอป)">
            {latestNotice.text}
          </Notice>
        )}

        {/* summary of what she recorded */}
        <section className="space-y-3 rounded-3xl border border-yai-green/20 bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xl font-bold">สรุปสุขภาพของยาย</h2>
            <Link to="/yai/journal/history" className="inline-flex min-h-[40px] items-center rounded-full bg-yai-green px-4 text-sm font-bold text-white">
              ดูทั้งหมด
            </Link>
          </div>
          <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1">
            {tiles.map((t) => (
              <Link key={t.label} to={t.to} className="w-40 shrink-0 snap-start space-y-1 rounded-2xl border border-yai-ink/10 p-3 hover:border-yai-green">
                <div className="flex items-center justify-between gap-1">
                  {t.icon}
                  {t.date && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{t.date}</span>}
                </div>
                <p className="text-base font-semibold">{t.label}</p>
                <p className={`font-bold ${t.value.length > 6 ? 'line-clamp-2 text-base' : 'text-3xl'}`}>{t.value}</p>
                {t.unit && <p className="text-sm text-yai-ink/60">{t.unit}</p>}
              </Link>
            ))}
          </div>
          <p className="text-sm text-yai-ink/60">มาจากสิ่งที่ยายบันทึกเอง ไม่ใช่ผลตรวจทางการแพทย์</p>
        </section>

        {/* service menu */}
        <section className="space-y-3" aria-labelledby="menu-title">
          <div className="flex items-center justify-between gap-2">
            <h2 id="menu-title" className="flex items-center gap-2 text-xl font-bold">
              <span className="h-3 w-3 rounded-full bg-yai-green" aria-hidden="true" /> เมนูบริการสุขภาพ
            </h2>
            <button type="button" onClick={() => setAllMenus((v) => !v)} className="inline-flex min-h-[40px] items-center rounded-full bg-yai-greendeep px-4 text-sm font-bold text-white" aria-expanded={allMenus}>
              {allMenus ? 'ย่อ' : 'เมนูทั้งหมด'} <ChevronRight className={`h-4 w-4 transition-transform ${allMenus ? 'rotate-90' : ''}`} aria-hidden="true" />
            </button>
          </div>
          <ul className={allMenus ? 'grid grid-cols-3 gap-3' : '-mx-4 flex gap-3 overflow-x-auto px-4 pb-1'}>
            {menus.map((m) => (
              <li key={m.to} className={allMenus ? '' : 'w-24 shrink-0'}>
                <Link to={m.to} className="flex flex-col items-center gap-1.5 text-center focus-visible:outline-none">
                  <span className={`flex h-20 w-20 items-center justify-center rounded-2xl border border-yai-ink/10 bg-white shadow-sm ${m.tint}`} aria-hidden="true">
                    {m.icon}
                  </span>
                  <span className="text-base font-bold leading-tight">{m.label}</span>
                  {m.sub && <span className="text-xs font-semibold text-yai-warn">{m.sub}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <Card>
          <DailyHeatmap entries={journal} today={today} onSelect={(d) => navigate(`/yai/journal/history?date=${d}`)} />
          <p className="mt-2 text-sm text-yai-ink/70">นับเฉพาะวันที่ยายยืนยันบันทึกแล้ว ไม่ได้บอกว่าสุขภาพดีหรือไม่ดี ไม่ต้องบันทึกทุกวันก็ได้ค่ะ</p>
        </Card>

        {todays.length > 0 && (
          <Card>
            <h2 className="text-xl font-bold">บันทึกวันนี้</h2>
            <ul className="mt-2 space-y-2">
              {todays.slice(0, 3).map((e) => (
                <li key={e.id} className="rounded-2xl bg-yai-mint/60 p-3">
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
          </Card>
        )}

        <p className="text-center text-sm text-yai-ink/60">
          ต้นแบบเพื่อการสาธิต ข้อมูลจำลอง ไม่ใช่การวินิจฉัยหรือสั่งยา · <Link to="/" className="underline">สำหรับบุคลากร</Link> ·{' '}
          <Link to="/partner" className="underline">คลินิกเข้าร่วม</Link>
        </p>
      </div>
    </div>
  );
};
