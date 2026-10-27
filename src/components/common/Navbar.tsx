import React from 'react';
import { User, Activity, AlertCircle, FileText, ChevronRight, UserPlus, Sparkles, Mic, Menu } from 'lucide-react';
import { SyntheticCase } from '../../types/patient';
import { WeatherWidget } from './WeatherWidget';
import teamLogo from '@/assets/team-logo.png';

interface NavbarProps {
  currentCase: SyntheticCase;
  onSelectCaseClick: () => void;
  onOpenIntake?: () => void;
  onOpenVoiceAssistant?: () => void;
  onWeatherUpdate?: (weather: any) => void;
  onOpenMenu?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentCase,
  onSelectCaseClick,
  onOpenIntake,
  onOpenVoiceAssistant,
  onWeatherUpdate,
  onOpenMenu,
}) => {
  const p = currentCase.patient_info;
  const v = currentCase.current_encounter.vitals;

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-sm no-print">
      <div className="px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Patient Ribbon + Active Case Selector */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {onOpenMenu && (
            <button
              onClick={onOpenMenu}
              className="lg:hidden shrink-0 p-2 -ml-1 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
              title="เปิดเมนู"
              aria-label="เปิดเมนู"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={onSelectCaseClick}
            className="min-w-0 flex items-center gap-2.5 bg-slate-50/90 hover:bg-brand-50/80 border border-slate-200 hover:border-brand-300 rounded-xl px-3 py-1.5 transition-all text-left group shadow-xs active:scale-[0.99]"
            title="คลิกเพื่อสลับเคสผู้ป่วย (Switch Patient)"
          >
            <div className="w-8 h-8 shrink-0 rounded-lg bg-gradient-to-br from-brand-700 to-teal-800 text-white flex items-center justify-center font-bold text-xs shadow-sm ring-1 ring-brand-900/10">
              {currentCase.case_id}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text-slate-900 text-sm truncate">{p.name}</span>
                <span className="text-[11px] text-slate-500 shrink-0">
                  ({p.gender}, {p.age} ปี)
                </span>
                <span className="hidden sm:inline text-[10px] bg-slate-200/80 text-slate-700 font-mono px-1 rounded shrink-0">
                  {p.hn}
                </span>
              </div>
              <div className="hidden sm:flex text-[11px] text-slate-500 items-center gap-2 truncate">
                <span className="truncate">ภูมิลำเนา: {p.province}</span>
                <span>•</span>
                <span className="text-brand-800 font-medium shrink-0">ธาตุกำเนิด: {p.birth_element}</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-brand-700 group-hover:translate-x-0.5 transition shrink-0 ml-1" />
          </button>

          {/* Vitals Summary Pill */}
          <div className="hidden xl:flex items-center gap-3 bg-slate-50/80 border border-slate-200/80 px-3 py-1.5 rounded-xl text-xs text-slate-600">
            <span className="flex items-center gap-1 font-medium">
              <Activity className="w-3.5 h-3.5 text-rose-500" />
              <span>BT: <b className="text-slate-900">{v.btemp}°C</b></span>
            </span>
            <span className="text-slate-300">|</span>
            <span>BP: <b className="text-slate-900">{v.sbp}/{v.dbp}</b></span>
            <span className="text-slate-300">|</span>
            <span>PR: <b className="text-slate-900">{v.pr}</b> bpm</span>
            <span className="text-slate-300">|</span>
            <span>RR: <b className="text-slate-900">{v.rr}</b>/min</span>
          </div>
        </div>

        {/* Right: Voice STT + New Patient CTA + Weather & Team Branding */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {onOpenVoiceAssistant && (
            <button
              onClick={onOpenVoiceAssistant}
              className="hidden sm:inline-flex items-center gap-1.5 bg-gradient-to-r from-teal-900 via-slate-900 to-indigo-950 border border-teal-400/80 hover:border-teal-300 text-teal-200 hover:text-white font-bold px-3 py-1.5 rounded-xl text-xs shadow-sm hover:shadow-teal-500/25 transition active:scale-95 group cursor-pointer"
              title="เปิดระบบดักจับเสียงคนไข้บอกอาการ (Speech-to-Text Model)"
            >
              <div className="relative flex items-center justify-center">
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping absolute"></span>
                <Mic className="w-3.5 h-3.5 text-teal-300 group-hover:scale-110 transition" />
              </div>
              <span className="hidden sm:inline font-black text-white">🎙️ Speech-to-Text</span>
              <span className="sm:hidden font-black text-white">🎙️ เสียง</span>
              <span className="hidden xl:inline text-[9px] bg-teal-500/30 text-teal-300 border border-teal-400/40 px-1 py-0.2 rounded font-mono font-bold">
                AI NLP
              </span>
            </button>
          )}

          {onOpenIntake && (
            <button
              onClick={onOpenIntake}
              className="inline-flex items-center gap-1.5 bg-gradient-to-r from-brand-600 to-teal-600 hover:from-brand-700 hover:to-teal-700 text-white font-medium px-3 py-1.5 rounded-xl text-xs shadow-sm hover:shadow-md transition active:scale-95 cursor-pointer"
              title="ลงทะเบียนผู้ป่วยรายใหม่และทดสอบทันที"
            >
              <UserPlus className="w-3.5 h-3.5 text-amber-200" />
              <span className="hidden sm:inline">+ ผู้ป่วยใหม่</span>
              <span className="sm:hidden">+ เพิ่ม</span>
            </button>
          )}

          {/* Live Open-Meteo Weather */}
          <div className="hidden xl:block">
          <WeatherWidget
            latitude={currentCase.current_encounter.ambient_context.latitude}
            longitude={currentCase.current_encounter.ambient_context.longitude}
            locationName={currentCase.current_encounter.ambient_context.location}
            onWeatherLoaded={onWeatherUpdate}
          />
          </div>

          {/* Subtle Team Crest in Header */}
          <div className="hidden xl:flex items-center gap-1.5 pl-2 border-l border-slate-200">
            <div className="w-7 h-7 rounded-lg overflow-hidden bg-slate-900 p-0.5 border border-amber-500/30 shadow-xs">
              <img src={teamLogo} alt="VejVivat" className="w-full h-full object-contain" />
            </div>
            <div className="text-[10px] leading-tight">
              <span className="font-semibold text-slate-800 block">ทีม VejVivat</span>
              <span className="text-slate-400 font-mono text-[9px] block">THAI AI</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
