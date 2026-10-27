import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Compass,
  Pill,
  BarChart3,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Database,
  Cpu,
  UserPlus,
  Users,
  Activity,
  Layers,
  Play,
  Film,
  X,
  Download,
  Mic,
} from 'lucide-react';
import teamLogo from '@/assets/team-logo.png';

interface LandingPageProps {
  onOpenIntake?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenIntake }) => {
  const navigate = useNavigate();
  const [isVideoModalOpen, setIsVideoModalOpen] = useState<boolean>(false);

  return (
    <div className="max-w-6xl mx-auto space-y-10 py-6 sm:px-6">
      {/* Hero Section with VejVivat Team Branding & Crest */}
      <div className="text-center space-y-5 max-w-3xl mx-auto pt-4">
        {/* Team Logo Badge */}
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="relative group">
            <div className="absolute -inset-1.5 bg-gradient-to-r from-amber-500 via-brand-500 to-teal-500 rounded-3xl blur opacity-30 group-hover:opacity-60 transition duration-500"></div>
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-slate-950 p-2 shadow-2xl border border-amber-400/40 flex items-center justify-center transform group-hover:scale-105 transition duration-300">
              <img
                src={teamLogo}
                alt="VejVivat Thai Medicine AI Crest"
                className="w-full h-full object-contain drop-shadow"
              />
            </div>
          </div>

          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-50 via-brand-50 to-teal-50 border border-amber-300/80 text-amber-950 px-4 py-1.5 rounded-full text-xs font-semibold shadow-xs">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span className="font-bold text-slate-900">ทีม VejVivat (เวชวิวัฒน์)</span>
            <span className="text-slate-400">•</span>
            <span className="text-teal-800">Thai Medicine AI Innovation</span>
          </div>
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
          TTM Smutthan Engine Platform
        </h1>

        <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
          แพลตฟอร์มสนับสนุนการตัดสินใจทางคลินิก (CDSS) สำหรับแพทย์แผนไทย เชื่อมโยงข้อมูลสภาพแวดล้อม Real-time ประเมินสมุฏฐานวินิจฉัยอย่างโปร่งใส ตรวจสอบอันตรกิริยายาสมุนไพรกับยาแผนปัจจุบัน (HDI) และวิเคราะห์ความคุ้มค่า ICD-10-TM
        </p>

        {/* Prototype Status Badges */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-xs">
          <span className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-black px-3 py-1 rounded-full border border-teal-400 shadow-sm flex items-center gap-1.5 animate-pulse">
            <Mic className="w-3.5 h-3.5 text-amber-300" /> Speech-to-Text Model (จับเสียงคนไข้)
          </span>
          <span className="bg-emerald-100 text-emerald-900 font-bold px-3 py-1 rounded-full flex items-center gap-1.5 border border-emerald-200 shadow-2xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" /> Functional Prototype (ระดับ 1.3)
          </span>
          <span className="bg-teal-100 text-teal-900 font-bold px-3 py-1 rounded-full flex items-center gap-1.5 border border-teal-200 shadow-2xs">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-700" /> MVP-Ready (ระดับ 1.4)
          </span>
          <span className="bg-amber-100 text-amber-950 font-bold px-3 py-1 rounded-full border border-amber-300 shadow-2xs flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-amber-700" /> 30 เคสสังเคราะห์ทางคลินิก
          </span>
          <span className="bg-indigo-100 text-indigo-950 font-bold px-3 py-1 rounded-full border border-indigo-200 shadow-2xs flex items-center gap-1">
            <UserPlus className="w-3.5 h-3.5 text-indigo-700" /> คีย์เพิ่มผู้ป่วยใหม่ได้เอง
          </span>
        </div>

        {/* Action CTAs */}
        <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => navigate('/patients')}
            className="bg-gradient-to-r from-brand-700 to-teal-700 hover:from-brand-800 hover:to-teal-800 text-white font-bold px-6 py-3.5 rounded-2xl shadow-lg shadow-brand-900/20 hover:shadow-xl transition-all transform active:scale-95 flex items-center gap-2 text-sm group"
          >
            <span>เริ่มสาธิตระบบห้องตรวจ (30 เคสจำลอง)</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
          </button>

          <button
            onClick={() => navigate('/smutthan')}
            className="bg-gradient-to-r from-teal-900 via-slate-900 to-indigo-950 border border-teal-400/80 hover:border-teal-300 text-teal-200 hover:text-white font-bold px-5 py-3.5 rounded-2xl shadow-lg hover:shadow-teal-500/25 transition-all transform active:scale-95 flex items-center gap-2 text-sm group cursor-pointer"
          >
            <Mic className="w-4 h-4 text-teal-300 group-hover:scale-110 transition" />
            <span>🎙️ ทดสอบ Speech-to-Text เสียงคนไข้</span>
          </button>

          <button
            onClick={() => setIsVideoModalOpen(true)}
            className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold px-5 py-3.5 rounded-2xl shadow-lg shadow-indigo-900/20 hover:shadow-xl transition-all transform active:scale-95 flex items-center gap-2 text-sm group"
          >
            <Play className="w-4 h-4 text-amber-300 fill-amber-300 group-hover:scale-110 transition" />
            <span>รับชมวิดีโอสาธิตระบบ (1:11 นาที)</span>
          </button>

          {onOpenIntake ? (
            <button
              onClick={onOpenIntake}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold px-5 py-3.5 rounded-2xl shadow-md hover:shadow-lg transition-all transform active:scale-95 flex items-center gap-2 text-sm"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ คีย์เพิ่มเคสผู้ป่วยใหม่</span>
            </button>
          ) : (
            <button
              onClick={() => navigate('/patients')}
              className="bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-950 font-bold px-5 py-3.5 rounded-2xl transition text-sm flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4 text-amber-700" />
              <span>+ เพิ่มเคสผู้ป่วยใหม่</span>
            </button>
          )}

          <button
            onClick={() => navigate('/status')}
            className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-medium px-5 py-3.5 rounded-2xl transition text-sm shadow-2xs"
          >
            สถานะความพร้อมระบบ (Status Matrix)
          </button>
        </div>
      </div>

      {/* Speech-to-Text Innovation Showcase Card */}
      <div className="max-w-4xl mx-auto rounded-3xl bg-gradient-to-br from-slate-900 via-teal-950 to-slate-950 p-6 sm:p-7 border-2 border-teal-500/50 shadow-2xl text-white space-y-4 relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-teal-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-teal-500/20 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-teal-500/40 shrink-0">
              <Mic className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  NEW AI MODEL
                </span>
                <h3 className="text-base sm:text-lg font-black text-white">
                  Model Speech-to-Text: ระบบดักจับเสียงคนไข้บอกอาการ
                </h3>
              </div>
              <p className="text-xs text-teal-200/90 mt-0.5">
                เปลี่ยนเสียงคำบ่นหรืออาการของผู้ป่วยภาษาไทย เป็นคำค้นพบทางคลินิกและเชื่อมโยงสมุฏฐาน 4 ธาตุสดทันที
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate('/smutthan')}
            className="bg-gradient-to-r from-teal-400 to-emerald-400 hover:brightness-110 text-slate-950 font-black px-4 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition cursor-pointer shrink-0"
          >
            <span>ทดลองใช้ในห้องตรวจ</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 space-y-1">
            <div className="font-bold text-teal-300 flex items-center gap-1.5">
              <span>1. Real-time Voice (th-TH)</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              รับฟังเสียงคนไข้สดผ่าน Web Speech API พร้อมคลื่นเสียง Audio Waveform แบบเรียลไทม์
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 space-y-1">
            <div className="font-bold text-emerald-300 flex items-center gap-1.5">
              <span>2. Thai NLP Symptom Extractor</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              อัลกอริทึมสกัดคำบ่งชี้อาการทางคลินิกอัตโนมัติ ครอบคลุม 5 ระบบโรคหลักและคำบอกเล่าภาษาไทย
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 space-y-1">
            <div className="font-bold text-amber-300 flex items-center gap-1.5">
              <span>3. Instant Smutthan & ICD Mapping</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              เชื่อมผลการถอดเสียงเข้าสู่ Smutthan Radar Chart และแนะนำรหัส ICD-10 / ICD-10-TM ทันที
            </p>
          </div>
        </div>
      </div>

      {/* Video Simulation Teaser Card */}
      <div
        onClick={() => setIsVideoModalOpen(true)}
        className="relative group cursor-pointer max-w-4xl mx-auto rounded-3xl overflow-hidden border border-slate-200/90 shadow-card bg-slate-950 p-1.5 transition-all hover:shadow-2xl hover:border-amber-400/50"
      >
        <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-900 flex items-center justify-center">
          <img
            src="./videos/demo-poster.png"
            alt="TTM Simulation Video Preview"
            className="w-full h-full object-cover opacity-85 group-hover:opacity-95 group-hover:scale-102 transition duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-between p-6">
            <div className="flex items-center justify-between">
              <span className="bg-rose-600/90 text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1.5 backdrop-blur-xs">
                <Film className="w-3.5 h-3.5" /> Simulation Video (HD 720p)
              </span>
              <span className="bg-slate-900/80 text-amber-300 text-xs font-mono px-2.5 py-1 rounded-full border border-slate-700">
                01:11 นาที
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-xl group-hover:scale-110 transition duration-300 shrink-0">
                <Play className="w-7 h-7 fill-slate-950 ml-1" />
              </div>
              <div>
                <h3 className="text-white font-extrabold text-base sm:text-lg group-hover:text-amber-300 transition">
                  คลิกเพื่อรับชมวิดีโอจำลองการทำงานจริง (Live Simulation Walkthrough)
                </h3>
                <p className="text-slate-300 text-xs sm:text-sm mt-0.5">
                  สาธิตระบบครบ 5 ขั้นตอน: ลงทะเบียนคนไข้ใหม่ → สมุฏฐาน 4 ธาตุ → ตรวจจับ HDI → พิมพ์ใบสั่งยา → แผนการรักษาและกราฟแนวโน้มรายบุคคล
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Core Platform Pillars Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 pt-4">
        {/* Pillar 1 */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-soft hover:shadow-card hover:-translate-y-1 transition-all flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-brand-700 flex items-center justify-center border border-teal-100 shadow-sm">
              <Compass className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-slate-900">
              1. Smutthan Engine (AI-Assisted)
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              ดึงข้อมูลสภาพอากาศ อุณหภูมิ ความชื้นสดจาก <b>Open-Meteo API</b> แบบ Real-time ประมวลผลร่วมกับกาลสมุฏฐาน อายุ และสัญญาณชีพ เพื่อคำนวณแนวโน้ม 4 ธาตุ (ปถวี อาโป วาโย เตโช) ผ่าน Rule-based scoring ที่โปร่งใสและอธิบายได้
            </p>
          </div>
          <div className="pt-3 border-t border-slate-100 text-xs font-semibold text-brand-700 flex items-center gap-1">
            <span>คำนวณสดด้วย Radar Chart & Explainable Rules</span>
          </div>
        </div>

        {/* Pillar 2 */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-soft hover:shadow-card hover:-translate-y-1 transition-all flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 shadow-sm">
              <Pill className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-slate-900">
              2. Centralized Herb-Drug Interaction (HDI)
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              ฐานข้อมูลกลางตรวจสอบอันตรกิริยาคู่ยาระหว่างยาแผนปัจจุบันใน HIS กับยาสมุนไพรไทย แจ้งเตือนความเสี่ยงทันที (สูง/ปานกลาง/ต่ำ) พร้อมกลไกทางเภสัชวิทยา ระดับหลักฐานเชิงประจักษ์ (Level A-D) และระบบตรวจขนาดยาเกินอัตโนมัติ
            </p>
          </div>
          <div className="pt-3 border-t border-slate-100 text-xs font-semibold text-rose-600 flex items-center gap-1">
            <span>เชื่อมต่อ HIS ผ่าน OpenAPI & FHIR Spec</span>
          </div>
        </div>

        {/* Pillar 3 */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-soft hover:shadow-card hover:-translate-y-1 transition-all flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shadow-sm">
              <BarChart3 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-slate-900">
              3. ICD-10-TM Real-time Analytics
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              ประมวลผลการลงรหัสโรคแพทย์แผนไทย (ICD-10-TM U-Codes) ควบคู่กับรหัสหัตถการและค่ายาสมุนไพรแบบ Real-time คำนวณต้นทุนต่อเคส (Cost per Episode) เพื่อสร้างกรอบวิเคราะห์ความคุ้มค่าทางเศรษฐศาสตร์สาธารณสุข
            </p>
          </div>
          <div className="pt-3 border-t border-slate-100 text-xs font-semibold text-blue-600 flex items-center gap-1">
            <span>โครงสร้างรองรับ CEA / CUA / ICER ในอนาคต</span>
          </div>
        </div>

        {/* Pillar 4 */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-soft hover:shadow-card hover:-translate-y-1 transition-all flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200 shadow-sm">
              <UserPlus className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-slate-900">
              4. Interactive Intake & 30 Synthetic Cohort
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              รองรับการทดสอบด้วย 30 เคสจำลองทางคลินิก และมีระบบ <b>ลงทะเบียนผู้ป่วยใหม่ (Self-Service Intake)</b> คำนวณธาตุกำเนิดอัตโนมัติจากวันเดือนปีเกิด ดึงพิกัดสภาพอากาศสด และเลือกยาจากบัญชียาหลักแห่งชาติ พ.ศ. 2569
            </p>
          </div>
          <div className="pt-3 border-t border-slate-100 text-xs font-semibold text-amber-700 flex items-center gap-1">
            <span>ระบบเก็บข้อมูล LocalStorage ปลอดภัย Zero PII</span>
          </div>
        </div>
      </div>

      {/* 5-Step Workflow Cards */}
      <div className="bg-gradient-to-br from-slate-900 via-brand-950 to-slate-950 text-white rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl border border-slate-800">
        <div>
          <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
            ขั้นตอนการทำงาน 5 ขั้นตอนอัจฉริยะ (5-Step Complete Smart Workflow)
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
            ระบบรองรับวงจรการดูแลรักษาแบบบูรณาการครบถ้วนตั้งแต่แรกรับจนถึงติดตามผล
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60 space-y-2">
            <span className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 font-bold text-xs flex items-center justify-center border border-amber-500/30">
              1
            </span>
            <h4 className="font-bold text-sm text-white">เลือกเคส / ลงทะเบียนใหม่</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              30 เคสจำลองทางคลินิก หรือลงทะเบียนผู้ป่วยรายใหม่ คัดกรองยาเดิมและโรคประจำตัว
            </p>
          </div>

          <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60 space-y-2">
            <span className="w-7 h-7 rounded-xl bg-teal-500/20 text-teal-400 font-bold text-xs flex items-center justify-center border border-teal-500/30">
              2
            </span>
            <h4 className="font-bold text-sm text-white">ประเมินสมุฏฐานธาตุ</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              คำนวณ 4 ธาตุจากสภาพอากาศสด กาลเวลา วัย สัญญาณชีพ พร้อมเรดาร์ชาร์ตและกฎที่อธิบายได้
            </p>
          </div>

          <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60 space-y-2">
            <span className="w-7 h-7 rounded-xl bg-rose-500/20 text-rose-400 font-bold text-xs flex items-center justify-center border border-rose-500/30">
              3
            </span>
            <h4 className="font-bold text-sm text-white">สั่งยาสมุนไพร & ตรวจ HDI</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              ค้นหายาสมุนไพร ตรวจสอบขนาดยาสูงสุด และแจ้งเตือนอันตรกิริยายาทันทีแบบ Real-time
            </p>
          </div>

          <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60 space-y-2">
            <span className="w-7 h-7 rounded-xl bg-blue-500/20 text-blue-400 font-bold text-xs flex items-center justify-center border border-blue-500/30">
              4
            </span>
            <h4 className="font-bold text-sm text-white">พิมพ์ใบสั่งยา & เวชระเบียน</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              พิมพ์ใบสั่งยามาตรฐาน รหัสยา 24 หลัก พร้อมคำเตือนทางคลินิก และส่งออก 43 แฟ้ม / FHIR
            </p>
          </div>

          <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60 space-y-2">
            <span className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center border border-emerald-500/30">
              5
            </span>
            <h4 className="font-bold text-sm text-white">แผนการรักษา & ติดตามผล</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              ตารางนัดรายเดือนตามหลักวิชาการ เฝ้าระวัง 4 ด้าน และดูกราฟแนวโน้มการฟื้นฟูรายบุคคล
            </p>
          </div>
        </div>
      </div>

      {/* Team Branding Footer Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-brand-950 to-slate-900 rounded-3xl p-6 text-white flex flex-col sm:flex-row items-center justify-between gap-6 border border-slate-800 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-400/20 border border-amber-400/40 p-1 flex items-center justify-center shrink-0 shadow-md">
            <img src={teamLogo} alt="Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="text-amber-400 font-bold text-xs uppercase tracking-wider">
              ทีมพัฒนาผู้เข้าแข่งขัน
            </div>
            <h4 className="text-lg font-bold text-white">
              ทีม VejVivat (เวชวิวัฒน์) - Thai Medicine AI
            </h4>
            <p className="text-xs text-slate-300 mt-0.5">
              มุ่งมั่นพัฒนานวัตกรรมปัญญาประดิษฐ์เพื่อยกระดับระบบบริการสุขภาพการแพทย์แผนไทยสู่มาตรฐานสากล
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setIsVideoModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-md transition flex items-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>รับชมวิดีโอ (1:11 นาที)</span>
          </button>
          <button
            onClick={() => navigate('/patients')}
            className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs shadow-md transition"
          >
            เข้าสู่ห้องตรวจ (30 เคส)
          </button>
        </div>
      </div>

      {/* Video Modal */}
      {isVideoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl space-y-3 p-4 sm:p-6 text-white animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold border border-amber-500/30">
                  <Play className="w-4 h-4 fill-amber-400" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-white">
                    วิดีโอจำลองการทำงานจริง — TTM Smutthan Engine (ทีม VejVivat)
                  </h3>
                  <p className="text-xs text-slate-400">
                    สาธิต 5 ขั้นตอน: ลงทะเบียนคนไข้ใหม่ → ประเมินสมุฏฐานธาตุ → ตรวจจับ HDI → สั่งยา → แผนการรักษา & ติดตามผล
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsVideoModalOpen(false)}
                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition"
                title="ปิดวิดีโอ"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative rounded-2xl overflow-hidden bg-black aspect-video border border-slate-800 shadow-inner">
              <video
                controls
                autoPlay
                poster="./videos/demo-poster.png"
                className="w-full h-full object-contain"
              >
                <source src="./videos/ttm-vejvivat-demo.mp4" type="video/mp4" />
                <source src="./videos/ttm-vejvivat-demo.webm" type="video/webm" />
                เบราว์เซอร์ของคุณไม่รองรับการเล่นวิดีโอ HTML5
              </video>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" /> บันทึกการทำงานจริงแบบ Real-time ความละเอียด 720p HD
              </span>
              <a
                href="./videos/ttm-vejvivat-demo.mp4"
                download="ttm-vejvivat-demo.mp4"
                className="text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>ดาวน์โหลดวิดีโอ (.mp4, 7 MB)</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
