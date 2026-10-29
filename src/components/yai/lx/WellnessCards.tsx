import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, BatteryMedium, BookOpenCheck, ClipboardList, Footprints, Moon, RefreshCw, Search, ShieldCheck, Smile, Stethoscope, Sun } from 'lucide-react';
import { demoNow, useYai, yaiStore } from '../../../services/yai/yaiStore';
import { bangkokDate } from '../../../domain/yai/journal';
import { checkinOn, goalProgress, METRICS, MetricId, progressWords, series } from '../../../domain/yai/wellness';
import { greetingFor } from '../../../domain/yai/dailyGreeting';
import { herbOfTheDay } from '../../../domain/yai/herbDiscovery';
import { stepGoalOf, stepsOn, stepWeek, stepWords } from '../../../domain/yai/steps';
import { LxCard, LxSectionHeader, ProgressBar, SourceTag } from './ui';

const timeTh = (iso: string) => new Date(iso).toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit' });
const WEEKDAY = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
export const weekdayShort = (d: string) => WEEKDAY[new Date(`${d}T12:00:00+07:00`).getUTCDay()];

const TILE_ICON: Record<'sleep' | 'energy' | 'mood' | 'activity', React.ComponentType<{ className?: string }>> = {
  sleep: Moon,
  energy: BatteryMedium,
  mood: Smile,
  activity: Activity,
};

