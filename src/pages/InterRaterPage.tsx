import React, { useState, useEffect } from 'react';
import { MockDataService } from '../services/mockDataService';
import { ClinicianOverride } from '../types/smutthan';
import { GitCompare, CheckCircle2, AlertCircle, Users, BarChart3, ShieldCheck } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

export const InterRaterPage: React.FC = () => {
  const [overrides, setOverrides] = useState<ClinicianOverride[]>([]);

  useEffect(() => {
    setOverrides(MockDataService.getOverrides());
  }, []);

  // Baseline synthetic inter-rater benchmark data
  const agreementStats = {
    totalEvaluations: 120 + overrides.length,
    agreedCount: 106,
    overriddenCount: 14 + overrides.length,
    agreementRate: Math.round(((106) / (120 + overrides.length)) * 1000) / 10,
    cohenKappa: 0.82, // Strong agreement
  };

  const elementComparisonData = [
    { element: 'วาโย (ลม)', engineMatches: 48, clinicianAdjusted: 5 },
    { element: 'เตโช (ไฟ)', engineMatches: 34, clinicianAdjusted: 3 },
    { element: 'อาโป (น้ำ)', engineMatches: 22, clinicianAdjusted: 4 },
    { element: 'ปถวี (ดิน)', engineMatches: 16, clinicianAdjusted: 2 },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-4 sm:px-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-teal-50 text-brand-700 rounded-xl">
              <GitCompare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                การประเมินความสอดคล้องและการลดความเหลื่อมล้ำ (Inter-Rater Reliability)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                เปรียบเทียบผลการวินิจฉัยของ Smutthan Engine กับการ Override ของแพทย์แผนไทย เพื่อสร้างมาตรฐานการตรวจวินิจฉัยที่อธิบายได้
              </p>
            </div>
          </div>
        </div>

        <span className="text-xs bg-brand-50 text-brand-800 border border-brand-200 px-3 py-1.5 rounded-xl font-medium shrink-0">
          Cohen's Kappa κ = {agreementStats.cohenKappa} (เกณฑ์สอดคล้องสูงมาก)
        </span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-soft">
          <div className="text-xs font-semibold text-slate-500">อัตราความสอดคล้องรวม</div>
          <div className="text-2xl font-bold text-emerald-600 font-mono mt-1">
            {agreementStats.agreementRate}%
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Engine ตรงกับการตัดสินใจแพทย์</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-soft">
          <div className="text-xs font-semibold text-slate-500">จำนวนเคสที่ประเมิน</div>
          <div className="text-2xl font-bold text-slate-900 font-mono mt-1">
            {agreementStats.totalEvaluations}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">กลุ่มตัวอย่างทดสอบมาตรฐาน</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-soft">
          <div className="text-xs font-semibold text-slate-500">เคสที่เห็นพ้องต้องกัน</div>
          <div className="text-2xl font-bold text-brand-700 font-mono mt-1">
            {agreementStats.agreedCount}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">ผลวิเคราะห์ธาตุสอดคล้องกัน</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-soft">
          <div className="text-xs font-semibold text-slate-500">เคสที่แพทย์ Override</div>
          <div className="text-2xl font-bold text-amber-600 font-mono mt-1">
            {agreementStats.overriddenCount}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">มีบันทึกเหตุผลทางคลินิก</div>
        </div>
      </div>

      {/* Comparison Chart */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-soft space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-bold text-xs text-slate-900">
              การกระจายตัวของธาตุประธานระหว่าง Smutthan Engine และการปรับแก้ของแพทย์
            </h4>
            <p className="text-[11px] text-slate-500">
              เปรียบเทียบความแตกต่างรายธาตุ แสดงให้เห็นว่าระบบช่วยสร้างเกณฑ์มาตรฐานอ้างอิงที่มั่นคง
            </p>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={elementComparisonData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <XAxis dataKey="element" tick={{ fill: '#475569', fontSize: 11 }} />
              <YAxis tick={{ fill: '#475569', fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Bar name="ตรงกันตาม Engine (เคส)" dataKey="engineMatches" fill="#0F766E" radius={[4, 4, 0, 0]} />
              <Bar name="แพทย์ Override ปรับแก้ (เคส)" dataKey="clinicianAdjusted" fill="#F59E0B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Real-time Overrides Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-soft overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <h4 className="font-bold text-xs text-slate-900 flex items-center gap-2">
            <span>บันทึกการ Override ในเซสชันปัจจุบัน (Human-in-the-Loop Audit Log)</span>
          </h4>
          <span className="text-[11px] text-slate-500 font-mono">
            {overrides.length} รายการ
          </span>
        </div>

        {overrides.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-slate-50/50">
            ยังไม่มีการบันทึกการ Override ในเซสชันนี้ (ทดลองกด "ปรับเปลี่ยนผล" ในหน้าประเมินสมุฏฐานเพื่อทดสอบ)
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">เวลา</th>
                  <th className="py-2.5 px-4 font-semibold">แพทย์ผู้ประเมิน</th>
                  <th className="py-2.5 px-4 font-semibold">ผลเดิมจาก Engine</th>
                  <th className="py-2.5 px-4 font-semibold">ผลที่แพทย์ปรับแก้</th>
                  <th className="py-2.5 px-4 font-semibold">เหตุผลทางคลินิกที่ระบุ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {overrides.map((ov, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-4 font-mono text-slate-500">
                      {new Date(ov.timestamp).toLocaleTimeString('th-TH')}
                    </td>
                    <td className="py-2.5 px-4 font-medium text-slate-900">{ov.clinician_name}</td>
                    <td className="py-2.5 px-4 text-slate-600">{ov.original_dominant}</td>
                    <td className="py-2.5 px-4 font-bold text-amber-700">{ov.overridden_dominant}</td>
                    <td className="py-2.5 px-4 text-slate-700 italic">{ov.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

interface InterRaterPageProps {}
