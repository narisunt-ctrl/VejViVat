import React from 'react';
import { MedicationPassport } from '../../domain/yai/models';
import { screenInteractions, SAMPLE_RULES_COVERAGE } from '../../domain/yai/policies';
import { Notice } from './ui';

/** Coverage-aware screening message. There is deliberately no "safe" state. */
export const ScreeningNotice: React.FC<{ medicines: MedicationPassport[]; audience?: 'patient' | 'clinician' }> = ({ medicines, audience = 'patient' }) => {
  const res = screenInteractions(medicines);
  const nameOf = (id: string) => medicines.find((m) => m.id === id)?.displayName.value ?? 'ยาที่ยังไม่ทราบชื่อ';

  if (res.verdict === 'MATCHED_UNREVIEWED') {
    return (
      <Notice tone="warn" title={audience === 'patient' ? 'ควรถามเภสัชกรเรื่องยาที่ใช้ร่วมกัน' : 'พบคู่ในกฎตัวอย่าง (ยังไม่ผ่านการทบทวน)'}>
        <ul className="list-disc pl-5">
          {res.matches.map((m) => (
            <li key={m.rule.a + m.rule.b}>
              {nameOf(m.medicineIds[0])} + {nameOf(m.medicineIds[1])}
              {audience === 'clinician' && <span className="block text-sm">{m.rule.note}</span>}
            </li>
          ))}
        </ul>
        <p className="mt-1 text-sm">{audience === 'patient' ? 'อย่าเพิ่งหยุดหรือเปลี่ยนยาเอง ให้คุณหมอหรือเภสัชกรช่วยดูก่อนค่ะ' : SAMPLE_RULES_COVERAGE}</p>
      </Notice>
    );
  }
  return (
    <Notice title={res.verdict === 'INSUFFICIENT_INFORMATION' ? 'ข้อมูลยังไม่ครบ ยังตรวจยาที่ใช้ร่วมกันไม่ได้' : 'ยังยืนยันไม่ได้ว่าปลอดภัย'}>
      {res.verdict === 'INSUFFICIENT_INFORMATION'
        ? `มี ${res.unidentifiedCount} รายการที่ยังไม่ทราบว่าเป็นยาอะไร ต้องให้ผู้เชี่ยวชาญช่วยระบุก่อน`
        : 'ไม่พบคู่ยาในฐานข้อมูลตัวอย่างซึ่งมีน้อยมาก ยังไม่ได้ประเมินทุกคู่ยา ควรให้เภสัชกรตรวจสอบ'}
      {audience === 'clinician' && <span className="block text-sm">{SAMPLE_RULES_COVERAGE}</span>}
    </Notice>
  );
};
