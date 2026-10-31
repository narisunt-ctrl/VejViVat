import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { History, Table2, BarChart3, HeartPulse } from 'lucide-react';
import { demoNow, useYai } from '../../services/yai/yaiStore';
import { LxCard, LxLinkRow, LxNotice, LxPageHeader, SourceTag } from '../../components/yai/lx/ui';
import { FeelingsVoiceCard } from '../../components/yai/lx/FeelingsVoiceCard';
import { useLxColors } from '../../components/yai/lx/useLxColors';
import { weekdayShort } from '../../components/yai/lx/WellnessCards';
import { bangkokDate, thaiDateLabel } from '../../domain/yai/journal';
import { baseline, BASELINE_MIN_DAYS, METRICS, MetricId, OBSERVATION_MIN_PER_GROUP, series, sleepEnergyObservation } from '../../domain/yai/wellness';

// Health Insights: one small chart per measure (single series → no legend; the title names it), bars anchored to
// zero with rounded data ends, missing days left empty, dashed personal-baseline line only when enough days exist,
// hover tooltip, and a table view for every chart. Colour = one validated hue per theme.

const ORDER: MetricId[] = ['sleep', 'energy', 'mood', 'activity', 'symptoms'];
const TICK_STEP: Record<MetricId, number> = { sleep: 2, energy: 1, mood: 1, activity: 15, symptoms: 1 };
const ticksFor = (m: MetricId) => Array.from({ length: METRICS[m].max / TICK_STEP[m] + 1 }, (_, i) => i * TICK_STEP[m]);

const MetricChart: React.FC<{ metric: MetricId; days: 7 | 30; asTable: boolean }> = ({ metric, days, asTable }) => {
  const state = useYai((s) => s);
  const colors = useLxColors();
  const today = bangkokDate(demoNow(state));
  const def = METRICS[metric];
  const data = series(state, metric, today, days).map((d) => ({ ...d, label: days === 7 ? weekdayShort(d.date) : String(Number(d.date.slice(8))) }));
  const recorded = data.filter((d) => d.value !== null);
  const base = baseline(state, metric, today);
  const synthetic = recorded.some((d) => d.synthetic);
  const avg = recorded.length ? Math.round((recorded.reduce((t, d) => t + (d.value ?? 0), 0) / recorded.length) * 10) / 10 : null;

  return (
    <LxCard as="article" labelledBy={`chart-${metric}`}>
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id={`chart-${metric}`} className="text-lg font-semibold">
            {def.label} <span className="text-sm font-normal text-lx-muted">({def.unit})</span>
          </h2>
          <p className="text-sm text-lx-muted">
            บันทึก {recorded.length}/{days} วัน{avg !== null ? ` · เฉลี่ย ${avg}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          <SourceTag kind="SELF" text={metric === 'symptoms' ? 'จากบันทึกที่ยืนยันแล้ว' : 'Self-Reported'} />
          {synthetic && <SourceTag kind="DEMO" />}
        </div>
      </div>

      {recorded.length === 0 ? (
        <p className="flex h-40 items-center justify-center rounded-2xl bg-lx-surface2 text-base text-lx-muted">ยังไม่มีข้อมูลในช่วงนี้</p>
      ) : asTable ? (
        <div className="max-h-64 overflow-auto rounded-2xl bg-lx-surface2">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-lx-surface2 text-lx-muted">
              <tr>
                <th className="p-2 font-semibold">วันที่</th>
                <th className="p-2 text-right font-semibold">{def.label}</th>
              </tr>
            </thead>
            <tbody>
              {[...data].reverse().map((d) => (
                <tr key={d.date} className="border-t border-lx-line">
                  <td className="p-2">{thaiDateLabel(d.date)}</td>
                  <td className="num p-2 text-right">{d.value === null ? <span className="text-lx-muted">ไม่ได้บันทึก</span> : `${d.value} ${def.unit}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="h-44" role="img" aria-label={`${def.label} ${days} วัน บันทึก ${recorded.length} วัน${avg !== null ? ` เฉลี่ย ${avg} ${def.unit}` : ''}`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 4, left: -24, bottom: 0 }} barCategoryGap={days === 7 ? '30%' : '18%'}>
              <CartesianGrid vertical={false} stroke={colors.line} strokeDasharray="0" />
              <XAxis dataKey="label" tick={{ fill: colors.muted, fontSize: 11 }} axisLine={false} tickLine={false} interval={days === 7 ? 0 : 4} />
              <YAxis domain={[0, def.max]} ticks={ticksFor(metric)} tick={{ fill: colors.muted, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} width={44} />
              <Tooltip
                cursor={{ fill: colors.line, opacity: 0.5 }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0].payload as (typeof data)[number];
                  return (
                    <div className="rounded-xl border border-lx-line bg-lx-surface px-3 py-2 text-sm text-lx-ink shadow-lg">
                      <p className="font-semibold">{thaiDateLabel(p.date)}</p>
                      <p className="num">{p.value === null ? 'ไม่ได้บันทึก' : `${def.label}: ${p.value} ${def.unit}`}</p>
                    </div>
                  );
                }}
              />
              {base.value !== null && <ReferenceLine y={base.value} stroke={colors.muted} strokeDasharray="4 4" strokeWidth={1.5} />}
              <Bar dataKey="value" fill={colors.chart} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <p className="mt-2 text-sm text-lx-muted">
        {base.value !== null ? (
          <>
            ค่าปกติส่วนตัว (เส้นประ) <b className="num text-lx-ink">{base.value}</b> จาก {base.days} วันก่อนหน้า
            {base.recent !== null && (
              <>
                {' '}
                · 7 วันล่าสุด <b className="num text-lx-ink">{base.recent}</b>
              </>
            )}
          </>
        ) : (
          `ค่าปกติส่วนตัวจะแสดงเมื่อมีบันทึกอย่างน้อย ${BASELINE_MIN_DAYS} วันใน 4 สัปดาห์ก่อนหน้า (ตอนนี้ ${base.days} วัน)`
        )}
      </p>
    </LxCard>
  );
};

