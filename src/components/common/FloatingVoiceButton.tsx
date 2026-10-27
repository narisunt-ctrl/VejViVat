import React from 'react';
import { Mic, Sparkles } from 'lucide-react';

interface FloatingVoiceButtonProps {
  onClick: () => void;
}

export const FloatingVoiceButton: React.FC<FloatingVoiceButtonProps> = ({ onClick }) => {
  return (
    <aside aria-label="ผู้ช่วยเสียง AI" className="fixed bottom-4 right-4 sm:bottom-5 sm:right-5 z-40 no-print">
      <div className="relative group">
        {/* Ambient pulse glow */}
        <div className="absolute -inset-1 bg-gradient-to-r from-teal-500 via-emerald-400 to-indigo-500 rounded-full blur-md opacity-70 group-hover:opacity-100 animate-pulse transition duration-500 pointer-events-none" />

        <button
          onClick={onClick}
          className="relative flex items-center gap-2.5 bg-gradient-to-r from-slate-950 via-teal-950 to-slate-900 border-2 border-teal-400/80 text-white p-2.5 sm:pl-3.5 sm:pr-4 sm:py-2.5 rounded-full shadow-2xl hover:shadow-teal-500/30 transition-all duration-300 transform group-hover:scale-105 active:scale-95 cursor-pointer"
          title="คลิกเพื่อเปิดระบบดักจับเสียงคนไข้ AI Speech-to-Text"
          aria-label="เปิดผู้ช่วยเสียง AI Speech-to-Text"
        >
          {/* Animated pulsing mic badge */}
          <div className="relative flex items-center justify-center">
            <span className="absolute w-7 h-7 rounded-full bg-teal-400/40 animate-ping"></span>
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 text-slate-950 flex items-center justify-center font-bold shadow-md">
              <Mic className="w-4 h-4" />
            </div>
          </div>

          <div className="hidden sm:block text-left">
            <div className="flex items-center gap-1.5">
              <span className="font-black text-xs text-white tracking-tight">
                AI Speech-to-Text
              </span>
              <span className="text-[9px] bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black px-1.5 py-0.2 rounded-full uppercase">
                จับเสียง
              </span>
            </div>
            <p className="text-[10px] text-teal-300/80 leading-none mt-0.5">
              ดักจับอาการด้วยเสียง
            </p>
          </div>
        </button>
      </div>
    </aside>
  );
};
