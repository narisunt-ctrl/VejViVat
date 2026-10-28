import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useYai, yaiStore } from '../../services/yai/yaiStore';
import { BigButton, Card, Notice, PageTitle } from '../../components/yai/ui';
import { YaiSettings } from '../../domain/yai/models';

export const OnboardingPage: React.FC = () => {
  const settings = useYai((s) => s.settings);
  const navigate = useNavigate();
  const [role, setRole] = useState<YaiSettings['role']>(settings.role);
  const [scale, setScale] = useState<YaiSettings['fontScale']>(settings.fontScale);
  const [ack, setAck] = useState(false);

  return (
    <div className="space-y-5">
      <PageTitle title="เริ่มใช้ยายพร้อม" subtitle="ตอบ 3 ข้อสั้นๆ เปลี่ยนภายหลังได้ที่ตั้งค่า" />

      <Card>
        <h2 className="text-xl font-bold">1. ใครเป็นคนใช้แอปนี้?</h2>
        <div className="mt-3 grid gap-3">
          {(
            [
              ['PATIENT', 'คุณยาย/คุณตา ใช้เอง'],
              ['CAREGIVER', 'ลูกหลานช่วยใช้แทน'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={role === value}
              onClick={() => setRole(value)}
              className={`min-h-[56px] rounded-2xl border-2 px-4 text-left text-lg font-semibold ${role === value ? 'border-yai-deep bg-yai-mint' : 'border-yai-ink/15 bg-white'}`}
            >
              {role === value ? '● ' : '○ '}
              {label}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="text-xl font-bold">2. ขนาดตัวหนังสือ</h2>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {([100, 125, 150] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={scale === v}
              onClick={() => {
                setScale(v);
                yaiStore.updateSettings({ fontScale: v });
              }}
              className={`min-h-[56px] rounded-2xl border-2 font-bold ${scale === v ? 'border-yai-deep bg-yai-mint' : 'border-yai-ink/15 bg-white'}`}
              style={{ fontSize: `${v * 0.16}px` }}
            >
              ก {v}%
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="text-xl font-bold">3. เรื่องข้อมูล</h2>
        <Notice tone="warn" title="นี่คือแอปต้นแบบเพื่อการสาธิต">
          ข้อมูลทั้งหมดเป็นข้อมูลจำลอง เก็บไว้ในเครื่องนี้เท่านั้น ระบบไม่วินิจฉัยโรค ไม่สั่งยา และไม่บอกว่ายาคู่ไหนปลอดภัย
          ข้อมูลจะถูกส่งให้คลินิกก็ต่อเมื่อคุณยายกดอนุญาตเป็นรายคลินิก
        </Notice>
        <label className="mt-3 flex min-h-[56px] items-center gap-3 text-lg">
          <input type="checkbox" className="h-7 w-7 accent-yai-deep" checked={ack} onChange={(e) => setAck(e.target.checked)} />
          เข้าใจแล้ว
        </label>
      </Card>

      <BigButton
        size="lg"
        disabled={!ack}
        onClick={() => {
          yaiStore.updateSettings({ role, fontScale: scale, onboarded: true });
          navigate('/yai');
        }}
      >
        เริ่มใช้งาน
      </BigButton>
    </div>
  );
};
