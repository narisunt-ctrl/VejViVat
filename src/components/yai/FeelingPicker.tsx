import React from 'react';
import type { FeelingTag } from '../../domain/yai/models';
import { FEELINGS } from '../../domain/yai/voiceFeatures';

/**
 * "วันนี้รู้สึกแบบไหน": the user picks how they feel (any number, or none). The app asks instead of guessing
 * from the voice. `look` matches the screen it sits on (premium lx screens or the older light journal screens).
 */
export const FeelingPicker: React.FC<{
  value: FeelingTag[];
  onChange: (v: FeelingTag[]) => void;
  look?: 'lx' | 'light';
  legend?: string;
}> = ({ value, onChange, look = 'lx', legend = 'วันนี้รู้สึกแบบไหน (เลือกได้หลายข้อ ข้ามได้)' }) => {
  const on = look === 'lx' ? 'border-lx-accent bg-lx-accent text-lx-onaccent' : 'border-emerald-600 bg-emerald-600 text-white';
  const off = look === 'lx' ? 'border-lx-line bg-lx-surface2 text-lx-ink hover:border-lx-accent/60' : 'border-yai-ink/15 bg-white text-yai-ink';
  return (
    <fieldset>
      <legend className="mb-2 text-base font-semibold">{legend}</legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {FEELINGS.map((f) => {
          const picked = value.includes(f.tag);
          return (
            <button
              key={f.tag}
              type="button"
              aria-pressed={picked}
              onClick={() => onChange(picked ? value.filter((t) => t !== f.tag) : [...value, f.tag])}
              className={`flex min-h-[64px] items-center justify-center gap-1.5 whitespace-nowrap rounded-2xl border-2 px-2 text-base font-semibold transition sm:text-lg ${picked ? on : off}`}
            >
              <span aria-hidden="true">{f.emoji}</span>
              {f.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
};
