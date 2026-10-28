import React from 'react';
import { MedicationPassport, YaiState } from '../../domain/yai/models';
import { missingFields, useDiscrepancy, SIDE_INFO } from '../../domain/yai/policies';
import { originLabel } from './ui';
import { ScreeningNotice } from './ScreeningNotice';
import { CompletenessGrid } from './CompletenessGrid';

/**
 * Source-linked pre-visit packet: what is known, what is unknown, disagreements and questions.
 * The sections are shared by the patient preview and the clinician tabs so both see the same content.
 */

export function packetQuestions(state: YaiState): string[] {
  const conflictQs = state.medicines
    .filter(useDiscrepancy)
    .map((m) => `${m.displayName.value ?? 'ยาที่ยังไม่ทราบชื่อ'}: ฉลากกับวิธีที่ใช้จริงไม่ตรงกัน ควรใช้อย่างไร`);
  const unresolved = state.medicines.flatMap((m) => m.unresolvedQuestions.filter((q) => !q.startsWith('ข้อมูลวิธีใช้')));
  return Array.from(new Set([...conflictQs, ...unresolved, 'ยาและสมุนไพรทั้งหมดนี้ใช้ร่วมกันได้หรือไม่']));
}

export function packetStats(state: YaiState) {
  const incomplete = state.medicines.filter((m) => m.pendingIdentification || missingFields(m).length > 0).length;
  return { total: state.medicines.length, incomplete, questions: packetQuestions(state).length };
}

export const PacketStats: React.FC<{ state: YaiState }> = ({ state }) => {
  const s = packetStats(state);
  const tile = (n: number, label: string, cls: string) => (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 text-center">
      <p className={`text-3xl font-bold ${cls}`}>{n}</p>
      <p className="text-sm">{label}</p>
    </div>
  );
  return (
    <div className="grid grid-cols-3 gap-2">
      {tile(s.total, 'รายการยา', 'text-yai-deep')}
      {tile(s.incomplete, 'รายการไม่ครบ', s.incomplete ? 'text-yai-alert' : 'text-yai-deep')}
      {tile(s.questions, 'คำถามแนะนำ', 'text-yai-deep')}
    </div>
  );
};

export const PatientHeader: React.FC<{ state: YaiState }> = ({ state }) => (
  <div>
    <p className="font-bold">
      ผู้ป่วย: {state.patient.displayName} · อายุ {state.patient.age} ปี{state.patient.hn ? ` · HN ${state.patient.hn}` : ''}
    </p>
    <p className="text-sm opacity-75">สร้างจากข้อมูลที่ผู้ป่วยและครอบครัวบันทึก ยังไม่ใช่เวชระเบียนและยังไม่ผ่านการยืนยันโดยบุคลากร</p>
  </div>
);

