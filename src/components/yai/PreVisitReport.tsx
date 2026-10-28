import React from 'react';
import { MedicationPassport, YaiState } from '../../domain/yai/models';
import { missingFields, useDiscrepancy } from '../../domain/yai/policies';
import { originLabel } from './ui';
import { ScreeningNotice } from './ScreeningNotice';

/**
 * Source-linked pre-visit packet: what is known, what is unknown, disagreements and questions.
 * Shared by the patient preview and the clinician view so both see exactly the same content.
 */
export const PreVisitReport: React.FC<{
  state: YaiState;
  audience: 'patient' | 'clinician';
  onDemoReview?: (medicineId: string) => void;
}> = ({ state, audience, onDemoReview }) => {
  const meds = state.medicines;
  const known = meds.filter((m) => !m.pendingIdentification);
  const unknown = meds.filter((m) => m.pendingIdentification);
  const conflicts = meds.filter(useDiscrepancy);
  const questions = Array.from(new Set(meds.flatMap((m) => m.unresolvedQuestions)));

  return (
    <div className="space-y-4 text-base">
      <div>
        <p className="font-bold">
          ผู้ป่วย: {state.patient.displayName} · อายุ {state.patient.age} ปี
        </p>
        <p className="text-sm opacity-75">สร้างจากข้อมูลที่ผู้ป่วยและครอบครัวบันทึก ยังไม่ใช่เวชระเบียนและยังไม่ผ่านการยืนยันโดยบุคลากร</p>
      </div>

      <ScreeningNotice medicines={meds} audience={audience} />

      <section>
        <h3 className="text-lg font-bold">ข้อมูลที่ทราบ ({known.length})</h3>
        <ul className="mt-2 space-y-3">
          {known.map((m) => (
            <MedRow key={m.id} m={m} audience={audience} onDemoReview={onDemoReview} />
          ))}
        </ul>
      </section>

      <section>
        <h3 className="text-lg font-bold">ยังไม่ทราบ / รอระบุ ({unknown.length})</h3>
        {unknown.length === 0 ? (
          <p>ไม่มี</p>
        ) : (
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {unknown.map((m) => (
              <li key={m.id}>{m.useReports.map((r) => `${originLabel(r.origin)}: ${r.value}`).join(' · ') || 'ไม่มีคำอธิบาย'}</li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="text-lg font-bold">ความขัดแย้งเรื่องวิธีใช้ ({conflicts.length})</h3>
        {conflicts.length === 0 ? (
          <p>ไม่พบ</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {conflicts.map((m) => (
              <li key={m.id} className="rounded-xl border border-amber-300 bg-amber-50 p-3">
                <b>{m.displayName.value}</b>
                <ul className="mt-1 list-disc pl-5">
                  {m.labelDirections.value && <li>ฉลาก: {m.labelDirections.value}</li>}
                  {m.useReports.map((r, i) => (
                    <li key={i}>
                      {originLabel(r.origin)}: {r.value}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="text-lg font-bold">คำถามสำหรับคุณหมอ</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {questions.map((q) => (
            <li key={q}>{q}</li>
          ))}
          <li>ยาและสมุนไพรทั้งหมดนี้ใช้ร่วมกันได้หรือไม่</li>
        </ul>
      </section>
    </div>
  );
};

const MedRow: React.FC<{ m: MedicationPassport; audience: 'patient' | 'clinician'; onDemoReview?: (id: string) => void }> = ({ m, audience, onDemoReview }) => {
  const missing = missingFields(m);
  return (
    <li className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="font-bold">{m.displayName.value}</p>
      <p className="text-sm">
        ความแรงบนฉลาก: {m.labelStrength.value ?? 'ไม่ทราบ'} · ที่มา: {originLabel(m.displayName.origin)}
        {m.displayName.isSynthetic ? ' (ข้อมูลตัวอย่าง)' : ''}
        {typeof m.displayName.extractionConfidence === 'number' ? ` · OCR ${Math.round(m.displayName.extractionConfidence * 100)}%` : ''}
      </p>
      <p className="text-sm">ใช้จริงตามที่เล่า: {m.useReports.map((r) => `${originLabel(r.origin)} "${r.value}"`).join(' · ') || 'ยังไม่มี'}</p>
      {missing.length > 0 && <p className="text-sm text-amber-800">ยังไม่ทราบ: {missing.join(', ')}</p>}
      <p className="text-sm font-semibold">
        สถานะ:{' '}
        {m.status === 'CLINICIAN_VERIFIED' ? 'ทบทวนแล้ว (การทบทวนจำลอง ไม่ใช่ลายเซ็นจริง)' : m.status === 'PATIENT_CONFIRMED' ? 'ผู้ป่วยยืนยันว่าใช้อยู่' : 'รอตรวจสอบ'}
      </p>
      {audience === 'clinician' && onDemoReview && m.status !== 'CLINICIAN_VERIFIED' && (
        <button className="mt-2 min-h-[40px] rounded-lg border border-violet-300 bg-violet-50 px-3 text-sm font-bold text-violet-800" onClick={() => onDemoReview(m.id)}>
          ทำเครื่องหมายว่าทบทวนแล้ว (จำลอง)
        </button>
      )}
    </li>
  );
};
