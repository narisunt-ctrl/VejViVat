import React, { useState } from 'react';
import { ThaiHerbFormularyItem } from '../../types/drug';
import { HerbRecommendationResult } from '../../services/herbRecommendationService';
import { Search, Filter, BookOpen, CheckCircle, HelpCircle, Sparkles, ShieldCheck, ShieldAlert, AlertTriangle } from 'lucide-react';

interface FormularySearchProps {
  formulary: ThaiHerbFormularyItem[];
  selectedHerb: ThaiHerbFormularyItem | null;
  onSelectHerb: (herb: ThaiHerbFormularyItem) => void;
  recommendations?: HerbRecommendationResult[];
}

export const FormularySearch: React.FC<FormularySearchProps> = ({
  formulary,
  selectedHerb,
  onSelectHerb,
  recommendations = [],
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>(
    recommendations.length > 0 ? 'RECOMMENDED' : 'ALL'
  );

  const recommendedItems = recommendations.filter((r) => r.matchScore >= 55);

  const filtered = formulary.filter((herb) => {
    const matchTerm =
      herb.thai_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      herb.common_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      herb.drug_code_24.includes(searchTerm) ||
      herb.indications.some((ind) => ind.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchTerm) return false;

    if (selectedType === 'RECOMMENDED') {
      return recommendations.some((r) => r.herb.drug_code_24 === herb.drug_code_24 && r.matchScore >= 55);
    }
    if (selectedType === 'SINGLE') return herb.herb_type === 'ยาเดี่ยว';
    if (selectedType === 'FORMULA') return herb.herb_type === 'ยาตำรับ';
    if (selectedType === 'EXTRACT') return herb.herb_type === 'ยาสมุนไพรสกัด';

    return true;
  });

  // If in RECOMMENDED mode, sort by match score descending
  const sorted = [...filtered].sort((a, b) => {
    if (selectedType === 'RECOMMENDED') {
      const scoreA = recommendations.find((r) => r.herb.drug_code_24 === a.drug_code_24)?.matchScore || 0;
      const scoreB = recommendations.find((r) => r.herb.drug_code_24 === b.drug_code_24)?.matchScore || 0;
      return scoreB - scoreA;
    }
    return 0;
  });

  return (
    <div className="space-y-3">
      {/* Search & Filters Header */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหาชื่อสมุนไพร, ตำรับยา, สรรพคุณ หรือรหัสยา 24 หลัก..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition shadow-sm"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {recommendations.length > 0 && (
            <button
              onClick={() => setSelectedType('RECOMMENDED')}
              className={`px-2.5 py-1 rounded-lg font-bold transition shrink-0 flex items-center gap-1 ${
                selectedType === 'RECOMMENDED'
                  ? 'bg-gradient-to-r from-teal-700 to-emerald-700 text-white shadow-sm ring-1 ring-teal-500'
                  : 'bg-teal-50 text-teal-800 border border-teal-300 hover:bg-teal-100'
              }`}
            >
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span>⭐ แนะนำตามอาการ & ธาตุ ({recommendedItems.length})</span>
            </button>
          )}

          <button
            onClick={() => setSelectedType('ALL')}
            className={`px-2.5 py-1 rounded-lg font-medium transition shrink-0 ${
              selectedType === 'ALL'
                ? 'bg-brand-700 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            ทั้งหมด ({formulary.length})
          </button>
          <button
            onClick={() => setSelectedType('SINGLE')}
            className={`px-2.5 py-1 rounded-lg font-medium transition shrink-0 ${
              selectedType === 'SINGLE'
                ? 'bg-brand-700 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            ยาเดี่ยว
          </button>
          <button
            onClick={() => setSelectedType('FORMULA')}
            className={`px-2.5 py-1 rounded-lg font-medium transition shrink-0 ${
              selectedType === 'FORMULA'
                ? 'bg-brand-700 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            ยาตำรับ
          </button>
          <button
            onClick={() => setSelectedType('EXTRACT')}
            className={`px-2.5 py-1 rounded-lg font-medium transition shrink-0 ${
              selectedType === 'EXTRACT'
                ? 'bg-brand-700 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            สารสกัด
          </button>
        </div>
      </div>

      {/* Herb List Grid */}
      <div className="max-h-80 overflow-y-auto space-y-2.5 pr-1">
        {sorted.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            ไม่พบรายการยาที่ตรงกับเงื่อนไขการค้นหา
          </div>
        ) : (
          sorted.map((herb) => {
            const isSelected = selectedHerb?.drug_code_24 === herb.drug_code_24;
            const rec = recommendations.find((r) => r.herb.drug_code_24 === herb.drug_code_24);

            return (
              <div
                key={herb.drug_code_24}
                onClick={() => onSelectHerb(herb)}
                className={`p-3 rounded-xl border cursor-pointer transition ${
                  isSelected
                    ? 'bg-brand-50/60 border-brand-500 ring-2 ring-brand-500 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-brand-300 hover:bg-slate-50/60'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5 flex-wrap">
                      <span>{herb.thai_name}</span>
                      <span className="text-[10px] text-slate-500 font-normal">({herb.herb_type})</span>

                      {/* AI Match Score Badge if available */}
                      {rec && rec.matchScore >= 55 && (
                        <span className="text-[10px] bg-teal-100 text-teal-900 border border-teal-300 px-1.5 py-0.2 rounded-md font-extrabold flex items-center gap-0.5">
                          <Sparkles className="w-2.5 h-2.5 text-teal-700" />
                          <span>ตรงอาการ {rec.matchScore}%</span>
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 italic mt-0.5 truncate">
                      {herb.scientific_name}
                    </div>
                  </div>

                  {/* NLEM Badge */}
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${
                      herb.nlem_status === 'ใช่'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    {herb.nlem_status === 'ใช่' ? (
                      <>
                        <CheckCircle className="w-2.5 h-2.5 text-emerald-600" /> ในบัญชียาหลัก
                      </>
                    ) : (
                      <>
                        <HelpCircle className="w-2.5 h-2.5 text-slate-400" /> ยังไม่ตรวจสอบ
                      </>
                    )}
                  </span>
                </div>

                {/* Taste & Recommendation Rationale if matching */}
                {rec && (
                  <div className="mt-1.5 text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 space-y-1">
                    <div className="flex items-center justify-between text-[10px] flex-wrap gap-1">
                      <span className="text-brand-800 font-semibold">
                        รสยา: {herb.taste} • {rec.elementRationale}
                      </span>

                      {/* Live HDI Risk Indicator */}
                      {rec.hdiRisk === 'HIGH' ? (
                        <span className="bg-rose-100 text-rose-800 border border-rose-300 px-1.5 py-0.2 rounded font-bold flex items-center gap-1">
                          <AlertTriangle className="w-2.5 h-2.5 text-rose-600" />
                          <span>เสี่ยง HDI สูง</span>
                        </span>
                      ) : rec.hdiRisk === 'MODERATE' ? (
                        <span className="bg-amber-100 text-amber-800 border border-amber-300 px-1.5 py-0.2 rounded font-bold flex items-center gap-1">
                          <ShieldAlert className="w-2.5 h-2.5 text-amber-600" />
                          <span>เฝ้าระวัง HDI</span>
                        </span>
                      ) : (
                        <span className="bg-slate-100 text-slate-700 border border-slate-300 px-1.5 py-0.2 rounded font-bold flex items-center gap-1" title="ฐานข้อมูล HDI ตัวอย่างครอบคลุมจำกัด ไม่ใช่การยืนยันความปลอดภัย">
                          <ShieldCheck className="w-2.5 h-2.5 text-slate-500" />
                          <span>ไม่พบในฐานข้อมูลตัวอย่าง</span>
                        </span>
                      )}
                    </div>

                    {rec.matchedSymptoms.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap pt-0.5">
                        <span className="text-[10px] text-slate-500">ตรงกับอาการ:</span>
                        {rec.matchedSymptoms.map((sym, i) => (
                          <span
                            key={i}
                            className="text-[9px] bg-white text-teal-800 border border-teal-200 px-1.5 py-0.2 rounded font-medium"
                          >
                            ✓ {sym}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-2 text-[11px] text-slate-600 flex items-center justify-between">
                  <span className="truncate max-w-[260px] text-slate-500">
                    สรรพคุณ: {herb.indications[0]}
                  </span>
                  <span className="font-mono font-medium text-slate-700 shrink-0">
                    ฿{herb.unit_price_thb.toFixed(2)}/{herb.unit}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
