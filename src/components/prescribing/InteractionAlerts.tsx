import React from 'react';
import { MatchedInteractionResult } from '../../types/hdi';
import { AlertOctagon, AlertTriangle, Info, HelpCircle, BookOpen, UserCheck } from 'lucide-react';

interface InteractionAlertsProps {
  interactions: MatchedInteractionResult[];
}

export const InteractionAlerts: React.FC<InteractionAlertsProps> = ({ interactions }) => {
  if (interactions.length === 0) {
    // Zero matches in a small sample dataset is not proof that the combination is safe
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-800 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0 text-slate-600">
          <Info className="w-4 h-4" />
        </div>
        <div>
          <div className="font-bold">ไม่พบคู่อันตรกิริยาในฐานข้อมูลตัวอย่าง</div>
          <div className="text-[11px] text-slate-600 mt-0.5">
            ฐานข้อมูล Herb-Drug Interaction ตัวอย่างมีเพียง 14 คู่ยา และยังไม่ได้ประเมินทุกคู่ยา จึงยืนยันว่าปลอดภัยไม่ได้ — ควรให้เภสัชกรตรวจสอบ
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
          <AlertOctagon className="w-4 h-4 text-rose-600" />
          <span>แจ้งเตือนอันตรกิริยายาแผนปัจจุบันและสมุนไพร (HDI Alerts)</span>
        </h4>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] bg-blue-50 text-blue-800 font-semibold px-2 py-0.5 rounded border border-blue-200">
            อิง NLEM 2569
          </span>
          <span className="text-[11px] bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-full">
            {interactions.length} ปฏิกิริยาตรวจพบ
          </span>
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 text-[11px] text-slate-600 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5 text-brand-700" />
          <span>เชื่อมโยงฐานข้อมูลยาเคมีแผนปัจจุบัน (NLEM 2569) กับยาสมุนไพร 14 คู่ยามาตรฐาน</span>
        </span>
        <span className="text-[10px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded font-medium border border-amber-200">
          ระดับสูงต้องบันทึกเหตุผล (Two-Key Check)
        </span>
      </div>

      <div className="space-y-2.5">
        {interactions.map((match, idx) => {
          const item = match.interaction;
          const isHigh = item.severity === 'สูง';
          const isMod = item.severity === 'ปานกลาง';
          const isLow = item.severity === 'ต่ำ';

          let bgClass = 'bg-slate-50 border-slate-300 text-slate-900';
          let badgeClass = 'bg-slate-500 text-white';
          let IconComp = HelpCircle;

          if (isHigh) {
            bgClass = 'bg-rose-50/70 border-rose-300 text-rose-950 ring-1 ring-rose-300';
            badgeClass = 'bg-rose-600 text-white';
            IconComp = AlertOctagon;
          } else if (isMod) {
            bgClass = 'bg-orange-50/70 border-orange-300 text-orange-950 ring-1 ring-orange-200';
            badgeClass = 'bg-orange-600 text-white';
            IconComp = AlertTriangle;
          } else if (isLow) {
            bgClass = 'bg-amber-50/70 border-amber-300 text-amber-950';
            badgeClass = 'bg-amber-600 text-white';
            IconComp = Info;
          }

          return (
            <div key={idx} className={`p-3.5 rounded-xl border text-xs shadow-sm ${bgClass}`}>
              <div className="flex items-start justify-between gap-2 border-b border-black/5 pb-2">
                <div className="flex items-center gap-2">
                  <IconComp className="w-4 h-4 shrink-0" />
                  <span className="font-bold">
                    {match.drug_name} + {match.herb_name}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${badgeClass}`}>
                    ระดับ: {item.severity}
                  </span>
                  <span className="bg-white/80 border border-black/10 px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-700">
                    Evidence: Level {item.evidence_level}
                  </span>
                </div>
              </div>

              {/* Mechanism */}
              <div className="mt-2 text-[11px] leading-relaxed">
                <span className="font-semibold text-slate-800">กลไกการออกฤทธิ์: </span>
                <span className="text-slate-700">{item.mechanism}</span>
              </div>

              {/* Clinical Risk */}
              <div className="mt-1 text-[11px] leading-relaxed">
                <span className="font-semibold text-slate-800">ความเสี่ยงทางคลินิก: </span>
                <span className="font-medium text-rose-900">{item.clinical_effects}</span>
              </div>

              {/* Clinical Recommendation */}
              <div className="mt-2 p-2 bg-white/80 rounded-lg border border-black/5 text-[11px]">
                <span className="font-bold text-slate-900">คำแนะนำสำหรับแพทย์: </span>
                <span className="text-slate-800">{item.recommendation}</span>
              </div>

              {/* Footnote Source & Reviewer */}
              <div className="mt-2 pt-1 border-t border-black/5 flex items-center justify-between text-[10px] text-slate-500">
                <span className="truncate max-w-[280px]">แหล่งอ้างอิง: {item.sources}</span>
                <span className="font-medium">{item.reviewer}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
