import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { useYai, yaiStore } from '../../../services/yai/yaiStore';
import { PERSONAS, personaOf } from '../../../data/yai/personas';
import { LxCard } from './ui';
import type { DemoPersona } from '../../../domain/yai/models';

/**
 * Demo-only switch between the two synthetic users, so one presentation can show both target groups.
 * Switching replaces this browser's demo data (asks once to confirm); the viewer's theme and text size stay.
 */
export const PersonaSwitcher: React.FC = () => {
  const state = useYai((s) => s);
  const navigate = useNavigate();
  const current = personaOf(state);
  const [pending, setPending] = useState<DemoPersona | null>(null);

  const confirm = () => {
    if (!pending) return;
    yaiStore.switchPersona(pending);
    setPending(null);
    navigate('/yai');
  };

  return (
    <LxCard labelledBy="persona-title">
      <h2 id="persona-title" className="text-lg font-semibold">
        ผู้ใช้ตัวอย่างสำหรับสาธิต
      </h2>
      <p className="mt-1 text-sm text-lx-muted">สลับเพื่อดูแอปจากมุมของกลุ่มเป้าหมายแต่ละกลุ่ม ข้อมูลทั้งหมดเป็นข้อมูลจำลอง</p>
      <ul className="mt-3 grid gap-2" role="radiogroup" aria-label="เลือกผู้ใช้ตัวอย่าง">
        {PERSONAS.map((p) => {
          const active = p.id === current;
          return (
            <li key={p.id}>
              <button
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setPending(active ? null : p.id)}
                className={`flex min-h-[64px] w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${
                  active ? 'border-lx-accent bg-lx-accent/10' : pending === p.id ? 'border-lx-warn bg-lx-warnbg' : 'border-lx-line bg-lx-surface2 hover:border-lx-accent/60'
                }`}
              >
                <span className="text-3xl" aria-hidden="true">
                  {p.avatar}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">
                    {p.name} · {p.age} ปี
                  </span>
                  <span className="block text-sm text-lx-muted">{p.summary}</span>
                </span>
                {active && <Check className="h-5 w-5 shrink-0 text-lx-accent" aria-label="กำลังใช้" />}
              </button>
            </li>
          );
        })}
      </ul>
      {pending && (
        <div className="mt-3 space-y-2 rounded-2xl bg-lx-warnbg p-3 text-lx-warn" role="alert">
          <p className="text-sm font-semibold">สลับเป็น {PERSONAS.find((p) => p.id === pending)!.name}? ข้อมูลสาธิตในเบราว์เซอร์นี้จะถูกแทนที่ด้วยข้อมูลตัวอย่างของผู้ใช้คนนั้น</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={confirm} className="min-h-[44px] rounded-xl bg-lx-accent px-4 text-sm font-semibold text-lx-onaccent">
              สลับผู้ใช้
            </button>
            <button type="button" onClick={() => setPending(null)} className="min-h-[44px] rounded-xl border border-lx-line px-4 text-sm font-semibold text-lx-ink">
              ยกเลิก
            </button>
          </div>
        </div>
      )}
    </LxCard>
  );
};
