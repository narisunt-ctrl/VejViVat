import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Leaf, UserPlus } from 'lucide-react';
import { demoNow, useYai, yaiStore } from '../../services/yai/yaiStore';
import { Card, PageTitle } from '../../components/yai/ui';
import { INVITABLE_FRIENDS } from '../../data/yai/fixtures';
import { bangkokDate } from '../../domain/yai/journal';
import { leaderboard, POINT_RULES, STREAK_BONUS, weekPoints } from '../../domain/yai/points';

const MEDALS = ['🥇', '🥈', '🥉'];
const WEEKDAY_SHORT = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

export const LeaderboardPage: React.FC = () => {
  const state = useYai((s) => s);
  const today = bangkokDate(demoNow(state));
  const wp = weekPoints(state, today);
  const board = leaderboard(state, today);
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const max = Math.max(...wp.days.map((d) => d.total), 1);

  const addFriend = () => {
    const r = yaiStore.addFriendByCode(code, INVITABLE_FRIENDS);
    setMsg(r.ok ? { ok: true, text: 'เพิ่มเพื่อนแล้วค่ะ' } : { ok: false, text: r.reason ?? 'เพิ่มไม่ได้' });
    if (r.ok) setCode('');
  };

  return (
    <div className="space-y-5">
      <PageTitle title="คะแนนสุขภาพกับเพื่อน" subtitle="สะสมแต้มจากการดูแลตัวเองเบาๆ ทุกวัน" back="/yai" />

      <section className="rounded-3xl bg-gradient-to-br from-amber-300 via-amber-200 to-yellow-100 p-4 shadow-sm">
        <p className="text-base font-semibold text-amber-900">แต้มของยายสัปดาห์นี้</p>
        <p className="text-5xl font-bold text-amber-950">
          {wp.total} <span className="text-2xl">แต้ม</span>
        </p>
        {wp.streakBonus > 0 && <p className="mt-1 text-base font-semibold text-amber-900">รวมโบนัสบันทึกต่อเนื่อง {STREAK_BONUS.days} วัน +{wp.streakBonus}</p>}
        <ol className="mt-3 flex h-24 items-end justify-between gap-1" aria-label="แต้มรายวัน 7 วันล่าสุด">
          {wp.days.map((d) => (
            <li key={d.date} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-xs font-bold text-amber-950">{d.total}</span>
              <span className="w-full rounded-t-md bg-amber-600/80" style={{ height: `${Math.max(4, (d.total / max) * 56)}px` }} aria-hidden="true" />
              <span className={`text-xs ${d.date === today ? 'font-bold' : ''}`}>{d.date === today ? 'วันนี้' : WEEKDAY_SHORT[new Date(`${d.date}T12:00:00+07:00`).getUTCDay()]}</span>
            </li>
          ))}
        </ol>
      </section>

      <Card>
        <h2 className="text-xl font-bold">อันดับในกลุ่มเพื่อน</h2>
        <ol className="mt-3 space-y-2">
          {board.map((r, i) => (
            <li key={r.id} className={`flex items-center gap-3 rounded-2xl p-3 ${r.isMe ? 'border-2 border-yai-green bg-yai-mint' : 'bg-slate-50'}`}>
              <span className="w-8 text-center text-2xl" aria-label={`อันดับ ${i + 1}`}>
                {MEDALS[i] ?? <span className="text-lg font-bold text-yai-ink/60">{i + 1}</span>}
              </span>
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-2xl shadow-sm" aria-hidden="true">
                {r.avatar}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-lg font-bold">{r.isMe ? `${r.name} (ยาย)` : r.name}</span>
                {r.isSynthetic && <span className="text-xs text-yai-ink/50">เพื่อนตัวอย่าง (ข้อมูลจำลอง)</span>}
              </span>
              <span className="text-xl font-bold">{r.points}</span>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-sm text-yai-ink/70">เพื่อนเห็นแค่ชื่อและแต้มรวมรายสัปดาห์ ไม่เห็นข้อมูลสุขภาพ ยา หรืออาการของยาย</p>
        <label className="mt-2 flex min-h-[48px] items-center gap-3 text-base">
          <input
            type="checkbox"
            className="h-6 w-6"
            checked={state.settings.shareScore ?? true}
            onChange={(e) => yaiStore.updateSettings({ shareScore: e.target.checked })}
          />
          ให้เพื่อนเห็นแต้มของยาย
        </label>
      </Card>

      <Card>
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <UserPlus className="h-6 w-6 text-yai-green" aria-hidden="true" /> เพิ่มเพื่อนด้วยรหัส
        </h2>
        <div className="mt-3 flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="เช่น YAI-1234"
            aria-label="รหัสเพื่อน"
            className="min-h-[52px] min-w-0 flex-1 rounded-2xl border-2 border-yai-ink/20 px-3 text-xl uppercase"
          />
          <button type="button" onClick={addFriend} disabled={!code.trim()} className="min-h-[52px] rounded-2xl bg-yai-green px-5 text-lg font-bold text-white disabled:opacity-50">
            เพิ่ม
          </button>
        </div>
        {msg && <p className={`mt-2 text-base font-semibold ${msg.ok ? 'text-emerald-700' : 'text-yai-alert'}`}>{msg.text}</p>}
        <p className="mt-2 text-sm text-yai-ink/60">ต้นแบบ: ลองรหัส YAI-1234 (เพื่อนตัวอย่าง) · ของจริงต้องให้ทั้งสองฝ่ายกดยอมรับ</p>
      </Card>

      <Card>
        <h2 className="text-xl font-bold">วิธีได้แต้ม</h2>
        <ul className="mt-2 divide-y">
          {POINT_RULES.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 py-2 text-base">
              <span>{r.label}</span>
              <span className="shrink-0 text-right font-bold text-yai-green">
                +{r.points}
                <span className="block text-xs font-normal text-yai-ink/60">
                  {r.per} · สูงสุด {r.dailyCap}/วัน
                </span>
              </span>
            </li>
          ))}
          <li className="flex items-center justify-between gap-3 py-2 text-base">
            <span>บันทึกต่อเนื่อง {STREAK_BONUS.days} วัน</span>
            <span className="font-bold text-yai-green">+{STREAK_BONUS.points}/สัปดาห์</span>
          </li>
        </ul>
        <p className="mt-2 text-sm text-yai-ink/70">
          ทุกข้อมีเพดานต่อวัน เพื่อไม่ให้ต้องฝืนตัวเอง · ตอบเตือนกินยาว่า “ยังไม่ได้กิน” ก็ได้แต้มเท่ากัน ตอบตามจริงดีที่สุด · แต้มไม่มีผลต่อการรักษา
        </p>
        <Link to="/yai/herb-reviews" className="mt-3 flex min-h-[56px] items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-lg font-bold text-white">
          <Leaf className="h-5 w-5" aria-hidden="true" /> รีวิวสมุนไพรที่ใช้ รับ +15 แต้ม
        </Link>
      </Card>
    </div>
  );
};
