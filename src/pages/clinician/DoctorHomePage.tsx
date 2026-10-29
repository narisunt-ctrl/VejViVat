import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, BookCheck, ClipboardCheck, Compass, FlaskConical, MessageSquareWarning, Pill, Stethoscope, UserRound, Users } from 'lucide-react';
import type { SyntheticCase } from '../../types/patient';
import { DEMO_PATIENT_LINKS } from '../../data/yai/demoLinks';
import { yaiStore } from '../../services/yai/yaiStore';
import { getScreeningRules } from '../../services/interactionMatcher';
import { screenPatientInteractions } from '../../domain/yai/interactionCheck';
import { bangkokDate } from '../../domain/yai/journal';
import { useConsults } from '../../services/carebridge/consults';
import { useGuidelines } from '../../services/carebridge/evidenceReviews';
import { useClinicianMessages } from '../../services/yai/clinicianMessages';

// The doctor's start page: what needs attention today, in one screen, each item one click from the place to act.
// Patient data is read once on opening, only with the patient's consent (the read is audited on the patient side).

export const DoctorHomePage: React.FC<{ currentCase: SyntheticCase }> = ({ currentCase }) => {
  const link = DEMO_PATIENT_LINKS[0];
  const [snap, setSnap] = useState<ReturnType<typeof yaiStore.readDoseReportsForClinician> | null>(null);
  useEffect(() => setSnap(yaiStore.readDoseReportsForClinician(link.recipientId)), [link.recipientId]);
  const consultList = useConsults();
  const gl = useGuidelines();
  const messages = useClinicianMessages();

  const screen = useMemo(
    () =>
      snap?.allowed
        ? screenPatientInteractions({ medicines: snap.medicines ?? [], journal: snap.journal, syncedOrders: snap.syncedOrders ?? [] }, getScreeningRules(), bangkokDate(new Date(Date.now() - 14 * 86_400_000)))
        : null,
    [snap]
  );
  const high = screen?.flags.filter((f) => f.rule.severity_code === 'HIGH').length ?? 0;
  const pendingConsults = consultList.filter((c) => !c.acceptedAt).length;
  const drafts = gl.filter((g) => g.status === 'DRAFT').length;
  const unread = messages.filter((m) => !m.acknowledgedAt).length;
  const today = new Date().toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Bangkok' });

  const tiles = [
    { label: 'ผู้ป่วยมีคู่ยาตีกันรุนแรงสูง', value: snap?.allowed ? high : '–', to: '/clinician/followup', icon: AlertTriangle, tone: high ? 'rose' : 'slate', sub: snap?.allowed ? 'จากข้อมูลที่ผู้ป่วยอนุญาต' : 'ผู้ป่วยยังไม่อนุญาต' },
    { label: 'คำขอปรึกษารอรับเรื่อง', value: pendingConsults, to: '/clinician/followup', icon: Users, tone: pendingConsults ? 'violet' : 'slate', sub: 'จากแพทย์แผนปัจจุบัน' },
    { label: 'Guideline รออนุมัติ', value: drafts, to: '/guidelines', icon: BookCheck, tone: drafts ? 'amber' : 'slate', sub: 'ต้องได้ทั้งสองแผน' },
    { label: 'ข้อความที่ผู้ป่วยยังไม่รับทราบ', value: unread, to: '/clinician/followup', icon: MessageSquareWarning, tone: unread ? 'sky' : 'slate', sub: 'ส่งจากหน้าติดตาม' },
  ] as const;
  const TONE: Record<string, string> = {
    rose: 'border-rose-300 bg-rose-50 text-rose-900',
    violet: 'border-violet-300 bg-violet-50 text-violet-900',
    amber: 'border-amber-300 bg-amber-50 text-amber-900',
    sky: 'border-sky-300 bg-sky-50 text-sky-900',
    slate: 'border-slate-200 bg-white text-slate-900',
  };

  const actions = [
    { to: '/smutthan', label: 'ประเมินสมุฏฐาน', icon: Compass },
    { to: '/prescribe', label: 'สั่งยา + ดูหลักฐาน', icon: Pill },
    { to: '/research', label: 'ค้นหลักฐานงานวิจัย', icon: FlaskConical },
    { to: '/clinician/handover', label: 'สร้างสรุปส่งต่อ', icon: ClipboardCheck },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-5 py-4 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{today}</p>
          <h1 className="text-2xl font-bold text-slate-900">สวัสดีครับคุณหมอ วันนี้มีเรื่องต้องดู {[high > 0, pendingConsults > 0, drafts > 0, unread > 0].filter(Boolean).length} เรื่อง</h1>
        </div>
        <Link to="/patients" className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm hover:border-brand-400">
          <UserRound className="h-4 w-4 text-brand-700" />
          เคสปัจจุบัน: <b>{currentCase.patient_info.name}</b>
          <span className="text-xs text-slate-500">เปลี่ยน</span>
        </Link>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="ต้องทำวันนี้">
        {tiles.map((t) => (
          <Link key={t.label} to={t.to} className={`group flex flex-col gap-1 rounded-2xl border p-4 transition hover:shadow-md ${TONE[t.tone]}`}>
            <span className="flex items-center justify-between">
              <t.icon className="h-5 w-5" aria-hidden="true" />
              <ArrowRight className="h-4 w-4 opacity-0 transition group-hover:opacity-100" aria-hidden="true" />
            </span>
            <span className="text-3xl font-bold">{t.value}</span>
            <span className="text-sm font-semibold">{t.label}</span>
            <span className="text-xs opacity-70">{t.sub}</span>
          </Link>
        ))}
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 lg:col-span-2">
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
            <Stethoscope className="h-5 w-5 text-brand-700" /> ผู้ป่วยที่ติดตามผ่านยายพร้อม
          </h2>
          {DEMO_PATIENT_LINKS.map((l) => (
            <div key={l.yaiPatientId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
              <div>
                <p className="font-semibold text-slate-900">{snap?.allowed ? snap.patient?.displayName : l.yaiPatientId}</p>
                <p className="text-xs text-slate-500">
                  {snap?.allowed
                    ? `คู่ยาที่อาจตีกัน ${screen?.flags.length ?? 0} คู่ · บันทึกล่าสุด ${snap.journal.filter((e) => e.status !== 'DRAFT').map((e) => e.recordedLocalDate).sort().pop() ?? '-'}`
                    : 'ผู้ป่วยยังไม่อนุญาตให้คลินิกนี้ดูข้อมูล'}
                </p>
              </div>
              <div className="flex gap-2">
                <Link to="/clinician/followup" className="rounded-lg bg-brand-700 px-3 py-1.5 text-xs font-bold text-white">
                  ดูสรุป 30 วินาที
                </Link>
                <Link to="/clinician/handover" className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700">
                  Handover
                </Link>
              </div>
            </div>
          ))}
          <p className="text-xs text-slate-500">ข้อมูลจำลอง · อ่านเฉพาะเมื่อผู้ป่วยอนุญาต และบันทึกการเปิดดูทุกครั้ง</p>
        </section>

        <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="text-base font-bold text-slate-900">เคสที่เปิดอยู่</h2>
          <p className="font-semibold">{currentCase.patient_info.name}</p>
          <p className="text-sm text-slate-600">
            อายุ {currentCase.patient_info.age} ปี · {currentCase.current_encounter.chief_complaint}
          </p>
          <p className="text-xs text-slate-500">
            BP {currentCase.current_encounter.vitals.sbp}/{currentCase.current_encounter.vitals.dbp} · PR {currentCase.current_encounter.vitals.pr} · T {currentCase.current_encounter.vitals.btemp}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {actions.map((a) => (
              <Link key={a.to} to={a.to} className="flex flex-col items-start gap-1 rounded-xl border border-slate-200 p-3 text-sm font-semibold text-slate-800 hover:border-brand-400 hover:bg-brand-50/40">
                <a.icon className="h-5 w-5 text-brand-700" aria-hidden="true" />
                {a.label}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
