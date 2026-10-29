import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Footprints, NotebookPen, Smartphone, Watch } from 'lucide-react';
import { demoNow, useYai, yaiStore } from '../../services/yai/yaiStore';
import { Card, Notice, PageTitle } from '../../components/yai/ui';
import { HealthSummaryCard, StreakCard } from '../../components/yai/HomeCards';
import { DailyHeatmap } from '../../components/yai/DailyHeatmap';
import { bangkokDate, thaiDateLabel } from '../../domain/yai/journal';
import type { Measurement } from '../../domain/yai/models';

// Measurements are shown exactly as recorded; the app gives no "normal/abnormal" verdict.
// Plausibility bounds only catch typing slips (e.g. 640 kg), they are not clinical thresholds.
const BOUNDS: Record<'WEIGHT' | 'GLUCOSE' | 'BP', { min: number; max: number; min2?: number; max2?: number }> = {
  WEIGHT: { min: 20, max: 250 },
  GLUCOSE: { min: 20, max: 600 },
  BP: { min: 60, max: 260, min2: 30, max2: 160 },
};

const TYPE_LABEL: Record<Measurement['type'], string> = { WEIGHT: 'น้ำหนัก', GLUCOSE: 'น้ำตาล', BP: 'ความดัน', STEPS: 'ก้าวเดิน' };
const UNIT: Record<Measurement['type'], string> = { WEIGHT: 'กก.', GLUCOSE: 'มก./ดล.', BP: 'มม.ปรอท', STEPS: 'ก้าว' };

