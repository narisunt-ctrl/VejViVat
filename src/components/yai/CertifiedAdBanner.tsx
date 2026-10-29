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
    <aside className="relative rounded-2xl border border-lx-line bg-lx-surface p-3 text-sm text-lx-ink" aria-label="โฆษณา">
      <div className="flex items-start justify-between gap-2">
        <span className="rounded bg-lx-surface2 px-1.5 py-0.5 text-xs font-bold text-lx-muted">โฆษณา</span>
        <button type="button" onClick={() => yaiStore.hideAd(ad.id)} className="flex h-8 w-8 items-center justify-center rounded-full text-lx-muted hover:bg-lx-surface2" aria-label="ซ่อนโฆษณานี้">
          <X className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-1 text-base font-bold">{ad.product}</p>
      <p className="text-lx-muted">{ad.claim}</p>
      <p className="mt-1 text-xs text-lx-muted">
        {ad.maker} · ทะเบียน อย. {ad.fdaReg} · ใบอนุญาตโฆษณา {ad.adLicense} · GMP · ข้อมูลจำลอง
      </p>
      <p className="mt-1 text-xs font-semibold text-lx-warn">ปรึกษาแพทย์หรือเภสัชกรก่อนใช้ โดยเฉพาะผู้ที่ใช้ยาประจำ · โฆษณาไม่ได้เลือกจากข้อมูลสุขภาพของคุณ</p>
    </aside>
  );
};
