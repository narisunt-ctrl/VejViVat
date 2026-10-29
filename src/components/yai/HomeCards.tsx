import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Bell, ChevronRight, Droplet, Footprints, HeartPulse, RefreshCw, Scale, Share2, ThumbsDown, Trophy } from 'lucide-react';
import { demoNow, useYai, yaiStore } from '../../services/yai/yaiStore';
import { greetingFor } from '../../domain/yai/dailyGreeting';
import { bangkokDate } from '../../domain/yai/journal';
import { journalStreak, leaderboard, weekPoints } from '../../domain/yai/points';
import { todaysOccurrences } from '../../services/yai/reminderSchedule';
import { speakThai } from '../../services/yai/thaiVoiceJournal';
import type { Measurement } from '../../domain/yai/models';
import { GreetingArt } from './GreetingArt';
import yaiLogo from '../../assets/yai/yai-logo.webp';

const THAI_SHORT_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const shortDate = (d: string) => `${Number(d.slice(8))} ${THAI_SHORT_MONTHS[Number(d.slice(5, 7)) - 1]}`;
const addDays = (d: string, n: number) => bangkokDate(new Date(Date.parse(`${d}T12:00:00+07:00`) + n * 86_400_000));

/** Daily blessing card in the colour of the day; Buddha image on วันพระ; grandma can ask for another one */
export const GreetingCard: React.FC = () => {
  const state = useYai((s) => s);
  const today = bangkokDate(demoNow(state));
  const [seed, setSeed] = useState(0);
  const g = greetingFor(today, seed, state.settings.greetingSkips ?? []);
  const name = state.patient.displayName.replace(/\s*\(.*\)\s*$/, '');

  const share = async () => {
    const text = `${g.title}\n${g.quote}\n— ส่งจากแอปยายพร้อม`;
    try {
      if (navigator.share) await navigator.share({ text });
      else await navigator.clipboard?.writeText(text);
    } catch {
      // user cancelled
    }
  };

  return (
    <section className="overflow-hidden rounded-3xl border border-amber-100 bg-gradient-to-r from-amber-50 to-white shadow-sm" aria-labelledby="greet-title">
      <div className="flex items-center gap-3 p-3">
        <img src={yaiLogo} alt="" className="h-16 w-16 shrink-0 rounded-2xl object-cover object-top" />
        <div className="min-w-0">
          <p id="greet-title" className="text-xl font-bold text-yai-greendeep">
            สวัสดีค่ะ {name} <span aria-hidden="true">☀️</span>
          </p>
          <p className="text-base text-yai-ink/80">วันนี้เป็นอีกหนึ่งวันที่ดี ดูแลตัวเองให้แข็งแรงนะคะ 💚</p>
        </div>
      </div>
      <div className="mx-3 mb-3 overflow-hidden rounded-2xl border" style={{ borderColor: g.theme.color }}>
        <div className="relative h-40" style={{ backgroundColor: g.theme.light }}>
          <GreetingArt art={g.art} color={g.theme.color} light={g.theme.light} variant={g.artVariant} />
          <div className="absolute inset-x-0 top-0 p-2">
            <p className="inline-block rounded-full px-3 py-0.5 text-base font-bold text-white shadow" style={{ backgroundColor: g.theme.color }}>
              {g.occasion?.art === 'BUDDHA' ? g.occasion.title : g.title}
            </p>
          </div>
        </div>
        <p className="bg-white px-3 py-2 text-lg font-semibold leading-snug" style={{ color: g.theme.color }}>
          “{g.quote}”
        </p>
        {g.occasion?.approximate && <p className="bg-white px-3 pb-1 text-xs text-yai-ink/50">วันพระคำนวณจากข้างขึ้นข้างแรม อาจคลาดเคลื่อน 1 วัน</p>}
        <div className="grid grid-cols-4 gap-1 border-t bg-white p-1 text-sm font-semibold">
          <button type="button" onClick={() => speakThai(`${g.title} ${g.quote}`)} className="min-h-[44px] rounded-xl hover:bg-yai-mint">
            🔊 ฟัง
          </button>
          <button type="button" onClick={() => setSeed((s) => s + 1)} className="inline-flex min-h-[44px] items-center justify-center gap-1 rounded-xl hover:bg-yai-mint">
            <RefreshCw className="h-4 w-4" aria-hidden="true" /> คำใหม่
          </button>
          <button
            type="button"
            onClick={() => {
              yaiStore.skipGreeting(g.quote);
              setSeed((s) => s + 1);
            }}
            className="inline-flex min-h-[44px] items-center justify-center gap-1 rounded-xl hover:bg-yai-mint"
          >
            <ThumbsDown className="h-4 w-4" aria-hidden="true" /> ไม่ชอบ
          </button>
          <button type="button" onClick={share} className="inline-flex min-h-[44px] items-center justify-center gap-1 rounded-xl hover:bg-yai-mint">
            <Share2 className="h-4 w-4" aria-hidden="true" /> ส่งต่อ
          </button>
        </div>
      </div>
    </section>
  );
};