/** Today's four self-reported (or device) values. Empty → "ยังไม่ได้บันทึก", never a made-up value. */
export const WellnessOverview: React.FC = () => {
  const state = useYai((s) => s);
  const today = bangkokDate(demoNow(state));
  const c = checkinOn(state, today);
  const steps = (state.measurements ?? []).filter((m) => m.type === 'STEPS' && m.date === today).sort((a, b) => b.at.localeCompare(a.at))[0];

  const tiles: { id: 'sleep' | 'energy' | 'mood' | 'activity'; value?: string; detail?: string; tag?: React.ReactNode }[] = [
    { id: 'sleep', value: c?.sleepHours !== undefined ? `${c.sleepHours}` : undefined, detail: c?.sleepHours !== undefined ? 'ชั่วโมงเมื่อคืน' : undefined },
    { id: 'energy', value: c?.energy !== undefined ? `${c.energy}/5` : undefined, detail: c?.energy !== undefined ? METRICS.energy.describe(c.energy) : undefined },
    { id: 'mood', value: c?.mood !== undefined ? `${c.mood}/5` : undefined, detail: c?.mood !== undefined ? METRICS.mood.describe(c.mood) : undefined },
    c?.activityMinutes !== undefined
      ? { id: 'activity', value: `${c.activityMinutes}`, detail: 'นาทีที่ขยับร่างกาย' }
      : steps
        ? {
            id: 'activity',
            value: steps.value.toLocaleString('th-TH'),
            detail: 'ก้าว',
            tag: <SourceTag kind="DEVICE" text={`${steps.device ?? 'อุปกรณ์'} · ${timeTh(steps.at)}`} />,
          }
        : { id: 'activity' },
  ];

  return (
    <LxCard labelledBy="overview-title">
      <LxSectionHeader id="overview-title" eyebrow="Daily Wellness" title="ภาพรวมวันนี้" action={{ to: '/yai/insights', label: 'แนวโน้ม' }} />
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-2 2xl:grid-cols-4">
        {tiles.map((t) => {
          const Icon = TILE_ICON[t.id];
          return (
            <li key={t.id} className="flex min-h-[132px] flex-col rounded-2xl bg-lx-surface2 p-3">
              <span className="flex items-center gap-2 text-sm font-semibold text-lx-muted">
                <Icon className="h-4 w-4 text-lx-accent" aria-hidden="true" />
                {METRICS[t.id].label}
              </span>
              {t.value ? (
                <>
                  <span className="num mt-2 text-3xl font-semibold leading-none">{t.value}</span>
                  <span className="mt-1 text-sm text-lx-muted">{t.detail}</span>
                  <span className="mt-auto pt-2">{t.tag ?? <SourceTag kind={c?.isSynthetic ? 'DEMO' : 'SELF'} />}</span>
                </>
              ) : (
                <>
                  <span className="mt-3 text-base font-semibold text-lx-muted">ยังไม่ได้บันทึก</span>
                  <Link to="/yai/checkin" className="mt-auto inline-flex min-h-[40px] items-center text-sm font-semibold text-lx-link">
                    บันทึกตอนนี้
                  </Link>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </LxCard>
  );
};

/** 7-day mini bars; missing days are drawn as an empty slot, not as zero */
export const MiniTrend: React.FC<{ metric: MetricId }> = ({ metric }) => {
  const state = useYai((s) => s);
  const today = bangkokDate(demoNow(state));
  const data = series(state, metric, today, 7);
  const def = METRICS[metric];
  const recorded = data.filter((d) => d.value !== null);
  const synthetic = recorded.some((d) => d.synthetic);
  const H = 56;
  return (
    <Link to={`/yai/insights?metric=${metric}`} className="block rounded-2xl bg-lx-surface2 p-3 transition hover:ring-2 hover:ring-lx-accent/40">
      <span className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold">{def.label}</span>
        <span className="text-xs text-lx-muted">
          {recorded.length}/7 วัน
        </span>
      </span>
      {recorded.length === 0 ? (
        <span className="flex h-[76px] items-center text-sm text-lx-muted">ยังไม่มีข้อมูล 7 วันนี้</span>
      ) : (
        <svg viewBox={`0 0 ${7 * 20} ${H + 14}`} className="mt-1 h-[76px] w-full" role="img" aria-label={`${def.label} 7 วัน: ${data.map((d) => (d.value === null ? 'ไม่ได้บันทึก' : `${d.value}`)).join(', ')}`}>
          {data.map((d, i) => {
            const h = d.value === null ? 0 : Math.max(4, (Math.min(d.value, def.max) / def.max) * H);
            return (
              <g key={d.date}>
                <title>{`${weekdayShort(d.date)} ${d.date.slice(8)}: ${d.value === null ? 'ไม่ได้บันทึก' : `${d.value} ${def.unit}`}`}</title>
                {d.value === null ? (
                  <rect x={i * 20 + 4} y={H - 4} width={12} height={4} rx={2} className="fill-lx-line" />
                ) : (
                  <path d={`M${i * 20 + 4},${H} v${-(h - 4)} q0,-4 4,-4 h4 q4,0 4,4 v${h - 4} z`} className="fill-lx-chart" />
                )}
                <text x={i * 20 + 10} y={H + 12} textAnchor="middle" className="fill-lx-muted" fontSize="9">
                  {weekdayShort(d.date)}
                </text>
              </g>
            );
          })}
        </svg>
      )}
      <span className="mt-1 flex flex-wrap gap-1">
        {metric === 'symptoms' ? <SourceTag kind="SELF" text="จากบันทึกที่ยืนยันแล้ว" /> : <SourceTag kind="SELF" />}
        {synthetic && <SourceTag kind="DEMO" />}
      </span>
    </Link>
  );
};

export const WeeklyTrends: React.FC = () => (
  <LxCard labelledBy="trend-title">
    <LxSectionHeader id="trend-title" eyebrow="Weekly Trends" title="แนวโน้ม 7 วัน" action={{ to: '/yai/insights', label: 'ดู 30 วัน' }} />
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {(['sleep', 'energy', 'activity', 'symptoms'] as const).map((m) => (
        <MiniTrend key={m} metric={m} />
      ))}
    </div>
    <p className="mt-3 text-xs text-lx-muted">ข้อมูลที่คุณบอกเอง (Self-Reported) ใช้ติดตามตัวเอง ไม่ใช่ผลตรวจทางการแพทย์ · ช่องว่าง = วันที่ไม่ได้บันทึก</p>
  </LxCard>
);

export const JourneyCard: React.FC = () => {
  const state = useYai((s) => s);
  const today = bangkokDate(demoNow(state));
  const goals = goalProgress(state, today);
  return (
    <LxCard labelledBy="journey-title">
      <LxSectionHeader id="journey-title" eyebrow="Wellness Journey" title="เป้าหมายสัปดาห์นี้" action={{ to: '/yai/journey', label: 'ทั้งหมด' }} />
      {goals.length === 0 ? (
        <p className="text-base text-lx-muted">ยังไม่ได้เลือกเป้าหมาย</p>
      ) : (
        <ul className="space-y-4">
          {goals.map((g) => (
            <li key={g.goal.id}>
              <div className="mb-1.5 flex items-baseline justify-between gap-2">
                <span className="text-base font-semibold">{g.goal.title}</span>
                <span className="num shrink-0 text-sm text-lx-muted">
                  {g.done}/{g.target}
                </span>
              </div>
              <ProgressBar value={g.done} max={g.target} label={`${g.goal.title} ${g.done} จาก ${g.target}`} />
              <p className="mt-1 text-xs text-lx-muted">{progressWords(g.done, g.target)}</p>
            </li>
          ))}
        </ul>
      )}
    </LxCard>
  );
};

export const DiscoverCard: React.FC = () => {
  const state = useYai((s) => s);
  const herb = herbOfTheDay(bangkokDate(demoNow(state)));
  return (
    <LxCard className="relative overflow-hidden" labelledBy="discover-title">
      <svg className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 text-lx-accent/10" viewBox="0 0 100 100" aria-hidden="true">
        <path d="M50 95C20 70 15 35 50 5c35 30 30 65 0 90Z" fill="currentColor" />
        <path d="M50 92V12" stroke="currentColor" strokeWidth="2" />
      </svg>
      <LxSectionHeader id="discover-title" eyebrow="Discover Thai Wellness" title="ค้นพบภูมิปัญญาไทย เพื่อสุขภาพระยะยาว" />
      <Link to={`/yai/discover/${herb.id}`} className="block rounded-2xl bg-lx-surface2 p-4 transition hover:ring-2 hover:ring-lx-accent/40">
        <p className="text-xs font-semibold text-lx-muted">ความรู้วันนี้</p>
        <p className="mt-1 text-lg font-semibold">{herb.thaiName}</p>
        <p className="text-sm italic text-lx-muted">{herb.scientificName}</p>
        <div className="mt-2 flex flex-wrap gap-1">
          {herb.inNationalList && <SourceTag kind="VERIFIED" text="อยู่ในบัญชียาหลักแห่งชาติ" />}
          {herb.interactions.length > 0 && <SourceTag kind="PENDING" text={`ข้อควรระวังกับยา ${herb.interactions.length} รายการ`} />}
        </div>
      </Link>
      <Link to="/yai/discover" className="mt-3 inline-flex min-h-[48px] items-center gap-2 text-base font-semibold text-lx-link">
        <Search className="h-5 w-5" aria-hidden="true" /> ค้นหาสมุนไพร พร้อมระดับหลักฐานและข้อจำกัด
      </Link>
    </LxCard>
  );
};

export const CareBridgeCard: React.FC = () => {
  const syncedPlans = useYai((s) => s.reminders.filter((r) => r.source === 'CLINICIAN_ORDER' && r.status === 'ACTIVE').length);
  const items = [
    { to: '/yai/clinics', icon: Stethoscope, title: 'ค้นหาผู้เชี่ยวชาญ', sub: 'คลินิกแผนไทย แผนปัจจุบัน ใกล้บ้าน' },
    { to: '/yai/previsit', icon: ClipboardList, title: 'เตรียมข้อมูลก่อนปรึกษา', sub: 'สรุปจากสิ่งที่คุณบันทึก แชร์เมื่อคุณยินยอม' },
    { to: '/yai/care', icon: ShieldCheck, title: 'แผนดูแลที่ผู้เชี่ยวชาญยืนยัน', sub: syncedPlans ? `${syncedPlans} แผนจาก CareBridge` : 'ยังไม่มีแผนที่ยืนยัน' },
  ];
  return (
    <LxCard labelledBy="cb-title">
      <LxSectionHeader id="cb-title" eyebrow="CareBridge" title="เชื่อมกับผู้เชี่ยวชาญ" action={{ to: '/yai/consult', label: 'ปรึกษา' }} />
      <ul className="grid gap-2 md:grid-cols-3">
        {items.map((i) => (
          <li key={i.to}>
            <Link to={i.to} className="flex h-full min-h-[64px] items-start gap-3 rounded-2xl bg-lx-surface2 p-3 transition hover:ring-2 hover:ring-lx-accent/40">
              <i.icon className="mt-0.5 h-5 w-5 shrink-0 text-lx-accent" aria-hidden="true" />
              <span>
                <span className="block text-base font-semibold">{i.title}</span>
                <span className="block text-sm text-lx-muted">{i.sub}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </LxCard>
  );
};

/** One line of daily wisdom in the colour of the day; Buddha icon on วันพระ; another line on request */
export const DailyWisdom: React.FC = () => {
  const state = useYai((s) => s);
  const today = bangkokDate(demoNow(state));
  const [seed, setSeed] = useState(0);
  const g = greetingFor(today, seed, state.settings.greetingSkips ?? []);
  const holy = g.occasion?.art === 'BUDDHA';
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-lx-line bg-lx-surface px-4 py-3">
      <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${g.theme.color}33`, color: g.theme.color }} aria-hidden="true">
        {holy ? '☸' : <Sun className="h-5 w-5" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-lx-muted">{holy ? g.occasion!.title : g.title}</p>
        <p className="text-base leading-snug">{g.quote}</p>
        {g.occasion?.approximate && <p className="text-xs text-lx-muted">วันพระคำนวณจากข้างขึ้นข้างแรม อาจคลาดเคลื่อน 1 วัน</p>}
      </div>
      <button
        type="button"
        onClick={() => {
          yaiStore.skipGreeting(g.quote);
          setSeed((v) => v + 1);
        }}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lx-muted hover:bg-lx-surface2"
        aria-label="ขอข้อคิดใหม่"
      >
        <RefreshCw className="h-4 w-4" />
      </button>
    </div>
  );
};

export const TodayCareStrip: React.FC = () => {
  const state = useYai((s) => s);
  const active = state.reminders.filter((r) => r.status === 'ACTIVE').length;
  const pending = state.medicines.filter((m) => m.status !== 'PATIENT_CONFIRMED' && m.status !== 'CLINICIAN_VERIFIED').length;
  if (state.medicines.length === 0) return null;
  return (
    <Link to="/yai/care" className="flex min-h-[60px] items-center gap-3 rounded-2xl border border-lx-line bg-lx-surface px-4 py-3 transition hover:border-lx-accent/60">
      <BookOpenCheck className="h-5 w-5 shrink-0 text-lx-accent" aria-hidden="true" />
      <span className="min-w-0 flex-1 text-base">
        <span className="font-semibold">ยาและการดูแล</span>
        <span className="block text-sm text-lx-muted">
          เตือนกินยา {active} รายการ{pending ? ` · รอตรวจสอบ ${pending} รายการ` : ''}
        </span>
      </span>
    </Link>
  );
};

/** Today's steps against the user's goal, linking to the step activity page */
export const StepsCard: React.FC = () => {
  const state = useYai((s) => s);
  const today = bangkokDate(demoNow(state));
  const goal = stepGoalOf(state);
  const t = stepsOn(state, today);
  const week = stepWeek(state, today);
  return (
    <Link to="/yai/steps" className="flex min-h-[64px] items-center gap-3 rounded-2xl border border-lx-line bg-lx-surface px-4 py-3 transition hover:border-lx-accent/60" aria-label={`กิจกรรมก้าวเดิน ${stepWords(t.value, goal)}`}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lx-accent/15 text-lx-accent" aria-hidden="true">
        <Footprints className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className="font-semibold">กิจกรรมก้าวเดิน</span>
          <span className="num shrink-0 text-sm text-lx-muted">
            {t.value === null ? 'ยังไม่ได้บันทึก' : `${t.value.toLocaleString('th-TH')} / ${goal.toLocaleString('th-TH')}`}
          </span>
        </span>
        <span className="mt-1.5 block">
          <ProgressBar value={t.value ?? 0} max={goal} label={`ก้าววันนี้ ${t.value ?? 0} จากเป้า ${goal}`} />
        </span>
        <span className="mt-1 block text-xs text-lx-muted">สัปดาห์นี้ถึงเป้า {week.goalDays} วัน · ชวนเพื่อนเดิน</span>
      </span>
    </Link>
  );
};