export const HealthRecordPage: React.FC = () => {
  const state = useYai((s) => s);
  const navigate = useNavigate();
  const today = bangkokDate(demoNow(state));
  const [type, setType] = useState<'WEIGHT' | 'GLUCOSE' | 'BP'>('WEIGHT');
  const [v1, setV1] = useState('');
  const [v2, setV2] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const link = state.settings.deviceLink ?? 'NONE';
  const ms = [...(state.measurements ?? [])].sort((a, b) => b.at.localeCompare(a.at));
  const steps = ms.filter((m) => m.type === 'STEPS').slice(0, 7).reverse();

  const save = () => {
    const a = Number(v1);
    const b = Number(v2);
    const lim = BOUNDS[type];
    if (!Number.isFinite(a) || a < lim.min || a > lim.max || (type === 'BP' && (!Number.isFinite(b) || b < lim.min2! || b > lim.max2!))) {
      setMsg({ ok: false, text: 'ตัวเลขดูไม่ตรง ลองตรวจอีกครั้งนะคะ' });
      return;
    }
    yaiStore.addMeasurement({ type, value: a, value2: type === 'BP' ? b : undefined });
    setV1('');
    setV2('');
    setMsg({ ok: true, text: 'บันทึกแล้วค่ะ (+3 แต้ม วันละครั้ง)' });
  };

  return (
    <div className="space-y-5">
      <PageTitle title="บันทึกสุขภาพ" subtitle="จดตัวเลขที่วัดเอง หรือเชื่อมก้าวเดินจากมือถือ/นาฬิกา" />
      <HealthSummaryCard />

      <Card>
        <h2 className="text-xl font-bold">จดค่าที่วัดวันนี้</h2>
        <div className="mt-3 grid grid-cols-3 gap-2" role="radiogroup" aria-label="ชนิดค่าที่วัด">
          {(['WEIGHT', 'GLUCOSE', 'BP'] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={type === t}
              onClick={() => {
                setType(t);
                setMsg(null);
              }}
              className={`min-h-[52px] rounded-2xl border-2 text-lg font-bold ${type === t ? 'border-yai-green bg-yai-green text-white' : 'border-yai-green/30 bg-white'}`}
            >
              {TYPE_LABEL[t]}
            </button>
          ))}
        </div>
        <div className="mt-3 flex items-end gap-2">
          <label className="flex-1 text-base font-semibold">
            {type === 'BP' ? 'ตัวบน' : TYPE_LABEL[type]} ({UNIT[type]})
            <input inputMode="decimal" value={v1} onChange={(e) => setV1(e.target.value)} className="mt-1 block min-h-[52px] w-full rounded-2xl border-2 border-yai-ink/20 px-3 text-2xl" />
          </label>
          {type === 'BP' && (
            <label className="flex-1 text-base font-semibold">
              ตัวล่าง
              <input inputMode="numeric" value={v2} onChange={(e) => setV2(e.target.value)} className="mt-1 block min-h-[52px] w-full rounded-2xl border-2 border-yai-ink/20 px-3 text-2xl" />
            </label>
          )}
        </div>
        <button type="button" onClick={save} className="mt-3 min-h-[56px] w-full rounded-2xl bg-yai-green text-xl font-bold text-white">
          บันทึก
        </button>
        {msg && <p className={`mt-2 text-base font-semibold ${msg.ok ? 'text-emerald-700' : 'text-yai-alert'}`}>{msg.text}</p>}
        <p className="mt-2 text-sm text-yai-ink/60">แอปไม่ได้แปลผลว่าปกติหรือผิดปกติ ถ้ากังวลให้ถามคุณหมอหรือ อสม.</p>
      </Card>

      <Card>
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <Footprints className="h-6 w-6 text-sky-600" aria-hidden="true" /> เชื่อมนับก้าว
        </h2>
        {link === 'NONE' ? (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => yaiStore.connectDemoDevice('PHONE_DEMO')} className="flex min-h-[64px] items-center justify-center gap-2 rounded-2xl border-2 border-sky-200 bg-sky-50 text-lg font-bold">
              <Smartphone className="h-6 w-6" aria-hidden="true" /> มือถือ
            </button>
            <button type="button" onClick={() => yaiStore.connectDemoDevice('WATCH_DEMO')} className="flex min-h-[64px] items-center justify-center gap-2 rounded-2xl border-2 border-sky-200 bg-sky-50 text-lg font-bold">
              <Watch className="h-6 w-6" aria-hidden="true" /> สมาร์ทวอทช์
            </button>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            <p className="text-base">
              เชื่อมแล้ว: <b>{link === 'WATCH_DEMO' ? 'สมาร์ทวอทช์ (จำลอง)' : 'โทรศัพท์ (จำลอง)'}</b>
            </p>
            <ol className="flex items-end justify-between gap-1" aria-label="ก้าวเดิน 7 วันล่าสุด">
              {steps.map((m) => (
                <li key={m.id} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-xs font-semibold">{(m.value / 1000).toFixed(1)}k</span>
                  <span className="w-full rounded-t-lg bg-sky-500" style={{ height: `${Math.max(8, Math.min(m.value, 8000) / 80)}px` }} aria-hidden="true" />
                  <span className="text-[11px] text-yai-ink/60">{thaiDateLabel(m.date).split(' ').slice(0, 2).join(' ')}</span>
                </li>
              ))}
            </ol>
            <p className="text-sm text-yai-ink/70">ได้ 1 แต้มต่อ 1,000 ก้าว นับถึง 6,000 ก้าวต่อวัน เดินเท่าที่ไหว ไม่ต้องฝืนนะคะ</p>
            <button type="button" onClick={() => yaiStore.disconnectDevice()} className="min-h-[48px] rounded-2xl border-2 border-yai-ink/20 px-4 text-base font-semibold">
              ยกเลิกการเชื่อม
            </button>
          </div>
        )}
        <Notice title="ต้นแบบบนเว็บ ใช้ข้อมูลจำลอง">
          การอ่านก้าวเดินจริงต้องใช้แอปมือถือที่เชื่อม Health Connect (Android), Apple Health (iPhone) หรือแอปของนาฬิกา และยายต้องกดอนุญาตเองทุกครั้ง
        </Notice>
      </Card>

      <Card>
        <h2 className="text-xl font-bold">ค่าที่บันทึกล่าสุด</h2>
        {ms.filter((m) => m.type !== 'STEPS').length === 0 ? (
          <p className="mt-2 text-base text-yai-ink/60">ยังไม่มีข้อมูล</p>
        ) : (
          <ul className="mt-2 divide-y">
            {ms
              .filter((m) => m.type !== 'STEPS')
              .slice(0, 8)
              .map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-2 py-2 text-base">
                  <span>
                    {TYPE_LABEL[m.type]} <span className="text-sm text-yai-ink/60">· {thaiDateLabel(m.date)}</span>
                  </span>
                  <span className="font-bold">
                    {m.type === 'BP' ? `${m.value}/${m.value2}` : m.value} {UNIT[m.type]}
                    {m.isSynthetic && <span className="ml-1 rounded bg-slate-100 px-1 text-xs font-normal">ตัวอย่าง</span>}
                  </span>
                </li>
              ))}
          </ul>
        )}
      </Card>

      <StreakCard />
      <Card>
        <DailyHeatmap entries={state.journal ?? []} today={today} onSelect={(d) => navigate(`/yai/journal/history?date=${d}`)} />
        <Link to="/yai/journal/history" className="mt-3 flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-yai-mint text-lg font-bold text-yai-greendeep">
          <NotebookPen className="h-5 w-5" aria-hidden="true" /> สมุดบันทึกอาการทั้งหมด
        </Link>
      </Card>
    </div>
  );
};