/** "บันทึกสุขภาพต่อเนื่อง N วัน" with the last days as circles; missing a day is not punished */
export const StreakCard: React.FC = () => {
  const state = useYai((s) => s);
  const today = bangkokDate(demoNow(state));
  const days = new Set((state.journal ?? []).filter((e) => e.status !== 'DRAFT').map((e) => e.recordedLocalDate));
  const streak = journalStreak(state, today);
  const cells = [-4, -3, -2, -1, 0, 1, 2].map((n) => addDays(today, n));
  return (
    <section className="rounded-3xl border border-yai-green/15 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-base font-bold">บันทึกสุขภาพต่อเนื่อง</p>
        <Link to="/yai/journal/history" className="inline-flex items-center text-sm font-semibold text-yai-green">
          ดูประวัติทั้งหมด <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className="text-4xl" aria-hidden="true">
          🔥
        </span>
        <p className="shrink-0 text-3xl font-bold">
          {streak} <span className="text-xl">วัน</span>
        </p>
      </div>
      <div className="mt-2">
        <ol className="flex justify-between gap-1" aria-label="7 วันล่าสุด">
          {cells.map((d) => {
            const done = days.has(d);
            const isToday = d === today;
            const future = d > today;
            return (
              <li key={d} className="flex flex-col items-center gap-0.5">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                    done ? 'bg-yai-green text-white' : future ? 'bg-slate-100 text-slate-300' : isToday ? 'border-2 border-yai-green bg-white text-yai-green' : 'bg-slate-100 text-slate-400'
                  }`}
                  aria-label={`${shortDate(d)} ${done ? 'บันทึกแล้ว' : future ? '' : 'ยังไม่บันทึก'}`}
                >
                  {done ? '✓' : ''}
                </span>
                <span className={`text-[11px] ${isToday ? 'font-bold text-yai-green' : 'text-yai-ink/50'}`}>{isToday ? 'วันนี้' : shortDate(d)}</span>
              </li>
            );
          })}
        </ol>
      </div>
      {streak === 0 && <p className="mt-1 text-sm text-yai-ink/60">เริ่มใหม่ได้ทุกวัน ไม่ต้องรีบค่ะ</p>}
    </section>
  );
};

/** Today's medicine reminders with their status (self-reported) */
export const TodayMedsCard: React.FC = () => {
  const state = useYai((s) => s);
  const now = demoNow(state);
  const occ = todaysOccurrences(state, now);
  return (
    <section className="rounded-3xl border border-amber-100 bg-amber-50/40 p-3 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-base font-bold">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-400 text-white">
            <Bell className="h-4 w-4" aria-hidden="true" />
          </span>
          ยาที่ต้องทานวันนี้
        </p>
        <Link to="/yai/reminders" className="inline-flex items-center text-sm font-semibold text-yai-green">
          ดูทั้งหมด <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
      {occ.length === 0 ? (
        <p className="mt-2 text-base text-yai-ink/60">วันนี้ไม่มีการเตือนกินยา</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {occ.slice(0, 3).map((o) => {
            const med = state.medicines.find((m) => m.id === o.plan.medicineId);
            const log = state.doseLogs.find((l) => l.id === `${o.plan.id}@${o.key}`);
            return (
              <li key={o.key + o.plan.id} className="flex items-center justify-between gap-2 rounded-2xl bg-white p-2">
                <span className="min-w-0">
                  <span className="block truncate text-base font-semibold">{med?.displayName.value ?? 'ยา'}</span>
                  <span className="text-sm text-yai-ink/60">{o.time} น.</span>
                </span>
                {log?.response === 'TAKEN_REPORTED' ? (
                  <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-sm font-semibold text-emerald-800">✓ ทานแล้ว</span>
                ) : o.isPast ? (
                  <button
                    type="button"
                    onClick={() => yaiStore.reportDose(o.plan.id, o.key, 'TAKEN_REPORTED')}
                    className="min-h-[40px] shrink-0 rounded-full bg-yai-green px-3 text-sm font-bold text-white"
                  >
                    ทานแล้ว
                  </button>
                ) : (
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-sm text-slate-600">รอทาน</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

const latest = (ms: Measurement[], type: Measurement['type']) => ms.filter((m) => m.type === type).sort((a, b) => b.at.localeCompare(a.at))[0];

/** Latest measurements as recorded; no "normal/abnormal" verdict from the app */
export const HealthSummaryCard: React.FC = () => {
  const ms = useYai((s) => s.measurements ?? []);
  const tiles = [
    { type: 'WEIGHT' as const, label: 'น้ำหนัก', unit: 'กิโลกรัม', icon: Scale, tint: 'text-sky-700' },
    { type: 'GLUCOSE' as const, label: 'ระดับน้ำตาล', unit: 'มก./ดล.', icon: Droplet, tint: 'text-rose-600' },
    { type: 'BP' as const, label: 'ความดันโลหิต', unit: 'มม.ปรอท', icon: HeartPulse, tint: 'text-red-600' },
    { type: 'STEPS' as const, label: 'ก้าวเดินวันนี้', unit: 'ก้าว', icon: Footprints, tint: 'text-sky-600' },
  ];
  return (
    <section className="rounded-3xl border border-yai-green/15 bg-yai-mint/40 p-3 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-base font-bold">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-yai-green text-white">
            <Activity className="h-4 w-4" aria-hidden="true" />
          </span>
          สรุปสุขภาพ
        </p>
        <Link to="/yai/health" className="inline-flex items-center text-sm font-semibold text-yai-green">
          บันทึก <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {tiles.map((t) => {
          const m = latest(ms, t.type);
          return (
            <Link key={t.type} to="/yai/health" className="rounded-2xl bg-white p-2">
              <span className="flex items-center gap-1 text-sm text-yai-ink/70">
                <t.icon className={`h-4 w-4 ${t.tint}`} aria-hidden="true" /> {t.label}
              </span>
              <span className="block text-2xl font-bold">{m ? (t.type === 'BP' ? `${m.value}/${m.value2}` : m.value.toLocaleString('th-TH')) : '–'}</span>
              <span className="text-xs text-yai-ink/50">
                {m ? `${t.unit}${m.isSynthetic ? ' · ตัวอย่าง' : ''}${m.source === 'DEVICE_DEMO' ? ' · จากอุปกรณ์ (จำลอง)' : ''}` : 'ยังไม่มีข้อมูล'}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
};

/** Weekly points and rank among linked friends; friendly framing, no health details shared */
export const LeaderboardTeaser: React.FC = () => {
  const state = useYai((s) => s);
  const today = bangkokDate(demoNow(state));
  const wp = weekPoints(state, today);
  const board = leaderboard(state, today);
  const rank = board.findIndex((r) => r.isMe) + 1;
  return (
    <Link to="/yai/leaderboard" className="flex items-center gap-3 rounded-3xl border border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 p-4 shadow-sm">
      <Trophy className="h-10 w-10 shrink-0 text-amber-500" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="block text-lg font-bold">คะแนนสุขภาพสัปดาห์นี้ {wp.total} แต้ม</span>
        <span className="block text-sm text-yai-ink/70">
          อันดับ {rank} จาก {board.length} ในกลุ่มเพื่อน · ทุกคนเก่งค่ะ
        </span>
      </span>
      <ChevronRight className="h-5 w-5 text-yai-ink/40" aria-hidden="true" />
    </Link>
  );
};