export const MedicinesSection: React.FC<{ state: YaiState; audience: 'patient' | 'clinician'; onDemoReview?: (id: string) => void }> = ({
  state,
  audience,
  onDemoReview,
}) => {
  const known = state.medicines.filter((m) => !m.pendingIdentification);
  const unknown = state.medicines.filter((m) => m.pendingIdentification);
  return (
    <div className="space-y-4">
      <section>
        <h3 className="text-lg font-bold">รายการที่ทราบ ({known.length})</h3>
        <ul className="mt-2 space-y-3">
          {known.map((m) => (
            <MedRow key={m.id} m={m} audience={audience} onDemoReview={onDemoReview} />
          ))}
        </ul>
      </section>
      <section>
        <h3 className="text-lg font-bold">ยังไม่ทราบ / ต้องตรวจสอบ ({unknown.length})</h3>
        {unknown.length === 0 ? (
          <p>ไม่มี</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {unknown.map((m) => (
              <li key={m.id} className="rounded-xl border border-amber-300 bg-amber-50 p-3">
                <p className="font-bold">รายการที่ยังไม่ทราบชื่อ</p>
                <p className="text-sm">{m.useReports.map((r) => `${originLabel(r.origin)}: ${r.value}`).join(' · ') || 'ไม่มีคำอธิบาย'}</p>
                <p className="text-sm text-amber-900">ไม่ทราบชื่อพืช ส่วนประกอบ และความแรง</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export const RiskSection: React.FC<{ state: YaiState; audience: 'patient' | 'clinician' }> = ({ state, audience }) => {
  const conflicts = state.medicines.filter(useDiscrepancy);
  return (
    <div className="space-y-4">
      <ScreeningNotice medicines={state.medicines} audience={audience} />
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
    </div>
  );
};

export const QuestionsSection: React.FC<{ state: YaiState }> = ({ state }) => (
  <section>
    <h3 className="text-lg font-bold">คำถามที่ควรซักเพิ่มเติม</h3>
    <ol className="mt-2 list-decimal space-y-1 pl-5">
      {packetQuestions(state).map((q) => (
        <li key={q}>{q}</li>
      ))}
    </ol>
    <p className="mt-2 text-xs opacity-70">สร้างจากกฎตรวจข้อมูลที่ขาดและข้อมูลที่ไม่ตรงกัน ไม่ได้สร้างโดย AI</p>
  </section>
);

export const NoteSection: React.FC<{ state: YaiState }> = ({ state }) =>
  state.previsitNote?.trim() ? (
    <section>
      <h3 className="text-lg font-bold">บันทึกเพิ่มเติมจากผู้ป่วย</h3>
      <p className="mt-1 whitespace-pre-wrap rounded-xl bg-slate-50 p-3">{state.previsitNote}</p>
    </section>
  ) : null;

export const PhotosSection: React.FC<{ state: YaiState }> = ({ state }) => {
  const groups = state.medicines
    .map((m) => ({ m, photos: state.photos.filter((p) => m.photoIds.includes(p.id)) }))
    .filter((g) => g.photos.length > 0);
  if (groups.length === 0) return <p>ยังไม่มีภาพฉลากในข้อมูลที่ส่งมา (รายการตัวอย่างไม่มีรูป)</p>;
  return (
    <div className="space-y-4">
      {groups.map(({ m, photos }) => (
        <section key={m.id}>
          <h3 className="font-bold">{m.displayName.value ?? 'รายการที่ยังไม่ทราบชื่อ'}</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {photos.map((p) => (
              <figure key={p.id}>
                <a href={p.dataUrl} target="_blank" rel="noreferrer">
                  <img src={p.dataUrl} alt={`ภาพฉลาก ${p.side ? SIDE_INFO[p.side].label : ''}`} className="h-32 w-28 rounded-lg object-cover" />
                </a>
                <figcaption className="text-center text-xs">{p.side ? SIDE_INFO[p.side].label : 'ไม่ระบุด้าน'}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};

/** Full packet, used for the patient preview and printing */
export const PreVisitReport: React.FC<{ state: YaiState; audience: 'patient' | 'clinician'; onDemoReview?: (medicineId: string) => void }> = ({
  state,
  audience,
  onDemoReview,
}) => (
  <div className="space-y-5 text-base">
    <PatientHeader state={state} />
    <PacketStats state={state} />
    <RiskSection state={state} audience={audience} />
    <MedicinesSection state={state} audience={audience} onDemoReview={onDemoReview} />
    <QuestionsSection state={state} />
    <NoteSection state={state} />
  </div>
);

const MedRow: React.FC<{ m: MedicationPassport; audience: 'patient' | 'clinician'; onDemoReview?: (id: string) => void }> = ({ m, audience, onDemoReview }) => (
  <li className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
    <div>
      <p className="font-bold">{m.displayName.value}</p>
      <p className="text-sm">
        ความแรงบนฉลาก: {m.labelStrength.value ?? 'ไม่ทราบ'} · ที่มา: {originLabel(m.displayName.origin)}
        {m.displayName.isSynthetic ? ' (ข้อมูลตัวอย่าง)' : ''}
        {typeof m.displayName.extractionConfidence === 'number' ? ` · OCR ${Math.round(m.displayName.extractionConfidence * 100)}%` : ''}
      </p>
      <p className="text-sm">ใช้จริงตามที่เล่า: {m.useReports.map((r) => `${originLabel(r.origin)} "${r.value}"`).join(' · ') || 'ยังไม่มี'}</p>
    </div>
    <CompletenessGrid medicine={m} compact />
    <p className="text-sm font-semibold">
      สถานะ:{' '}
      {m.status === 'CLINICIAN_VERIFIED' ? 'ทบทวนแล้ว (การทบทวนจำลอง ไม่ใช่ลายเซ็นจริง)' : m.status === 'PATIENT_CONFIRMED' ? 'ผู้ป่วยยืนยันว่าใช้อยู่' : 'รอตรวจสอบ'}
    </p>
    {audience === 'clinician' && onDemoReview && m.status !== 'CLINICIAN_VERIFIED' && (
      <button className="min-h-[40px] rounded-lg border border-violet-300 bg-violet-50 px-3 text-sm font-bold text-violet-800" onClick={() => onDemoReview(m.id)}>
        ทำเครื่องหมายว่าทบทวนแล้ว (จำลอง)
      </button>
    )}
  </li>
);
