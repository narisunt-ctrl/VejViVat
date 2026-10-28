import React, { useMemo } from 'react';
import { Card, Notice, PageTitle, formatThaiDateTime } from '../../components/yai/ui';
import { CategoryChip } from '../../components/yai/SourceVerificationChip';
import { demoNow, useYai } from '../../services/yai/yaiStore';
import { getElementSummaryForPatient } from '../../services/yai/elementSummaryAdapter';
import { bangkokDate, isConfirmed, thaiDateLabel } from '../../domain/yai/journal';

// General Thai home dishes per taste, for illustration only. Not reviewed by a nutritionist or a clinician,
// not patient-specific, and not a treatment.
const TASTE_EXAMPLES: { match: string; dishes: string[]; salty?: boolean }[] = [
  { match: 'ขม', dishes: ['มะระผัดไข่', 'แกงขี้เหล็ก'] },
  { match: 'เผ็ดร้อน', dishes: ['แกงเลียง', 'ผัดขิงไก่'] },
  { match: 'เปรี้ยว', dishes: ['ต้มส้มผัก', 'แกงส้มผักรวม'] },
  { match: 'ฝาด', dishes: ['ยอดมะม่วงหิมพานต์กับน้ำพริก', 'กล้วยน้ำว้าดิบต้ม'] },
  { match: 'มัน', dishes: ['ถั่วต้ม', 'ฟักทองนึ่ง'] },
  { match: 'จืด', dishes: ['แกงจืดตำลึง', 'ต้มฟัก'] },
  { match: 'เย็น', dishes: ['แกงจืดผักกาด', 'บวบผัดไข่'] },
  { match: 'หวาน', dishes: ['ฟักทองนึ่ง'] },
  { match: 'สุขุม', dishes: ['ต้มยำปลาน้ำใส (ไม่จัด)'] },
  { match: 'เค็ม', dishes: ['ปลาทูนึ่ง'], salty: true },
];

/** Supplementary "อาหารตามธาตุ": not part of the daily entry, reads the existing Smutthan engine through the adapter */
export const FoodPage: React.FC = () => {
  const state = useYai((s) => s);
  const summary = useMemo(() => getElementSummaryForPatient(state.patient.id), [state.patient.id]);
  const since = bangkokDate(new Date(demoNow(state).getTime() - 7 * 86_400_000));
  const eaten = (state.journal ?? [])
    .filter((e) => isConfirmed(e) && e.recordedLocalDate >= since)
    .flatMap((e) => e.segments.filter((s) => s.category === 'FOOD_CONSUMED').map((s) => ({ s, e })));

  const hasHypertension = summary.status === 'AVAILABLE' && summary.dietReviewNeeded.some((d) => /hypertension|ความดัน/i.test(d));
  const ideas =
    summary.status === 'AVAILABLE'
      ? summary.dynamic.recommendedTaste
          .flatMap((t) => TASTE_EXAMPLES.filter((x) => t.includes(x.match) && !(hasHypertension && x.salty)).flatMap((x) => x.dishes))
          .filter((d, i, a) => a.indexOf(d) === i)
          .slice(0, 3)
      : [];

  return (
    <div className="space-y-5">
      <PageTitle title="อาหารตามธาตุ" subtitle="ส่วนเสริม ตามแนวการแพทย์แผนไทย · ไม่ใช่การรักษา" back="/yai" />

      {summary.status === 'UNKNOWN' ? (
        <Notice tone="warn" title="รอข้อมูลประเมิน">
          ยังประเมินธาตุไม่ได้ เพราะยังขาด: {summary.missingInputs.join(', ')} · ระบบไม่เดาหรือใส่ค่าปกติแทน
        </Notice>
      ) : (
        <Card className="space-y-3">
          <div>
            <p className="text-sm font-semibold text-yai-ink/70">ธาตุเจ้าเรือน (ข้อมูลกำเนิดในเคสที่เชื่อมไว้ ไม่เปลี่ยนตามวัน)</p>
            <p className="text-xl font-bold">{summary.birthElement ?? 'ยังไม่มีข้อมูล'}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-yai-ink/70">สมุฏฐานวันที่ประเมิน (เปลี่ยนตามอากาศ เวลา วัย สัญญาณชีพ อาการ)</p>
            <p className="text-xl font-bold">
              {summary.dynamic.dominantTh} · {summary.dynamic.state}
            </p>
          </div>
          <p className="text-base">รสที่แนะนำตามตำรา: {summary.dynamic.recommendedTaste.join(', ')}</p>
          <p className="text-sm text-yai-ink/70">
            ประเมินเมื่อ {formatThaiDateTime(summary.assessedAt)} · {summary.source} · {summary.ruleVersion} · คำนวณด้วยสูตรเดิมของระบบ (calculateSmutthan)
          </p>
        </Card>
      )}

      {ideas.length > 0 && (
        <Card className="space-y-2">
          <h2 className="text-xl font-bold">ตัวอย่างเมนู (แนะนำ ไม่ใช่สิ่งที่กินจริง)</h2>
          <ul className="list-disc pl-6 text-lg">
            {ideas.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
          <p className="text-sm text-yai-warn">
            ตัวอย่างทั่วไป ยังไม่ผ่านการทบทวนโดยนักโภชนาการหรือแพทย์ ไม่ได้คำนึงถึงการแพ้อาหารหรือโรคไต/เบาหวานที่ยังไม่ได้บันทึก
          </p>
        </Card>
      )}
      {summary.status === 'AVAILABLE' && summary.dietReviewNeeded.length > 0 && (
        <Notice tone="warn" title="มีโรคประจำตัวในข้อมูลที่เชื่อมไว้ ต้องให้แพทย์หรือนักโภชนาการทบทวนก่อนปรับอาหาร">
          {summary.dietReviewNeeded.join(', ')}
          {hasHypertension ? ' · จึงไม่แสดงตัวอย่างรสเค็ม' : ''}
        </Notice>
      )}

      <Card className="space-y-2">
        <h2 className="text-xl font-bold">อาหารที่ยายบอกว่ากินจริง (7 วันล่าสุด)</h2>
        {eaten.length === 0 ? (
          <p className="text-base text-yai-ink/70">ยังไม่มีบันทึกอาหาร เล่าได้ที่หน้าแรก</p>
        ) : (
          <ul className="space-y-1">
            {eaten.map(({ s, e }) => (
              <li key={`${e.id}-${s.id}`} className="flex flex-wrap items-center gap-2 text-base">
                <span className="text-sm text-yai-ink/70">{thaiDateLabel(e.recordedLocalDate)}</span>
                <CategoryChip category="FOOD_CONSUMED" />
                {s.text}
                {e.isSynthetic && <span className="text-xs font-semibold text-yai-warn">ตัวอย่าง</span>}
              </li>
            ))}
          </ul>
        )}
      </Card>
      <p className="text-center text-sm text-yai-ink/60">การเลือกยาสมุนไพรเป็นหน้าที่ของแพทย์ ระบบไม่แนะนำยาเอง</p>
    </div>
  );
};
