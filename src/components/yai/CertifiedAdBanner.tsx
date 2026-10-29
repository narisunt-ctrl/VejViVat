import React from 'react';
import { X } from 'lucide-react';
import { demoNow, useYai, yaiStore } from '../../services/yai/yaiStore';
import { adForDate, eligibleAds, SPONSORED_PRODUCTS } from '../../data/yai/adsCatalog';
import { bangkokDate } from '../../domain/yai/journal';

/** Sponsored banner (free app): certified products only, clearly labelled, not targeted, can be hidden */
export const CertifiedAdBanner: React.FC = () => {
  const state = useYai((s) => s);
  const ad = adForDate(eligibleAds(SPONSORED_PRODUCTS, state.settings.hiddenAds), bangkokDate(demoNow(state)));
  if (!ad) return null;
  return (
    <aside className="relative rounded-2xl border border-slate-200 bg-white p-3 text-sm" aria-label="โฆษณา">
      <div className="flex items-start justify-between gap-2">
        <span className="rounded bg-slate-200 px-1.5 py-0.5 text-xs font-bold text-slate-700">โฆษณา</span>
        <button type="button" onClick={() => yaiStore.hideAd(ad.id)} className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100" aria-label="ซ่อนโฆษณานี้">
          <X className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-1 text-base font-bold">{ad.product}</p>
      <p className="text-yai-ink/80">{ad.claim}</p>
      <p className="mt-1 text-xs text-yai-ink/60">
        {ad.maker} · ทะเบียน อย. {ad.fdaReg} · ใบอนุญาตโฆษณา {ad.adLicense} · GMP · ข้อมูลจำลอง
      </p>
      <p className="mt-1 text-xs font-semibold text-amber-800">ปรึกษาแพทย์หรือเภสัชกรก่อนใช้ โดยเฉพาะผู้ที่ใช้ยาประจำ · โฆษณาไม่ได้เลือกจากข้อมูลสุขภาพของคุณ</p>
    </aside>
  );
};
