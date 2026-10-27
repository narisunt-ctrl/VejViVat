import React from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';

export const DisclaimerBanner: React.FC = () => {
  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 px-3 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs text-amber-900 flex items-center justify-between no-print">
      <div className="flex items-center gap-2 max-w-5xl mx-auto w-full">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
        <div>
          <span className="font-semibold bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded mr-1.5 uppercase text-[10px] tracking-wide">
            ข้อมูลสังเคราะห์เพื่อการสาธิต
          </span>
          <span className="sm:hidden">CDSS ช่วยแพทย์แผนไทย ไม่ใช่การวินิจฉัยแทนแพทย์</span>
          <span className="hidden sm:inline">
            ระบบนี้เป็น Clinical Decision Support (CDSS) สำหรับแพทย์แผนไทย มิใช่การวินิจฉัยหรือสั่งยาอัตโนมัติแทนแพทย์ | ข้อมูลทั้งหมดเป็นข้อมูลจำลองเพื่อการแข่งขัน Hackathon 2026
          </span>
        </div>
      </div>
      <div className="hidden md:flex items-center gap-1 text-[11px] text-amber-700 shrink-0 font-medium">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
        <span>PDPA & Zero-PII Verified</span>
      </div>
    </div>
  );
};
