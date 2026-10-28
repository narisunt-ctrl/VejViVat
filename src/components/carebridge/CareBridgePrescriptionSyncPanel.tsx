import React, { useMemo, useState } from 'react';
import { Send, ShieldCheck, PackageCheck, Clock, XCircle, Eye, ExternalLink } from 'lucide-react';
import type { SyntheticCase } from '../../types/patient';
import type { PrescribedItem } from '../../types/drug';
import { linkForCase } from '../../data/yai/demoLinks';
import { evaluateReminderSync, MedicationOrderSnapshot, orderKey, RegimenType } from '../../domain/yai/prescriptionSync';
import { canRead, isValidTime } from '../../domain/yai/policies';
import { bangkokDate } from '../../domain/yai/journal';
import { carebridgeOutbox, useCarebridgeOutbox } from '../../services/yai/prescriptionSyncAdapter';
import { yaiStore } from '../../services/yai/yaiStore';

// CareBridge → ยายพร้อม order hand-off (synthetic demo). Printing or confirming the cart is NOT an approval:
// approval, dispense verification and reminder times are separate, explicit actions here, each published as a new
// order version. The patient app applies evaluateReminderSync() before any reminder exists.

const DEMO_PRESCRIBER = 'แพทย์สาธิต DEMO-DR-01';
const DEMO_PHARMACIST = 'เภสัชกรสาธิต DEMO-RPH-01';

interface Candidate {
  sourceOrderId: string;
  medicineName: string;
  strengthLabel: string | null;
  dose: string;
  directions: string;
  regimen: RegimenType;
  days: number;
  origin: 'cart' | 'case-plan';
}

function regimenFrom(timing: string): RegimenType {
  if (/เมื่อมีอาการ|เมื่อปวด|prn/i.test(timing)) return 'PRN';
  if (/ค่อย ๆ ลด|ลดขนาด|taper/i.test(timing)) return 'TAPER';
  return 'SCHEDULED';
}

function candidatesFor(c: SyntheticCase, cart: PrescribedItem[]): Candidate[] {
  const fromCart = cart.map((it) => ({
    sourceOrderId: `RX-${c.case_id}-${it.herb.drug_code_24.slice(-8)}`,
    medicineName: it.herb.thai_name,
    strengthLabel: it.herb.strength_per_unit || null,
    dose: `ครั้งละ ${it.dose_per_admin} ${it.herb.unit}`,
    directions: `${it.timing} วันละ ${it.frequency_per_day} ครั้ง นาน ${it.days} วัน`,
    regimen: regimenFrom(it.timing),
    days: it.days,
    origin: 'cart' as const,
  }));
  const p = c.intended_ttm_prescription;
  const fromPlan = p
    ? [
        {
          sourceOrderId: `RX-${c.case_id}-${p.drug_code_24.slice(-8)}`,
          medicineName: p.herb_name,
          strengthLabel: p.unit,
          dose: `ครั้งละ ${p.dose_per_admin} ${p.unit}`,
          directions: `${p.timing} วันละ ${p.frequency_per_day} ครั้ง นาน ${p.days} วัน`,
          regimen: regimenFrom(p.timing),
          days: p.days,
          origin: 'case-plan' as const,
        },
      ]
    : [];
  const seen = new Set<string>();
  return [...fromCart, ...fromPlan].filter((x) => (seen.has(x.sourceOrderId) ? false : (seen.add(x.sourceOrderId), true)));
}

