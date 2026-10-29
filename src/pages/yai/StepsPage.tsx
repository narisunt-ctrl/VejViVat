import React, { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3, Footprints, Smartphone, Table2, Trophy, Watch } from 'lucide-react';
import { demoNow, useYai, yaiStore } from '../../services/yai/yaiStore';
import { LxCard, LxNotice, LxPageHeader, ProgressBar, SourceTag, btnPrimary, btnSecondary } from '../../components/yai/lx/ui';
import { useLxColors } from '../../components/yai/lx/useLxColors';
import { weekdayShort } from '../../components/yai/lx/WellnessCards';
import { bangkokDate, thaiDateLabel } from '../../domain/yai/journal';
import { STEP_ENTRY_MAX, STEP_GOAL_OPTIONS, stepBoard, stepGoalOf, stepSeries, stepsOn, stepWeek, stepWords } from '../../domain/yai/steps';

// กิจกรรมก้าวเดิน: today's steps against the user's own goal, a typed entry for people without a device, the demo
// device link, a 7-day chart (goal as a dashed line, missing days empty, table view), and a weekly walking
// challenge with friends that shares only weekly totals.

const timeTh = (iso: string) => new Date(iso).toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit' });
const fmt = (n: number) => n.toLocaleString('th-TH');
const MEDALS = ['🥇', '🥈', '🥉'];

