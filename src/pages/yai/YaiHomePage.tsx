import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Keyboard, SlidersHorizontal } from 'lucide-react';
import { useYai, demoNow, yaiStore } from '../../services/yai/yaiStore';
import { FEELING_LABEL, FEELINGS } from '../../domain/yai/voiceFeatures';
import { VoiceEntryButton } from '../../components/yai/VoiceEntryButton';
import { DoctorMessagesCard } from '../../components/yai/DoctorMessagesCard';
import { CareBridgeCard, DailyWisdom, DiscoverCard, JourneyCard, StepsCard, TodayCareStrip, WeeklyTrends, WellnessOverview } from '../../components/yai/lx/WellnessCards';
import { LxNotice } from '../../components/yai/lx/ui';
import { useClinicianMessages } from '../../services/yai/clinicianMessages';
import { canRead } from '../../domain/yai/policies';
import { journalDraft } from '../../services/yai/journalDraft';
import type { VoiceMeasures } from '../../domain/yai/models';
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
  const todayFeelings = (state.checkins ?? []).find((c) => c.date === bangkokDate(now.toISOString()))?.feelings ?? [];

  const startDraft = (text: string, voice?: VoiceMeasures) => {
    journalDraft.set({ originalText: text, inputSource: 'VOICE_TRANSCRIPT', capturedAt: demoNow().toISOString(), photoIds: [], photoTags: {}, voice });
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
            {state.settings.persona === 'PROFESSIONAL' ? '🧑' : '👵'}
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
        {/* C. main daily check-in: the hero */}
        <section aria-labelledby="checkin-title" className="hero-aurora relative isolate overflow-clip rounded-[2rem] px-5 pb-6 pt-7 text-white shadow-lg lg:col-span-2 lg:p-7">
          <span className="aurora-blob aurora-a" aria-hidden="true" />
          <span className="aurora-blob aurora-b" aria-hidden="true" />
          <span className="aurora-blob aurora-c" aria-hidden="true" />
          <svg className="pointer-events-none absolute -right-12 -top-12 h-56 w-56 text-white/[0.06]" viewBox="0 0 100 100" aria-hidden="true">
            <path d="M50 95C20 70 15 35 50 5c35 30 30 65 0 90Z" fill="currentColor" />
          </svg>
          <div className="relative text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#C3ED81]">Daily Check-in</p>
            <h2 id="checkin-title" className="mt-1 text-[2.25rem] font-semibold leading-[1.15] tracking-tight">
              วันนี้คุณรู้สึกอย่างไร?
            </h2>
            <p className="mx-auto mb-6 mt-2 max-w-[24rem] text-lg text-white/80">เล่าเรื่องการนอน อาหาร อารมณ์ หรืออาการ ระบบช่วยแยกหมวด แล้วคุณตรวจก่อนบันทึก</p>
            <VoiceEntryButton
              look="orb"
              label="กดพูด บันทึกสุขภาพ"
              onTranscript={startDraft}
              onFallback={(problem) => {
                journalDraft.set({ originalText: '', inputSource: 'MANUAL_TEXT', capturedAt: demoNow().toISOString(), photoIds: [], photoTags: {}, voiceProblem: problem });
                navigate('/yai/journal/process?mode=text');
              }}
            />

            <p className="mt-6 font-semibold text-white/85">หรือแตะความรู้สึกตอนนี้</p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {FEELINGS.map((f) => {
                const on = todayFeelings.includes(f.tag);
                return (
                  <button
                    key={f.tag}
                    type="button"
                    aria-pressed={on}
                    onClick={() => yaiStore.setFeelings(on ? todayFeelings.filter((t) => t !== f.tag) : [...todayFeelings, f.tag])}
                    className={`flex min-h-[64px] items-center justify-center gap-2 rounded-2xl text-lg font-semibold ring-1 backdrop-blur-sm transition duration-200 hover:-translate-y-0.5 ${
                      on ? 'bg-[#C3ED81] text-[#0B1F1B] ring-[#C3ED81]' : 'bg-white/10 ring-white/15 hover:bg-white/20'
                    }`}
                  >
                    <span aria-hidden="true">{f.emoji}</span>
                    {f.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 min-h-[1.5rem] text-sm text-white/75" aria-live="polite">
              {todayFeelings.length ? `บันทึกแล้ว: ${todayFeelings.map((t) => FEELING_LABEL[t]).join(' ')} · แตะอีกครั้งเพื่อเอาออก` : 'แตะได้หลายข้อ บันทึกทันที'}
            </p>

            <div className="mt-2 flex flex-wrap items-center justify-center gap-x-6 gap-y-1">
              <Link to="/yai/checkin" className="inline-flex min-h-[48px] items-center gap-2 font-semibold text-white/90 underline decoration-white/40 underline-offset-4">
                <SlidersHorizontal className="h-5 w-5" aria-hidden="true" /> แตะเช็กอิน
              </Link>
              <Link to="/yai/journal/process?mode=text" className="inline-flex min-h-[48px] items-center gap-2 font-semibold text-white/90 underline decoration-white/40 underline-offset-4">
                <Keyboard className="h-5 w-5" aria-hidden="true" /> พิมพ์เอง
              </Link>
            </div>

            <details className="mt-2 text-left text-sm text-white/75">
              <summary className="min-h-[44px] cursor-pointer py-2 text-center">เสียงของฉันไปที่ไหน และวัดอะไรบ้าง</summary>
              <p>เบราว์เซอร์จะแปลงเสียงเป็นข้อความ (อาจส่งเสียงไปยังบริการของเบราว์เซอร์) แล้วให้ตรวจก่อนบันทึกทุกครั้ง</p>
              <label className="mt-3 flex items-start gap-3">
                <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-[#C3ED81]" checked={!!state.settings.voiceMeasures} onChange={(e) => yaiStore.setVoiceMeasures(e.target.checked)} />
                <span>
                  ฟังลักษณะเสียงในเครื่องนี้ (ความเร็ว ช่วงหยุด ระดับเสียง ความดัง) แล้วเทียบกับเสียงปกติของฉันเมื่อครบ 10 ครั้ง (ทดลอง)
                  <span className="block text-xs text-white/60">เก็บเป็นตัวเลขเท่านั้น ไม่เก็บไฟล์เสียง แอปไม่ทายอารมณ์จากเสียง ถ้าเสียงต่างจากปกติจะถามให้คุณเลือกความรู้สึกเอง ปิดได้ทุกเมื่อ</span>
                </span>
              </label>
              <p className="mt-2 text-xs text-white/60">ข้อมูลจากนาฬิกา/มือถือ: เชื่อมได้ในโปรไฟล์ (ต้นแบบใช้ข้อมูลจำลอง)</p>
            </details>
          </div>
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
