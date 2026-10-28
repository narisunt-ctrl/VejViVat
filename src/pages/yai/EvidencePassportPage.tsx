import React from 'react';
import { Link } from 'react-router-dom';
import { Card, MedStatusChip, PageTitle, formatThaiDateTime, originLabel } from '../../components/yai/ui';
import { CategoryChip, SourceVerificationChip } from '../../components/yai/SourceVerificationChip';
import { demoNow, useYai } from '../../services/yai/yaiStore';
import { useClinicianOrderSync } from '../../services/yai/useOrderSync';
import { orderStatusLabels } from '../../domain/yai/prescriptionSync';
import { missingFields } from '../../domain/yai/policies';
import { bangkokDate, isConfirmed, thaiDateLabel } from '../../domain/yai/journal';

/**
 * Evidence Passport: everything recorded about the patient's medicines and health statements, each with its source
 * (label photo, patient, caregiver, clinician) and who verified it. Unknowns are listed, never filled in.
 */
export const EvidencePassportPage: React.FC = () => {
  const state = useYai((s) => s);
  useClinicianOrderSync();
  const orders = state.syncedOrders ?? [];
  const meds = state.medicines.filter((m) => !m.linkedOrderKey);
  const pending = meds.filter((m) => m.pendingIdentification);
  const since = bangkokDate(new Date(demoNow(state).getTime() - 14 * 86_400_000));
  const statements = (state.journal ?? [])
    .filter((e) => isConfirmed(e) && e.recordedLocalDate >= since)
    .flatMap((e) => e.segments.map((s) => ({ s, e })));
  const unknownStatements = statements.filter(({ s }) => s.unknown);

  return (
    <div className="space-y-5">
      <PageTitle title="Evidence Passport" subtitle="ข้อมูลทุกอย่างพร้อมที่มา: ฉลาก · คุณยายบอก · ผู้ดูแล · บุคลากร" back="/yai" />
      <p className="rounded-2xl bg-amber-50 p-3 text-base font-semibold text-amber-950">ข้อมูลจำลองสำหรับสาธิต ไม่ใช่เวชระเบียน ไม่ใช่คำสั่งยา</p>

      <Card className="space-y-3">
        <h2 className="text-xl font-bold">1. คำสั่งยาจากแพทย์ (ข้อมูลจำลอง)</h2>
        {orders.length === 0 && <p className="text-base text-yai-ink/70">ยังไม่มีคำสั่งยาที่ส่งมาจากคลินิก</p>}
        {orders.map((r) => (
          <div key={r.key} className="rounded-2xl border border-yai-ink/10 p-3">
            <p className="text-lg font-bold">{r.snapshot.medicineName ?? 'ยังไม่ระบุชื่อยา'}</p>
            <p className="text-base">
              {r.snapshot.dosePerAdministration ?? '-'} · {r.snapshot.directions ?? '-'}
            </p>
            <div className="mt-1 flex flex-wrap gap-1 text-sm">
              {orderStatusLabels(r).map((l) => (
                <span key={l.key} className="rounded-full border border-yai-ink/15 px-2 py-0.5 font-semibold">
                  {l.label}
                </span>
              ))}
            </div>
            <p className="mt-1 text-sm text-yai-ink/70">
              อ้างอิงคำสั่ง {r.snapshot.sourceOrderId} ฉบับที่ {r.snapshot.sourceVersion} · ผู้รับรอง: {r.snapshot.approvedBy ?? 'ยังไม่มี'} · จ่ายยา: {r.snapshot.dispensedBy ?? 'ยังไม่ยืนยัน'}
            </p>
          </div>
        ))}
      </Card>

      <Card className="space-y-3">
        <h2 className="text-xl font-bold">2. ยาและสมุนไพรที่บันทึกไว้</h2>
        {meds.map((m) => (
          <Link key={m.id} to={`/yai/medicines/${m.id}`} className="block rounded-2xl border border-yai-ink/10 p-3 hover:border-yai-teal">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-lg font-bold">{m.displayName.value ?? 'ยังไม่ทราบชื่อ'}</span>
              <MedStatusChip status={m.status} />
            </div>
            <p className="mt-1 text-sm">
              ชื่อยามาจาก: {originLabel(m.displayName.origin)} · คำบอกเล่าการใช้: {m.useReports.map((r) => originLabel(r.origin)).join(', ') || 'ยังไม่มี'}
            </p>
            {missingFields(m).length > 0 && <p className="text-sm text-yai-warn">ยังไม่ทราบ: {missingFields(m).join(', ')}</p>}
          </Link>
        ))}
        {pending.length > 0 && (
          <p className="rounded-2xl bg-amber-50 p-3 text-base text-amber-950">
            ยาไม่มีฉลาก/ยังไม่ทราบชนิด {pending.length} รายการ: รอเภสัชกรหรือแพทย์แผนไทยช่วยระบุ ไม่มีการตั้งเตือน และทำให้การตรวจยาตีกันยังไม่ครบ
          </p>
        )}
      </Card>

      <Card className="space-y-2">
        <h2 className="text-xl font-bold">3. สิ่งที่ยายเล่า 14 วันล่าสุด</h2>
        <p className="text-sm text-yai-ink/70">เป็นคำบอกเล่าของผู้ป่วย ไม่ใช่การวินิจฉัย การบอกว่ากินยาแล้วไม่ใช่หลักฐานว่ากลืนยาจริง</p>
        {statements.length === 0 && <p className="text-base text-yai-ink/70">ยังไม่มีบันทึก</p>}
        <ul className="space-y-2">
          {statements.slice(0, 30).map(({ s, e }) => (
            <li key={`${e.id}-${s.id}`} className="flex flex-wrap items-center gap-2 border-b border-yai-ink/5 pb-2">
              <span className="w-24 shrink-0 text-sm text-yai-ink/70">{thaiDateLabel(e.recordedLocalDate)}</span>
              <CategoryChip category={s.category} />
              <span className="text-base">{s.unknown ? `${s.text} (ยังไม่ทราบ)` : s.text}</span>
              <SourceVerificationChip source={e.inputSource} synthetic={e.isSynthetic} />
            </li>
          ))}
        </ul>
      </Card>

      <Card className="space-y-2">
        <h2 className="text-xl font-bold">4. ยายรายงานการกินยา</h2>
        {state.doseLogs.length === 0 ? (
          <p className="text-base text-yai-ink/70">ยังไม่มีรายงาน</p>
        ) : (
          <ul className="space-y-1 text-base">
            {state.doseLogs.slice(0, 10).map((l) => {
              const plan = state.reminders.find((p) => p.id === l.reminderPlanId);
              const med = state.medicines.find((m) => m.id === plan?.medicineId);
              return (
                <li key={l.id}>
                  {med?.displayName.value ?? 'ยา'} เวลา {l.scheduledAt.slice(11)} ·{' '}
                  {l.response === 'TAKEN_REPORTED' ? 'ยายบอกว่ากินแล้ว' : l.response === 'NOT_YET_REPORTED' ? 'ยายบอกว่ายังไม่ได้กิน' : 'ไม่แน่ใจ'} · {formatThaiDateTime(l.reportedAt)}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {unknownStatements.length > 0 && (
        <Card>
          <h2 className="text-xl font-bold">5. สิ่งที่ยายบอกว่ายังไม่ทราบ</h2>
          <ul className="mt-2 list-disc pl-6 text-base">
            {unknownStatements.map(({ s, e }) => (
              <li key={`${e.id}-${s.id}-u`}>{s.text || 'ไม่ระบุ'}</li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
};
