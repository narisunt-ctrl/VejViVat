import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SyntheticCase } from '../types/patient';
import { CarePlanService } from '../services/carePlanService';
import { PatientCarePlan, FollowUpMilestone } from '../types/carePlan';
import {
  Calendar,
  Clock,
  ClipboardCheck,
  TrendingUp,
  Activity,
  HeartPulse,
  AlertTriangle,
  CheckCircle2,
  Printer,
  Download,
  Share2,
  FileText,
  Sparkles,
  Stethoscope,
  Pill,
  Compass,
  ShieldCheck,
  ChevronRight,
  ArrowRight,
  ArrowLeft,
  CalendarCheck,
  CalendarClock,
  UserCheck,
  MessageSquare,
  Plus,
  PhoneCall,
  Building2,
  TestTube2,
  Layers,
  HeartHandshake,
  BookOpen,
  Info,
  Check,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import teamLogo from '@/assets/team-logo.png';

interface CarePlanPageProps {
  currentCase: SyntheticCase;
}

export const CarePlanPage: React.FC<CarePlanPageProps> = ({ currentCase }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'plan' | 'trajectory' | 'lifestyle'>('plan');
  const [customNote, setCustomNote] = useState<string>('');
  const [recordedNotes, setRecordedNotes] = useState<Record<number, string>>({});
  const [showNoteSavedAlert, setShowNoteSavedAlert] = useState<boolean>(false);

  // Generate personalized care plan
  const plan: PatientCarePlan = CarePlanService.generateCarePlan(currentCase);
  const p = currentCase.patient_info;
  const enc = currentCase.current_encounter;
  const outcome = currentCase.expected_demo_outcome;

  const handlePrint = () => {
    window.print();
  };

  const handleExportJson = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(plan, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `care-plan-${p.hn}-${enc.date}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleSaveMilestoneNote = (visitNumber: number) => {
    if (!customNote.trim()) return;
    setRecordedNotes((prev) => ({ ...prev, [visitNumber]: customNote }));
    setCustomNote('');
    setShowNoteSavedAlert(true);
    setTimeout(() => setShowNoteSavedAlert(false), 3000);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-4 sm:px-6">
      {/* 1. Header Navigation & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4 no-print">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/prescribe')}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition"
            title="ย้อนกลับไปหน้าสั่งยา"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-600" />
                <span>ขั้นตอนที่ 5 (Final Step)</span>
              </span>
              <h1 className="text-xl font-bold text-slate-900">
                แผนการรักษาและการติดตามผลรายบุคคล (Clinical Care Plan & Trajectory)
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              กำหนดแนวทางการติดตามผลตามหลักวิชาการ อิงระเบียบกระทรวงสาธารณสุข และสรุปแนวโน้มการฟื้นฟูสุขภาพรายบุคคล
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportJson}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-3 py-2 rounded-xl transition text-xs shadow-xs"
            title="ส่งออกแผนการรักษาเป็น JSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span>ส่งออก JSON</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-medium px-3.5 py-2 rounded-xl transition text-xs shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>พิมพ์แผนการรักษา</span>
          </button>
        </div>
      </div>

      {/* 2. Patient Context & Risk Level Ribbon */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-slate-700/80 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/4 opacity-10 pointer-events-none flex items-center justify-end pr-6">
          <img src={teamLogo} alt="" className="w-48 h-48 object-contain filter invert" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400/40 p-1 flex items-center justify-center shrink-0 shadow-md">
              <img src={teamLogo} alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-white text-base sm:text-lg">
                  {p.name}
                </span>
                <span className="text-xs text-slate-300 font-mono bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                  {p.hn}
                </span>
                <span className="text-xs text-amber-300 font-medium">
                  ({p.gender}, {p.age} ปี • ธาตุ{p.birth_element})
                </span>
              </div>
              <div className="text-xs text-slate-300 mt-1 flex items-center gap-2 flex-wrap">
                <span>อาการสำคัญ: <b className="text-white">{enc.chief_complaint}</b></span>
                <span>•</span>
                <span>ยาแผนไทย: <b className="text-teal-300">{plan.prescribed_herb_name}</b></span>
                <span>•</span>
                <span>ยาประจำตัว: <b className="text-amber-200">{plan.western_medications.join(', ') || 'ไม่มี'}</b></span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-start md:items-end gap-1.5 shrink-0">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border shadow-xs ${
                plan.risk_level === 'HIGH'
                  ? 'bg-rose-500/20 text-rose-200 border-rose-400/40'
                  : plan.risk_level === 'MODERATE'
                  ? 'bg-amber-500/20 text-amber-200 border-amber-400/40'
                  : 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{plan.risk_label}</span>
            </span>
            <span className="text-[10px] text-slate-400 max-w-xs text-left md:text-right">
              อิงเกณฑ์: {plan.guideline_source}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-1 no-print">
        <button
          onClick={() => setActiveTab('plan')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition ${
            activeTab === 'plan'
              ? 'bg-brand-700 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <CalendarClock className="w-4 h-4" />
          <span>1. แผนการรักษา & ตารางติดตามผลรายเดือน</span>
        </button>

        <button
          onClick={() => setActiveTab('trajectory')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition ${
            activeTab === 'trajectory'
              ? 'bg-brand-700 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>2. แนวโน้มสรุปการดูแลรักษารายบุคคล (Longitudinal)</span>
        </button>

        <button
          onClick={() => setActiveTab('lifestyle')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition ${
            activeTab === 'lifestyle'
              ? 'bg-brand-700 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>3. แผนการดูแลตนเองและสัญญาณเตือนฉุกเฉิน</span>
        </button>
      </div>

      {/* 4. Tab Content 1: Care Plan & Cadence */}
      {activeTab === 'plan' && (
        <div className="space-y-6">
          {/* Section A: Therapeutic Goals */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-soft space-y-4">
            <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-brand-700" />
              <span>เป้าหมายการรักษาทางคลินิก (Therapeutic Goals & Milestones)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {/* Short Term */}
              <div className="bg-teal-50/60 p-4 rounded-2xl border border-teal-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-teal-900">ระยะสั้น (สัปดาห์ที่ 1 - 2)</span>
                  <span className="bg-teal-200 text-teal-900 text-[10px] px-2 py-0.5 rounded-full font-semibold">
                    เฉียบพลัน
                  </span>
                </div>
                <ul className="space-y-1.5 text-teal-950">
                  {plan.therapeutic_goals.short_term_weeks_1_2.map((g, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-teal-700 shrink-0 mt-0.5" />
                      <span>{g}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Medium Term */}
              <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-900">ระยะกลาง (เดือนที่ 1 - 3)</span>
                  <span className="bg-amber-200 text-amber-900 text-[10px] px-2 py-0.5 rounded-full font-semibold">
                    ปรับสมดุลธาตุ
                  </span>
                </div>
                <ul className="space-y-1.5 text-amber-950">
                  {plan.therapeutic_goals.medium_term_months_1_3.map((g, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                      <span>{g}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Long Term */}
              <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-900">ระยะยาว (เดือนที่ 3 - 6)</span>
                  <span className="bg-emerald-200 text-emerald-900 text-[10px] px-2 py-0.5 rounded-full font-semibold">
                    ยั่งยืน & ป้องกัน
                  </span>
                </div>
                <ul className="space-y-1.5 text-emerald-950">
                  {plan.therapeutic_goals.long_term_months_3_6.map((g, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                      <span>{g}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Section B: Academic Monitoring Cadence (จำนวนครั้งแต่ละเดือน) */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-soft space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-brand-700" />
                  <span>ความถี่ในการติดตามผลแต่ละเดือนตามหลักวิชาการ (Academic Monthly Cadence)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  อิงมาตรฐานเวชปฏิบัติกรมการแพทย์แผนไทยฯ และ WHO Pharmacovigilance ตามระดับความเสี่ยงของเคส
                </p>
              </div>
              <span className="text-xs bg-slate-100 text-slate-700 font-bold px-3 py-1 rounded-full self-start sm:self-auto">
                Evidence-Based Protocol
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {plan.monthly_cadence.map((cad, idx) => (
                <div
                  key={idx}
                  className="bg-slate-50 p-4 rounded-2xl border border-slate-200 hover:border-brand-300 transition flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-brand-800">เดือนที่ {cad.month_number}</span>
                      <span className="text-xs font-black bg-brand-700 text-white px-2.5 py-0.5 rounded-full shadow-2xs">
                        {cad.recommended_visits_per_month} ครั้ง/เดือน
                      </span>
                    </div>
                    <div className="font-bold text-xs text-slate-900">{cad.month_label}</div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      {cad.frequency_rationale}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-200/80 space-y-1 text-[11px]">
                    <div className="text-[10px] text-slate-500 font-semibold uppercase">สิ่งที่ตรวจประจำรอบ:</div>
                    <div className="flex flex-wrap gap-1">
                      {cad.check_items.map((it, i) => (
                        <span key={i} className="bg-white border border-slate-200 text-slate-700 px-1.5 py-0.5 rounded text-[10px]">
                          {it}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section C: 4 Monitoring Core Domains (ต้องติดตามเรื่องอะไร & ยังไง) */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-soft space-y-4">
            <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-brand-700" />
              <span>มิติการติดตาม 4 ด้านหลัก (What & How to Monitor)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {plan.monitoring_domains.map((dom) => {
                let badgeColor = 'bg-teal-50 text-teal-800 border-teal-200';
                let IconModality = Building2;
                if (dom.modality === 'LAB') {
                  badgeColor = 'bg-rose-50 text-rose-800 border-rose-200';
                  IconModality = TestTube2;
                } else if (dom.modality === 'TELEMED') {
                  badgeColor = 'bg-sky-50 text-sky-800 border-sky-200';
                  IconModality = PhoneCall;
                } else if (dom.modality === 'SELF_LOG') {
                  badgeColor = 'bg-amber-50 text-amber-800 border-amber-200';
                  IconModality = UserCheck;
                }

                return (
                  <div
                    key={dom.id}
                    className="p-5 rounded-2xl border border-slate-200/90 bg-white hover:shadow-card transition flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                          <span>{dom.title}</span>
                        </h4>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${badgeColor}`}>
                          <IconModality className="w-3 h-3" />
                          <span>{dom.modality}</span>
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{dom.description}</p>

                      <div className="mt-3 space-y-2 text-xs">
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                          <span className="font-bold text-slate-900 block mb-0.5">🔍 สิ่งที่ต้องติดตาม (What to Monitor):</span>
                          <span className="text-slate-700">{dom.what_to_monitor}</span>
                        </div>

                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                          <span className="font-bold text-slate-900 block mb-0.5">📋 วิธีการติดตาม (How to Monitor):</span>
                          <span className="text-slate-700">{dom.how_to_monitor}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                          <div className="p-2 rounded-lg bg-emerald-50/70 border border-emerald-200 text-emerald-950">
                            <span className="font-bold block">🎯 ตัวชี้วัดเป้าหมาย:</span>
                            <span>{dom.target_indicator}</span>
                          </div>
                          <div className="p-2 rounded-lg bg-rose-50/70 border border-rose-200 text-rose-950">
                            <span className="font-bold block">⚠️ สัญญาณอันตราย:</span>
                            <span>{dom.danger_signs}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                      <span>กำหนดเวลา: <b>{dom.frequency_note}</b></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section D: Actionable Follow-up Milestones Timeline */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-soft space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                  <CalendarCheck className="w-5 h-5 text-brand-700" />
                  <span>กำหนดการนัดหมายติดตามผล 6 เดือน (Actionable Milestones Timeline)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  ตารางนัดหมายระบุวันที่ วิธีการ และหัวข้อการตรวจประเมินทางคลินิก
                </p>
              </div>
            </div>

            {showNoteSavedAlert && (
              <div className="p-3 bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-semibold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-700" />
                <span>บันทึกความคิดเห็นทางคลินิกเรียบร้อยแล้ว</span>
              </div>
            )}

            <div className="space-y-3">
              {plan.follow_up_schedule.map((milestone) => {
                const note = recordedNotes[milestone.visit_number] || milestone.doctor_notes;

                return (
                  <div
                    key={milestone.visit_number}
                    className={`p-4 rounded-2xl border transition flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      milestone.status === 'NEXT_DUE'
                        ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-400/20'
                        : 'bg-white border-slate-200 hover:border-brand-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-bold text-xs flex flex-col items-center justify-center shrink-0 shadow-xs">
                        <span>ครั้งที่</span>
                        <span>{milestone.visit_number}</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-slate-900">
                            {milestone.timing_label}
                          </span>
                          <span className="text-xs text-slate-500 font-mono">
                            ({milestone.scheduled_date})
                          </span>
                          <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-medium border border-slate-200">
                            {milestone.modality_label}
                          </span>
                          {milestone.status === 'NEXT_DUE' && (
                            <span className="text-[10px] bg-amber-500 text-slate-950 font-bold px-2 py-0.5 rounded-full">
                              นัดหมายครั้งถัดไป
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-700 font-medium">
                          {milestone.focus}
                        </p>
                        <div className="flex flex-wrap gap-1 text-[11px] text-slate-500 pt-0.5">
                          {milestone.key_actions.map((act, i) => (
                            <span key={i} className="inline-flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                              <CheckCircle2 className="w-3 h-3 text-teal-600" />
                              <span>{act}</span>
                            </span>
                          ))}
                        </div>
                        {note && (
                          <div className="mt-2 text-xs bg-slate-100/80 p-2 rounded-xl text-slate-800 border border-slate-200">
                            <b>บันทึกแพทย์: </b> {note}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                      <button
                        onClick={() => {
                          const noteText = prompt(
                            `กรอกบันทึกทางคลินิกสำหรับการติดตามครั้งที่ ${milestone.visit_number} (${milestone.timing_label}):`,
                            note || ''
                          );
                          if (noteText !== null) {
                            setRecordedNotes((prev) => ({
                              ...prev,
                              [milestone.visit_number]: noteText,
                            }));
                          }
                        }}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition"
                      >
                        {note ? 'แก้ไขบันทึก' : '+ บันทึกผลติดตาม'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 5. Tab Content 2: Longitudinal Trajectory & Prognosis */}
      {activeTab === 'trajectory' && (
        <div className="space-y-6">
          {/* Prognosis & Outcomes Summary Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-soft space-y-4">
            <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-brand-700" />
              <span>สรุปพยากรณ์โรคและผลลัพธ์ทางคลินิกรายบุคคล (Individual Clinical Prognosis)</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 text-teal-950">
                <span className="text-[11px] text-teal-700 block font-semibold">การตอบสนองต่อการรักษา:</span>
                <span className="font-extrabold text-sm sm:text-base text-teal-900 block mt-1">
                  ดีเยี่ยม (Good)
                </span>
                <span className="text-[10px] text-teal-700 block mt-0.5">อาการทุเลาลงอย่างต่อเนื่อง</span>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950">
                <span className="text-[11px] text-emerald-700 block font-semibold">ดัชนีคุณภาพชีวิต (PROM):</span>
                <span className="font-extrabold text-sm sm:text-base text-emerald-900 block mt-1">
                  {plan.prognosis.prom_score.overall_score} / 100
                </span>
                <span className="text-[10px] text-emerald-700 block mt-0.5">
                  กาย {plan.prognosis.prom_score.physical_dimension} • ใจ {plan.prognosis.prom_score.mental_dimension}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950">
                <span className="text-[11px] text-amber-700 block font-semibold">ความร่วมมือการใช้ยา (Adherence):</span>
                <span className="font-extrabold text-sm sm:text-base text-amber-900 block mt-1">
                  {plan.prognosis.overall_adherence_percent}%
                </span>
                <span className="text-[10px] text-amber-700 block mt-0.5">ตรงตามขนาดและเวลา</span>
              </div>

              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-950">
                <span className="text-[11px] text-blue-700 block font-semibold">ต้นทุนสะสมตลอดการรักษา:</span>
                <span className="font-extrabold text-sm sm:text-base text-blue-900 block mt-1">
                  {plan.prognosis.cumulative_spend_thb.toLocaleString()} บาท
                </span>
                <span className="text-[10px] text-blue-700 block mt-0.5">ประหยัดงบประมาณกองทุน UC</span>
              </div>
            </div>
          </div>

          {/* Chart 1: Pain VAS & Symptom Severity Trajectory */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-soft space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-brand-700" />
                  <span>แนวโน้มความรุนแรงของอาการและระดับความปวด (Pain Score VAS & Symptom Severity)</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  เปรียบเทียบจากประวัติในอดีต วันปัจจุบัน และการคาดการณ์ไปข้างหน้า (Projected Trajectory)
                </p>
              </div>
              <span className="text-[11px] text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                เป้าหมาย: VAS &lt; 2 / 10
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={plan.prognosis.trajectory_points}>
                  <defs>
                    <linearGradient id="colorPain" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EA580C" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#EA580C" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorSev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0F766E" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0F766E" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="visit_label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', fontSize: '11px', border: '1px solid #cbd5e1' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Area
                    type="monotone"
                    dataKey="symptom_severity"
                    name="ความรุนแรงของอาการ (%)"
                    stroke="#0F766E"
                    fillOpacity={1}
                    fill="url(#colorSev)"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="pain_score"
                    name="ระดับความปวด (VAS 0-10)"
                    stroke="#EA580C"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: 4-Element Balance Evolution */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-soft space-y-4">
            <div>
              <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Compass className="w-4 h-4 text-brand-700" />
                <span>แนวโน้มความสมดุลของตรีธาตุและสมุฏฐาน 4 ธาตุ (Longitudinal 4-Element Normalization)</span>
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                ติดตามการลดลงของธาตุวิปริต (วาโย/เตโช) และการกลับคืนสู่สภาวะสมธาตุ (Samathat)
              </p>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={plan.prognosis.trajectory_points}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="visit_label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', fontSize: '11px', border: '1px solid #cbd5e1' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Line
                    type="monotone"
                    dataKey="wind_score"
                    name="วาโยธาตุ (ลม)"
                    stroke="#059669"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="fire_score"
                    name="เตโชธาตุ (ไฟ)"
                    stroke="#EA580C"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="water_score"
                    name="อาโปธาตุ (น้ำ)"
                    stroke="#0284C7"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="earth_score"
                    name="ปถวีธาตุ (ดิน)"
                    stroke="#8B5A2B"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Table: Longitudinal Points Table */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-soft space-y-4">
            <h4 className="font-bold text-sm text-slate-900">
              ตารางเวชระเบียนติดตามผลระยะยาว (Longitudinal Clinical Audit Table)
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">รอบการตรวจ</th>
                    <th className="py-2.5 px-3">วันที่</th>
                    <th className="py-2.5 px-3">ความปวด (VAS)</th>
                    <th className="py-2.5 px-3">อาการ (%)</th>
                    <th className="py-2.5 px-3">ความดัน (BP)</th>
                    <th className="py-2.5 px-3">ชีพจร</th>
                    <th className="py-2.5 px-3">ต้นทุนสะสม</th>
                    <th className="py-2.5 px-3">สรุปทางคลินิก</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {plan.prognosis.trajectory_points.map((pt, i) => (
                    <tr
                      key={i}
                      className={
                        pt.visit_label.includes('ปัจจุบัน')
                          ? 'bg-amber-50/60 font-semibold'
                          : pt.is_projected
                          ? 'text-slate-500'
                          : ''
                      }
                    >
                      <td className="py-2 px-3">{pt.visit_label}</td>
                      <td className="py-2 px-3 font-mono">{pt.date}</td>
                      <td className="py-2 px-3">
                        <span className="font-bold text-orange-700">{pt.pain_score}</span> / 10
                      </td>
                      <td className="py-2 px-3">{pt.symptom_severity}%</td>
                      <td className="py-2 px-3 font-mono">{pt.sbp}/{pt.dbp}</td>
                      <td className="py-2 px-3 font-mono">{pt.pr}</td>
                      <td className="py-2 px-3 font-mono">{pt.cumulative_cost_thb.toLocaleString()} บ.</td>
                      <td className="py-2 px-3 text-[11px] truncate max-w-xs">{pt.clinical_summary}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 6. Tab Content 3: Holistic Self-Care & Emergency Red Flags */}
      {activeTab === 'lifestyle' && (
        <div className="space-y-6">
          {/* Dietary & Nutrition Prescription */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-soft space-y-4">
            <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-brand-700" />
              <span>อาหารปรับสมดุลตามธาตุเจ้าเรือน ({p.birth_element}) และฤดูกาล ({enc.season})</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                <span className="font-bold text-emerald-900 block flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  <span>อาหารและเครื่องดื่มที่แนะนำ (Recommended Dietary):</span>
                </span>
                <ul className="space-y-2 text-emerald-950">
                  {plan.holistic_care.diet_recommendations.map((d, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-emerald-700 font-bold">•</span>
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-2">
                <span className="font-bold text-rose-900 block flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-700" />
                  <span>อาหารแสลงและของที่ควรหลีกเลี่ยง (Foods to Avoid):</span>
                </span>
                <ul className="space-y-2 text-rose-950">
                  {plan.holistic_care.avoid_foods.map((d, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-rose-700 font-bold">•</span>
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Ruesi Dat Ton & Exercise */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-soft space-y-4">
            <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
              <HeartPulse className="w-5 h-5 text-brand-700" />
              <span>ท่ากายบริหารฤาษีดัดตนและการปรับพฤติกรรม (Ruesi Dat Ton & Circadian Alignment)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="font-bold text-slate-900 block">ท่าฤาษีดัดตนที่เหมาะสมกับโรค:</span>
                <ul className="space-y-2 text-slate-700">
                  {plan.holistic_care.exercise_ruesi_dutton.map((r, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-brand-700 shrink-0 mt-0.5" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="font-bold text-slate-900 block">การปรับพฤติกรรมตามกาลสมุฏฐาน:</span>
                <ul className="space-y-2 text-slate-700">
                  {plan.holistic_care.lifestyle_behaviors.map((l, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-brand-700 shrink-0 mt-0.5" />
                      <span>{l}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Emergency Red Flags Box */}
          <div className="bg-gradient-to-r from-rose-900 via-rose-800 to-rose-950 text-white rounded-3xl p-6 shadow-lg border border-rose-700 space-y-3">
            <h4 className="font-bold text-sm sm:text-base flex items-center gap-2 text-amber-300">
              <AlertTriangle className="w-5 h-5 text-amber-300 animate-pulse" />
              <span>สัญญาณอันตรายที่ต้องหยุดยาและพบแพทย์ทันที (Emergency Red Flags)</span>
            </h4>
            <p className="text-xs text-rose-100">
              หากผู้ป่วยพบอาการเตือนเหล่านี้ก่อนถึงวันนัดหมาย ให้หยุดใช้ยาสมุนไพรทันทีและมาพบแพทย์ ณ ห้องฉุกเฉินหรือโรงพยาบาลใกล้บ้าน:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
              {plan.holistic_care.emergency_red_flags.map((flag, idx) => (
                <div key={idx} className="bg-rose-950/60 p-2.5 rounded-xl border border-rose-700/60 flex items-start gap-2">
                  <span className="font-bold text-amber-400">⚠️</span>
                  <span>{flag}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 7. Bottom Navigation Next Step Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-soft flex flex-col sm:flex-row items-center justify-between gap-3 no-print">
        <button
          onClick={() => navigate('/prescribe')}
          className="text-xs text-slate-600 hover:text-slate-900 font-semibold flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>ย้อนกลับ: สั่งยาแผนไทย & ตรวจ HDI</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/prescription-print')}
            className="text-xs text-brand-800 hover:text-brand-900 font-semibold flex items-center gap-1 bg-brand-50 border border-brand-200 px-3 py-2 rounded-xl"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>ดูใบสั่งยาและฉลากยา</span>
          </button>

          <button
            onClick={() => navigate('/analytics')}
            className="text-xs bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl shadow-sm flex items-center gap-1.5"
          >
            <span>ไปที่ ICD-10-TM Analytics</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
