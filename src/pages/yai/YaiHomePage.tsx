import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Camera, Keyboard, Pill, BellRing, Stethoscope, FileText, Users, Utensils, ShieldCheck, ScanLine, History } from 'lucide-react';
import { useYai, demoNow } from '../../services/yai/yaiStore';
import { BigLink, Card, Notice, SpeakButton } from '../../components/yai/ui';
import { nextOccurrences } from '../../services/yai/reminderSchedule';
import { DEMO_CLINICS } from '../../data/yai/fixtures';
import { DailyHeatmap } from '../../components/yai/DailyHeatmap';
import { VoiceEntryButton } from '../../components/yai/VoiceEntryButton';
import { CategoryChip, SourceVerificationChip } from '../../components/yai/SourceVerificationChip';
import { bangkokDate, isConfirmed } from '../../domain/yai/journal';
import { journalDraft } from '../../services/yai/journalDraft';
import { useClinicianOrderSync } from '../../services/yai/useOrderSync';

export const YaiHomePage: React.FC = () => {
  const state = useYai((s) => s);
  const navigate = useNavigate();
  useClinicianOrderSync();
  const now = demoNow(state);
  const today = bangkokDate(now);
  const journal = state.journal ?? [];
  const todays = journal.filter((e) => isConfirmed(e) && e.recordedLocalDate === today);
  const greeting = 'สวัสดีค่ะคุณยาย วันนี้เป็นอย่างไรบ้างคะ?';

  const next = useMemo(() => nextOccurrences(state, now)[0], [state, now]);
  const nextMed = next && state.medicines.find((m) => m.id === next.plan.medicineId);
  const openAppt = state.appointments.find((a) => ['REQUESTED', 'OFFERED', 'CONFIRMED'].includes(a.status));
  const pendingCount = state.medicines.filter((m) => m.status !== 'PATIENT_CONFIRMED' && m.status !== 'CLINICIAN_VERIFIED').length;
  const latestNotice = (state.orderNotices ?? [])[0];

  const startDraft = (text: string, source: 'VOICE_TRANSCRIPT' | 'MANUAL_TEXT', mode: string) => {
    journalDraft.set({ originalText: text, inputSource: source, capturedAt: demoNow().toISOString(), photoIds: [], photoTags: {} });
    navigate(`/yai/journal/process?mode=${mode}`);
  };

  return (
    <div className="space-y-5">
      {!state.settings.onboarded && (
        <Notice title="ใช้ครั้งแรกใช่ไหมคะ?">
          <Link to="/yai/onboarding" className="font-bold text-yai-deep underline">
            เริ่มตั้งค่าแบบง่าย (1 นาที)
          </Link>
        </Notice>
      )}

      <Card className="space-y-4 bg-gradient-to-br from-yai-deep to-yai-teal text-white">
        <div className="flex items-start justify-between gap-2">
          <p className="text-2xl font-bold leading-snug">{greeting}</p>
          <span className="shrink-0 rounded-xl bg-white/90">
            <SpeakButton text={greeting} />
          </span>
        </div>
        <p className="text-lg text-white/90">ไม่ต้องเลือกหมวด แค่เล่า พิมพ์ หรือถ่ายรูป แล้วหนูช่วยจัดให้ ยายตรวจก่อนบันทึกทุกครั้งค่ะ</p>
        <VoiceEntryButton
          onTranscript={(text) => startDraft(text, 'VOICE_TRANSCRIPT', 'voice')}
          onFallback={(problem) => {
            journalDraft.set({ originalText: '', inputSource: 'MANUAL_TEXT', capturedAt: demoNow().toISOString(), photoIds: [], photoTags: {}, voiceProblem: problem });
            navigate('/yai/journal/process?mode=text');
          }}
        />
        <div className="grid grid-cols-2 gap-3">
          <BigLink to="/yai/journal/process?mode=text" size="lg" variant="secondary" className="!bg-white !text-yai-deep" icon={<Keyboard className="h-7 w-7" />}>
            พิมพ์เอง
          </BigLink>
          <BigLink to="/yai/journal/process?mode=photo" size="lg" variant="secondary" className="!bg-white !text-yai-deep" icon={<Camera className="h-7 w-7" />}>
            ถ่ายรูป
          </BigLink>
        </div>
      </Card>

      {latestNotice && (
        <Notice title="แจ้งจากคลินิก (ข้อมูลจำลองภายในแอป)">
          {latestNotice.text}{' '}
          <Link to="/yai/reminders" className="font-bold text-yai-deep underline">
            ดูการเตือน
          </Link>
        </Notice>
      )}

      <Card>
        <DailyHeatmap entries={journal} today={today} onSelect={(d) => navigate(`/yai/journal/history?date=${d}`)} />
        <p className="mt-2 text-sm text-yai-ink/70">นับเฉพาะวันที่ยายยืนยันบันทึกแล้ว ไม่ได้บอกว่าสุขภาพดีหรือไม่ดี ไม่ต้องบันทึกทุกวันก็ได้ค่ะ</p>
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xl font-bold">ข้อมูลวันนี้</h2>
          <Link to="/yai/journal/history" className="inline-flex min-h-[44px] items-center gap-1 text-base font-bold text-yai-deep underline">
            <History className="h-5 w-5" aria-hidden="true" /> ดูประวัติ / แก้ไข
          </Link>
        </div>
        {todays.length === 0 ? (
          <p className="mt-2 text-lg text-yai-ink/70">วันนี้ยังไม่มีบันทึก</p>
        ) : (
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
        )}
        <ul className="mt-3 space-y-2 border-t border-yai-ink/10 pt-3 text-lg">
          <li className="flex items-start gap-2">
            <BellRing className="mt-1 h-5 w-5 shrink-0 text-yai-deep" aria-hidden="true" />
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

      <section aria-labelledby="more-services">
        <h2 id="more-services" className="mb-2 text-xl font-bold">
          บริการเพิ่มเติม
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <QuickLink to="/yai/medicines" icon={<Pill className="h-7 w-7" />} label="สมุดยา" sub={pendingCount ? `${pendingCount} รายการรอตรวจ` : undefined} />
          <QuickLink to="/yai/reminders" icon={<BellRing className="h-7 w-7" />} label="เตือนกินยา" />
          <QuickLink to="/yai/passport" icon={<ShieldCheck className="h-7 w-7" />} label="Evidence Passport" sub="ที่มาของข้อมูลทั้งหมด" />
          <QuickLink to="/yai/previsit" icon={<FileText className="h-7 w-7" />} label="ข้อมูลให้หมอ" />
          <QuickLink to="/yai/scan" icon={<ScanLine className="h-7 w-7" />} label="สแกนฉลากยา" />
          <QuickLink to="/yai/food" icon={<Utensils className="h-7 w-7" />} label="อาหารตามธาตุ" sub="ส่วนเสริม" />
          <QuickLink to="/yai/clinics" icon={<Stethoscope className="h-7 w-7" />} label="ไปหาหมอ" />
        </div>
      </section>

      <Card className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-yai-deep" aria-hidden="true" />
          <span className="text-lg font-semibold">ต้องการให้หลานช่วยไหม?</span>
        </div>
        <Link to="/yai/help" className="min-h-[48px] rounded-2xl bg-yai-mint px-4 py-3 text-base font-bold text-yai-deep">
          ขอความช่วยเหลือ
        </Link>
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
