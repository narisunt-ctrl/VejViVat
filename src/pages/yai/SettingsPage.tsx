import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useYai, yaiStore } from '../../services/yai/yaiStore';
import { BigButton, Card, Notice, PageTitle, formatThaiDateTime } from '../../components/yai/ui';
import { cloudOcrAvailable } from '../../services/yai/ocrPipeline';

const AUDIT_LABEL: Record<string, string> = {
  CONSENT_GRANTED: 'อนุญาตให้เห็นข้อมูล',
  CONSENT_REVOKED: 'ยกเลิกการอนุญาต',
  PREVISIT_READ: 'คลินิกเปิดอ่านสรุป',
  PREVISIT_READ_DENIED: 'คลินิกพยายามเปิดอ่านแต่ไม่มีสิทธิ์',
  APPOINTMENT_REQUESTED: 'ส่งคำขอนัด',
  APPOINTMENT_PROVIDER_UPDATE: 'คลินิก (จำลอง) ตอบคำขอนัด',
  MEDICINE_SAVED: 'บันทึกยา',
  REMINDER_CREATED: 'ตั้งเตือนกินยา',
  DOSE_REPORTED: 'ตอบการเตือนกินยา',
  DEMO_RESET: 'ล้างข้อมูลสาธิต',
};

export const SettingsPage: React.FC = () => {
  const state = useYai((s) => s);
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div className="space-y-5">
      <PageTitle title="ตั้งค่า" />

      <Card>
        <h2 className="text-xl font-bold">ขนาดตัวหนังสือ</h2>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {([100, 125, 150] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={state.settings.fontScale === v}
              onClick={() => yaiStore.updateSettings({ fontScale: v })}
              className={`min-h-[56px] rounded-2xl border-2 text-lg font-bold ${state.settings.fontScale === v ? 'border-yai-deep bg-yai-mint' : 'border-yai-ink/15 bg-white'}`}
            >
              {v}%
            </button>
          ))}
        </div>
      </Card>

      <Card className="space-y-2">
        <Link to="/yai/family" className="flex min-h-[56px] items-center justify-between text-lg font-semibold text-yai-deep">
          ครอบครัวช่วยดูแล <span aria-hidden="true">›</span>
        </Link>
        <Link to="/yai/appointments" className="flex min-h-[56px] items-center justify-between text-lg font-semibold text-yai-deep">
          คำขอนัดของฉัน <span aria-hidden="true">›</span>
        </Link>
        <Link to="/yai/onboarding" className="flex min-h-[56px] items-center justify-between text-lg font-semibold text-yai-deep">
          ตั้งค่าเริ่มต้นใหม่ <span aria-hidden="true">›</span>
        </Link>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-xl font-bold">ความเป็นส่วนตัว</h2>
        <p className="text-base">ข้อมูลในแอปนี้เป็นข้อมูลจำลอง เก็บในเบราว์เซอร์เครื่องนี้ (รูปต้นฉบับเก็บใน IndexedDB ของเครื่องนี้)</p>
        {cloudOcrAvailable() && (
          <label className="flex min-h-[56px] items-start gap-3 text-lg">
            <input
              type="checkbox"
              className="mt-1 h-7 w-7 shrink-0 accent-yai-deep"
              checked={state.settings.cloudOcrConsent === true}
              onChange={(e) => yaiStore.updateSettings({ cloudOcrConsent: e.target.checked })}
            />
            <span>
              ส่งรูปฉลากไปอ่านที่เซิร์ฟเวอร์ (PaddleOCR และ Typhoon OCR) เพื่อความแม่นยำ
              <span className="block text-sm text-yai-ink/70">เซิร์ฟเวอร์ไม่เก็บรูป ถ้าปิด ระบบจะอ่านในเครื่องนี้แทน</span>
            </span>
          </label>
        )}
        <Link to="/yai/privacy" className="block min-h-[44px] text-base font-semibold text-yai-deep underline">
          อ่านประกาศความเป็นส่วนตัว
        </Link>
        {!confirmReset ? (
          <BigButton variant="secondary" onClick={() => setConfirmReset(true)}>
            ล้างข้อมูลสาธิตทั้งหมด
          </BigButton>
        ) : (
          <div className="space-y-2">
            <Notice tone="warn" title="ลบรูปและรายการที่บันทึก แล้วเริ่มเรื่องตัวอย่างใหม่?" />
            <div className="grid grid-cols-2 gap-2">
              <BigButton variant="ghost" onClick={() => setConfirmReset(false)}>
                ยกเลิก
              </BigButton>
              <BigButton
                variant="danger"
                onClick={() => {
                  yaiStore.reset();
                  setConfirmReset(false);
                }}
              >
                ล้างข้อมูล
              </BigButton>
            </div>
          </div>
        )}
      </Card>

      <Card>
        <h2 className="text-xl font-bold">ประวัติการใช้ข้อมูล (ล่าสุด)</h2>
        {state.audit.length === 0 ? (
          <p className="mt-2 text-base text-yai-ink/70">ยังไม่มี</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {state.audit.slice(0, 10).map((e) => (
              <li key={e.id} className="border-b border-yai-ink/5 pb-2 text-base">
                <b>{AUDIT_LABEL[e.action] ?? e.action}</b>
                <span className="block text-sm text-yai-ink/70">
                  {formatThaiDateTime(e.at)} · {e.actor}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};
