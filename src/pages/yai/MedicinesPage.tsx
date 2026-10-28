import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Camera, PackageOpen } from 'lucide-react';
import { useYai } from '../../services/yai/yaiStore';
import { MedicationPassport } from '../../domain/yai/models';
import { useDiscrepancy } from '../../domain/yai/policies';
import { BigLink, Card, MedStatusChip, Notice, PageTitle } from '../../components/yai/ui';
import { ScreeningNotice } from '../../components/yai/ScreeningNotice';

const KIND_LABEL: Record<MedicationPassport['kind'], string> = {
  CONVENTIONAL: 'ยาแผนปัจจุบัน',
  HERBAL_FORMULA: 'ยาสมุนไพร',
  BOTANICAL: 'สมุนไพร',
  SUPPLEMENT: 'วิตามิน/อาหารเสริม',
  UNKNOWN: 'ยังไม่ทราบชนิด',
};

export const MedicinesPage: React.FC = () => {
  const medicines = useYai((s) => s.medicines);
  const [params] = useSearchParams();
  const confirmed = medicines.filter((m) => m.status === 'PATIENT_CONFIRMED' || m.status === 'CLINICIAN_VERIFIED');
  const pending = medicines.filter((m) => !confirmed.includes(m));

  return (
    <div className="space-y-5">
      <PageTitle title="ยาของยาย" subtitle={`บันทึกไว้ ${medicines.length} รายการ`} />
      {params.get('saved') && (
        <Notice title={params.get('saved') === 'pending' ? 'บันทึกเท่าที่มีแล้ว รอผู้เชี่ยวชาญช่วยระบุ' : 'บันทึกยาแล้ว'} />
      )}

      <ScreeningNotice medicines={medicines} />

      <Section title="กำลังใช้อยู่ตามที่ยายบอก" items={confirmed} empty="ยังไม่มียาที่ยืนยันแล้ว" />
      <Section title="ยังยืนยันไม่ครบ / ควรถามผู้เชี่ยวชาญ" items={pending} empty="ไม่มี" />

      <div className="grid gap-3">
        <BigLink to="/yai/scan" icon={<Camera className="h-6 w-6" />}>
          ถ่ายรูปยาเพิ่ม
        </BigLink>
        <BigLink to="/yai/scan/review?onlyThis=1" variant="secondary" icon={<PackageOpen className="h-6 w-6" />}>
          เพิ่มยาที่ไม่มีฉลาก
        </BigLink>
        <BigLink to="/yai/previsit" variant="ghost">
          สรุปรายการยาให้คุณหมอ →
        </BigLink>
      </div>
    </div>
  );
};

const Section: React.FC<{ title: string; items: MedicationPassport[]; empty: string }> = ({ title, items, empty }) => (
  <section className="space-y-3">
    <h2 className="text-xl font-bold">{title}</h2>
    {items.length === 0 ? (
      <p className="text-lg text-yai-ink/70">{empty}</p>
    ) : (
      items.map((m) => <MedicineCard key={m.id} m={m} />)
    )}
  </section>
);

const MedicineCard: React.FC<{ m: MedicationPassport }> = ({ m }) => (
  <Link to={`/yai/medicines/${m.id}`} className="block">
    <Card className="space-y-2 hover:border-yai-teal">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xl font-bold">{m.displayName.value ?? 'ยาที่ยังไม่ทราบชื่อ'}</p>
        <span className="shrink-0 text-2xl text-yai-deep" aria-hidden="true">›</span>
      </div>
      <p className="text-base text-yai-ink/75">
        {KIND_LABEL[m.kind]}
        {m.labelStrength.value ? ` · ฉลากเขียน ${m.labelStrength.value}` : ''}
      </p>
      <div className="flex flex-wrap gap-2">
        <MedStatusChip status={m.status} />
        {useDiscrepancy(m) && <span className="rounded-full border border-yai-warn/40 bg-amber-50 px-2.5 py-0.5 text-sm font-semibold text-yai-warn">วิธีใช้ไม่ตรงกัน</span>}
        {m.displayName.isSynthetic && <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-sm text-yai-warn">ข้อมูลตัวอย่าง</span>}
      </div>
    </Card>
  </Link>
);
