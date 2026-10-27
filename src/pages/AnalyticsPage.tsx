import React from 'react';
import { SyntheticCase } from '../types/patient';
import { computeAnalytics } from '../services/analyticsEngine';
import { CostPerCaseCard } from '../components/analytics/CostPerCaseCard';
import { Icd10tmUtilizationChart } from '../components/analytics/Icd10tmUtilizationChart';
import { DataQualityReport } from '../components/analytics/DataQualityReport';
import { BarChart3, Database, RefreshCw, ShieldCheck } from 'lucide-react';

interface AnalyticsPageProps {
  cases: SyntheticCase[];
}

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ cases }) => {
  const summary = computeAnalytics(cases);

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-4 sm:px-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 text-blue-700 rounded-xl">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                ICD-10-TM Real-time Analytics & Health Economics
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                ยกระดับการบันทึกรหัสโรค ICD-10-TM เพื่อประมวลผลการจ่ายยาและหัตถการไทยแบบ Real-time ประเมินต้นทุนต่อเคส
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-xl font-medium flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>43 แฟ้มเชื่อมต่ออัตโนมัติ</span>
          </span>
        </div>
      </div>

      {/* Top Economic KPI Cards */}
      <CostPerCaseCard summary={summary} />

      {/* NHSO / สปสช. Economic Benefit & NSAID-Sparing Card */}
      <div className="bg-gradient-to-r from-teal-900 to-brand-900 text-white rounded-2xl p-5 shadow-soft space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-teal-500/20 rounded-lg text-teal-300 font-bold text-xs">
              NHSO Benefit
            </span>
            <h3 className="font-bold text-sm text-white">
              มิติด้านเศรษฐศาสตร์สาธารณสุข: สปสช. Fee Schedule & ผลลัพธ์ NSAID-Sparing
            </h3>
          </div>
          <span className="text-[11px] text-teal-200 bg-white/10 px-2.5 py-0.5 rounded-full font-mono">
            นโยบายยกระดับบริการปฐมภูมิ 2568-2569
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="bg-white/10 rounded-xl p-3 border border-white/10 space-y-1">
            <div className="text-[11px] text-teal-200 font-semibold">
              NSAID-Sparing Effect (ทดแทนยาเคมี)
            </div>
            <div className="text-lg font-bold text-white font-mono">
              ลดความเสี่ยง GI Bleed & CKD
            </div>
            <p className="text-[11px] text-slate-200 leading-snug">
              การใช้เถาวัลย์เปรียง/ครีมไพลทดแทน NSAIDs ลดผลข้างเคียงเลือดออกในทางเดินอาหารและไตเสื่อมในกลุ่มผู้สูงอายุ
            </p>
          </div>

          <div className="bg-white/10 rounded-xl p-3 border border-white/10 space-y-1">
            <div className="text-[11px] text-teal-200 font-semibold">
              มูลค่าการป้องกันภาวะแทรกซ้อนเฉลี่ย
            </div>
            <div className="text-lg font-bold text-emerald-300 font-mono">
              ~฿35,000 / ราย
            </div>
            <p className="text-[11px] text-slate-200 leading-snug">
              ประมาณการต้นทุนค่ารักษาภาวะแทรกซ้อนเฉียบพลันที่ระบบสุขภาพประหยัดได้ต่อการเกิดเหตุไม่พึงประสงค์ 1 ครั้ง
            </p>
          </div>

          <div className="bg-white/10 rounded-xl p-3 border border-white/10 space-y-1">
            <div className="text-[11px] text-teal-200 font-semibold">
              การเบิกจ่ายตาม Fee Schedule สปสช.
            </div>
            <div className="text-lg font-bold text-white font-mono">
              ฿150 - ฿250 / หัตถการ
            </div>
            <p className="text-[11px] text-slate-200 leading-snug">
              รหัส 9007710 (นวด) และ 9007720 (ประคบ) เชื่อมโยง 43 แฟ้มและ ICD-10-TM ส่งเบิกกองทุนบริการแพทย์แผนไทยได้ 100%
            </p>
          </div>
        </div>
      </div>

      {/* Charts & Table */}
      <Icd10tmUtilizationChart
        utilization={summary.utilization_by_code}
        monthlyTrends={summary.monthly_trends}
      />

      {/* Data Quality & Methodology Framework */}
      <DataQualityReport cases={cases} />
    </div>
  );
};
