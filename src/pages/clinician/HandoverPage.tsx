import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardCheck, Printer, ShieldOff } from 'lucide-react';
import { DEMO_PATIENT_LINKS } from '../../data/yai/demoLinks';
import { yaiStore } from '../../services/yai/yaiStore';
import { getAllInteractionsDatabase } from '../../services/interactionMatcher';
import { screenPatientInteractions, SEVERITY_TH } from '../../domain/yai/interactionCheck';
import { bangkokDate, isConfirmed, thaiDateLabel } from '../../domain/yai/journal';
import { orderStatusLabels } from '../../domain/yai/prescriptionSync';
import { missingFields } from '../../domain/yai/policies';
import { herbForName } from '../../services/carebridge/herbEvidence';
import { loadReviewer, ROLE_TH, ReviewerRole, useGuidelines } from '../../services/carebridge/evidenceReviews';

// Clinical Handover: an SBAR-style summary the system assembles from what the patient shared (consent-gated), for a
// clinician to check and complete. The system fills Situation / Background / Assessment data with sources; the
// Recommendation is always written by the clinician. Nothing here is sent anywhere.

const KEY = 'carebridge-handovers-v1';
interface SignedHandover {
  id: string;
  patientId: string;
  recommendation: string;
  reviewer: string;
  role: ReviewerRole;
  at: string;
}
const loadSigned = (): SignedHandover[] => {
  try {
    return JSON.parse(globalThis.localStorage?.getItem(KEY) ?? '[]') as SignedHandover[];
  } catch {
    return [];
  }
};