const addDays = (date: string, n: number) => {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export const CareBridgePrescriptionSyncPanel: React.FC<{ currentCase: SyntheticCase; cartItems: PrescribedItem[] }> = ({ currentCase, cartItems }) => {
  const link = linkForCase(currentCase.case_id);
  const outbox = useCarebridgeOutbox();
  const candidates = useMemo(() => candidatesFor(currentCase, cartItems), [currentCase, cartItems]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [times, setTimes] = useState<string[]>(['']);
  const [agreed, setAgreed] = useState(false);
  const [doseView, setDoseView] = useState<ReturnType<typeof yaiStore.readDoseReportsForClinician> | null>(null);

  if (!link) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-soft">
        <h3 className="font-bold text-slate-800">ส่งคำสั่งยาไปยายพร้อม (สาธิต)</h3>
        <p className="mt-1">เคสนี้ยังไม่ได้เชื่อมกับผู้ป่วยในยายพร้อม ระบบจับคู่เฉพาะเคสที่กำหนดไว้ชัดเจน (เดโม: C11) ไม่จับคู่จากชื่อหรืออายุ</p>
      </section>
    );
  }

  const cand = candidates.find((c) => c.sourceOrderId === selectedId) ?? candidates[0];
  const latest = cand ? carebridgeOutbox.latestVersion(link.sourceSystem, cand.sourceOrderId) : null;
  void outbox; // re-render when the outbox changes
  const today = bangkokDate(new Date());
  const yai = yaiStore.getState();
  const consentActive = canRead(yai.consents, link.recipientId, 'REMINDER_ALERTS', new Date());
  const decision = latest ? evaluateReminderSync(latest, { expectedPatientId: link.yaiPatientId, mode: 'DEMO', consentActive, today }) : null;
  const events = latest ? outbox.events.filter((e) => e.orderKey === orderKey(latest)) : [];

  const base = (): Omit<MedicationOrderSnapshot, 'sourceVersion'> => {
    if (latest) {
      const { sourceVersion: _v, ...rest } = latest;
      return rest;
    }
    return {
      sourceSystem: link.sourceSystem,
      sourceOrderId: cand.sourceOrderId,
      patientId: link.yaiPatientId,
      prescriberId: null,
      approval: 'AWAITING_AUTHORIZED_REVIEW',
      approvedBy: null,
      approvedAt: null,
      dispense: 'PENDING',
      dispensedBy: null,
      dispensedAt: null,
      medicineIdentityVerified: true,
      medicineName: cand.medicineName,
      kind: 'HERBAL_FORMULA',
      formulation: null,
      strengthLabel: cand.strengthLabel,
      dosePerAdministration: cand.dose,
      route: 'รับประทาน',
      directions: cand.directions,
      plannedClockTimes: null,
      scheduleConfirmedBy: null,
      scheduleConfirmedAt: null,
      timeZone: 'Asia/Bangkok',
      regimenType: cand.regimen,
      startDate: today,
      endDate: addDays(today, Math.max(0, cand.days - 1)),
      onHold: false,
      lastChangedAt: new Date().toISOString(),
      changeNote: null,
      isSynthetic: true,
    };
  };
  const publish = (patch: Partial<MedicationOrderSnapshot>, actor: string, summary: string) =>
    carebridgeOutbox.publish({ ...base(), ...patch, lastChangedAt: new Date().toISOString(), changeNote: summary }, actor, summary);

  const now = () => new Date().toISOString();
  const validTimes = times.filter(Boolean);
  const timesOk = validTimes.length > 0 && validTimes.every(isValidTime) && new Set(validTimes).size === validTimes.length;
  const stopped = latest?.approval === 'CANCELLED' || latest?.approval === 'SUPERSEDED';

  return (
    <section className="space-y-4 rounded-2xl border border-violet-200 bg-white p-4 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-2 text-base font-bold text-slate-800">
            <Send className="h-4 w-4 text-violet-700" /> ส่งคำสั่งยาที่รับรองแล้วไปเตือนในยายพร้อม
          </h3>
          <p className="text-xs text-slate-500">
            เคส {currentCase.case_id} ↔ ผู้ป่วยยายพร้อม {link.yaiPatientId} (จับคู่ด้วยรหัสสังเคราะห์ที่กำหนดไว้ ไม่ใช่จากชื่อ)
          </p>
        </div>
        <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-800">
          ข้อมูลจำลอง · ไม่ใช่ใบสั่งยาที่ลงนามจริง · เชื่อมภายในแอปเท่านั้น
        </span>
      </div>
      <p className="rounded-xl bg-slate-50 p-2 text-xs text-slate-600">
        การกด "ยืนยันใบสั่งยา/พิมพ์" ในตะกร้าไม่ใช่การรับรองคำสั่งยา ขั้นตอนด้านล่างแยกกัน: รับรองโดยผู้สั่งใช้ยา → ยืนยันการจ่ายยา → ตกลงเวลาเตือนกับผู้ป่วย
        ระบบไม่เลือกยาหรือขนาดยาแทนแพทย์
      </p>

      {candidates.length === 0 ? (
        <p className="text-sm text-slate-600">ยังไม่มีรายการยาในตะกร้าหรือในแผนของเคส</p>
      ) : (
        <>
          <label className="block text-sm">
            <span className="font-semibold text-slate-700">รายการยา</span>
            <select
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              value={cand.sourceOrderId}
              onChange={(e) => {
                setSelectedId(e.target.value);
                setDoseView(null);
              }}
            >
              {candidates.map((c) => (
                <option key={c.sourceOrderId} value={c.sourceOrderId}>
                  {c.medicineName} · {c.dose} ({c.origin === 'cart' ? 'จากตะกร้า' : 'จากแผนในเคส'})
                </option>
              ))}
            </select>
          </label>
          <div className="rounded-xl border border-slate-200 p-3 text-sm">
            <p className="font-bold text-slate-800">{latest?.medicineName ?? cand.medicineName}</p>
            <p className="text-slate-600">
              {latest?.dosePerAdministration ?? cand.dose} · {latest?.directions ?? cand.directions}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {latest
                ? `ฉบับที่ ${latest.sourceVersion} · รับรอง: ${latest.approval === 'APPROVED_DEMO' ? `ใช่ (${latest.approvedBy})` : latest.approval} · จ่ายยา: ${latest.dispense} · เวลาเตือน: ${
                    latest.plannedClockTimes?.join(', ') ?? 'ยังไม่กำหนด'
                  }`
                : 'ยังไม่ได้ส่งไปยายพร้อม'}
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              disabled={stopped || latest?.approval === 'APPROVED_DEMO'}
              onClick={() => publish({ approval: 'APPROVED_DEMO', approvedBy: DEMO_PRESCRIBER, approvedAt: now(), prescriberId: 'DEMO-DR-01' }, DEMO_PRESCRIBER, 'รับรองคำสั่งยา (จำลอง)')}
              className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-violet-700 px-3 text-sm font-bold text-white disabled:opacity-40"
            >
              <ShieldCheck className="h-4 w-4" /> 1. รับรองคำสั่งยา (จำลอง)
            </button>
            <button
              type="button"
              disabled={stopped || !latest || latest.approval !== 'APPROVED_DEMO' || latest.dispense === 'VERIFIED_DEMO'}
              onClick={() => publish({ dispense: 'VERIFIED_DEMO', dispensedBy: DEMO_PHARMACIST, dispensedAt: now() }, DEMO_PHARMACIST, 'ยืนยันจ่ายยาให้ผู้ป่วยแล้ว (จำลอง)')}
              className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-emerald-700 px-3 text-sm font-bold text-white disabled:opacity-40"
            >
              <PackageCheck className="h-4 w-4" /> 2. เภสัชกรยืนยันจ่ายยาแล้ว (จำลอง)
            </button>
          </div>

          <div className="space-y-2 rounded-xl border border-slate-200 p-3">
            <p className="flex items-center gap-1.5 text-sm font-bold text-slate-800">
              <Clock className="h-4 w-4" /> 3. เวลาเตือน (ตกลงกับผู้ป่วย ไม่ได้เปลี่ยนคำสั่งยา)
            </p>
            <p className="text-xs text-slate-500">
              คำสั่ง "{latest?.directions ?? cand.directions}" ไม่ได้ระบุเวลานาฬิกา ระบบจึงไม่เดาเวลาเอง (เช่น หลังอาหาร ≠ 08:00) ยา PRN จะไม่มีเวลาเตือนประจำ
            </p>
            <div className="flex flex-wrap gap-2">
              {times.map((t, i) => (
                <input
                  key={i}
                  type="time"
                  aria-label={`เวลาที่ ${i + 1}`}
                  value={t}
                  onChange={(e) => setTimes(times.map((x, j) => (j === i ? e.target.value : x)))}
                  className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                />
              ))}
              {times.length < 4 && (
                <button type="button" className="text-sm font-semibold text-violet-700 underline" onClick={() => setTimes([...times, ''])}>
                  + เวลา
                </button>
              )}
            </div>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-0.5 h-4 w-4" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
              เภสัชกรตกลงเวลานี้กับผู้ป่วยแล้ว และสอดคล้องกับคำสั่งยา
            </label>
            <button
              type="button"
              disabled={stopped || !latest || !timesOk || !agreed}
              onClick={() => {
                publish(
                  { plannedClockTimes: [...validTimes].sort(), scheduleConfirmedBy: DEMO_PHARMACIST, scheduleConfirmedAt: now() },
                  DEMO_PHARMACIST,
                  `กำหนดเวลาเตือน ${[...validTimes].sort().join(', ')}`
                );
                setAgreed(false);
              }}
              className="min-h-[40px] rounded-xl bg-slate-800 px-3 text-sm font-bold text-white disabled:opacity-40"
            >
              บันทึกเวลาเตือน (ส่งเป็นฉบับใหม่)
            </button>
          </div>

          <button
            type="button"
            disabled={!latest || stopped}
            onClick={() => publish({ approval: 'CANCELLED' }, DEMO_PRESCRIBER, 'ยกเลิกคำสั่งยา (จำลอง)')}
            className="flex min-h-[40px] items-center gap-1.5 text-sm font-bold text-rose-700 disabled:opacity-40"
          >
            <XCircle className="h-4 w-4" /> ยกเลิกคำสั่งยานี้
          </button>

          {decision && (
            <div
              className={`rounded-xl border p-3 text-sm ${
                decision.kind === 'ACTIVE' ? 'border-emerald-300 bg-emerald-50' : decision.kind === 'PENDING_REVIEW' ? 'border-amber-300 bg-amber-50' : 'border-rose-300 bg-rose-50'
              }`}
            >
              <p className="font-bold">
                ผลตรวจก่อนสร้างการเตือนในยายพร้อม:{' '}
                {decision.kind === 'ACTIVE' ? `เตือนได้ เวลา ${decision.times.join(', ')}` : decision.kind === 'PENDING_REVIEW' ? 'ยังไม่เตือน' : decision.kind === 'STOPPED' ? 'หยุดเตือน' : 'ไม่รับเข้า'}
              </p>
              {decision.kind !== 'ACTIVE' && <p>{decision.reason}</p>}
              <p className="mt-1 text-xs text-slate-500">ยายพร้อมตรวจซ้ำด้วยกฎเดียวกันเมื่อเปิดแอป และต้องได้รับอนุญาตจากผู้ป่วยก่อนเสมอ</p>
            </div>
          )}

          {events.length > 0 && (
            <details className="text-xs text-slate-600">
              <summary className="cursor-pointer font-semibold">ประวัติการส่ง ({events.length})</summary>
              <ul className="mt-1 space-y-0.5">
                {events.map((e) => (
                  <li key={`${e.orderKey}-${e.version}`}>
                    ฉบับที่ {e.version} · {new Date(e.at).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })} · {e.actor}: {e.summary}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}

      <div className="space-y-2 border-t border-slate-100 pt-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setDoseView(yaiStore.readDoseReportsForClinician(link.recipientId))}
            className="flex min-h-[40px] items-center gap-1.5 rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-700"
          >
            <Eye className="h-4 w-4" /> ดูรายงานการกินยาจากผู้ป่วย
          </button>
          <a href="#/yai/reminders" target="_blank" rel="noreferrer" className="flex min-h-[40px] items-center gap-1.5 rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-700">
            <ExternalLink className="h-4 w-4" /> เปิดยายพร้อม (แท็บใหม่)
          </a>
        </div>
        {doseView && !doseView.allowed && (
          <p className="rounded-xl bg-rose-50 p-2 text-sm text-rose-800">ผู้ป่วยยังไม่อนุญาตหรือยกเลิกการอนุญาตแล้ว จึงดูไม่ได้ (บันทึกการพยายามเข้าถึงไว้แล้ว)</p>
        )}
        {doseView?.allowed && (
          <div className="rounded-xl bg-slate-50 p-2 text-sm">
            <p className="text-xs font-semibold text-slate-500">ผู้ป่วยรายงานเอง ไม่ใช่หลักฐานว่ากินยาจริง</p>
            {doseView.logs.filter((l) => doseView.plans.some((p) => p.id === l.reminderPlanId)).length === 0 ? (
              <p>ยังไม่มีรายงานสำหรับยาตามคำสั่ง</p>
            ) : (
              <ul>
                {doseView.logs
                  .filter((l) => doseView.plans.some((p) => p.id === l.reminderPlanId))
                  .map((l) => (
                    <li key={l.id}>
                      {l.scheduledAt.replace('T', ' ')} · {l.response === 'TAKEN_REPORTED' ? 'รายงานว่ากินแล้ว' : l.response === 'NOT_YET_REPORTED' ? 'รายงานว่ายังไม่ได้กิน' : 'ไม่แน่ใจ'}
                    </li>
                  ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
