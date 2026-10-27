import React, { useState } from 'react';
import { HerbDrugInteraction } from '../types/hdi';
import { getAllInteractionsDatabase } from '../services/interactionMatcher';
import {
  Database,
  Search,
  Filter,
  ShieldCheck,
  AlertOctagon,
  AlertTriangle,
  Info,
  ExternalLink,
  Code2,
  FileCode,
} from 'lucide-react';

export const AdminHdiPage: React.FC = () => {
  const interactions = getAllInteractionsDatabase();
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');

  const filtered = interactions.filter((item: HerbDrugInteraction) => {
    const matchSearch =
      item.herb_thai_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.drug_generic_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.mechanism.toLowerCase().includes(searchTerm.toLowerCase());

    const matchSeverity =
      severityFilter === 'ALL' || item.severity === severityFilter;

    return matchSearch && matchSeverity;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-4 sm:px-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-rose-50 text-rose-700 rounded-xl">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                จัดการฐานข้อมูลกลางอันตรกิริยาสมุนไพรและยา (Centralized HDI Database)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                ฐานข้อมูลกลางระดับประเทศสำหรับโรงพยาบาลและคลินิกทุกระดับ พร้อม OpenAPI Spec สำหรับเชื่อมต่อ HIS
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl font-mono font-medium">
            DB Version 1.0.0 (พ.ศ. 2568)
          </span>
        </div>
      </div>

      {/* API Integration Callout */}
      <div className="bg-slate-900 text-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md text-xs">
        <div className="flex items-center gap-3">
          <Code2 className="w-6 h-6 text-brand-400 shrink-0" />
          <div>
            <div className="font-bold text-white text-sm">
              RESTful API & OpenAPI 3.0 Ready
            </div>
            <div className="text-slate-400 text-[11px] mt-0.5">
              รองรับ <code>POST /v1/interactions/check</code> สำหรับระบบ HOSxP, EHP, SSB และ FHIR MedicationRequest
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a
            href="./openapi.yaml"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-xl border border-slate-700 transition"
          >
            <FileCode className="w-3.5 h-3.5 text-teal-400" />
            <span>ดาวน์โหลด openapi.yaml</span>
          </a>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-soft">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหาชื่อยา หรือสมุนไพร หรือกลไก..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <div className="flex items-center gap-1.5 text-xs w-full sm:w-auto overflow-x-auto">
          {['ALL', 'สูง', 'ปานกลาง', 'ต่ำ', 'ไม่มีข้อมูล'].map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`px-3 py-1.5 rounded-xl font-medium transition shrink-0 ${
                severityFilter === sev
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {sev === 'ALL' ? `ทั้งหมด (${interactions.length})` : sev}
            </button>
          ))}
        </div>
      </div>

      {/* Table of Interactions */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-semibold">รหัสคู่ยา</th>
                <th className="py-3 px-4 font-semibold">ยาแผนปัจจุบัน (HIS)</th>
                <th className="py-3 px-4 font-semibold">สมุนไพรแผนไทย</th>
                <th className="py-3 px-4 font-semibold text-center">ระดับความเสี่ยง</th>
                <th className="py-3 px-4 font-semibold">กลไกและผลทางคลินิก</th>
                <th className="py-3 px-4 font-semibold">คำแนะนำสำหรับแพทย์</th>
                <th className="py-3 px-4 font-semibold text-center">หลักฐาน</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.map((item: HerbDrugInteraction) => {
                let badgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
                if (item.severity === 'สูง') badgeClass = 'bg-rose-50 text-rose-800 border-rose-200 font-bold';
                else if (item.severity === 'ปานกลาง') badgeClass = 'bg-orange-50 text-orange-800 border-orange-200 font-bold';
                else if (item.severity === 'ต่ำ') badgeClass = 'bg-amber-50 text-amber-800 border-amber-200 font-medium';

                return (
                  <tr key={item.interaction_id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {item.interaction_id}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{item.drug_generic_name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">ATC: {item.atc_code}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-brand-900">{item.herb_thai_name}</div>
                      <div className="text-[10px] text-slate-400 italic">{item.herb_generic_name}</div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] border ${badgeClass}`}>
                        {item.severity}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-xs leading-relaxed">
                      <div className="line-clamp-2 text-slate-800">{item.clinical_effects}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{item.mechanism}</div>
                    </td>
                    <td className="py-3 px-4 max-w-xs text-slate-700 leading-relaxed">
                      <div className="line-clamp-2">{item.recommendation}</div>
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-slate-600">
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                        Level {item.evidence_level}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
