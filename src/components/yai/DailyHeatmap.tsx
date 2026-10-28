import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { buildMonthGrid, JournalEntry, recordedDaysInMonth, shiftMonth, thaiMonthLabel } from '../../domain/yai/journal';

const WEEKDAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
// how many entries were recorded that day; not a health score
const LEVEL_CLS = ['bg-yai-ink/5 text-yai-ink/50', 'bg-emerald-200 text-emerald-950', 'bg-emerald-400 text-emerald-950', 'bg-emerald-700 text-white'];

/**
 * Square-cell month calendar of confirmed journal entries (Asia/Bangkok dates). It counts distinct days with at
 * least one confirmed entry; it does not reward or punish, and it never says the patient is healthy.
 */
export const DailyHeatmap: React.FC<{
  entries: JournalEntry[];
  today: string;
  selected?: string | null;
  onSelect?: (date: string) => void;
}> = ({ entries, today, selected, onSelect }) => {
  const [month, setMonth] = useState(today.slice(0, 7));
  const cells = buildMonthGrid(month, entries, today);
  const days = recordedDaysInMonth(entries, month);
  const hasSample = entries.some((e) => e.isSynthetic && e.recordedLocalDate.startsWith(`${month}-`));
  const isThisMonth = month === today.slice(0, 7);

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={() => setMonth(shiftMonth(month, -1))} className="flex h-12 w-12 items-center justify-center rounded-xl text-yai-deep hover:bg-yai-mint" aria-label="เดือนก่อน">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <p className="text-center">
          <span className="block text-lg font-bold">{thaiMonthLabel(month)}</span>
          <span className="block text-base text-yai-ink/80" aria-live="polite">
            {isThisMonth ? 'เดือนนี้' : 'เดือนนั้น'}บันทึกแล้ว <b className="text-xl text-yai-deep">{days}</b> วัน
          </span>
        </p>
        <button
          type="button"
          onClick={() => setMonth(shiftMonth(month, 1))}
          disabled={isThisMonth}
          className="flex h-12 w-12 items-center justify-center rounded-xl text-yai-deep hover:bg-yai-mint disabled:opacity-30"
          aria-label="เดือนถัดไป"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>

      <div className="mt-2 grid grid-cols-7 gap-1.5" role="grid" aria-label={`ปฏิทินบันทึก ${thaiMonthLabel(month)}`}>
        {WEEKDAYS.map((d) => (
          <div key={d} role="columnheader" className="text-center text-sm font-semibold text-yai-ink/60">
            {d}
          </div>
        ))}
        {cells.map((c, i) =>
          c.date === null ? (
            <div key={`blank-${i}`} aria-hidden="true" />
          ) : (
            <button
              key={c.date}
              type="button"
              role="gridcell"
              disabled={c.isFuture || !onSelect}
              onClick={() => onSelect?.(c.date!)}
              aria-label={`วันที่ ${c.day}: ${c.count ? `บันทึก ${c.count} รายการ` : 'ยังไม่มีบันทึก'}${c.isToday ? ' (วันนี้)' : ''}`}
              aria-pressed={selected === c.date}
              className={`relative flex aspect-square min-h-[40px] flex-col items-center justify-center rounded-lg text-sm font-semibold ${
                c.isFuture ? 'bg-transparent text-yai-ink/25' : LEVEL_CLS[c.level]
              } ${c.isToday ? 'ring-2 ring-yai-deep ring-offset-1' : ''} ${selected === c.date ? 'outline outline-2 outline-yai-teal' : ''}`}
            >
              {c.day}
              {c.count > 1 && <span className="absolute bottom-0.5 right-1 text-[10px] leading-none">{c.count}</span>}
            </button>
          )
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-yai-ink/70">
        <span className="inline-flex items-center gap-1">
          <span className="h-3 w-3 rounded-sm bg-yai-ink/5" aria-hidden="true" /> ไม่มีบันทึก
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-3 w-3 rounded-sm bg-emerald-200" aria-hidden="true" /> 1
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-3 w-3 rounded-sm bg-emerald-400" aria-hidden="true" /> 2
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-3 w-3 rounded-sm bg-emerald-700" aria-hidden="true" /> 3+ รายการ
        </span>
      </div>
      {hasSample && <p className="mt-1 text-sm font-semibold text-yai-warn">รวมบันทึกตัวอย่าง (ข้อมูลจำลอง)</p>}
    </div>
  );
};