export const HandoverPage: React.FC = () => {
  const link = DEMO_PATIENT_LINKS[0];
  const [snap, setSnap] = useState<ReturnType<typeof yaiStore.readDoseReportsForClinician> | null>(null);
  const guidelineList = useGuidelines();
  const [recommendation, setRecommendation] = useState('');
  const [reviewer, setReviewer] = useState(loadReviewer);
  const [checked, setChecked] = useState(false);
  const [signed, setSigned] = useState<SignedHandover[]>(loadSigned);
  useEffect(() => setSnap(yaiStore.readDoseReportsForClinician(link.recipientId)), [link.recipientId]);

  const since = bangkokDate(new Date(Date.now() - 14 * 86_400_000));
  const screen = useMemo(
    () => (snap?.allowed ? screenPatientInteractions({ medicines: snap.medicines ?? [], journal: snap.journal, syncedOrders: snap.syncedOrders ?? [] }, getAllInteractionsDatabase(), since) : null),
    [snap, since]
  );
  if (!snap) return null;
  if (!snap.allowed)
    return (
      <div className="mx-auto max-w-3xl p-6">
        <p className="flex items-center gap-2 font-bold">
          <ShieldOff className="h-5 w-5" /> ผู้ป่วยยังไม่อนุญาตให้คลินิกนี้ดูข้อมูล จึงสร้างสรุปส่งต่อไม่ได้ (บันทึกการพยายามเปิดไว้แล้ว)
        </p>
      </div>
    );

  const journal = snap.journal.filter((e) => isConfirmed(e) && e.recordedLocalDate >= since);
  const symptoms = journal.flatMap((e) => e.segments.filter((s) => s.category === 'SYMPTOM').map((s) => ({ s, d: e.recordedLocalDate })));
  const meds = snap.medicines ?? [];
  const orders = snap.syncedOrders ?? [];
  const logs = snap.logs.filter((l) => snap.plans.some((p) => p.id === l.reminderPlanId));
  const unknowns = meds.filter((m) => m.pendingIdentification || missingFields(m).length > 0);

  return (
    <div className="mx-auto max-w-4xl space-y-4 bg-white py-4 print:max-w-none sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <ClipboardCheck className="h-6 w-6 text-emerald-700" /> Clinical Handover (SBAR)
          </h1>
          <p className="text-sm text-slate-600">
            {snap.patient?.displayName} · อายุ {snap.patient?.age} ปี · ข้อมูลจากยายพร้อมตามที่ผู้ป่วยอนุญาต · สร้างเมื่อ {new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}
          </p>
        </div>
        <button type="button" onClick={() => window.print()} className="flex min-h-[36px] items-center gap-1 rounded-lg border border-slate-300 px-3 text-sm print:hidden">
          <Printer className="h-4 w-4" /> พิมพ์
        </button>
      </div>
      <p className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">ข้อมูลจำลอง · ระบบรวบรวมให้ แพทย์ต้องตรวจทานก่อนใช้ · ไม่ใช่เวชระเบียน</p>

      <Section title="S · สถานการณ์ (ผู้ป่วยรายงาน 14 วัน)">
        {symptoms.length === 0 ? (
          <p>ไม่มีอาการที่บันทึก</p>
        ) : (
          <ul className="list-disc pl-5">
            {symptoms.slice(0, 8).map(({ s, d }) => (
              <li key={s.id}>
                {thaiDateLabel(d)}: “{s.text}” <span className="text-xs text-slate-500">(ผู้ป่วยเล่า)</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="B · ประวัติยา (กระทบยอด)">
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-slate-500">
            <tr>
              <th className="py-1">รายการ</th>
              <th>ที่มา</th>
              <th>สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {meds.map((m) => (
              <tr key={m.id} className="border-t border-slate-100">
                <td className="py-1">{m.displayName.value ?? 'ยังไม่ทราบชนิด'}</td>
                <td>{m.linkedOrderKey ? 'คำสั่งยาแพทย์ (จำลอง)' : m.displayName.origin === 'PHOTO_LABEL' ? 'ฉลากที่ผู้ป่วยถ่าย' : 'ผู้ป่วยบอก'}</td>
                <td>{m.pendingIdentification ? 'รอระบุชนิด' : m.status === 'PATIENT_CONFIRMED' ? 'ผู้ป่วยยืนยันว่าใช้' : m.status === 'CLINICIAN_VERIFIED' ? 'ทบทวนแล้ว (จำลอง)' : 'รอตรวจสอบ'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.map((r) => (
          <p key={r.key} className="text-xs text-slate-600">
            คำสั่งยา {r.snapshot.medicineName}: {orderStatusLabels(r).map((l) => l.label).join(' · ')}
          </p>
        ))}
        <p className="text-xs text-slate-600">
          รายงานการกินยาตามคำสั่ง (ผู้ป่วยรายงานเอง ไม่ใช่หลักฐาน): {logs.filter((l) => l.response === 'TAKEN_REPORTED').length}/{logs.length}
        </p>
      </Section>

      <Section title="A · ประเด็นที่ต้องประเมิน">
        {screen && screen.flags.length > 0 ? (
          <ul className="list-disc pl-5">
            {screen.flags.map((f) => (
              <li key={f.rule.interaction_id}>
                {f.rule.herb_thai_name} + {f.rule.drug_generic_name} · ความรุนแรง{SEVERITY_TH[f.rule.severity_code]} ({f.rule.interaction_id}, หลักฐานระดับ {f.rule.evidence_level})
              </li>
            ))}
          </ul>
        ) : (
          <p>ไม่พบคู่ในฐานข้อมูลตัวอย่าง (ไม่ได้แปลว่าปลอดภัย)</p>
        )}
        {unknowns.length > 0 && <p className="text-amber-800">ข้อมูลยายังไม่ครบ {unknowns.length} รายการ</p>}
        <p className="mt-1 font-semibold">หลักฐานและ Guideline ของยาแผนไทยที่เกี่ยวข้อง</p>
        <ul className="list-disc pl-5">
          {[...new Set([...meds.map((m) => m.displayName.value ?? ''), ...orders.map((o) => o.snapshot.medicineName ?? '')])]
            .map((n) => herbForName(n))
            .filter((h, i, a): h is NonNullable<typeof h> => !!h && a.findIndex((x) => x?.id === h.id) === i)
            .map((h) => {
              const g = guidelineList.find((x) => x.herbId === h.id && x.status === 'APPROVED') ?? guidelineList.find((x) => x.herbId === h.id);
              return (
                <li key={h.id}>
                  {h.thaiName}:{' '}
                  {g ? (
                    <Link to={`/guidelines/${g.id}`} className="underline">
                      {g.status === 'APPROVED' ? 'มี Guideline อนุมัติแล้ว (สาธิต)' : 'มีร่าง Guideline'}
                    </Link>
                  ) : (
                    'ยังไม่มี Guideline'
                  )}{' '}
                  ·{' '}
                  <Link to={`/research?herb=${encodeURIComponent(h.thaiName)}`} className="underline">
                    หลักฐาน PubMed
                  </Link>
                </li>
              );
            })}
        </ul>
      </Section>

      <Section title="R · ข้อแนะนำ (แพทย์เขียนเอง)">
        <textarea className="min-h-[90px] w-full rounded-lg border border-slate-300 p-2 text-sm" value={recommendation} onChange={(e) => setRecommendation(e.target.value)} placeholder="แผนการดูแลและสิ่งที่ส่งต่อ" />
        <div className="flex flex-wrap items-center gap-2 text-sm print:hidden">
          <input className="rounded-lg border border-slate-300 px-2 py-1" placeholder="ผู้ตรวจทาน" value={reviewer.name} onChange={(e) => setReviewer({ ...reviewer, name: e.target.value })} />
          <select className="rounded-lg border border-slate-300 px-2 py-1" value={reviewer.role} onChange={(e) => setReviewer({ ...reviewer, role: e.target.value as ReviewerRole })}>
            {(Object.keys(ROLE_TH) as ReviewerRole[]).map((r) => (
              <option key={r} value={r}>
                {ROLE_TH[r]}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} /> ตรวจทานข้อมูลข้างต้นกับผู้ป่วย/แหล่งเดิมแล้ว
          </label>
          <button
            type="button"
            disabled={!checked || !reviewer.name.trim() || !recommendation.trim()}
            onClick={() => {
              const next = [{ id: `handover-${Date.now()}`, patientId: link.yaiPatientId, recommendation: recommendation.trim(), reviewer: reviewer.name.trim(), role: reviewer.role, at: new Date().toISOString() }, ...signed];
              try {
                globalThis.localStorage?.setItem(KEY, JSON.stringify(next));
              } catch {
                // memory only
              }
              setSigned(next);
              setChecked(false);
            }}
            className="min-h-[36px] rounded-lg bg-emerald-700 px-3 font-bold text-white disabled:opacity-40"
          >
            บันทึกการตรวจทาน
          </button>
        </div>
        {signed.filter((s) => s.patientId === link.yaiPatientId).slice(0, 3).map((s) => (
          <p key={s.id} className="text-xs text-slate-600">
            ตรวจทานโดย {s.reviewer} ({ROLE_TH[s.role]}) {new Date(s.at).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}: {s.recommendation}
          </p>
        ))}
      </Section>
    </div>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="space-y-1 rounded-2xl border border-slate-200 p-4 text-sm">
    <h2 className="text-base font-bold text-slate-900">{title}</h2>
    {children}
  </section>
);
