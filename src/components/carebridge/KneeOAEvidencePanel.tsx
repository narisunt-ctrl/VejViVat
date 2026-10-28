import React, { useState } from 'react';
import { BookOpenCheck, CheckCircle2, XCircle } from 'lucide-react';
import type { SyntheticCase } from '../../types/patient';
import { linkForCase } from '../../data/yai/demoLinks';
import { yaiStore } from '../../services/yai/yaiStore';
import { TEAM_REFERENCES } from '../../data/carebridge/research';
import { Link } from 'react-router-dom';

// Optional clinician card for knee osteoarthritis, from the teammate's adoption strategy (docs/handoff/04).
// Every study figure below was supplied by the teammate and has NOT been checked against a primary source:
// display_state stays RESEARCH_REVIEW_PENDING and no DOI/PMID is shown until someone verifies one.
// The card never selects a herb, a dose or an interaction verdict; the clinician decides.

const REFERENCES = TEAM_REFERENCES.filter((r) => r.topic === 'KNEE_OA' || r.reference_id === 'TEAM-04');

const FIVE_C = [
  ['Clinical relevance', 'ปัญหาข้อเข่าเสื่อมของผู้ป่วยรายนี้ และเหตุผลที่พิจารณาการรักษาเสริม'],
  ['Credible evidence', 'อ้างอิงที่ตรวจแล้วเท่านั้น ด้านล่างยังรอตรวจแหล่งอ้างอิงทั้งหมด'],
  ['Clinical champion', 'แพทย์/เภสัชกร/แพทย์แผนไทยผู้ทบทวน และบันทึกผู้ตัดสินใจ'],
  ['Convenient workflow', 'อยู่ในหน้าสั่งยาเดิม ไม่ต้องกรอกซ้ำ'],
  ['Continuous feedback', 'ติดตามจากสิ่งที่ผู้ป่วยบันทึกจริง ไม่สร้างคะแนนเอง'],
];

