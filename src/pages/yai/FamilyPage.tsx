import React, { useState } from 'react';
import { useYai, yaiStore, demoNow } from '../../services/yai/yaiStore';
import { BigButton, Card, Field, inputCls, Notice, PageTitle, formatThaiDateTime } from '../../components/yai/ui';
import { isConsentActive } from '../../domain/yai/policies';
import { ConsentScope } from '../../domain/yai/models';

const CAREGIVER_ID = 'caregiver-demo';
const SCOPE_LABEL: Record<ConsentScope, string> = {
  APPOINTMENTS: 'นัดหมาย',
  REMINDER_ALERTS: 'แจ้งเตือนเมื่อไม่ได้ตอบการเตือนกินยา',
  MEDICINES: 'รายการยา',
  PREVISIT_REPORT: 'สรุปก่อนพบหมอ',
  HERB_DATA: 'ข้อมูลการใช้สมุนไพร',
};

export const FamilyPage: React.FC = () => {
  const state = useYai((s) => s);
  const [name, setName] = useState(state.settings.familyName);
  const [phone, setPhone] = useState(state.settings.familyPhone);
  const [scopes, setScopes] = useState<ConsentScope[]>(['APPOINTMENTS']);
  const [saved, setSaved] = useState(false);
  const now = demoNow(state);
  const grants = state.consents.filter((c) => c.recipientId === CAREGIVER_ID);

  return (
    <div className="space-y-5">
      <PageTitle title="ครอบครัวช่วยดูแล" back="/yai/settings" />

      <Card className="space-y-4">
        <Field label="ชื่อที่เรียก เช่น หลานแนน">
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="เบอร์โทรของหลาน" hint="ใช้กับปุ่มโทรหาหลานในหน้าช่วยเหลือ เก็บไว้ในเครื่องนี้เท่านั้น">
          <input className={inputCls} inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <BigButton
          onClick={() => {
            yaiStore.updateSettings({ familyName: name.trim(), familyPhone: phone.trim() });
            setSaved(true);
          }}
        >
          บันทึก
        </BigButton>
        {saved && <p className="text-base font-semibold text-yai-deep" role="status">บันทึกแล้ว</p>}
      </Card>

      <Card className="space-y-3">
        <h2 className="text-xl font-bold">ให้หลานเห็นข้อมูลอะไรบ้าง</h2>
        <p className="text-base text-yai-ink/75">เลือกเฉพาะที่จำเป็น หลานจะไม่เห็นรายการยาหากไม่ได้เลือก</p>
        {(Object.keys(SCOPE_LABEL) as ConsentScope[]).map((s) => (
          <label key={s} className="flex min-h-[52px] items-center gap-3 text-lg">
            <input
              type="checkbox"
              className="h-7 w-7 accent-yai-deep"
              checked={scopes.includes(s)}
              onChange={(e) => setScopes(e.target.checked ? [...scopes, s] : scopes.filter((x) => x !== s))}
            />
            {SCOPE_LABEL[s]}
          </label>
        ))}
        <BigButton
          variant="secondary"
          disabled={scopes.length === 0}
          onClick={() => yaiStore.grantConsent(CAREGIVER_ID, name || 'หลาน', scopes, 90)}
        >
          อนุญาต 90 วัน
        </BigButton>
        <Notice title="ตัวอย่างการทำงาน">ยังไม่มีระบบส่งแจ้งเตือนถึงหลานจริง การอนุญาตนี้บันทึกไว้เพื่อสาธิตการขอความยินยอมเท่านั้น</Notice>
      </Card>

      {grants.length > 0 && (
        <Card className="space-y-3">
          <h2 className="text-xl font-bold">การอนุญาตที่ให้ไว้</h2>
          {grants.map((g) => {
            const active = isConsentActive(g, now);
            return (
              <div key={g.id} className="rounded-2xl border border-yai-ink/10 p-3">
                <p className="text-lg font-semibold">{g.scope.map((s) => SCOPE_LABEL[s]).join(', ')}</p>
                <p className="text-sm text-yai-ink/70">
                  {active ? `ใช้ได้ถึง ${formatThaiDateTime(g.expiresAt!)}` : g.revokedAt ? `ยกเลิกแล้วเมื่อ ${formatThaiDateTime(g.revokedAt)}` : 'หมดอายุแล้ว'}
                </p>
                {active && (
                  <button className="mt-2 min-h-[44px] font-bold text-yai-alert underline" onClick={() => yaiStore.revokeConsent(g.id)}>
                    ยกเลิกการอนุญาต
                  </button>
                )}
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
};
