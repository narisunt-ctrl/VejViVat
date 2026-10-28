import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import { MedicationPassport } from '../../domain/yai/models';
import { fieldCompleteness } from '../../domain/yai/policies';

/** Two-column checklist of which label fields are known. Missing is fine; it is shown, not guessed. */
export const CompletenessGrid: React.FC<{ medicine: MedicationPassport; compact?: boolean }> = ({ medicine, compact }) => {
  const items = fieldCompleteness(medicine);
  const done = items.filter((i) => i.done).length;
  return (
    <div>
      <p className={`${compact ? 'text-sm' : 'text-base'} font-semibold`}>
        ความครบถ้วนของข้อมูล {done}/{items.length}
      </p>
      <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
        {items.map((i) => (
          <li key={i.key} className={`flex items-center gap-1.5 ${compact ? 'text-sm' : 'text-base'}`}>
            {i.done ? <CheckCircle2 className="h-5 w-5 shrink-0 text-yai-leaf" aria-hidden="true" /> : <Circle className="h-5 w-5 shrink-0 text-yai-ink/30" aria-hidden="true" />}
            <span className={i.done ? '' : 'text-yai-ink/60'}>{i.label}</span>
            <span className="sr-only">{i.done ? 'มีข้อมูล' : 'ยังไม่ทราบ'}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
