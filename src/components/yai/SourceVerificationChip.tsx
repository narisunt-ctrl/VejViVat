import React from 'react';
import { CATEGORY_LABEL, JournalCategory, JournalInputSource, JournalReviewStatus, SOURCE_LABEL } from '../../domain/yai/journal';

const CATEGORY_CLS: Record<JournalCategory, string> = {
  SYMPTOM: 'bg-rose-50 text-rose-900 border-rose-200',
  MEDICINE_USE_REPORT: 'bg-violet-50 text-violet-900 border-violet-200',
  FOOD_CONSUMED: 'bg-amber-50 text-amber-950 border-amber-200',
  OTHER: 'bg-slate-100 text-slate-800 border-slate-300',
};

export const CategoryChip: React.FC<{ category: JournalCategory }> = ({ category }) => (
  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-sm font-semibold ${CATEGORY_CLS[category]}`}>{CATEGORY_LABEL[category]}</span>
);

/** Where a statement came from and who confirmed it: ยายเล่า / พิมพ์เอง / OCR จากรูป / ผู้ดูแลให้ข้อมูล / บุคลากรยืนยัน */
export const SourceVerificationChip: React.FC<{ source?: JournalInputSource; status?: JournalReviewStatus; clinician?: boolean; synthetic?: boolean }> = ({
  source,
  status,
  clinician,
  synthetic,
}) => (
  <span className="inline-flex flex-wrap items-center gap-1 text-xs">
    {source && <span className="rounded-full bg-yai-mint px-2 py-0.5 font-semibold text-yai-deep">{SOURCE_LABEL[source]}</span>}
    {status === 'PATIENT_CONFIRMED' && <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-900">✓ ยายยืนยันแล้ว</span>}
    {status === 'CAREGIVER_CONFIRMED' && <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-900">✓ ผู้ดูแลยืนยันแล้ว</span>}
    {status === 'DRAFT' && <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">ร่าง ยังไม่บันทึก</span>}
    {clinician && <span className="rounded-full bg-violet-50 px-2 py-0.5 font-semibold text-violet-800">บุคลากรยืนยัน (จำลอง)</span>}
    {synthetic && <span className="rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-yai-warn">ตัวอย่าง</span>}
  </span>
);
