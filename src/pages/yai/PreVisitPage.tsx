import React, { useState } from 'react';
import { useYai, yaiStore, demoNow } from '../../services/yai/yaiStore';
import { DEMO_CLINICS } from '../../data/yai/fixtures';
import { isConsentActive } from '../../domain/yai/policies';
import { BigButton, Card, Field, inputCls, Notice, PageTitle, formatThaiDateTime } from '../../components/yai/ui';
import { PreVisitReport } from '../../components/yai/PreVisitReport';

export const PreVisitPage: React.FC = () => {
  const state = useYai((s) => s);
  const [clinicId, setClinicId] = useState(DEMO_CLINICS[0].id);
  const [days, setDays] = useState(7);
  const now = demoNow(state);
  const shares = state.consents.filter((c) => c.scope.includes('PREVISIT_REPORT') && DEMO_CLINICS.some((k) => k.id === c.recipientId));

  return (
    <div className="space-y-5">
      <PageTitle title="สรุปให้คุณหมอ" subtitle="ดูก่อนว่าคุณหมอจะเห็นอะไร แล้วเลือกส่งให้คลินิกที่ต้องการ" />

      <Card className="print:border-0 print:shadow-none">
        <PreVisitReport state={state} audience="patient" />
      </Card>

      <BigButton variant="ghost" onClick={() => window.print()} className="print:hidden">
        พิมพ์สรุปนี้
      </BigButton>

      <Card className="space-y-4 print:hidden">
        <h2 className="text-xl font-bold">ส่งให้คลินิก</h2>
        <Field label="คลินิก" hint="ส่งให้คลินิกที่เลือกเท่านั้น คลินิกอื่นและผู้ให้บริการรถรับส่งจะไม่เห็น">
          <select className={inputCls} value={clinicId} onChange={(e) => setClinicId(e.target.value)}>
            {DEMO_CLINICS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="ให้ดูได้กี่วัน">
          <select className={inputCls} value={days} onChange={(e) => setDays(Number(e.target.value))}>
            {[1, 7, 30].map((d) => (
              <option key={d} value={d}>
                {d} วัน
              </option>
            ))}
          </select>
        </Field>
        <BigButton onClick={() => yaiStore.grantConsent(clinicId, DEMO_CLINICS.find((c) => c.id === clinicId)!.name, ['PREVISIT_REPORT'], days)}>
          อนุญาตให้คลินิกนี้ดูสรุป
        </BigButton>
      </Card>

      {shares.length > 0 && (
        <Card className="space-y-3 print:hidden">
          <h2 className="text-xl font-bold">คลินิกที่ดูสรุปได้</h2>
          {shares.map((c) => {
            const active = isConsentActive(c, now);
            return (
              <div key={c.id} className="rounded-2xl border border-yai-ink/10 p-3">
                <p className="text-lg font-semibold">{c.recipientName}</p>
                <p className="text-sm text-yai-ink/70">
                  {active ? `ดูได้ถึง ${formatThaiDateTime(c.expiresAt!)}` : c.revokedAt ? `ยกเลิกแล้ว ${formatThaiDateTime(c.revokedAt)}` : 'หมดอายุแล้ว'}
                </p>
                {active && (
                  <button className="mt-2 min-h-[44px] text-base font-bold text-yai-alert underline" onClick={() => yaiStore.revokeConsent(c.id)}>
                    ยกเลิกการอนุญาต
                  </button>
                )}
              </div>
            );
          })}
        </Card>
      )}

      <Notice title="ข้อมูลจำลอง" >ในต้นแบบนี้ "คลินิก" คือหน้าจอสาธิตสำหรับบุคลากรในเครื่องเดียวกัน ยังไม่มีการส่งข้อมูลออกไปจริง</Notice>
    </div>
  );
};
