import React from 'react';
import { demoNow, useYai, yaiStore } from '../../services/yai/yaiStore';
import { bangkokDate, isConfirmed } from '../../domain/yai/journal';

// One-tap "how do you feel today", so the mind is part of the daily record without extra steps.
// It records the patient's own word for her mood; it is not a depression screen and draws no conclusion.

const MOODS: { emoji: string; label: string }[] = [
  { emoji: '😄', label: 'ดีมาก' },
  { emoji: '🙂', label: 'ดี' },
  { emoji: '😐', label: 'เฉย ๆ' },
  { emoji: '🙁', label: 'ไม่ค่อยดี' },
  { emoji: '😢', label: 'แย่' },
];

export const MoodTapCard: React.FC = () => {
  const state = useYai((s) => s);
  const today = bangkokDate(demoNow(state));
  const todayMood = (state.journal ?? []).find((e) => isConfirmed(e) && e.recordedLocalDate === today && e.segments.some((s) => s.category === 'MOOD' && s.text.startsWith('อารมณ์วันนี้')));
  const current = todayMood?.segments.find((s) => s.category === 'MOOD')?.text.replace('อารมณ์วันนี้: ', '');

  const pick = (label: string) => {
    const text = `อารมณ์วันนี้: ${label}`;
    if (todayMood) {
      yaiStore.editJournalEntry(todayMood.id, text, [{ ...todayMood.segments[0], text, correctedByUser: true }]);
    } else {
      yaiStore.saveJournalEntry({
        originalText: text,
        reviewedText: text,
        inputSource: 'MANUAL_TEXT',
        capturedAt: demoNow().toISOString(),
        segments: [{ id: `seg-mood-${Date.now()}`, category: 'MOOD', text, correctedByUser: false }],
        photoIds: [],
      });
    }
  };

  return (
    <section className="space-y-2 rounded-3xl border border-sky-200 bg-white p-4" aria-labelledby="mood-title">
      <h2 id="mood-title" className="text-lg font-bold">
        วันนี้ใจเป็นอย่างไรบ้างคะ?
      </h2>
      <div className="grid grid-cols-5 gap-1.5" role="group" aria-label="อารมณ์วันนี้">
        {MOODS.map((m) => (
          <button
            key={m.label}
            type="button"
            aria-pressed={current === m.label}
            onClick={() => pick(m.label)}
            className={`flex min-h-[72px] flex-col items-center justify-center rounded-2xl border-2 text-sm font-bold ${current === m.label ? 'border-sky-600 bg-sky-50' : 'border-yai-ink/10 bg-white'}`}
          >
            <span className="text-3xl" aria-hidden="true">
              {m.emoji}
            </span>
            {m.label}
          </button>
        ))}
      </div>
      <p className="text-sm text-yai-ink/60">{current ? `บันทึกแล้วว่า "${current}" แตะใหม่เพื่อเปลี่ยนได้` : 'แตะครั้งเดียวก็บันทึกแล้ว ไม่ใช่แบบประเมินโรค'}</p>
    </section>
  );
};
