import React, { useState } from 'react';
import { AlertTriangle, ArrowRightLeft, CheckCircle2, Leaf, Pill, Send } from 'lucide-react';
import type { InteractionScreen } from '../../domain/yai/interactionCheck';
import { SEVERITY_TH } from '../../domain/yai/interactionCheck';
import type { JournalEntry } from '../../domain/yai/journal';
import { thaiDateLabel } from '../../domain/yai/journal';
import type { MedicationPassport } from '../../domain/yai/models';
import { consults } from '../../services/carebridge/consults';

// The modern-medicine doctor's view: only what changes a decision today, readable in about 30 seconds.
// (1) herb–drug safety against the drugs this doctor prescribes, (2) which herbal / Thai medicines the patient
// takes (medicine reconciliation), (3) what she reported recently, (4) one click to hand off to the TTM team.
// Everything else stays in the Thai traditional medicine view.

export const ModernDoctorSummary: React.FC<{
  patientId: string;
  screen: InteractionScreen;
  medicines: MedicationPassport[];
  journal: JournalEntry[];
  doseSummary: { taken: number; due: number };
  onOpenDetail: () => void;
}> = ({ patientId, screen, medicines, journal, doseSummary, onOpenDetail }) => {
  const [asking, setAsking] = useState(false);
  const [question, setQuestion] = useState('');
  const [sent, setSent] = useState(false);
  const herbal = medicines.filter((m) => m.kind === 'HERBAL_FORMULA' || m.kind === 'BOTANICAL' || m.kind === 'UNKNOWN' || m.pendingIdentification);
  const symptoms = journal.flatMap((e) => e.segments.filter((s) => s.category === 'SYMPTOM').map((s) => ({ s, date: e.recordedLocalDate })));
  const symptomDays = new Set(symptoms.map((x) => x.date)).size;
  const high = screen.flags.filter((f) => f.rule.severity_code === 'HIGH').length;
  const daysWith = (pred: (s: JournalEntry['segments'][number]) => boolean) => new Set(journal.filter((e) => e.segments.some(pred)).map((e) => e.recordedLocalDate)).size;
  const lowMoodDays = daysWith((s) => s.category === 'MOOD' && /ไม่ค่อยดี|แย่|เครียด|เศร้า|เหงา|กังวล|ท้อ/.test(s.text));
  const sleepDays = daysWith((s) => s.category === 'SLEEP');
  const activityDays = daysWith((s) => s.category === 'ACTIVITY');

  return (
    <div className="space-y-3">
      <p className="rounded-xl bg-sky-50 px-3 py-2 text-sm text-sky-900">
        มุมมองแพทย์แผนปัจจุบัน: แสดงเฉพาะเรื่องที่มีผลต่อการสั่งยาวันนี้ ·{' '}
        <button type="button" onClick={onOpenDetail} className="font-semibold underline">
          ดูรายละเอียดแบบแพทย์แผนไทย
        </button>
      </p>

      <div className="grid gap-3 md:grid-cols-2">
        <section className={`space-y-2 rounded-2xl border p-4 ${high ? 'border-rose-300 bg-rose-50' : screen.flags.length ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white'}`}>
          <h3 className="flex items-center gap-2 font-bold text-slate-900">
            <AlertTriangle className="h-5 w-5 text-rose-600" /> 1. ความปลอดภัยยา
          </h3>
          {screen.flags.length === 0 ? (
            <p className="text-sm">ไม่พบคู่ในฐานข้อมูลตัวอย่าง {screen.rulesChecked} คู่ (ไม่ได้แปลว่าปลอดภัย)</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {screen.flags.map((f) => (
                <li key={f.rule.interaction_id}>
                  <b>{f.rule.herb_thai_name}</b> + <b>{f.rule.drug_generic_name}</b> · ความรุนแรง{SEVERITY_TH[f.rule.severity_code]}
                  <span className="block text-xs text-slate-600">{f.rule.recommendation}</span>
                </li>
              ))}
            </ul>
          )}
          {screen.unidentifiedCount > 0 && <p className="text-xs font-semibold text-amber-800">มียาที่ยังไม่ทราบชนิด {screen.unidentifiedCount} รายการ การตรวจยังไม่ครบ</p>}
        </section>

        <section className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="flex items-center gap-2 font-bold text-slate-900">
            <Leaf className="h-5 w-5 text-emerald-700" /> 2. สมุนไพร/ยาแผนไทยที่ผู้ป่วยใช้
          </h3>
          {herbal.length === 0 ? (
            <p className="text-sm text-slate-600">ไม่มีรายการที่บันทึก</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {herbal.map((m) => (
                <li key={m.id} className="flex flex-wrap justify-between gap-2">
                  <span className="font-semibold">{m.displayName.value ?? 'ยังไม่ทราบชนิด'}</span>
                  <span className="text-xs text-slate-500">
                    {m.linkedOrderKey ? 'สั่งโดยแพทย์ (จำลอง)' : m.pendingIdentification ? 'ไม่มีฉลาก รอระบุ' : 'ผู้ป่วยใช้เอง'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="font-bold text-slate-900">3. ผู้ป่วยรายงาน 14 วัน</h3>
          <p className="text-sm">
            มีอาการที่บันทึก {symptomDays} วัน · กินยาตามคำสั่ง (รายงานเอง) {doseSummary.due ? `${doseSummary.taken}/${doseSummary.due}` : 'ยังไม่มีข้อมูล'}
          </p>
          <ul className="text-sm text-slate-700">
            {symptoms.slice(0, 3).map(({ s, date }) => (
              <li key={s.id}>
                {thaiDateLabel(date)}: “{s.text}”
              </li>
            ))}
          </ul>
          <p className="text-sm">
            อารมณ์ไม่ดี {lowMoodDays} วัน · เรื่องการนอน {sleepDays} วัน · ขยับร่างกาย {activityDays} วัน
          </p>
          <p className="text-xs text-slate-500">คำบอกเล่าของผู้ป่วย ไม่ใช่การวินิจฉัยหรือแบบคัดกรอง</p>
        </section>

        <section className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="flex items-center gap-2 font-bold text-slate-900">
            <ArrowRightLeft className="h-5 w-5 text-violet-700" /> 4. ส่งต่อทีมแพทย์แผนไทย
          </h3>
          {sent ? (
            <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
              <CheckCircle2 className="h-4 w-4" /> ส่งคำขอปรึกษาแล้ว ทีมแพทย์แผนไทยจะเห็นในมุมมองของตน
            </p>
          ) : asking ? (
            <>
              <textarea
                className="min-h-[70px] w-full rounded-lg border border-slate-300 p-2 text-sm"
                placeholder="เช่น ผู้ป่วยใช้ warfarin ขอให้ทบทวนสมุนไพรที่ใช้อยู่"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
              />
              <button
                type="button"
                disabled={!question.trim()}
                onClick={() => {
                  consults.request({ patientId, from: 'แพทย์แผนปัจจุบัน (สาธิต)', question: question.trim(), ruleIds: screen.flags.map((f) => f.rule.interaction_id) });
                  setSent(true);
                }}
                className="flex min-h-[40px] items-center gap-1.5 rounded-xl bg-violet-700 px-3 text-sm font-bold text-white disabled:opacity-40"
              >
                <Send className="h-4 w-4" /> ส่งปรึกษา
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setAsking(true)} className="flex min-h-[40px] items-center gap-1.5 rounded-xl bg-violet-700 px-3 text-sm font-bold text-white">
              <Pill className="h-4 w-4" /> ส่งปรึกษาแพทย์แผนไทย
            </button>
          )}
          <p className="text-xs text-slate-500">แนบคู่ยาที่อาจตีกันไปให้อัตโนมัติ ไม่ต้องพิมพ์ซ้ำ</p>
        </section>
      </div>
    </div>
  );
};
