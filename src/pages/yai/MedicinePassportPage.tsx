import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useYai, yaiStore } from '../../services/yai/yaiStore';
import { EvidenceField } from '../../domain/yai/models';
import { missingFields, useDiscrepancy } from '../../domain/yai/policies';
import { BigButton, Card, Field, inputCls, MedStatusChip, Notice, PageTitle, SourceChip, originLabel, formatThaiDateTime } from '../../components/yai/ui';

/** Evidence Passport: every field shows where it came from and how sure we are. */
export const MedicinePassportPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const state = useYai((s) => s);
  const m = state.medicines.find((x) => x.id === id);
  const [reportText, setReportText] = useState('');
  const [reportOrigin, setReportOrigin] = useState<'PATIENT_VOICE' | 'CAREGIVER_VOICE'>('PATIENT_VOICE');
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!m) {
    return (
      <div className="space-y-4">
        <PageTitle title="ไม่พบรายการยานี้" back="/yai/medicines" />
      </div>
    );
  }
  const photos = state.photos.filter((p) => m.photoIds.includes(p.id));
  const missing = missingFields(m);
  const discrepancy = useDiscrepancy(m);
  const hasReminder = state.reminders.some((r) => r.medicineId === m.id && r.status === 'ACTIVE');

  return (
    <div className="space-y-5">
      <PageTitle title={m.displayName.value ?? 'ยาที่ยังไม่ทราบชื่อ'} subtitle="บัตรข้อมูลยา (Evidence Passport)" back="/yai/medicines" />
      <MedStatusChip status={m.status} />

      {m.pendingIdentification && (
        <Notice tone="warn" title="รอผู้เชี่ยวชาญช่วยระบุ">
          ระบบไม่เดาว่าเป็นยาอะไร และจะไม่ตั้งเตือนกินยานี้จนกว่าจะระบุได้
        </Notice>
      )}

      {photos.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {photos.map((p) => (
            <img key={p.id} src={p.dataUrl} alt="รูปหลักฐานจากฉลาก" className="h-32 w-28 shrink-0 rounded-xl object-cover" />
          ))}
        </div>
      )}

      <Card className="space-y-4">
        <h2 className="text-xl font-bold">ข้อมูลบนฉลาก</h2>
        <Row label="ชื่อยา" f={m.displayName} />
        {m.ingredients.length > 0 ? m.ingredients.map((f, i) => <Row key={i} label="ส่วนประกอบ" f={f} />) : <Row label="ส่วนประกอบ" f={{ ...m.displayName, value: null }} />}
        <Row label="ความแรงที่พิมพ์บนฉลาก" f={m.labelStrength} note="ไม่ใช่ปริมาณที่กินจริง" />
        <Row label="วิธีใช้ตามฉลาก" f={m.labelDirections} />
        <Row label="เลขทะเบียน" f={m.registrationNumber} />
      </Card>

      <Card className="space-y-3">
        <h2 className="text-xl font-bold">ใช้จริงอย่างไร (สามเสียง)</h2>
        {discrepancy && (
          <Notice tone="warn" title="ข้อมูลไม่ตรงกัน">
            ระบบเก็บไว้ทุกแบบ ไม่ตัดสินว่าแบบไหนถูก ให้คุณหมอหรือเภสัชกรช่วยดู อย่าเพิ่งเปลี่ยนวิธีกินเองนะคะ
          </Notice>
        )}
        <ul className="space-y-2">
          {m.labelDirections.value && (
            <li className="rounded-2xl bg-yai-mint p-3 text-lg">
              <span className="block text-sm font-semibold text-yai-deep">ฉลากเขียน</span>
              {m.labelDirections.value}
            </li>
          )}
          {m.useReports.map((r, i) => (
            <li key={i} className="rounded-2xl border border-yai-ink/10 p-3 text-lg">
              <span className="block text-sm font-semibold text-yai-deep">
                {originLabel(r.origin)} · {formatThaiDateTime(r.reportedAt)}
              </span>
              {r.value}
            </li>
          ))}
          {!m.labelDirections.value && m.useReports.length === 0 && <li className="text-lg text-yai-warn">ยังไม่มีข้อมูลวิธีใช้</li>}
        </ul>
        <div className="space-y-2 border-t border-yai-ink/10 pt-3">
          <div className="grid grid-cols-2 gap-2">
            {(['PATIENT_VOICE', 'CAREGIVER_VOICE'] as const).map((o) => (
              <button
                key={o}
                type="button"
                aria-pressed={reportOrigin === o}
                onClick={() => setReportOrigin(o)}
                className={`min-h-[48px] rounded-2xl border-2 text-base font-semibold ${reportOrigin === o ? 'border-yai-deep bg-yai-mint' : 'border-yai-ink/15 bg-white'}`}
              >
                {originLabel(o)}
              </button>
            ))}
          </div>
          <Field label="เพิ่มสิ่งที่เล่า">
            <input className={inputCls} value={reportText} onChange={(e) => setReportText(e.target.value)} />
          </Field>
          <BigButton
            variant="secondary"
            disabled={!reportText.trim()}
            onClick={() => {
              yaiStore.addUseReport(m.id, reportOrigin, reportText);
              setReportText('');
            }}
          >
            บันทึกเพิ่ม
          </BigButton>
        </div>
      </Card>

      {missing.length > 0 && (
        <Card>
          <h2 className="text-xl font-bold">ยังไม่ทราบ</h2>
          <p className="mt-1 text-lg">{missing.join(' · ')}</p>
          <p className="mt-1 text-base text-yai-ink/70">ไม่ต้องหาให้ครบก็ได้ค่ะ คุณหมอจะช่วยดูต่อ</p>
        </Card>
      )}

      <div className="grid gap-3">
        {m.status !== 'PATIENT_CONFIRMED' && m.status !== 'CLINICIAN_VERIFIED' && !m.pendingIdentification && (
          <BigButton onClick={() => yaiStore.confirmMedicine(m.id)}>ยืนยันว่าคุณยายใช้ยานี้อยู่</BigButton>
        )}
        {(m.status === 'PATIENT_CONFIRMED' || m.status === 'CLINICIAN_VERIFIED') && !hasReminder && (
          <Link to={`/yai/reminders?medicine=${m.id}`} className="flex min-h-[52px] items-center justify-center rounded-2xl bg-yai-mint text-lg font-bold text-yai-deep">
            ตั้งเตือนกินยานี้
          </Link>
        )}
        {!confirmDelete ? (
          <BigButton variant="ghost" onClick={() => setConfirmDelete(true)}>
            ลบรายการนี้
          </BigButton>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <BigButton variant="ghost" onClick={() => setConfirmDelete(false)}>
              ยกเลิก
            </BigButton>
            <BigButton
              variant="danger"
              onClick={() => {
                yaiStore.deleteMedicine(m.id);
                navigate('/yai/medicines');
              }}
            >
              ยืนยันลบ
            </BigButton>
          </div>
        )}
      </div>
    </div>
  );
};

const Row: React.FC<{ label: string; f: EvidenceField<string>; note?: string }> = ({ label, f, note }) => (
  <div className="border-b border-yai-ink/5 pb-3">
    <p className="text-sm font-semibold text-yai-ink/70">{label}</p>
    {f.value ? (
      <>
        <p className="text-lg font-semibold">{f.value}</p>
        {note && <p className="text-sm text-yai-warn">{note}</p>}
        <SourceChip origin={f.origin} synthetic={f.isSynthetic} confidence={f.extractionConfidence} verification={f.verification} />
      </>
    ) : (
      <p className="text-lg font-semibold text-yai-warn">ยังไม่ทราบ</p>
    )}
  </div>
);
