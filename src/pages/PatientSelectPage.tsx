import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { SyntheticCase } from '../types/patient';
import {
  User,
  AlertOctagon,
  AlertTriangle,
  Info,
  CheckCircle2,
  ChevronRight,
  Pill,
  Activity,
  Search,
  UserPlus,
  Filter,
  Trash2,
  Sparkles,
  RefreshCw,
  Compass,
  MapPin,
  Calendar,
} from 'lucide-react';
import teamLogo from '@/assets/team-logo.png';

interface PatientSelectPageProps {
  cases: SyntheticCase[];
  selectedCaseId: string;
  onSelectCase: (caseId: string) => void;
  onOpenIntake?: () => void;
  onDeleteCase?: (caseId: string) => void;
}

export const PatientSelectPage: React.FC<PatientSelectPageProps> = ({
  cases,
  selectedCaseId,
  onSelectCase,
  onOpenIntake,
  onDeleteCase,
}) => {
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<'all' | 'high' | 'mod' | 'low' | 'custom'>('all');
  const [selectedElementFilter, setSelectedElementFilter] = useState<string>('all');

  const handleChoose = (caseId: string) => {
    onSelectCase(caseId);
    navigate('/smutthan');
  };

  // Filter logic
  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      const p = c.patient_info;
      const enc = c.current_encounter;
      const outcome = c.expected_demo_outcome;

      // Risk level filter
      if (selectedRiskFilter === 'high') {
        if (!outcome.interaction_level.includes('สูง')) return false;
      } else if (selectedRiskFilter === 'mod') {
        if (!outcome.interaction_level.includes('ปานกลาง')) return false;
      } else if (selectedRiskFilter === 'low') {
        if (outcome.interaction_level.includes('สูง') || outcome.interaction_level.includes('ปานกลาง')) return false;
      } else if (selectedRiskFilter === 'custom') {
        const isCustom = (c as any).is_custom || c.case_id.startsWith('CUSTOM-');
        if (!isCustom) return false;
      }

      // Element filter
      if (selectedElementFilter !== 'all') {
        if (!p.birth_element.includes(selectedElementFilter)) return false;
      }

      // Search text filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const medsStr = c.current_medications.map((m) => m.generic_name).join(' ').toLowerCase();
        const chronicStr = c.chronic_diseases.map((d) => d.name + ' ' + d.icd10).join(' ').toLowerCase();

        const match =
          c.case_id.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q) ||
          p.hn.toLowerCase().includes(q) ||
          p.province.toLowerCase().includes(q) ||
          p.birth_element.toLowerCase().includes(q) ||
          enc.chief_complaint.toLowerCase().includes(q) ||
          c.intended_ttm_prescription.herb_name.toLowerCase().includes(q) ||
          medsStr.includes(q) ||
          chronicStr.includes(q);

        if (!match) return false;
      }

      return true;
    });
  }, [cases, searchQuery, selectedRiskFilter, selectedElementFilter]);

  // Statistics
  const counts = useMemo(() => {
    let high = 0;
    let mod = 0;
    let low = 0;
    let custom = 0;
    cases.forEach((c) => {
      const lvl = c.expected_demo_outcome.interaction_level;
      if (lvl.includes('สูง')) high++;
      else if (lvl.includes('ปานกลาง')) mod++;
      else low++;

      if ((c as any).is_custom || c.case_id.startsWith('CUSTOM-')) custom++;
    });
    return { total: cases.length, high, mod, low, custom };
  }, [cases]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-4 sm:px-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-700/80 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 pointer-events-none flex items-center justify-end pr-8">
          <img src={teamLogo} alt="" className="w-64 h-64 object-contain filter invert" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-amber-400/20 border border-amber-400/40 text-amber-300 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>ชุดเคสทดสอบและลงทะเบียนผู้ป่วย • ทีม VejVivat (เวชวิวัฒน์)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              เลือกเคสผู้ป่วยจำลอง ({cases.length} Clinical Demonstration Cases)
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              ชุดข้อมูลจำลองครอบคลุมทุกช่วงวัย (ทารก, วัยทำงาน, ผู้สูงอายุ), สภาพภูมิอากาศหลากหลายภูมิภาค, ระดับความเสี่ยงอันตรกิริยา HDI, และภาวะโรคเรื้อรังที่ใช้ยาหลายขนาน (Polypharmacy) พร้อมระบบคีย์เพิ่มเคสใหม่ได้ตามต้องการ
            </p>
          </div>

          {/* Quick CTA */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            {onOpenIntake && (
              <button
                onClick={onOpenIntake}
                className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold px-5 py-3 rounded-2xl shadow-lg shadow-amber-500/20 hover:shadow-xl transition-all transform active:scale-95 text-xs sm:text-sm"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ คีย์ข้อมูลเพิ่มผู้ป่วยใหม่</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Control Bar: Search & Filters */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-soft space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Live Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาตามชื่อ, HN, รหัสเคส, อาการ, ยาแผนปัจจุบัน, ยาสมุนไพร หรือจังหวัด..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ล้าง
              </button>
            )}
          </div>

          {/* Element Filter Dropdown */}
          <div className="flex items-center gap-2 shrink-0">
            <Compass className="w-4 h-4 text-slate-500 hidden sm:block" />
            <select
              value={selectedElementFilter}
              onChange={(e) => setSelectedElementFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            >
              <option value="all">ทุกธาตุกำเนิด</option>
              <option value="ดิน">ปถวีธาตุ (ดิน)</option>
              <option value="น้ำ">อาโปธาตุ (น้ำ)</option>
              <option value="ลม">วาโยธาตุ (ลม)</option>
              <option value="ไฟ">เตโชธาตุ (ไฟ)</option>
            </select>
          </div>
        </div>

        {/* Risk Level Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 text-xs">
          <span className="text-slate-500 text-[11px] font-medium mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> ระดับความเสี่ยง:
          </span>
          <button
            onClick={() => setSelectedRiskFilter('all')}
            className={`px-3 py-1.5 rounded-xl font-medium transition ${
              selectedRiskFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            ทั้งหมด ({counts.total})
          </button>
          <button
            onClick={() => setSelectedRiskFilter('high')}
            className={`px-3 py-1.5 rounded-xl font-medium transition flex items-center gap-1.5 ${
              selectedRiskFilter === 'high'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
            }`}
          >
            <AlertOctagon className="w-3 h-3" />
            <span>เสี่ยงสูง ({counts.high})</span>
          </button>
          <button
            onClick={() => setSelectedRiskFilter('mod')}
            className={`px-3 py-1.5 rounded-xl font-medium transition flex items-center gap-1.5 ${
              selectedRiskFilter === 'mod'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'bg-orange-50 text-orange-800 hover:bg-orange-100 border border-orange-200'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            <span>เสี่ยงปานกลาง ({counts.mod})</span>
          </button>
          <button
            onClick={() => setSelectedRiskFilter('low')}
            className={`px-3 py-1.5 rounded-xl font-medium transition flex items-center gap-1.5 ${
              selectedRiskFilter === 'low'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            <span>ปลอดภัย / เสี่ยงต่ำ ({counts.low})</span>
          </button>
          {counts.custom > 0 && (
            <button
              onClick={() => setSelectedRiskFilter('custom')}
              className={`px-3 py-1.5 rounded-xl font-medium transition flex items-center gap-1.5 ${
                selectedRiskFilter === 'custom'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-teal-50 text-teal-800 hover:bg-teal-100 border border-teal-200'
              }`}
            >
              <UserPlus className="w-3 h-3" />
              <span>ผู้ป่วยสร้างเอง ({counts.custom})</span>
            </button>
          )}

          <div className="ml-auto text-[11px] text-slate-500">
            แสดง <b className="text-slate-900">{filteredCases.length}</b> จาก {cases.length} เคส
          </div>
        </div>
      </div>

      {/* Empty State */}
      {filteredCases.length === 0 && (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <Search className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-slate-800 text-base">ไม่พบเคสผู้ป่วยที่ตรงกับเงื่อนไขการค้นหา</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              ลองเปลี่ยนคำค้นหา หรือรีเซ็ตตัวกรองเพื่อดูเคสทั้งหมด หรือสร้างเคสผู้ป่วยใหม่ขึ้นมาทดสอบ
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedRiskFilter('all');
                setSelectedElementFilter('all');
              }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
            >
              รีเซ็ตตัวกรองทั้งหมด
            </button>
            {onOpenIntake && (
              <button
                onClick={onOpenIntake}
                className="px-4 py-2 bg-brand-700 hover:bg-brand-800 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ เพิ่มเคสผู้ป่วยใหม่</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Case Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
        {filteredCases.map((c) => {
          const isSelected = c.case_id === selectedCaseId;
          const p = c.patient_info;
          const enc = c.current_encounter;
          const outcome = c.expected_demo_outcome;
          const isCustom = (c as any).is_custom || c.case_id.startsWith('CUSTOM-');

          let severityBadge = 'bg-emerald-50 text-emerald-800 border-emerald-200';
          let SevIcon = CheckCircle2;

          if (outcome.interaction_level.includes('สูง')) {
            severityBadge = 'bg-rose-50 text-rose-800 border-rose-200';
            SevIcon = AlertOctagon;
          } else if (outcome.interaction_level.includes('ปานกลาง')) {
            severityBadge = 'bg-orange-50 text-orange-800 border-orange-200';
            SevIcon = AlertTriangle;
          } else if (outcome.interaction_level.includes('ต่ำ')) {
            severityBadge = 'bg-amber-50 text-amber-800 border-amber-200';
            SevIcon = Info;
          } else if (outcome.interaction_level.includes('ไม่มีข้อมูล')) {
            severityBadge = 'bg-slate-100 text-slate-700 border-slate-200';
            SevIcon = Info;
          }

          // Element badge styling
          let elementColor = 'bg-amber-50 text-amber-900 border-amber-200';
          if (p.birth_element.includes('น้ำ')) elementColor = 'bg-sky-50 text-sky-900 border-sky-200';
          if (p.birth_element.includes('ลม')) elementColor = 'bg-emerald-50 text-emerald-900 border-emerald-200';
          if (p.birth_element.includes('ไฟ')) elementColor = 'bg-rose-50 text-rose-900 border-rose-200';

          return (
            <div
              key={c.case_id}
              onClick={() => handleChoose(c.case_id)}
              className={`p-4 sm:p-5 rounded-2xl border cursor-pointer transition-all duration-200 shadow-soft flex flex-col justify-between space-y-3 relative group ${
                isSelected
                  ? 'bg-gradient-to-br from-brand-50/90 to-teal-50/50 border-brand-500 ring-2 ring-brand-500/40 shadow-card'
                  : 'bg-white border-slate-200/90 hover:border-brand-400 hover:shadow-card hover:-translate-y-0.5'
              }`}
            >
              <div>
                {/* Top Row: Case ID, Demographics, Severity Tag */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition">
                      {c.case_id.replace('CUSTOM-', 'C*')}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-slate-900 flex items-center gap-1.5 flex-wrap">
                        <span className="group-hover:text-brand-800 transition">{p.name}</span>
                        <span className="text-xs font-normal text-slate-500">
                          ({p.gender}, {p.age} ปี)
                        </span>
                        {isCustom && (
                          <span className="text-[10px] bg-teal-100 text-teal-800 font-semibold px-1.5 py-0.2 rounded-full border border-teal-200">
                            เคสสร้างใหม่
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                        <span className="flex items-center gap-0.5">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {enc.ambient_context.location}
                        </span>
                        <span>•</span>
                        <span className={`px-1.5 py-0.2 rounded font-medium border ${elementColor}`}>
                          ธาตุ{p.birth_element}
                        </span>
                        <span>•</span>
                        <span className="text-slate-600 font-mono text-[10px]">{p.hn}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border ${severityBadge} shadow-xs`}
                    >
                      <SevIcon className="w-3.5 h-3.5" />
                      <span>{outcome.interaction_level}</span>
                    </span>

                    {/* Delete button for custom case */}
                    {isCustom && onDeleteCase && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`คุณต้องการลบเคสผู้ป่วย "${p.name}" หรือไม่?`)) {
                            onDeleteCase(c.case_id);
                          }
                        }}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition"
                        title="ลบเคสนี้"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Chief Complaint */}
                <div className="mt-3 text-xs bg-slate-50/90 p-2.5 rounded-xl border border-slate-200/70 text-slate-700 leading-relaxed">
                  <span className="font-semibold text-slate-900">อาการสำคัญ: </span>
                  <span>{enc.chief_complaint}</span>
                  <div className="mt-1 text-[11px] text-slate-500 flex items-center gap-2">
                    <span>ฤดู: <b className="text-slate-700">{enc.season}</b></span>
                    <span>•</span>
                    <span>กาล: <b className="text-slate-700">{enc.ambient_context.kala_period}</b></span>
                  </div>
                </div>

                {/* Clinical Meds & Herb Comparison */}
                <div className="mt-2.5 grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-100/70 border border-slate-200/70">
                    <div className="text-[10px] font-semibold text-slate-500 uppercase flex items-center gap-1">
                      <Pill className="w-3 h-3 text-slate-500" /> ยาแผนปัจจุบัน (HIS)
                    </div>
                    <div className="font-medium text-slate-800 truncate mt-0.5 text-xs" title={c.current_medications.map((m) => m.generic_name).join(', ')}>
                      {c.current_medications.length > 0
                        ? c.current_medications.map((m) => m.generic_name).join(', ')
                        : 'ไม่มีการใช้ยาประจำ'}
                    </div>
                    {c.chronic_diseases.length > 0 && (
                      <div className="text-[10px] text-slate-500 truncate mt-0.5">
                        โรค: {c.chronic_diseases.map((d) => d.name).join(', ')}
                      </div>
                    )}
                  </div>

                  <div className="p-2.5 rounded-xl bg-teal-50/80 border border-teal-200/80">
                    <div className="text-[10px] font-semibold text-teal-700 uppercase flex items-center gap-1">
                      <Activity className="w-3 h-3 text-teal-600" /> ยาแผนไทยที่จะสั่ง
                    </div>
                    <div className="font-medium text-teal-900 truncate mt-0.5 text-xs">
                      {c.intended_ttm_prescription.herb_name}
                    </div>
                    <div className="text-[10px] text-teal-700 truncate mt-0.5">
                      ขนาด: {c.intended_ttm_prescription.dose_per_admin} {c.intended_ttm_prescription.unit} ({c.intended_ttm_prescription.frequency_per_day}x/วัน)
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Action Footer */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 text-[11px]">
                  ประวัติการรักษา: <b>{c.history_episodes.length} ครั้ง</b>
                </span>
                <span className="text-brand-700 group-hover:text-brand-900 font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition">
                  <span>เลือกเคสและเข้าห้องตรวจ</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
