import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Keyboard, Camera, History } from 'lucide-react';
import { demoNow, useYai, yaiStore } from '../../services/yai/yaiStore';
import { VoiceEntryButton } from '../../components/yai/VoiceEntryButton';
import { LxCard, LxPageHeader, SourceTag, btnPrimary, btnSecondary } from '../../components/yai/lx/ui';
import { bangkokDate } from '../../domain/yai/journal';
import { checkinOn, METRICS } from '../../domain/yai/wellness';
import { journalDraft } from '../../services/yai/journalDraft';
import type { FeelingTag, WellnessCheckin } from '../../domain/yai/models';
import { FeelingPicker } from '../../components/yai/FeelingPicker';

// Daily Wellness Check-in. Two paths, both reviewed by the user before saving:
// 1. tap: sleep / energy / mood / activity (every field optional, nothing pre-filled);
// 2. voice or text: goes to the existing journal flow, where the rule-based classifier suggests categories
//    (sleep, food, mood, activity, symptom, medicine use) and the user confirms or edits — no dropdowns.

type Five = 1 | 2 | 3 | 4 | 5;
const SLEEP_OPTIONS = [4, 5, 6, 7, 8, 9];
const ACTIVITY_OPTIONS = [0, 10, 20, 30, 45, 60];

const Scale: React.FC<{ label: string; value?: Five; onChange: (v: Five | undefined) => void; words: (v: number) => string }> = ({ label, value, onChange, words }) => (
  <fieldset>
    <legend className="mb-2 text-base font-semibold">{label}</legend>
    <div className="grid grid-cols-5 gap-2">
      {([1, 2, 3, 4, 5] as const).map((n) => (
        <button
          key={n}
          type="button"
          aria-pressed={value === n}
          onClick={() => onChange(value === n ? undefined : n)}
          className={`flex min-h-[64px] flex-col items-center justify-center rounded-2xl border text-lg font-semibold transition ${
            value === n ? 'border-lx-accent bg-lx-accent text-lx-onaccent' : 'border-lx-line bg-lx-surface2 hover:border-lx-accent/60'
          }`}
        >
          <span className="num">{n}</span>
          <span className="px-1 text-[11px] font-normal leading-tight">{words(n)}</span>
        </button>
      ))}
    </div>
  </fieldset>
);

const Chips: React.FC<{ label: string; options: number[]; unit: string; value?: number; onChange: (v: number | undefined) => void; format?: (v: number) => string }> = ({
  label,
  options,
  unit,
  value,
  onChange,
  format = (v) => `${v}`,
}) => (
  <fieldset>
    <legend className="mb-2 text-base font-semibold">
      {label} <span className="text-sm font-normal text-lx-muted">({unit})</span>
    </legend>
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          aria-pressed={value === o}
          onClick={() => onChange(value === o ? undefined : o)}
          className={`num min-h-[52px] rounded-2xl border text-lg font-semibold transition ${value === o ? 'border-lx-accent bg-lx-accent text-lx-onaccent' : 'border-lx-line bg-lx-surface2 hover:border-lx-accent/60'}`}
        >
          {format(o)}
        </button>
      ))}
    </div>
  </fieldset>
);

