import React from 'react';
import { CalendarCheck, Check, Dumbbell, Trophy } from 'lucide-react';
import { demoNow, useYai, yaiStore } from '../../services/yai/yaiStore';
import { LxCard, LxLinkRow, LxNotice, LxPageHeader, ProgressBar, SourceTag } from '../../components/yai/lx/ui';
import { weekdayShort } from '../../components/yai/lx/WellnessCards';
import { bangkokDate } from '../../domain/yai/journal';
import { checkinOn, goalProgress, progressWords, weekOf, WELLNESS_GOALS } from '../../domain/yai/wellness';
import { DEMO_CLINICS } from '../../data/yai/fixtures';

// Personal Longevity Journey: goals the user picks, weekly progress, habit ticks and a follow-up plan.
// No biological age, recovery score or pace-of-aging number: there is no validated formula for this data.

export const JourneyPage: React.FC = () => {
  const state = useYai((s) => s);
  const today = bangkokDate(demoNow(state));
  const week = weekOf(today);
  const progress = goalProgress(state, today);
  const chosen = state.settings.goals ?? WELLNESS_GOALS.map((g) => g.id);
  const openAppt = state.appointments.find((a) => ['REQUESTED', 'OFFERED', 'CONFIRMED'].includes(a.status));
  const apptClinic = openAppt && DEMO_CLINICS.find((c) => c.id === openAppt.clinicId);
  const verifiedPlans = state.reminders.filter((r) => r.source === 'CLINICIAN_ORDER' && r.status === 'ACTIVE');

  const metOn = (goalId: string, d: string) => {
    if (d > today) return null;
    const c = checkinOn(state, d);
    if (goalId === 'SLEEP') return (c?.sleepHours ?? 0) >= 7;
    if (goalId === 'ACTIVE') return WELLNESS_GOALS.find((g) => g.id === 'ACTIVE')!.progress(state, [d]) > 0;
    return (state.habitLogs ?? []).some((l) => l.goalId === goalId && l.date === d);
  };

  const toggleGoal = (id: string) => yaiStore.setGoals(chosen.includes(id) ? chosen.filter((g) => g !== id) : [...chosen, id]);

  return (
    <div className="space-y-4">
      <LxPageHeader eyebrow="Personal Longevity Journey" title="เส้นทางสุขภาพของฉัน" subtitle="เน้นความสม่ำเสมอทีละน้อย ไม่ต้องสมบูรณ์แบบ" />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {progress.length === 0 && <LxNotice title="ยังไม่ได้เลือกเป้าหมาย">เลือกได้ด้านล่าง เปลี่ยนได้ทุกเมื่อ</LxNotice>}
          {progress.map((p) => (
            <LxCard key={p.goal.id} as="article" labelledBy={`goal-${p.goal.id}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 id={`goal-${p.goal.id}`} className="text-lg font-semibold">
                    {p.goal.title}
                  </h2>
                  <p className="text-sm text-lx-muted">{p.goal.why}</p>
                </div>
                <p className="num shrink-0 text-2xl font-semibold">
                  {p.done}
                  <span className="text-base text-lx-muted">/{p.target}</span>
                </p>
              </div>
              <div className="mt-3">
                <ProgressBar value={p.done} max={p.target} label={`${p.goal.title} ${p.done} จาก ${p.target}`} />
              </div>
              <p className="mt-1 text-sm text-lx-muted">
                {p.goal.unit} · {progressWords(p.done, p.target)}
              </p>
              <ol className="mt-3 grid grid-cols-7 gap-1" aria-label="สัปดาห์นี้">
                {week.map((d) => {
                  const met = metOn(p.goal.id, d);
                  return (
                    <li key={d} className="flex flex-col items-center gap-1">
                      <span
                        className={`flex h-9 w-9 items-center justify-center rounded-full text-sm ${
                          met === null ? 'border border-dashed border-lx-line text-lx-muted' : met ? 'bg-lx-accent text-lx-onaccent' : 'bg-lx-surface2 text-lx-muted'
                        }`}
                        aria-label={`${weekdayShort(d)} ${met === null ? 'ยังไม่ถึง' : met ? 'ทำแล้ว' : 'ยังไม่ได้บันทึก'}`}
                      >
                        {met ? <Check className="h-4 w-4" aria-hidden="true" /> : ''}
                      </span>
                      <span className={`text-xs ${d === today ? 'font-semibold text-lx-accent' : 'text-lx-muted'}`}>{d === today ? 'วันนี้' : weekdayShort(d)}</span>
                    </li>
                  );
                })}
              </ol>
              {p.goal.manual ? (
                <button
                  type="button"
                  onClick={() => yaiStore.toggleHabit(p.goal.id)}
                  aria-pressed={p.tickedToday}
                  className={`mt-3 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl border text-base font-semibold transition ${
                    p.tickedToday ? 'border-lx-accent bg-lx-accent/15 text-lx-accent' : 'border-lx-line bg-lx-surface2 hover:border-lx-accent/60'
                  }`}
                >
                  <Check className="h-5 w-5" aria-hidden="true" /> {p.tickedToday ? 'วันนี้ทำแล้ว (แตะเพื่อยกเลิก)' : 'วันนี้ทำแล้ว'}
                </button>
              ) : (
                <p className="mt-3 text-xs text-lx-muted">นับจากเช็กอินรายวัน{p.goal.id === 'ACTIVE' ? ' ก้าวเดินจากอุปกรณ์ และบันทึกกิจกรรม' : ''}</p>
              )}
              <p className="mt-2 text-xs text-lx-muted">อ้างอิง: {p.goal.source}</p>
            </LxCard>
          ))}
        </div>

        <div className="space-y-4">
          <LxCard labelledBy="choose-title">
            <h2 id="choose-title" className="text-lg font-semibold">
              เลือกเป้าหมาย
            </h2>
            <ul className="mt-3 space-y-2">
              {WELLNESS_GOALS.map((g) => (
                <li key={g.id}>
                  <label className="flex min-h-[52px] cursor-pointer items-center gap-3 rounded-2xl bg-lx-surface2 px-3">
                    <input type="checkbox" className="h-5 w-5 accent-[rgb(var(--lx-accent))]" checked={chosen.includes(g.id)} onChange={() => toggleGoal(g.id)} />
                    <span className="text-base">{g.title}</span>
                  </label>
                </li>
              ))}
            </ul>
          </LxCard>

          <LxCard labelledBy="plan-title">
            <h2 id="plan-title" className="flex items-center gap-2 text-lg font-semibold">
              <CalendarCheck className="h-5 w-5 text-lx-accent" aria-hidden="true" /> แผนติดตาม
            </h2>
            <ul className="mt-3 space-y-2 text-base">
              <li className="rounded-2xl bg-lx-surface2 p-3">
                <p className="text-sm text-lx-muted">นัดหมาย</p>
                <p className="font-semibold">{openAppt ? `${apptClinic?.name ?? 'คลินิก'} · ${openAppt.requestedWindow || 'รอยืนยันเวลา'}` : 'ยังไม่มีนัด'}</p>
              </li>
              <li className="rounded-2xl bg-lx-surface2 p-3">
                <p className="text-sm text-lx-muted">แผนดูแลจากผู้เชี่ยวชาญ (CareBridge)</p>
                {verifiedPlans.length ? (
                  <p className="font-semibold">
                    {verifiedPlans.length} แผน <SourceTag kind="VERIFIED" />
                  </p>
                ) : (
                  <p className="font-semibold">ยังไม่มีแผนที่ยืนยัน</p>
                )}
              </li>
            </ul>
          </LxCard>

          <LxCard labelledBy="tips-title">
            <h2 id="tips-title" className="text-lg font-semibold">
              คำแนะนำทั่วไป
            </h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm">
              <li>กิจกรรมระดับปานกลางรวมราว 150 นาที/สัปดาห์ และฝึกกล้ามเนื้อ 2 วัน/สัปดาห์ ทำเท่าที่ไหว (WHO 2020)</li>
              <li>ผู้สูงอายุควรเพิ่มการฝึกทรงตัวเพื่อป้องกันการหกล้ม (WHO 2020)</li>
              <li>นอนให้ได้อย่างน้อย 7 ชั่วโมงเป็นประจำ (AASM/SRS 2015)</li>
            </ul>
            <p className="mt-2 text-xs text-lx-muted">เป็นคำแนะนำสำหรับผู้ใหญ่ทั่วไป ไม่ได้ประเมินจากข้อมูลของคุณ ถ้ามีโรคประจำตัวควรถามแพทย์ก่อนเพิ่มการออกกำลังกาย</p>
          </LxCard>

          <div className="space-y-2">
            <LxLinkRow to="/yai/exercise" icon={Dumbbell} title="ท่าออกกำลังกายเบาๆ" sub="ลุก-นั่ง ยืดเหยียด เดิน หายใจ" />
            <LxLinkRow to="/yai/leaderboard" icon={Trophy} title="แต้มกับเพื่อน" sub="กำลังใจจากกลุ่มเพื่อน (เห็นแค่แต้ม)" />
          </div>
        </div>
      </div>
    </div>
  );
};
