import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Keyboard, SlidersHorizontal } from 'lucide-react';
import { useYai, demoNow } from '../../services/yai/yaiStore';
import { VoiceEntryButton } from '../../components/yai/VoiceEntryButton';
import { DoctorMessagesCard } from '../../components/yai/DoctorMessagesCard';
import { CareBridgeCard, DailyWisdom, DiscoverCard, JourneyCard, StepsCard, TodayCareStrip, WeeklyTrends, WellnessOverview } from '../../components/yai/lx/WellnessCards';
import { LxNotice } from '../../components/yai/lx/ui';
import { useClinicianMessages } from '../../services/yai/clinicianMessages';
import { canRead } from '../../domain/yai/policies';
import { journalDraft } from '../../services/yai/journalDraft';
import { useClinicianOrderSync } from '../../services/yai/useOrderSync';
import { thaiDateLabel, bangkokDate } from '../../domain/yai/journal';
import yaiLogo from '../../assets/yai/yai-logo.webp';

// Longevity Home Dashboard: today's self-reported wellness, one-tap voice check-in, 7-day trends, goals,
// Thai herbal knowledge and the CareBridge connection. Nothing is filled in for a day that was not recorded.

function greetingWord(hour: number) {
  if (hour < 11) return 'สวัสดีตอนเช้า';
  if (hour < 16) return 'สวัสดีตอนบ่าย';
  return 'สวัสดีตอนเย็น';
}

export const YaiHomePage: React.FC = () => {
  const state = useYai((s) => s);
  const navigate = useNavigate();
  const messages = useClinicianMessages();
  useClinicianOrderSync();
  const now = demoNow(state);
  const hour = Number(now.toLocaleString('en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', hour12: false }));
  const name = state.patient.displayName.replace(/\s*\(.*\)\s*$/, '');
  const unread = messages.filter((m) => m.patientId === state.patient.id && !m.acknowledgedAt && canRead(state.consents, m.fromRecipientId, 'REMINDER_ALERTS', now)).length;
  const latestNotice = (state.orderNotices ?? [])[0];

  const startDraft = (text: string) => {
    journalDraft.set({ originalText: text, inputSource: 'VOICE_TRANSCRIPT', capturedAt: demoNow().toISOString(), photoIds: [], photoTags: {} });
    navigate('/yai/journal/process?mode=voice');
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* A. header */}
      <header className="space-y-1">
        <div className="flex items-center gap-3">
          <img src={yaiLogo} alt="" className="h-11 w-11 rounded-2xl object-cover object-top lg:hidden" />
          <p className="min-w-0 flex-1 text-sm text-lx-muted">
            <span className="block font-semibold text-lx-ink lg:hidden">ยายพร้อม</span>
            {thaiDateLabel(bangkokDate(now))}
          </p>
          <Link
            to="/yai/consult"
            className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-lx-line bg-lx-surface"
            aria-label={unread ? `ข้อความจากผู้เชี่ยวชาญ ${unread} ข้อความ` : 'การแจ้งเตือน'}
          >
            <Bell className="h-5 w-5" aria-hidden="true" />
            {unread > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-lx-alert px-1 text-xs font-bold text-lx-bg">{unread}</span>}
          </Link>
          <Link to="/yai/profile" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-lx-lime text-lg font-semibold text-lx-forest" aria-label="โปรไฟล์">
            {name.replace(/^คุณ(ยาย|ตา)?/, '').trim().charAt(0) || 'ย'}
          </Link>
        </div>
        <h1 className="pt-2 text-2xl font-semibold leading-tight lg:text-3xl">
          {greetingWord(hour)}, {name}
        </h1>
        <p className="text-sm text-lx-muted">Live Better, Longer — ภูมิปัญญาไทยกับการดูแลที่เป็นของคุณ</p>
      </header>

      {!state.settings.onboarded && (
        <LxNotice title="ใช้ครั้งแรกใช่ไหม?">
          <Link to="/yai/onboarding" className="font-semibold text-lx-link underline">
            ตั้งค่าแบบง่าย 1 นาที
          </Link>
        </LxNotice>
      )}
      <DoctorMessagesCard />
      {latestNotice && <LxNotice title="แจ้งจากคลินิก (ข้อมูลจำลองภายในแอป)">{latestNotice.text}</LxNotice>}

      <div className="grid gap-4 lg:grid-cols-5 lg:gap-6">
        {/* C. main daily check-in */}
        <section aria-labelledby="checkin-title" className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-lx-forest via-lx-forest to-lx-emerald p-5 text-white lg:col-span-2 lg:p-6">
          <svg className="pointer-events-none absolute -bottom-10 -right-10 h-44 w-44 text-white/[0.06]" viewBox="0 0 100 100" aria-hidden="true">
            <path d="M50 95C20 70 15 35 50 5c35 30 30 65 0 90Z" fill="currentColor" />
          </svg>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#C3ED81]">Daily Check-in</p>
          <h2 id="checkin-title" className="mt-1 text-2xl font-semibold">
            วันนี้คุณรู้สึกอย่างไร?
          </h2>
          <p className="mb-4 mt-1 text-base text-white/85">เล่าสั้นๆ เรื่องการนอน อาหาร อารมณ์ หรืออาการ ระบบช่วยแยกหมวด แล้วคุณตรวจก่อนบันทึก</p>
          <div>
            <VoiceEntryButton
              label="กดพูด บันทึกสุขภาพ"
              onTranscript={startDraft}
              onFallback={(problem) => {
                journalDraft.set({ originalText: '', inputSource: 'MANUAL_TEXT', capturedAt: demoNow().toISOString(), photoIds: [], photoTags: {}, voiceProblem: problem });
                navigate('/yai/journal/process?mode=text');
              }}
            />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link to="/yai/checkin" className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-white/10 text-base font-semibold backdrop-blur hover:bg-white/20">
              <SlidersHorizontal className="h-5 w-5" aria-hidden="true" /> แตะเช็กอิน
            </Link>
            <Link to="/yai/journal/process?mode=text" className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-white/10 text-base font-semibold backdrop-blur hover:bg-white/20">
              <Keyboard className="h-5 w-5" aria-hidden="true" /> พิมพ์เอง
            </Link>
          </div>
          <p className="mt-3 text-xs text-white/70">ข้อมูลจากนาฬิกา/มือถือ: เชื่อมได้ในโปรไฟล์ (ต้นแบบใช้ข้อมูลจำลอง)</p>
        </section>

        {/* B. daily overview */}
        <div className="space-y-4 lg:col-span-3">
          <WellnessOverview />
          <StepsCard />
          <DailyWisdom />
          <TodayCareStrip />
        </div>
      </div>

      {/* D. trends */}
      <WeeklyTrends />

      <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        {/* E. journey */}
        <JourneyCard />
        {/* F. discover */}
        <DiscoverCard />
      </div>

      {/* G. CareBridge */}
      <CareBridgeCard />

      <p className="pb-2 text-center text-xs text-lx-muted">
        ต้นแบบเพื่อการสาธิต ข้อมูลจำลองติดป้ายไว้ · ไม่ใช่การวินิจฉัยหรือสั่งยา ·{' '}
        <Link to="/" className="underline">
          สำหรับบุคลากร
        </Link>
      </p>
    </div>
  );
};