export const CheckinPage: React.FC = () => {
  const state = useYai((s) => s);
  const navigate = useNavigate();
  const today = bangkokDate(demoNow(state));
  const existing = checkinOn(state, today);
  const [sleepHours, setSleep] = useState<number | undefined>(existing?.sleepHours);
  const [sleepQuality, setSleepQuality] = useState<Five | undefined>(existing?.sleepQuality);
  const [energy, setEnergy] = useState<Five | undefined>(existing?.energy);
  const [mood, setMood] = useState<Five | undefined>(existing?.mood);
  const [activityMinutes, setActivity] = useState<number | undefined>(existing?.activityMinutes);
  const [feelings, setFeelings] = useState<FeelingTag[]>(existing?.feelings ?? []);
  const [saved, setSaved] = useState(false);
  const nothing = [sleepHours, sleepQuality, energy, mood, activityMinutes].every((v) => v === undefined) && feelings.length === 0;

  const save = () => {
    const fields: Omit<WellnessCheckin, 'id' | 'date' | 'at' | 'source' | 'isSynthetic'> = { sleepHours, sleepQuality, energy, mood, activityMinutes, feelings: feelings.length ? feelings : undefined };
    yaiStore.saveCheckin(fields);
    setSaved(true);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <LxPageHeader back="/yai" eyebrow="Daily Wellness Check-in" title="เช็กอินวันนี้" subtitle="แตะเฉพาะข้อที่อยากบันทึก ข้ามได้ทุกข้อ" right={existing ? <SourceTag kind="SELF" text="บันทึกแล้ววันนี้ แก้ไขได้" /> : undefined} />

      <LxCard>
        <h2 className="mb-1 text-lg font-semibold">พูดหรือพิมพ์เล่า</h2>
        <p className="mb-3 text-sm text-lx-muted">ระบบช่วยแยกการนอน อาหาร อารมณ์ กิจกรรม อาการ และการใช้ยา แล้วให้คุณตรวจทุกครั้งก่อนบันทึกลงสมุดสุขภาพ</p>
        <VoiceEntryButton
          label="กดพูด บันทึกสุขภาพ"
          onTranscript={(text, voice) => {
            journalDraft.set({ originalText: text, inputSource: 'VOICE_TRANSCRIPT', capturedAt: demoNow().toISOString(), photoIds: [], photoTags: {}, voice });
            navigate('/yai/journal/process?mode=voice');
          }}
          onFallback={(problem) => {
            journalDraft.set({ originalText: '', inputSource: 'MANUAL_TEXT', capturedAt: demoNow().toISOString(), photoIds: [], photoTags: {}, voiceProblem: problem });
            navigate('/yai/journal/process?mode=text');
          }}
        />
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Link to="/yai/journal/process?mode=text" className={btnSecondary}>
            <Keyboard className="h-5 w-5" aria-hidden="true" /> พิมพ์
          </Link>
          <Link to="/yai/journal/process?mode=photo" className={btnSecondary}>
            <Camera className="h-5 w-5" aria-hidden="true" /> ถ่ายรูป
          </Link>
        </div>
      </LxCard>

      <LxCard className="space-y-6">
        <h2 className="text-lg font-semibold">แตะบันทึกสั้นๆ</h2>
        <Chips label="เมื่อคืนนอนประมาณ" unit="ชั่วโมง" options={SLEEP_OPTIONS} value={sleepHours} onChange={setSleep} format={(v) => (v === 9 ? '9+' : `${v}`)} />
        <Scale label="ตื่นมารู้สึกได้พักแค่ไหน" value={sleepQuality} onChange={setSleepQuality} words={(n) => ['', 'ไม่ได้พัก', 'น้อย', 'พอใช้', 'ดี', 'ดีมาก'][n]} />
        <Scale label="ความสดชื่น/พลังงานวันนี้" value={energy} onChange={setEnergy} words={METRICS.energy.describe} />
        <Scale label="อารมณ์วันนี้" value={mood} onChange={setMood} words={METRICS.mood.describe} />
        <FeelingPicker value={feelings} onChange={setFeelings} />
        <Chips label="ขยับร่างกายวันนี้" unit="นาที" options={ACTIVITY_OPTIONS} value={activityMinutes} onChange={setActivity} format={(v) => (v === 60 ? '60+' : `${v}`)} />

        {saved ? (
          <div className="space-y-3 rounded-2xl bg-lx-accent/15 p-4" role="status">
            <p className="text-lg font-semibold">บันทึกแล้ว</p>
            <p className="text-sm text-lx-muted">เป็นข้อมูลที่คุณรายงานเอง (Self-Reported) ใช้ดูแนวโน้มของตัวเอง ไม่ได้บอกว่าสุขภาพดีหรือไม่ดี</p>
            <div className="grid grid-cols-2 gap-2">
              <Link to="/yai" className={btnPrimary}>
                กลับหน้าหลัก
              </Link>
              <Link to="/yai/insights" className={btnSecondary}>
                ดูแนวโน้ม
              </Link>
            </div>
          </div>
        ) : (
          <button type="button" onClick={save} disabled={nothing} className={`${btnPrimary} w-full`}>
            {existing ? 'บันทึกการแก้ไข' : 'บันทึกเช็กอิน'}
          </button>
        )}
      </LxCard>

      <Link to="/yai/journal/history" className="flex min-h-[52px] items-center justify-center gap-2 text-base font-semibold text-lx-link">
        <History className="h-5 w-5" aria-hidden="true" /> ประวัติสมุดสุขภาพ
      </Link>
    </div>
  );
};
