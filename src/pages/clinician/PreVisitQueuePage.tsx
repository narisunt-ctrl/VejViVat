import React, { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ShieldAlert, FileText } from 'lucide-react';
import { useYai, yaiStore, demoNow } from '../../services/yai/yaiStore';
import { DEMO_CLINICS } from '../../data/yai/fixtures';
import { canRead, isConsentActive } from '../../domain/yai/policies';
import { PreVisitReport } from '../../components/yai/PreVisitReport';

// Clinician-side demo of the ยายพร้อม pre-visit packet. Each clinic only sees packets the
// patient explicitly shared with that clinic, and every read or denied read is audited.

export const PreVisitQueuePage: React.FC = () => {
  const state = useYai((s) => s);
  const now = demoNow(state);

  return (
    <div className="mx-auto max-w-4xl space-y-5 py-4 sm:px-6">
      <header>
        <h1 className="text-xl font-bold text-slate-900">สรุปก่อนพบแพทย์จากแอปยายพร้อม</h1>
        <p className="text-sm text-slate-600">ข้อมูลจำลอง · เลือกคลินิกที่จะดูในฐานะ คลินิกจะเห็นเฉพาะสรุปที่ผู้ป่วยอนุญาต</p>
      </header>
      <div className="grid gap-3 sm:grid-cols-2">
        {DEMO_CLINICS.map((c) => {
          const allowed = canRead(state.consents, c.id, 'PREVISIT_REPORT', now);
          const grant = state.consents.find((g) => g.recipientId === c.id && g.scope.includes('PREVISIT_REPORT') && isConsentActive(g, now));
          return (
            <Link
              key={c.id}
              to={`/clinician/previsit/${c.id}`}
              className={`rounded-2xl border p-4 transition hover:shadow-md ${allowed ? 'border-teal-300 bg-teal-50/60' : 'border-slate-200 bg-white'}`}
            >
              <p className="font-bold text-slate-900">{c.name}</p>
              <p className={`mt-1 text-sm font-semibold ${allowed ? 'text-teal-800' : 'text-slate-500'}`}>
                {allowed ? `มีสรุป 1 ราย (ถึง ${new Date(grant!.expiresAt!).toLocaleDateString('th-TH')})` : 'ยังไม่มีผู้ป่วยอนุญาต'}
              </p>
            </Link>
          );
        })}
      </div>
      <p className="text-xs text-slate-500">
        ทดลองฝั่งผู้ป่วยได้ที่ <Link to="/yai/previsit" className="underline">/yai/previsit</Link>
      </p>
    </div>
  );
};

export const PreVisitDetailPage: React.FC = () => {
  const { clinicId = '' } = useParams();
  const state = useYai((s) => s);
  const clinic = DEMO_CLINICS.find((c) => c.id === clinicId);
  const allowed = canRead(state.consents, clinicId, 'PREVISIT_REPORT', demoNow(state));

  useEffect(() => {
    if (clinic) yaiStore.recordPrevisitAccess(clinic.id, allowed);
    // log once per page open and on consent change
  }, [clinic, allowed]);

  return (
    <div className="mx-auto max-w-4xl space-y-4 py-4 sm:px-6">
      <Link to="/clinician/previsit" className="text-sm font-semibold text-teal-800 underline">
        ← กลับรายการ
      </Link>
      <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900">
        <FileText className="h-5 w-5 text-teal-700" />
        {clinic?.name ?? 'ไม่พบคลินิก'}
      </h1>
      {!clinic ? null : allowed ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <PreVisitReport state={state} audience="clinician" onDemoReview={(id) => yaiStore.demoReviewMedicine(id)} />
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-900">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-bold">ไม่มีสิทธิ์ดูสรุปนี้</p>
            <p className="text-sm">ผู้ป่วยยังไม่ได้อนุญาต หรือยกเลิก/หมดอายุแล้ว ระบบบันทึกการพยายามเปิดอ่านนี้ไว้ในประวัติของผู้ป่วย</p>
          </div>
        </div>
      )}
    </div>
  );
};
