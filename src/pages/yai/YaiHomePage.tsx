import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Camera, Keyboard, MessagesSquare, NotebookPen, PersonStanding, Utensils } from 'lucide-react';
import { useYai, demoNow } from '../../services/yai/yaiStore';
import { Notice } from '../../components/yai/ui';
import { VoiceEntryButton } from '../../components/yai/VoiceEntryButton';
import { DoctorMessagesCard } from '../../components/yai/DoctorMessagesCard';
import { MoodTapCard } from '../../components/yai/MoodTapCard';
import { GreetingCard, HealthSummaryCard, LeaderboardTeaser, StreakCard, TodayMedsCard } from '../../components/yai/HomeCards';
import { CertifiedAdBanner } from '../../components/yai/CertifiedAdBanner';
import { useClinicianMessages } from '../../services/yai/clinicianMessages';
import { canRead } from '../../domain/yai/policies';
import { journalDraft } from '../../services/yai/journalDraft';
import { useClinicianOrderSync } from '../../services/yai/useOrderSync';
import yaiLogo from '../../assets/yai/yai-logo.webp';

// Home: daily blessing first, then one big voice button, today's medicines and health numbers side by side,
// quick tiles, points with friends. The single sponsored banner sits near the bottom, away from medicines.

const TILES = [
  { to: '/yai/food', label: 'อาหารตามธาตุ', icon: Utensils, tint: 'bg-orange-50 text-orange-600' },
  { to: '/yai/exercise', label: 'ออกกำลังกายสำหรับผู้สูงวัย', icon: PersonStanding, tint: 'bg-sky-50 text-sky-600' },
  { to: '/yai/journal/history', label: 'บันทึกอาการ', icon: NotebookPen, tint: 'bg-violet-50 text-violet-600' },
  { to: '/yai/ask', label: 'ปรึกษาผู้เชี่ยวชาญ', icon: MessagesSquare, tint: 'bg-emerald-50 text-emerald-700' },
];

export const YaiHomePage: React.FC = () => {
  const state = useYai((s) => s);
  const navigate = useNavigate();
  const messages = useClinicianMessages();
  useClinicianOrderSync();
  const now = demoNow(state);
  const unread = messages.filter((m) => m.patientId === state.patient.id && !m.acknowledgedAt && canRead(state.consents, m.fromRecipientId, 'REMINDER_ALERTS', now)).length;
  const latestNotice = (state.orderNotices ?? [])[0];

  const startDraft = (text: string) => {
    journalDraft.set({ originalText: text, inputSource: 'VOICE_TRANSCRIPT', capturedAt: demoNow().toISOString(), photoIds: [], photoTags: {} });
    navigate('/yai/journal/process?mode=voice');
  };

  return (
    <div className="-mx-4 -mt-4 space-y-4 bg-gradient-to-b from-emerald-50 via-yai-paper to-yai-paper px-4 pb-4 pt-3">
      {/* brand bar */}
      <header className="flex items-center gap-3">
        <img src={yaiLogo} alt="" className="h-14 w-14 rounded-2xl object-cover object-top shadow-sm" />
        <div className="min-w-0 flex-1">
          <p className="whitespace-nowrap text-2xl font-bold leading-tight text-yai-greendeep">ยายพร้อม</p>
          <p className="text-xs leading-snug text-yai-ink/70">ดูแลสุขภาพอย่างห่วงใย ให้ผู้สูงวัยมีรอยยิ้มในทุกวัน</p>
        </div>
        <Link to="/yai/ask" className="relative flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm" aria-label={unread ? `ข้อความจากคุณหมอ ${unread} ข้อความ` : 'ถามคุณหมอ'}>
          <Bell className="h-6 w-6 text-yai-greendeep" aria-hidden="true" />
          {unread > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-bold text-white">{unread}</span>}
        </Link>
        <Link to="/yai/profile" className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-yai-green bg-white text-2xl" aria-label="โปรไฟล์">
          <span aria-hidden="true">👵</span>
        </Link>
      </header>

      {!state.settings.onboarded && (
        <Notice title="ใช้ครั้งแรกใช่ไหมคะ?">
          <Link to="/yai/onboarding" className="font-bold text-yai-deep underline">
            เริ่มตั้งค่าแบบง่าย (1 นาที)
          </Link>
        </Notice>
      )}

      <GreetingCard />

      {/* one big voice action, with typing/photo as quieter alternatives */}
      <section className="space-y-2 rounded-3xl bg-gradient-to-r from-yai-green to-emerald-500 p-4 text-white shadow-md">
        <p className="text-xl font-bold">วันนี้เป็นอย่างไรบ้างคะ? กดแล้วเล่าได้เลย</p>
        <VoiceEntryButton
          onTranscript={startDraft}
          onFallback={(problem) => {
            journalDraft.set({ originalText: '', inputSource: 'MANUAL_TEXT', capturedAt: demoNow().toISOString(), photoIds: [], photoTags: {}, voiceProblem: problem });
            navigate('/yai/journal/process?mode=text');
          }}
        />
        <div className="grid grid-cols-2 gap-2">
          <Link to="/yai/journal/process?mode=text" className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-white/20 text-lg font-bold">
            <Keyboard className="h-5 w-5" aria-hidden="true" /> พิมพ์เอง
          </Link>
          <Link to="/yai/journal/process?mode=photo" className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-white/20 text-lg font-bold">
            <Camera className="h-5 w-5" aria-hidden="true" /> ถ่ายรูป
          </Link>
        </div>
        <p className="text-sm text-white/90">หนูช่วยจัดหมวดให้ และยายตรวจก่อนบันทึกทุกครั้ง</p>
      </section>

      <DoctorMessagesCard />
      {latestNotice && <Notice title="แจ้งจากคลินิก (ข้อมูลจำลองภายในแอป)">{latestNotice.text}</Notice>}

      <StreakCard />

      <div className="grid gap-3 min-[400px]:grid-cols-2">
        <TodayMedsCard />
        <HealthSummaryCard />
      </div>

      <ul className="grid grid-cols-4 gap-2">
        {TILES.map((t) => (
          <li key={t.to}>
            <Link to={t.to} className="flex h-full flex-col items-center gap-1.5 rounded-2xl bg-white p-2 text-center shadow-sm">
              <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${t.tint}`} aria-hidden="true">
                <t.icon className="h-7 w-7" />
              </span>
              <span className="text-sm font-bold leading-tight">{t.label}</span>
            </Link>
          </li>
        ))}
      </ul>

      <LeaderboardTeaser />
      <MoodTapCard />
      <CertifiedAdBanner />

      <p className="text-center text-sm text-yai-ink/60">
        ต้นแบบเพื่อการสาธิต ข้อมูลจำลอง ไม่ใช่การวินิจฉัยหรือสั่งยา · <Link to="/" className="underline">สำหรับบุคลากร</Link> ·{' '}
        <Link to="/partner" className="underline">คลินิกเข้าร่วม</Link>
      </p>
    </div>
  );
};
