import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { useYai, yaiStore } from '../../services/yai/yaiStore';
import { Card, Notice, PageTitle } from '../../components/yai/ui';
import { summarizeHerbReviews } from '../../domain/yai/points';
import type { HerbReview } from '../../domain/yai/models';

// Real-world experience from users, collected with explicit research consent. It is shown as what people
// reported, never as proof that a herb works, and the app does not recommend herbs from it.
const COMMON_HERBS = ['ขมิ้นชัน', 'ฟ้าทะลายโจร', 'ขิง', 'ไพล', 'กระชายดำ', 'เพชรสังฆาต', 'มะขามแขก', 'ยาหอม'];
const SIDE: Record<HerbReview['sideEffects'], string> = { NONE: 'ไม่มี', MILD: 'มีเล็กน้อย', BOTHERSOME: 'มีจนรบกวน' };

export const HerbReviewsPage: React.FC = () => {
  const reviews = useYai((s) => s.herbReviews ?? []);
  const [herb, setHerb] = useState('');
  const [rating, setRating] = useState<HerbReview['rating'] | 0>(0);
  const [side, setSide] = useState<HerbReview['sideEffects']>('NONE');
  const [sideNote, setSideNote] = useState('');
  const [weeks, setWeeks] = useState('4');
  const [recommend, setRecommend] = useState(true);
  const [note, setNote] = useState('');
  const [consent, setConsent] = useState(false);
  const [done, setDone] = useState(false);
  const summary = summarizeHerbReviews(reviews);

  const submit = () => {
    if (!herb.trim() || !rating) return;
    yaiStore.addHerbReview({
      herbName: herb.trim(),
      rating,
      sideEffects: side,
      sideEffectNote: sideNote.trim(),
      weeksUsed: Math.max(0, Math.min(520, Number(weeks) || 0)),
      wouldRecommend: recommend,
      note: note.trim(),
      consentResearch: consent,
    });
    setDone(true);
    setHerb('');
    setRating(0);
    setSide('NONE');
    setSideNote('');
    setNote('');
    setConsent(false);
  };

  return (
    <div className="space-y-5">
      <PageTitle title="รีวิวสมุนไพรจากเพื่อนๆ" subtitle="เล่าประสบการณ์ใช้สมุนไพร ช่วยเก็บข้อมูลให้นักวิจัย" back="/yai/leaderboard" />

      <Notice tone="warn" title="เป็นประสบการณ์ของผู้ใช้ ไม่ใช่หลักฐานทางการแพทย์">
        ผลกับแต่ละคนไม่เหมือนกัน ห้ามหยุดหรือเปลี่ยนยาที่หมอสั่งเพราะรีวิว ถ้าใช้ยาประจำ ปรึกษาแพทย์หรือเภสัชกรก่อนใช้สมุนไพร
      </Notice>

      <Card>
        <h2 className="text-xl font-bold">รีวิวสมุนไพรที่ยายใช้</h2>
        {done && <p className="mt-2 rounded-2xl bg-emerald-50 p-3 text-base font-semibold text-emerald-800">ขอบคุณค่ะ ได้ +15 แต้ม (ให้ดาวเท่าไรก็ได้แต้มเท่ากัน)</p>}
        <label className="mt-3 block text-base font-semibold">
          ชื่อสมุนไพร
          <input
            list="herb-list"
            value={herb}
            onChange={(e) => {
              setHerb(e.target.value);
              setDone(false);
            }}
            className="mt-1 block min-h-[52px] w-full rounded-2xl border-2 border-yai-ink/20 px-3 text-xl"
          />
          <datalist id="herb-list">
            {COMMON_HERBS.map((h) => (
              <option key={h} value={h} />
            ))}
          </datalist>
        </label>

        <fieldset className="mt-3">
          <legend className="text-base font-semibold">ยายรู้สึกว่าช่วยได้แค่ไหน</legend>
          <div className="mt-1 flex gap-1">
            {([1, 2, 3, 4, 5] as const).map((n) => (
              <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} ดาว`} aria-pressed={rating === n} className="flex h-12 w-12 items-center justify-center rounded-xl hover:bg-amber-50">
                <Star className={`h-9 w-9 ${rating >= n ? 'fill-amber-400 text-amber-500' : 'text-slate-300'}`} />
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-3">
          <legend className="text-base font-semibold">อาการไม่พึงประสงค์</legend>
          <div className="mt-1 grid grid-cols-3 gap-2">
            {(Object.keys(SIDE) as HerbReview['sideEffects'][]).map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={side === k}
                onClick={() => setSide(k)}
                className={`min-h-[48px] rounded-2xl border-2 text-base font-bold ${side === k ? 'border-yai-green bg-yai-green text-white' : 'border-yai-ink/15 bg-white'}`}
              >
                {SIDE[k]}
              </button>
            ))}
          </div>
          {side !== 'NONE' && (
            <input
              value={sideNote}
              onChange={(e) => setSideNote(e.target.value)}
              placeholder="เช่น ปวดท้อง ผื่น"
              aria-label="อาการที่เกิด"
              className="mt-2 block min-h-[48px] w-full rounded-2xl border-2 border-yai-ink/20 px-3 text-lg"
            />
          )}
          {side === 'BOTHERSOME' && <p className="mt-2 text-base font-semibold text-yai-alert">ถ้ามีอาการรบกวน ควรหยุดและแจ้งคุณหมอหรือเภสัชกรนะคะ</p>}
        </fieldset>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="text-base font-semibold">
            ใช้มากี่สัปดาห์
            <input inputMode="numeric" value={weeks} onChange={(e) => setWeeks(e.target.value)} className="mt-1 block min-h-[48px] w-full rounded-2xl border-2 border-yai-ink/20 px-3 text-xl" />
          </label>
          <label className="flex items-end gap-2 pb-2 text-base font-semibold">
            <input type="checkbox" className="h-6 w-6" checked={recommend} onChange={(e) => setRecommend(e.target.checked)} />
            จะบอกต่อเพื่อน
          </label>
        </div>
        <label className="mt-3 block text-base font-semibold">
          เล่าเพิ่ม (ไม่ใส่ก็ได้)
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="mt-1 block w-full rounded-2xl border-2 border-yai-ink/20 p-3 text-lg" />
        </label>
        <label className="mt-3 flex items-start gap-3 rounded-2xl bg-sky-50 p-3 text-base">
          <input type="checkbox" className="mt-1 h-6 w-6 shrink-0" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span>
            ยินยอมให้นำรีวิวนี้ไปใช้ในงานวิจัยแบบ<b>ไม่ระบุตัวตน</b> (ไม่บังคับ ยกเลิกได้ภายหลัง) ถ้าไม่ติ๊ก รีวิวจะแสดงในกลุ่มเพื่อนเท่านั้น
          </span>
        </label>
        <button type="button" onClick={submit} disabled={!herb.trim() || !rating} className="mt-3 min-h-[56px] w-full rounded-2xl bg-yai-green text-xl font-bold text-white disabled:opacity-50">
          ส่งรีวิว
        </button>
      </Card>

      <Card>
        <h2 className="text-xl font-bold">สรุปจากรีวิวในกลุ่ม</h2>
        <ul className="mt-3 space-y-2">
          {summary.map((s) => (
            <li key={s.herb} className="rounded-2xl bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-lg font-bold">{s.herb}</span>
                <span className="text-base font-semibold text-amber-700">★ {s.avgRating.toFixed(1)} · {s.count} รีวิว</span>
              </div>
              <p className="text-sm text-yai-ink/70">
                บอกต่อ {s.recommend}/{s.count} · มีอาการไม่พึงประสงค์ {Math.round(s.sideEffectShare * 100)}% · ยินยอมใช้วิจัย {s.researchConsented} รีวิว
              </p>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-sm text-yai-ink/60">จำนวนรีวิวน้อยและผู้ใช้เลือกมารีวิวเอง จึงสรุปไม่ได้ว่าสมุนไพรได้ผล ใช้เป็นสัญญาณให้นักวิจัยศึกษาต่อเท่านั้น · มีรีวิวตัวอย่าง (ข้อมูลจำลอง)</p>
      </Card>

      <Card>
        <h2 className="text-xl font-bold">รีวิวล่าสุด</h2>
        <ul className="mt-2 divide-y">
          {reviews.slice(0, 6).map((r) => (
            <li key={r.id} className="py-2">
              <p className="text-base">
                <b>{r.herbName}</b> <span className="text-amber-600">{'★'.repeat(r.rating)}</span> · {r.isSelf ? 'ยาย' : r.author}
                {r.isSynthetic && <span className="ml-1 rounded bg-slate-100 px-1 text-xs">ตัวอย่าง</span>}
              </p>
              {r.note && <p className="text-sm text-yai-ink/80">“{r.note}”</p>}
              <p className="text-xs text-yai-ink/60">
                ใช้ {r.weeksUsed} สัปดาห์ · อาการไม่พึงประสงค์: {SIDE[r.sideEffects]}
                {r.sideEffectNote ? ` (${r.sideEffectNote})` : ''}
              </p>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
};
