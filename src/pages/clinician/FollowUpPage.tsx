import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, BellRing, BookOpen, CheckCircle2, ClipboardList, Pill, RefreshCw, Send, ShieldOff } from 'lucide-react';
import { DEMO_PATIENT_LINKS } from '../../data/yai/demoLinks';
import { yaiStore } from '../../services/yai/yaiStore';
import { getAllInteractionsDatabase } from '../../services/interactionMatcher';
import { draftPatientAlert, InteractionFlag, screenPatientInteractions, SEVERITY_TH } from '../../domain/yai/interactionCheck';
import { bangkokDate, CATEGORY_LABEL, isConfirmed, recordedDaysInMonth, thaiDateLabel } from '../../domain/yai/journal';
import { orderStatusLabels } from '../../domain/yai/prescriptionSync';
import { clinicianMessages, useClinicianMessages } from '../../services/yai/clinicianMessages';
import { consults, useConsults } from '../../services/carebridge/consults';
import { herbForName } from '../../services/carebridge/herbEvidence';
import { getElementSummaryForPatient } from '../../services/yai/elementSummaryAdapter';
import { ModernDoctorSummary } from '../../components/carebridge/ModernDoctorSummary';
import { CATEGORY_CLS } from '../../components/yai/SourceVerificationChip';

type Role = 'MODERN' | 'TTM';
const ROLE_KEY = 'carebridge-role';
const loadRole = (): Role => {
  try {
    return globalThis.localStorage?.getItem(ROLE_KEY) === 'TTM' ? 'TTM' : 'MODERN';
  } catch {
    return 'MODERN';
  }
};

// Doctor's follow-up workspace for patients who use ยายพร้อม. Built to save the doctor's time: things that need
// attention come first, every item says where it came from, and nothing has to be typed in again.
// It reads only what the patient allowed (consent scope MEDICINES); every read is audited on the patient side.

const SEV_CLS = { HIGH: 'bg-rose-600 text-white', MODERATE: 'bg-amber-500 text-white', LOW: 'bg-slate-500 text-white', UNCLEAR: 'bg-slate-400 text-white' };
const SRC_TH = { MEDICINE_LIST: 'สมุดยา', CLINICIAN_ORDER: 'คำสั่งยาแพทย์', JOURNAL: 'ยายเล่า' };

type Snapshot = ReturnType<typeof yaiStore.readDoseReportsForClinician>;

