import React from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';
import { ElementScores } from '../../types/smutthan';
import { Flame, Droplet, Wind, Mountain } from 'lucide-react';

interface ElementRadarChartProps {
  scores: ElementScores;
  dominantElement: 'earth' | 'water' | 'wind' | 'fire';
  status: string;
}

export const ElementRadarChart: React.FC<ElementRadarChartProps> = ({
  scores,
  dominantElement,
  status,
}) => {
  const chartData = [
    { element: 'ปถวี (ดิน)', score: scores.earth, fullMark: 100 },
    { element: 'อาโป (น้ำ)', score: scores.water, fullMark: 100 },
    { element: 'วาโย (ลม)', score: scores.wind, fullMark: 100 },
    { element: 'เตโช (ไฟ)', score: scores.fire, fullMark: 100 },
  ];

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-soft flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <span>สมดุลธาตุประธานทั้ง 4</span>
            <span className="text-[11px] font-normal text-slate-500">(Four Elements Radar)</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            สเกลคะแนน 0 - 100 ประมวลผลจากสภาพแวดล้อม กาล วัย และสัญญาณชีพ
          </p>
        </div>
        <div className="text-right">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-brand-50 text-brand-800 border border-brand-200">
            {status}
          </span>
        </div>
      </div>

      {/* Radar Chart */}
      <div className="h-64 w-full my-1">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="65%" data={chartData}>
            <PolarGrid stroke="#e2e8f0" strokeDasharray="3 3" />
            <PolarAngleAxis
              dataKey="element"
              tick={{ fill: '#334155', fontSize: 12, fontWeight: 500 }}
            />
            <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#cbd5e1" />
            <Radar
              name="ระดับคะแนนธาตุ"
              dataKey="score"
              stroke="#0F766E"
              fill="#0F766E"
              fillOpacity={0.4}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* 4 Element Score Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100">
        {/* Earth */}
        <div
          className={`p-2.5 rounded-xl border text-center transition ${
            dominantElement === 'earth'
              ? 'bg-amber-50/80 border-amber-300 ring-1 ring-amber-300'
              : 'bg-slate-50 border-slate-200/70'
          }`}
        >
          <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-[#8B5A2B]">
            <Mountain className="w-3.5 h-3.5" /> ปถวี (ดิน)
          </div>
          <div className="text-lg font-bold text-slate-900 mt-0.5">{scores.earth}</div>
          <div className="text-[10px] text-slate-500">20 ส่วนโครงสร้าง</div>
        </div>

        {/* Water */}
        <div
          className={`p-2.5 rounded-xl border text-center transition ${
            dominantElement === 'water'
              ? 'bg-sky-50/80 border-sky-300 ring-1 ring-sky-300'
              : 'bg-slate-50 border-slate-200/70'
          }`}
        >
          <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-sky-600">
            <Droplet className="w-3.5 h-3.5" /> อาโป (น้ำ)
          </div>
          <div className="text-lg font-bold text-slate-900 mt-0.5">{scores.water}</div>
          <div className="text-[10px] text-slate-500">12 ส่วนของเหลว</div>
        </div>

        {/* Wind */}
        <div
          className={`p-2.5 rounded-xl border text-center transition ${
            dominantElement === 'wind'
              ? 'bg-emerald-50/80 border-emerald-300 ring-1 ring-emerald-300'
              : 'bg-slate-50 border-slate-200/70'
          }`}
        >
          <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-emerald-600">
            <Wind className="w-3.5 h-3.5" /> วาโย (ลม)
          </div>
          <div className="text-lg font-bold text-slate-900 mt-0.5">{scores.wind}</div>
          <div className="text-[10px] text-slate-500">6 ส่วนการเคลื่อนไหว</div>
        </div>

        {/* Fire */}
        <div
          className={`p-2.5 rounded-xl border text-center transition ${
            dominantElement === 'fire'
              ? 'bg-orange-50/80 border-orange-300 ring-1 ring-orange-300'
              : 'bg-slate-50 border-slate-200/70'
          }`}
        >
          <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-orange-600">
            <Flame className="w-3.5 h-3.5" /> เตโช (ไฟ)
          </div>
          <div className="text-lg font-bold text-slate-900 mt-0.5">{scores.fire}</div>
          <div className="text-[10px] text-slate-500">4 ส่วนความร้อน/ย่อย</div>
        </div>
      </div>
    </div>
  );
};