export const InsightsPage: React.FC = () => {
  const state = useYai((s) => s);
  const [params] = useSearchParams();
  const [days, setDays] = useState<7 | 30>(30);
  const [asTable, setAsTable] = useState(false);
  const focus = params.get('metric') as MetricId | null;
  const order = focus && ORDER.includes(focus) ? [focus, ...ORDER.filter((m) => m !== focus)] : ORDER;
  const obs = sleepEnergyObservation(state, bangkokDate(demoNow(state)));

  return (
    <div className="space-y-4">
      <LxPageHeader eyebrow="Health Insights" title="แนวโน้มสุขภาพของคุณ" subtitle="ดูย้อนหลังจากสิ่งที่คุณบันทึก เทียบกับค่าปกติของตัวเอง" />

      {/* filters in one row above the charts */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-2xl border border-lx-line bg-lx-surface p-1" role="group" aria-label="ช่วงเวลา">
          {([7, 30] as const).map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={days === d}
              onClick={() => setDays(d)}
              className={`min-h-[44px] rounded-xl px-4 text-base font-semibold ${days === d ? 'bg-lx-accent text-lx-onaccent' : 'text-lx-muted hover:text-lx-ink'}`}
            >
              {d} วัน
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setAsTable((v) => !v)} className="inline-flex min-h-[48px] items-center gap-2 rounded-2xl border border-lx-line bg-lx-surface px-4 text-base font-semibold">
          {asTable ? <BarChart3 className="h-5 w-5" aria-hidden="true" /> : <Table2 className="h-5 w-5" aria-hidden="true" />}
          {asTable ? 'ดูเป็นกราฟ' : 'ดูเป็นตาราง'}
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {order.map((m) => (
          <MetricChart key={m} metric={m} days={days} asTable={asTable} />
        ))}

        <FeelingsVoiceCard days={days} />

        <LxCard as="article" labelledBy="obs-title">
          <h2 id="obs-title" className="text-lg font-semibold">
            ข้อสังเกตจากบันทึก
          </h2>
          {obs ? (
            <>
              <p className="mt-2 text-base">{obs.text}</p>
              <dl className="mt-3 grid grid-cols-2 gap-2">
                {[obs.groupA, obs.groupB].map((g) => (
                  <div key={g.label} className="rounded-2xl bg-lx-surface2 p-3">
                    <dt className="text-sm text-lx-muted">{g.label}</dt>
                    <dd className="num text-2xl font-semibold">{g.mean}</dd>
                    <dd className="text-xs text-lx-muted">ความสดชื่นเฉลี่ย · {g.n} วัน</dd>
                  </div>
                ))}
              </dl>
            </>
          ) : (
            <p className="mt-2 text-base text-lx-muted">ต้องมีวันที่บันทึกทั้งการนอนและความสดชื่นอย่างน้อยกลุ่มละ {OBSERVATION_MIN_PER_GROUP} วันใน 30 วัน จึงจะแสดงข้อสังเกต</p>
          )}
          <p className="mt-3 text-xs text-lx-muted">เป็นความสัมพันธ์เชิงสังเกตจากข้อมูลที่คุณบอกเอง ไม่ได้แปลว่าสิ่งหนึ่งเป็นสาเหตุของอีกสิ่ง และไม่ใช่คำแนะนำทางการแพทย์</p>
        </LxCard>
      </div>

      <LxNotice title="ไม่มีคะแนนสุขภาพรวมหรืออายุชีวภาพ">
        แอปไม่สร้าง Recovery Score, Biological Age หรือ Pace of Aging เพราะยังไม่มีสูตรที่ตรวจสอบและรับรองสำหรับข้อมูลแบบนี้ เราแสดงเฉพาะสิ่งที่คุณบันทึกจริง
      </LxNotice>

      <div className="grid gap-2 md:grid-cols-2">
        <LxLinkRow to="/yai/journal/history" icon={History} title="ประวัติสมุดสุขภาพ" sub="ปฏิทินและบันทึกเสียง/ข้อความทั้งหมด" />
        <LxLinkRow to="/yai/health" icon={HeartPulse} title="ค่าที่วัดและก้าวเดิน" sub="น้ำหนัก ความดัน น้ำตาล อุปกรณ์ที่เชื่อม" />
      </div>
    </div>
  );
};