export const StepsPage: React.FC = () => {
  const state = useYai((s) => s);
  const colors = useLxColors();
  const today = bangkokDate(demoNow(state));
  const goal = stepGoalOf(state);
  const todays = stepsOn(state, today);
  const week = stepWeek(state, today);
  const series = stepSeries(state, today, 7).map((d) => ({ ...d, label: d.date === today ? 'วันนี้' : weekdayShort(d.date) }));
  const board = stepBoard(state, today);
  const link = state.settings.deviceLink ?? 'NONE';
  const [entry, setEntry] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [asTable, setAsTable] = useState(false);
  const yMax = Math.max(goal, ...series.map((d) => d.value ?? 0)) * 1.15;

  const save = () => {
    const n = Math.round(Number(entry.replace(/[,\s]/g, '')));
    if (!Number.isFinite(n) || n < 0 || n > STEP_ENTRY_MAX) {
      setMsg({ ok: false, text: `ตัวเลขดูไม่ตรง ใส่ได้ 0–${fmt(STEP_ENTRY_MAX)} ก้าว` });
      return;
    }
    yaiStore.addMeasurement({ type: 'STEPS', value: n });
    setEntry('');
    setMsg({ ok: true, text: `บันทึก ${fmt(n)} ก้าวของวันนี้แล้ว` });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <LxPageHeader back="/yai" eyebrow="Step Activity" title="กิจกรรมก้าวเดิน" subtitle="เดินสม่ำเสมอทีละน้อย ตั้งเป้าเองได้ ทำเท่าที่ไหว" />

      <div className="grid gap-4 md:grid-cols-5">
        {/* today */}
        <section aria-labelledby="today-steps" className="relative min-w-0 overflow-hidden rounded-3xl bg-gradient-to-br from-lx-forest via-lx-forest to-lx-emerald p-5 text-white md:col-span-3">
          <Footprints className="pointer-events-none absolute -bottom-6 -right-6 h-40 w-40 text-white/[0.06]" aria-hidden="true" />
          <p id="today-steps" className="text-xs font-semibold uppercase tracking-[0.14em] text-[#C3ED81]">
            วันนี้
          </p>
          {todays.value === null ? (
            <p className="mt-2 text-2xl font-semibold">ยังไม่ได้บันทึกก้าว</p>
          ) : (
            <p className="num mt-1 text-5xl font-semibold leading-none">
              {fmt(todays.value)} <span className="text-xl font-normal text-white/80">ก้าว</span>
            </p>
          )}
          <div className="mt-4 [&_[role=progressbar]]:bg-white/15">
            <ProgressBar value={todays.value ?? 0} max={goal} label={`ก้าววันนี้ ${todays.value ?? 0} จากเป้า ${goal}`} />
          </div>
          <p className="mt-2 text-sm text-white/85">
            เป้าของคุณ {fmt(goal)} ก้าว/วัน · {stepWords(todays.value, goal)}
          </p>
          {todays.value !== null && (
            <p className="mt-2 text-xs text-white/75">
              {todays.source === 'DEVICE_DEMO' ? todays.device ?? 'อุปกรณ์ (จำลอง)' : 'ใส่เอง'} · อัปเดต {todays.at ? timeTh(todays.at) : '-'} น.
            </p>
          )}
        </section>

        {/* entry */}
        <LxCard className="min-w-0 md:col-span-2" labelledBy="entry-title">
          <h2 id="entry-title" className="text-lg font-semibold">
            ใส่จำนวนก้าวเอง
          </h2>
          <p className="mt-1 text-sm text-lx-muted">อ่านจากเครื่องนับก้าวหรือแอปในมือถือ ใส่ยอดรวมของวันนี้ ใส่ใหม่ได้ ระบบใช้ค่าล่าสุด</p>
          <label htmlFor="steps-entry" className="sr-only">
            จำนวนก้าววันนี้
          </label>
          <div className="mt-3 flex gap-2">
            <input
              id="steps-entry"
              inputMode="numeric"
              value={entry}
              onChange={(e) => {
                setEntry(e.target.value);
                setMsg(null);
              }}
              placeholder="เช่น 4500"
              className="num min-h-[52px] w-full min-w-0 flex-1 rounded-2xl border border-lx-line bg-lx-surface2 px-4 text-xl text-lx-ink placeholder:text-lx-muted focus:border-lx-accent focus:outline-none focus:ring-4 focus:ring-lx-accent/25"
            />
            <button type="button" onClick={save} disabled={!entry.trim()} className={btnPrimary}>
              บันทึก
            </button>
          </div>
          {msg && (
            <p role="status" className={`mt-2 text-sm font-semibold ${msg.ok ? 'text-lx-accent' : 'text-lx-alert'}`}>
              {msg.text}
            </p>
          )}
        </LxCard>
      </div>

      {/* 7-day chart */}
      <LxCard labelledBy="week-title">
        <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 id="week-title" className="text-lg font-semibold">
              ก้าวเดิน 7 วัน
            </h2>
            <p className="text-sm text-lx-muted">
              บันทึก {week.recordedDays}/7 วัน · ถึงเป้า {week.goalDays} วัน{week.average !== null ? ` · เฉลี่ย ${fmt(week.average)} ก้าว/วัน` : ''}
            </p>
          </div>
          <button type="button" onClick={() => setAsTable((v) => !v)} className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl border border-lx-line bg-lx-surface2 px-3 text-sm font-semibold">
            {asTable ? <BarChart3 className="h-4 w-4" aria-hidden="true" /> : <Table2 className="h-4 w-4" aria-hidden="true" />}
            {asTable ? 'ดูเป็นกราฟ' : 'ดูเป็นตาราง'}
          </button>
        </div>
        {week.recordedDays === 0 ? (
          <p className="flex h-40 items-center justify-center rounded-2xl bg-lx-surface2 px-4 text-center text-base text-lx-muted">ยังไม่มีข้อมูลก้าว ใส่เองด้านบน หรือเชื่อมอุปกรณ์ด้านล่าง</p>
        ) : asTable ? (
          <div className="overflow-x-auto rounded-2xl bg-lx-surface2">
            <table className="w-full text-left text-sm">
              <thead className="text-lx-muted">
                <tr>
                  <th className="p-2 font-semibold">วันที่</th>
                  <th className="p-2 text-right font-semibold">ก้าว</th>
                  <th className="p-2 font-semibold">ที่มา</th>
                </tr>
              </thead>
              <tbody>
                {[...series].reverse().map((d) => (
                  <tr key={d.date} className="border-t border-lx-line">
                    <td className="p-2">{thaiDateLabel(d.date)}</td>
                    <td className="num p-2 text-right">{d.value === null ? <span className="text-lx-muted">ไม่ได้บันทึก</span> : fmt(d.value)}</td>
                    <td className="p-2 text-lx-muted">{d.source === 'DEVICE_DEMO' ? 'อุปกรณ์ (จำลอง)' : d.source === 'MANUAL' ? 'ใส่เอง' : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="h-52" role="img" aria-label={`ก้าวเดิน 7 วัน บันทึก ${week.recordedDays} วัน ถึงเป้า ${week.goalDays} วัน`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series} margin={{ top: 12, right: 4, left: -8, bottom: 0 }} barCategoryGap="28%">
                <CartesianGrid vertical={false} stroke={colors.line} />
                <XAxis dataKey="label" tick={{ fill: colors.muted, fontSize: 12 }} axisLine={false} tickLine={false} interval={0} />
                <YAxis domain={[0, Math.ceil(yMax / 1000) * 1000]} tick={{ fill: colors.muted, fontSize: 11 }} tickFormatter={(v: number) => (v >= 1000 ? `${v / 1000}k` : `${v}`)} axisLine={false} tickLine={false} width={40} />
                <Tooltip
                  cursor={{ fill: colors.line, opacity: 0.5 }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const p = payload[0].payload as (typeof series)[number];
                    return (
                      <div className="rounded-xl border border-lx-line bg-lx-surface px-3 py-2 text-sm text-lx-ink shadow-lg">
                        <p className="font-semibold">{thaiDateLabel(p.date)}</p>
                        <p className="num">{p.value === null ? 'ไม่ได้บันทึก' : `${fmt(p.value)} ก้าว`}</p>
                      </div>
                    );
                  }}
                />
                <ReferenceLine y={goal} stroke={colors.muted} strokeDasharray="4 4" strokeWidth={1.5} />
                <Bar dataKey="value" fill={colors.chart} radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        {week.recordedDays > 0 && !asTable && <p className="mt-1 text-xs text-lx-muted">เส้นประ = เป้าของคุณ {fmt(goal)} ก้าว/วัน · ช่องว่าง = วันที่ไม่ได้บันทึก</p>}
        <div className="mt-2 flex flex-wrap gap-1">
          {series.some((d) => d.source === 'MANUAL') && <SourceTag kind="SELF" text="ใส่เอง" />}
          {series.some((d) => d.source === 'DEVICE_DEMO') && <SourceTag kind="DEVICE" text="จากอุปกรณ์" />}
          {series.some((d) => d.synthetic) && <SourceTag kind="DEMO" />}
        </div>
      </LxCard>

      <div className="grid gap-4 md:grid-cols-2">
        {/* goal */}
        <LxCard labelledBy="goal-title">
          <h2 id="goal-title" className="text-lg font-semibold">
            เป้าก้าวต่อวัน
          </h2>
          <div className="mt-3 grid grid-cols-3 gap-2" role="group" aria-label="เลือกเป้าก้าวต่อวัน">
            {STEP_GOAL_OPTIONS.map((g) => (
              <button
                key={g}
                type="button"
                aria-pressed={goal === g}
                onClick={() => yaiStore.updateSettings({ stepGoal: g })}
                className={`num min-h-[52px] rounded-2xl border text-base font-semibold transition ${goal === g ? 'border-lx-accent bg-lx-accent text-lx-onaccent' : 'border-lx-line bg-lx-surface2 hover:border-lx-accent/60'}`}
              >
                {fmt(g)}
              </button>
            ))}
          </div>
          <p className="mt-3 text-sm text-lx-muted">
            เริ่มจากที่ทำได้จริงแล้วค่อยเพิ่ม งานวิจัยรวมหลายกลุ่มประชากรพบว่าในผู้สูงอายุ ประโยชน์ต่อสุขภาพเพิ่มขึ้นตามจำนวนก้าวและเริ่มคงที่ราว 6,000–8,000 ก้าว/วัน (Paluch และคณะ, Lancet Public Health 2022) เป็นข้อมูลทั่วไป ไม่ได้ประเมินจากตัวคุณ
          </p>
        </LxCard>

        {/* device */}
        <LxCard labelledBy="device-title">
          <h2 id="device-title" className="text-lg font-semibold">
            เชื่อมมือถือหรือนาฬิกา
          </h2>
          {link === 'NONE' ? (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => yaiStore.connectDemoDevice('PHONE_DEMO')} className={btnSecondary}>
                <Smartphone className="h-5 w-5" aria-hidden="true" /> มือถือ
              </button>
              <button type="button" onClick={() => yaiStore.connectDemoDevice('WATCH_DEMO')} className={btnSecondary}>
                <Watch className="h-5 w-5" aria-hidden="true" /> นาฬิกา
              </button>
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              <p className="text-base">
                เชื่อมแล้ว: <b>{link === 'WATCH_DEMO' ? 'สมาร์ทวอทช์ (จำลอง)' : 'โทรศัพท์ (จำลอง)'}</b>
              </p>
              <button type="button" onClick={() => yaiStore.disconnectDevice()} className={btnSecondary}>
                ยกเลิกการเชื่อม
              </button>
            </div>
          )}
          <p className="mt-3 text-xs text-lx-muted">ต้นแบบบนเว็บใช้ข้อมูลจำลอง 7 วัน ของจริงต้องใช้แอปมือถือที่เชื่อม Health Connect (Android) หรือ Apple Health และผู้ใช้กดอนุญาตเอง</p>
        </LxCard>
      </div>

      {/* walking challenge */}
      <LxCard labelledBy="challenge-title">
        <h2 id="challenge-title" className="flex items-center gap-2 text-lg font-semibold">
          <Trophy className="h-5 w-5 text-lx-accent" aria-hidden="true" /> ชวนเพื่อนเดินสัปดาห์นี้
        </h2>
        <p className="mt-1 text-sm text-lx-muted">รวมก้าว 7 วันล่าสุด เพื่อนเห็นแค่ชื่อและยอดรวมก้าว ไม่เห็นข้อมูลสุขภาพอื่น</p>
        <ol className="mt-3 space-y-2">
          {board.map((r, i) => (
            <li key={r.id} className={`flex items-center gap-3 rounded-2xl p-3 ${r.isMe ? 'border border-lx-accent bg-lx-accent/10' : 'bg-lx-surface2'}`}>
              <span className="w-8 text-center text-xl" aria-label={`อันดับ ${i + 1}`}>
                {MEDALS[i] ?? <span className="text-base font-semibold text-lx-muted">{i + 1}</span>}
              </span>
              <span className="text-xl" aria-hidden="true">
                {r.avatar}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block break-words font-semibold leading-snug">{r.isMe ? `${r.name.replace(/\s*\(.*\)\s*$/, '')} (คุณ)` : r.name}</span>
                {r.isSynthetic && <span className="text-xs text-lx-muted">เพื่อนตัวอย่าง</span>}
              </span>
              <span className="num shrink-0 text-lg font-semibold">{fmt(r.steps)}</span>
            </li>
          ))}
        </ol>
        <label className="mt-3 flex min-h-[48px] items-center justify-between gap-3 rounded-2xl bg-lx-surface2 px-3 text-sm">
          ให้เพื่อนเห็นยอดก้าวและแต้มรายสัปดาห์
          <input type="checkbox" className="h-6 w-6 accent-[rgb(var(--lx-accent))]" checked={state.settings.shareScore ?? true} onChange={(e) => yaiStore.updateSettings({ shareScore: e.target.checked })} />
        </label>
        <p className="mt-2 text-xs text-lx-muted">ทุก 1,000 ก้าวได้ 1 แต้ม นับถึง 6,000 ก้าวต่อวัน เดินมากกว่านี้ไม่ได้แต้มเพิ่ม เพื่อไม่ให้ต้องฝืน</p>
      </LxCard>

      <LxNotice tone="warn" title="เดินอย่างปลอดภัย">
        เดินช้าๆ ในจังหวะที่ยังพูดคุยได้ ใส่รองเท้าที่ไม่ลื่น หยุดทันทีถ้าเจ็บหน้าอก เวียนหัว หรือหายใจไม่ทัน ถ้ามีโรคหัวใจ ข้อเข่า หรือเพิ่งผ่าตัด ถามแพทย์ก่อนเพิ่มจำนวนก้าว
      </LxNotice>
    </div>
  );
};