export const FollowUpPage: React.FC = () => {
  const [linkIdx, setLinkIdx] = useState(0);
  const link = DEMO_PATIENT_LINKS[linkIdx];
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [readAt, setReadAt] = useState<string | null>(null);
  const messages = useClinicianMessages();
  const consultList = useConsults();
  const [role, setRoleState] = useState<Role>(loadRole);
  const setRole = (r: Role) => {
    setRoleState(r);
    try {
      globalThis.localStorage?.setItem(ROLE_KEY, r);
    } catch {
      // remember for this visit only
    }
  };

  const refresh = useCallback(() => {
    setSnap(yaiStore.readDoseReportsForClinician(link.recipientId));
    setReadAt(new Date().toISOString());
  }, [link.recipientId]);
  useEffect(() => refresh(), [refresh]);

  const today = bangkokDate(new Date());
  const since = bangkokDate(new Date(Date.now() - 14 * 86_400_000));
  const screen = useMemo(
    () =>
      snap?.allowed
        ? screenPatientInteractions({ medicines: snap.medicines ?? [], journal: snap.journal, syncedOrders: snap.syncedOrders ?? [] }, getAllInteractionsDatabase(), since)
        : null,
    [snap, since]
  );
  const journal = (snap?.journal ?? []).filter((e) => isConfirmed(e) && e.recordedLocalDate >= since);
  const days = [...new Set(journal.map((e) => e.recordedLocalDate))].sort().reverse();
  const recentLogs = (snap?.logs ?? []).filter((l) => (snap?.plans ?? []).some((p) => p.id === l.reminderPlanId) && l.scheduledAt.slice(0, 10) >= bangkokDate(new Date(Date.now() - 7 * 86_400_000)));
  const taken = recentLogs.filter((l) => l.response === 'TAKEN_REPORTED').length;
  const sent = messages.filter((m) => m.patientId === link.yaiPatientId);

  return (
    <div className="mx-auto max-w-6xl space-y-4 py-4 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">ติดตามผู้ป่วยรายบุคคล (ยายพร้อม)</h1>
          <p className="text-sm text-slate-600">ดูอาการที่ผู้ป่วยบันทึก ยาที่ใช้ และคู่ที่อาจตีกัน · อ่านตามที่ผู้ป่วยอนุญาต และบันทึกการเปิดดูทุกครั้ง</p>
        </div>
        <div className="flex items-center gap-2">
          <select className="rounded-xl border border-slate-300 px-3 py-2 text-sm" value={linkIdx} onChange={(e) => setLinkIdx(Number(e.target.value))} aria-label="เลือกผู้ป่วย">
            {DEMO_PATIENT_LINKS.map((l, i) => (
              <option key={l.yaiPatientId} value={i}>
                {l.yaiPatientId} · เคส {l.clinicianCaseId}
              </option>
            ))}
          </select>
          <button type="button" onClick={refresh} className="flex min-h-[40px] items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700">
            <RefreshCw className="h-4 w-4" /> รีเฟรช
          </button>
        </div>
      </header>
      <div className="inline-flex rounded-2xl border border-slate-300 bg-white p-1" role="group" aria-label="มุมมองแพทย์">
        {(
          [
            ['MODERN', 'แพทย์แผนปัจจุบัน · สรุปเฉพาะที่จำเป็น'],
            ['TTM', 'แพทย์แผนไทย · ละเอียด'],
          ] as [Role, string][]
        ).map(([r, label]) => (
          <button
            key={r}
            type="button"
            aria-pressed={role === r}
            onClick={() => setRole(r)}
            className={`min-h-[40px] rounded-xl px-4 text-sm font-bold ${role === r ? (r === 'MODERN' ? 'bg-sky-700 text-white' : 'bg-emerald-700 text-white') : 'text-slate-600'}`}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
        ข้อมูลจำลองทั้งหมด · เชื่อมภายในเบราว์เซอร์นี้เท่านั้น ไม่ใช่เวชระเบียนหรือระบบโรงพยาบาลจริง · ข้อความที่ผู้ป่วยบันทึกเป็นคำบอกเล่า ไม่ใช่การวินิจฉัย
      </p>

      {snap && !snap.allowed && (
        <section className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-5">
          <ShieldOff className="mt-0.5 h-6 w-6 text-slate-500" />
          <div>
            <p className="font-bold text-slate-800">ผู้ป่วยยังไม่อนุญาตให้คลินิกนี้ดูข้อมูล หรือยกเลิกการอนุญาตแล้ว</p>
            <p className="text-sm text-slate-600">ผู้ป่วยอนุญาตได้ในแอปยายพร้อม หน้า "เตือนกินยา" → "อนุญาต 90 วัน" · การพยายามเปิดดูครั้งนี้ถูกบันทึกไว้แล้ว</p>
          </div>
        </section>
      )}

      {snap?.allowed && screen && role === 'MODERN' && (
        <ModernDoctorSummary
          patientId={link.yaiPatientId}
          screen={screen}
          medicines={snap.medicines ?? []}
          journal={journal}
          doseSummary={{ taken, due: recentLogs.length }}
          onOpenDetail={() => setRole('TTM')}
        />
      )}

      {snap?.allowed && screen && role === 'TTM' && (
        <>
          <ConsultInbox list={consultList.filter((c) => c.patientId === link.yaiPatientId)} />
          <ElementCard patientId={link.yaiPatientId} />
          <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="ผู้ป่วย" value={snap.patient?.displayName ?? link.yaiPatientId} sub={`อายุ ${snap.patient?.age ?? '-'} ปี · จ.${snap.patient?.province ?? '-'}`} />
            <Stat label="บันทึกใน 14 วัน" value={`${days.length} วัน`} sub={`เดือนนี้ ${recordedDaysInMonth(snap.journal, today.slice(0, 7))} วัน`} />
            <Stat label="คู่ที่อาจตีกัน" value={`${screen.flags.length} คู่`} tone={screen.flags.some((f) => f.rule.severity_code === 'HIGH') ? 'alert' : screen.flags.length ? 'warn' : 'ok'} sub={`ตรวจกับฐานข้อมูล ${screen.rulesChecked} คู่`} />
            <Stat label="รายงานกินยา 7 วัน" value={`${taken}/${recentLogs.length}`} sub="ผู้ป่วยรายงานเอง ไม่ใช่หลักฐาน" />
          </section>

          <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
              <AlertTriangle className="h-5 w-5 text-rose-600" /> ต้องดูก่อน: สิ่งที่ผู้ป่วยกินร่วมกันที่อาจตีกัน
            </h2>
            {screen.flags.length === 0 ? (
              <p className="text-sm text-slate-600">
                ไม่พบคู่ในฐานข้อมูลตัวอย่าง {screen.rulesChecked} คู่ (ไม่ได้แปลว่าปลอดภัย)
              </p>
            ) : (
              screen.flags.map((f) => <FlagCard key={f.rule.interaction_id} flag={f} link={link} />)
            )}
            {screen.unidentifiedCount > 0 && (
              <p className="text-xs font-semibold text-amber-700">มียาที่ยังไม่ทราบชนิด {screen.unidentifiedCount} รายการ การตรวจยังไม่ครบ</p>
            )}
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4">
              <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
                <ClipboardList className="h-5 w-5 text-brand-700" /> อาการและสิ่งที่ผู้ป่วยบันทึก 14 วัน
              </h2>
              {days.length === 0 && <p className="text-sm text-slate-600">ยังไม่มีบันทึก</p>}
              <ul className="divide-y divide-slate-100">
                {days.map((d) => {
                  const segs = journal.filter((e) => e.recordedLocalDate === d).flatMap((e) => e.segments.map((s) => ({ s, synthetic: e.isSynthetic })));
                  return (
                    <li key={d} className="py-2 text-sm">
                      <p className="font-semibold text-slate-700">{thaiDateLabel(d)}</p>
                      <ul className="mt-1 space-y-0.5">
                        {segs.map(({ s, synthetic }) => (
                          <li key={s.id} className="flex flex-wrap gap-2">
                            <span className={`rounded border px-1.5 text-xs font-semibold ${CATEGORY_CLS[s.category]}`}>
                              {CATEGORY_LABEL[s.category]}
                            </span>
                            <span>{s.unknown ? `${s.text} (ไม่ทราบ)` : s.text}</span>
                            {synthetic && <span className="text-xs text-amber-700">ตัวอย่าง</span>}
                          </li>
                        ))}
                      </ul>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4">
              <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
                <Pill className="h-5 w-5 text-brand-700" /> ยาที่ผู้ป่วยใช้
              </h2>
              <ul className="divide-y divide-slate-100 text-sm">
                {(snap.medicines ?? []).map((m) => (
                  <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span className="font-semibold">{m.displayName.value ?? 'ยังไม่ทราบชนิด'}</span>
                    <span className="text-xs text-slate-500">
                      {m.linkedOrderKey ? 'คำสั่งยาแพทย์ (จำลอง)' : m.pendingIdentification ? 'รอระบุชนิด' : m.status === 'PATIENT_CONFIRMED' ? 'ผู้ป่วยยืนยันว่าใช้' : 'รอตรวจสอบ'}
                    </span>
                  </li>
                ))}
              </ul>
              {(snap.syncedOrders ?? []).map((r) => (
                <p key={r.key} className="text-xs text-slate-600">
                  {r.snapshot.medicineName}: {orderStatusLabels(r).map((l) => l.label).join(' · ')}
                </p>
              ))}
              <div className="rounded-xl bg-slate-50 p-2 text-xs text-slate-600">
                <p className="font-semibold">รายงานการกินยาตามคำสั่ง (ผู้ป่วยรายงานเอง)</p>
                {recentLogs.length === 0 ? (
                  <p>ยังไม่มีรายงานใน 7 วัน</p>
                ) : (
                  recentLogs.slice(0, 8).map((l) => (
                    <p key={l.id}>
                      {l.scheduledAt.replace('T', ' ')} · {l.response === 'TAKEN_REPORTED' ? 'กินแล้ว' : l.response === 'NOT_YET_REPORTED' ? 'ยังไม่ได้กิน' : 'ไม่แน่ใจ'}
                    </p>
                  ))
                )}
              </div>
            </section>
          </div>

          <section className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
              <BellRing className="h-5 w-5 text-brand-700" /> ข้อความที่ส่งถึงผู้ป่วย
            </h2>
            {sent.length === 0 ? (
              <p className="text-sm text-slate-600">ยังไม่ได้ส่งข้อความ</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {sent.map((m) => (
                  <li key={m.id} className="flex flex-wrap items-center gap-2">
                    {m.acknowledgedAt ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <span className="h-2 w-2 rounded-full bg-amber-500" />}
                    <span className="font-semibold">{m.title}</span>
                    <span className="text-xs text-slate-500">
                      ส่ง {new Date(m.at).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })} · {m.acknowledgedAt ? `ผู้ป่วยกดรับทราบ ${new Date(m.acknowledgedAt).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}` : 'ยังไม่กดรับทราบ'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <p className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
            อ่านข้อมูลเมื่อ {readAt ? new Date(readAt).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }) : '-'} ·{' '}
            <Link to="/research" className="inline-flex items-center gap-1 font-semibold text-brand-700 underline">
              <BookOpen className="h-3.5 w-3.5" /> คลังงานวิจัยประกอบการตัดสินใจ
            </Link>{' '}
            ·{' '}
            <Link to="/clinician/handover" className="font-semibold text-brand-700 underline">
              สร้างสรุปส่งต่อ (Clinical Handover)
            </Link>
          </p>
        </>
      )}
    </div>
  );
};

const Stat: React.FC<{ label: string; value: string; sub?: string; tone?: 'ok' | 'warn' | 'alert' }> = ({ label, value, sub, tone }) => (
  <div className={`rounded-2xl border p-3 ${tone === 'alert' ? 'border-rose-300 bg-rose-50' : tone === 'warn' ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white'}`}>
    <p className="text-xs font-semibold text-slate-500">{label}</p>
    <p className="truncate text-lg font-bold text-slate-900">{value}</p>
    {sub && <p className="text-xs text-slate-500">{sub}</p>}
  </div>
);

const FlagCard: React.FC<{ flag: InteractionFlag; link: (typeof DEMO_PATIENT_LINKS)[number] }> = ({ flag: f, link }) => {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(() => draftPatientAlert(f));
  const [sentAt, setSentAt] = useState<string | null>(null);
  return (
    <div className="space-y-2 rounded-xl border border-rose-200 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${SEV_CLS[f.rule.severity_code]}`}>ความรุนแรง{SEVERITY_TH[f.rule.severity_code]}</span>
        <span className="text-sm font-bold text-slate-900">
          {f.rule.herb_thai_name} + {f.rule.drug_generic_name}
        </span>
        <span className="text-xs text-slate-500">
          {f.rule.interaction_id} · หลักฐานระดับ {f.rule.evidence_level} · ทบทวนโดย {f.rule.reviewer}
        </span>
      </div>
      <p className="text-xs text-slate-600">
        พบจาก: {f.herbSources.map((s) => `${s.text} (${SRC_TH[s.kind]}${s.date ? ` ${thaiDateLabel(s.date)}` : ''})`).join(', ')} · ร่วมกับ{' '}
        {f.drugSources.map((s) => `${s.text} (${SRC_TH[s.kind]})`).join(', ')}
      </p>
      <p className="text-sm text-slate-800">{f.rule.clinical_effects}</p>
      <p className="text-xs text-slate-600">คำแนะนำในฐานข้อมูล: {f.rule.recommendation}</p>
      {herbForName(f.rule.herb_thai_name) && (
        <Link to={`/research?herb=${encodeURIComponent(herbForName(f.rule.herb_thai_name)!.thaiName)}`} className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 underline">
          <BookOpen className="h-3.5 w-3.5" /> ดูหลักฐานวิจัยของ{f.rule.herb_thai_name} (PubMed)
        </Link>
      )}
      {sentAt ? (
        <p className="text-sm font-semibold text-emerald-700">ส่งข้อความถึงผู้ป่วยแล้ว ({new Date(sentAt).toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok' })})</p>
      ) : open ? (
        <div className="space-y-2">
          <textarea className="min-h-[90px] w-full rounded-xl border border-slate-300 p-2 text-sm" value={text} onChange={(e) => setText(e.target.value)} aria-label="ข้อความถึงผู้ป่วย" />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!text.trim()}
              onClick={() => {
                clinicianMessages.send({
                  patientId: link.yaiPatientId,
                  fromRecipientId: link.recipientId,
                  fromName: link.recipientName,
                  kind: 'INTERACTION_ALERT',
                  title: 'คุณหมอขอคุยเรื่องยาที่กินร่วมกัน',
                  body: text.trim(),
                  ruleId: f.rule.interaction_id,
                });
                setSentAt(new Date().toISOString());
              }}
              className="flex min-h-[40px] items-center gap-1.5 rounded-xl bg-rose-600 px-3 text-sm font-bold text-white disabled:opacity-40"
            >
              <Send className="h-4 w-4" /> ส่งถึงยาย
            </button>
            <button type="button" onClick={() => setOpen(false)} className="min-h-[40px] rounded-xl border border-slate-300 px-3 text-sm font-semibold">
              ยกเลิก
            </button>
          </div>
          <p className="text-xs text-slate-500">ระบบร่างข้อความให้ แพทย์แก้ได้ก่อนส่ง · ระบบไม่สั่งหยุดหรือเปลี่ยนยาเอง</p>
        </div>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className="flex min-h-[40px] items-center gap-1.5 rounded-xl bg-rose-600 px-3 text-sm font-bold text-white">
          <BellRing className="h-4 w-4" /> แจ้งเตือนยาย
        </button>
      )}
    </div>
  );
};

const ConsultInbox: React.FC<{ list: ReturnType<typeof consults.all> }> = ({ list }) =>
  list.length === 0 ? null : (
    <section className="space-y-2 rounded-2xl border border-violet-200 bg-violet-50/60 p-4">
      <h2 className="text-base font-bold text-slate-900">คำขอปรึกษาจากแพทย์แผนปัจจุบัน</h2>
      {list.map((c) => (
        <div key={c.id} className="flex flex-wrap items-start justify-between gap-2 rounded-xl bg-white p-3 text-sm">
          <div>
            <p className="font-semibold">{c.question}</p>
            <p className="text-xs text-slate-500">
              จาก {c.from} · {new Date(c.at).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}
              {c.ruleIds.length ? ` · แนบคู่ยา ${c.ruleIds.join(', ')}` : ''}
            </p>
          </div>
          {c.acceptedAt ? (
            <span className="text-xs font-semibold text-emerald-700">รับเรื่องแล้ว</span>
          ) : (
            <button type="button" onClick={() => consults.accept(c.id)} className="min-h-[36px] rounded-lg bg-violet-700 px-3 text-xs font-bold text-white">
              รับเรื่อง
            </button>
          )}
        </div>
      ))}
    </section>
  );

/** Thai traditional medicine view only: birth element and today's Smutthan from the existing engine */
const ElementCard: React.FC<{ patientId: string }> = ({ patientId }) => {
  const e = getElementSummaryForPatient(patientId);
  return (
    <section className="rounded-2xl border border-emerald-200 bg-white p-4 text-sm">
      <h2 className="text-base font-bold text-slate-900">ธาตุและสมุฏฐาน (เครื่องมือเดิมของระบบ)</h2>
      {e.status === 'UNKNOWN' ? (
        <p className="text-amber-800">รอข้อมูลประเมิน: ขาด {e.missingInputs.join(', ')}</p>
      ) : (
        <p>
          ธาตุเจ้าเรือน: <b>{e.birthElement ?? '-'}</b> · สมุฏฐานวันที่ประเมิน: <b>{e.dynamic.dominantTh}</b> ({e.dynamic.state}) · รสที่ตำราแนะนำ: {e.dynamic.recommendedTaste.join(', ')}
          <span className="block text-xs text-slate-500">
            {e.source} · {e.ruleVersion} · ประเมินเมื่อ {new Date(e.assessedAt).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}
          </span>
        </p>
      )}
    </section>
  );
};