export const KneeOAEvidencePanel: React.FC<{ currentCase: SyntheticCase }> = ({ currentCase }) => {
  const isKnee = /เข่า|knee/i.test(`${currentCase.current_encounter.chief_complaint} ${currentCase.current_encounter.symptoms.join(' ')}`);
  const link = linkForCase(currentCase.case_id);
  const [followup, setFollowup] = useState<ReturnType<typeof yaiStore.readDoseReportsForClinician> | null>(null);
  const [decision, setDecision] = useState<{ choice: 'APPROVE' | 'REJECT'; note: string; at: string } | null>(null);
  const [note, setNote] = useState('');
  if (!isKnee) return null;

  const kneeReports = (followup?.journal ?? []).flatMap((e) =>
    e.segments.filter((s) => s.category === 'SYMPTOM' && /เข่า/.test(s.text)).map((s) => ({ date: e.recordedLocalDate, text: s.text, synthetic: e.isSynthetic }))
  );

  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="flex items-center gap-2 text-base font-bold text-slate-800">
          <BookOpenCheck className="h-4 w-4 text-brand-700" /> ข้อเข่าเสื่อม: หลักฐานและการติดตาม (ไม่บังคับ)
        </h3>
        <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-800">หลักฐานรอตรวจแหล่งอ้างอิง</span>
      </div>
      <p className="text-xs text-slate-500">
        การแพทย์แผนไทยอาจเป็นทางเลือกเสริมในข้อบ่งใช้ที่คัดเลือกและมีหลักฐานรองรับ ระบบไม่เลือกยาหรือขนาดยาแทนแพทย์ และไม่สรุปว่าไม่มีอันตรกิริยา
      </p>

      <ul className="grid gap-1 text-xs sm:grid-cols-2">
        {FIVE_C.map(([k, v]) => (
          <li key={k} className="rounded-lg bg-slate-50 p-2">
            <b>{k}:</b> {v}
          </li>
        ))}
      </ul>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-xs">
          <thead className="text-slate-500">
            <tr>
              <th className="p-1">อ้างอิง</th>
              <th className="p-1">ข้อความที่ได้รับมา</th>
              <th className="p-1">ข้อจำกัด</th>
              <th className="p-1">สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {REFERENCES.map((r) => (
              <tr key={r.reference_id} className="border-t border-slate-100 align-top">
                <td className="p-1 font-mono">{r.reference_id}</td>
                <td className="p-1">{r.original_claim}</td>
                <td className="p-1">{r.clinical_limitations}</td>
                <td className="p-1 font-semibold text-amber-700">รอตรวจ (ไม่มี DOI/PMID ที่ยืนยัน)</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Link to="/research" className="inline-block text-xs font-semibold text-brand-700 underline">
        เปิดคลังงานวิจัย: ค้นงานใหม่จาก PubMed / ClinicalTrials.gov และบันทึกงานที่อ่านแล้ว
      </Link>

      <div className="space-y-1 rounded-xl border border-slate-200 p-3 text-sm">
        <p className="font-bold text-slate-800">การติดตามจากผู้ป่วย</p>
        {!link ? (
          <p className="text-slate-500">เคสนี้ยังไม่ได้เชื่อมกับยายพร้อม</p>
        ) : !followup ? (
          <button type="button" className="text-sm font-semibold text-brand-700 underline" onClick={() => setFollowup(yaiStore.readDoseReportsForClinician(link.recipientId))}>
            ดูอาการเข่าที่ผู้ป่วยบันทึก (ต้องได้รับอนุญาต)
          </button>
        ) : !followup.allowed ? (
          <p className="text-rose-700">ผู้ป่วยยังไม่อนุญาต (บันทึกการพยายามเข้าถึงไว้แล้ว)</p>
        ) : (
          <>
            {kneeReports.length === 0 ? (
              <p className="text-slate-500">ยังไม่มีบันทึกอาการเข่า</p>
            ) : (
              <ul className="text-xs">
                {kneeReports.map((r, i) => (
                  <li key={i}>
                    {r.date}: "{r.text}" {r.synthetic ? '(ตัวอย่าง)' : ''}
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-slate-500">
              ไม่มีคะแนน VAS/WOMAC ที่เก็บตามเครื่องมือมาตรฐาน จึงไม่แสดงคะแนนหรือกราฟผลการรักษา · ยาที่ยังไม่ทราบชนิดในยายพร้อม: {followup.pendingMedicines} รายการ (ประวัติยายังไม่ครบ)
            </p>
          </>
        )}
      </div>

      <div className="space-y-2 rounded-xl border border-slate-200 p-3 text-sm">
        <p className="font-bold text-slate-800">การตัดสินใจของแพทย์ต่อแผนการดูแลเสริม (จำลอง)</p>
        {decision ? (
          <p>
            {decision.choice === 'APPROVE' ? 'เห็นชอบให้พิจารณา' : 'ไม่ใช้'} · {decision.note || 'ไม่มีหมายเหตุ'} · {new Date(decision.at).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}{' '}
            <button type="button" className="ml-2 text-xs underline" onClick={() => setDecision(null)}>
              แก้
            </button>
          </p>
        ) : (
          <>
            <input
              className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
              placeholder="เหตุผลประกอบการตัดสินใจ"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDecision({ choice: 'APPROVE', note, at: new Date().toISOString() })}
                className="flex min-h-[40px] items-center gap-1 rounded-xl bg-emerald-700 px-3 text-sm font-bold text-white"
              >
                <CheckCircle2 className="h-4 w-4" /> เห็นชอบให้พิจารณา
              </button>
              <button
                type="button"
                onClick={() => setDecision({ choice: 'REJECT', note, at: new Date().toISOString() })}
                className="flex min-h-[40px] items-center gap-1 rounded-xl border border-slate-300 px-3 text-sm font-bold text-slate-700"
              >
                <XCircle className="h-4 w-4" /> ไม่ใช้
              </button>
            </div>
            <p className="text-xs text-slate-500">การตัดสินใจนี้ไม่สร้างคำสั่งยาเอง ต้องสั่งยาผ่านขั้นตอนปกติด้านบน</p>
          </>
        )}
      </div>
    </section>
  );
};
