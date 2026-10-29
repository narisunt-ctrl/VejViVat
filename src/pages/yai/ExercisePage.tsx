import React from 'react';
import { demoNow, useYai, yaiStore } from '../../services/yai/yaiStore';
import { Notice, PageTitle, SpeakButton } from '../../components/yai/ui';
import { bangkokDate, isConfirmed } from '../../domain/yai/journal';

// Gentle, general movement ideas for older adults; not an exercise prescription. Tapping "ทำแล้ว" saves the
// patient's own activity note to the journal (counted for points once per day).
const ACTIVITIES = [
  { id: 'walk', emoji: '🚶‍♀️', title: 'เดินช้าๆ ในบ้านหรือรอบบ้าน', how: 'เดินสบายๆ 10–15 นาที พูดคุยได้ไม่หอบ ใส่รองเท้าที่ไม่ลื่น' },
  { id: 'chair', emoji: '🪑', title: 'ลุก-นั่งเก้าอี้', how: 'นั่งเก้าอี้มีพนัก ลุกขึ้นยืนแล้วนั่งลงช้าๆ 5–10 ครั้ง มือจับพนักได้' },
  { id: 'ankle', emoji: '🦶', title: 'หมุนข้อเท้า เหยียดขา', how: 'นั่งเหยียดขาทีละข้าง กระดกปลายเท้าขึ้นลง 10 ครั้ง' },
  { id: 'arm', emoji: '🙆‍♀️', title: 'ยกแขน ยืดไหล่', how: 'ยกแขนขึ้นเหนือศีรษะช้าๆ หายใจเข้า ลดลงหายใจออก 10 ครั้ง' },
  { id: 'breath', emoji: '🧘‍♀️', title: 'หายใจช้าๆ ผ่อนคลาย', how: 'หายใจเข้านับ 1–4 ออกนับ 1–6 ทำ 5 นาที' },
  { id: 'garden', emoji: '🌱', title: 'รดน้ำต้นไม้ ทำสวนเบาๆ', how: 'งานบ้านเบาๆ ก็นับเป็นการขยับร่างกาย พักเมื่อเหนื่อย' },
];

export const ExercisePage: React.FC = () => {
  const state = useYai((s) => s);
  const today = bangkokDate(demoNow(state));
  const doneToday = new Set(
    (state.journal ?? [])
      .filter((e) => isConfirmed(e) && e.recordedLocalDate === today)
      .flatMap((e) => e.segments.filter((s) => s.category === 'ACTIVITY').map((s) => s.text))
  );

  const markDone = (title: string) => {
    const text = `ออกกำลังกาย: ${title}`;
    yaiStore.saveJournalEntry({
      originalText: text,
      reviewedText: text,
      inputSource: 'MANUAL_TEXT',
      capturedAt: demoNow().toISOString(),
      segments: [{ id: `seg-act-${Date.now()}`, category: 'ACTIVITY', text, correctedByUser: false }],
      photoIds: [],
    });
  };

  return (
    <div className="space-y-5">
      <PageTitle title="ออกกำลังกายสำหรับผู้สูงวัย" subtitle="ขยับเบาๆ ทุกวัน ทำเท่าที่ไหว" back="/yai" />
      <Notice tone="warn" title="หยุดทันทีถ้าเจ็บหน้าอก เวียนหัว หรือหายใจไม่ทัน">
        ถ้ามีโรคหัวใจ ข้อเข่า หรือเพิ่งผ่าตัด ถามคุณหมอหรือนักกายภาพก่อนว่าท่าไหนเหมาะ
      </Notice>
      <ul className="space-y-3">
        {ACTIVITIES.map((a) => {
          const text = `ออกกำลังกาย: ${a.title}`;
          const done = doneToday.has(text);
          return (
            <li key={a.id} className="rounded-3xl border border-yai-ink/10 bg-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="text-4xl" aria-hidden="true">
                  {a.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-bold">{a.title}</p>
                  <p className="text-base text-yai-ink/80">{a.how}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <SpeakButton text={`${a.title} ${a.how}`} />
                {done ? (
                  <span className="flex min-h-[48px] flex-1 items-center justify-center rounded-2xl bg-emerald-50 text-lg font-bold text-emerald-800">✓ วันนี้ทำแล้ว</span>
                ) : (
                  <button type="button" onClick={() => markDone(a.title)} className="min-h-[48px] flex-1 rounded-2xl bg-yai-green text-lg font-bold text-white">
                    ทำแล้ว
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="text-center text-sm text-yai-ink/60">กด “ทำแล้ว” จะบันทึกลงสมุดสุขภาพ และได้แต้มขยับร่างกายวันละ 5 แต้ม</p>
    </div>
  );
};
