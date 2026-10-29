import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Sparkles,
  FlaskConical,
  Users,
  Compass,
  Pill,
  BarChart3,
  GitCompare,
  Database,
  Info,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  ShieldCheck,
  CalendarClock,
  FileText,
  X,
  Smartphone,
  ClipboardList,
  HeartPulse,
  BookOpen,
  BookCheck,
  ClipboardCheck,
  Layers3,
  Target,
  LayoutDashboard,
  TrendingUp,
  Scale,
} from 'lucide-react';
import teamLogo from '@/assets/team-logo.png';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
  onOpenIntake?: () => void;
  casesCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed: collapsedDesktop,
  onToggle,
  mobileOpen = false,
  onCloseMobile,
  onOpenIntake,
  casesCount = 30,
}) => {
  // The mobile drawer always shows the full menu, even if the desktop rail is collapsed
  const collapsed = collapsedDesktop && !mobileOpen;

  // Grouped by what a doctor is doing, daily work first; badges only where they carry information
  const menuGroups: { title: string; items: { to: string; label: string; icon: typeof Users; badge?: string }[] }[] = [
    {
      title: 'งานประจำวัน',
      items: [
        { to: '/doctor', label: 'หน้าหลักแพทย์', icon: LayoutDashboard },
        { to: '/patients', label: 'เคสผู้ป่วย', icon: Users, badge: `${casesCount}` },
        { to: '/clinician/followup', label: 'ติดตามผู้ป่วย (ยายพร้อม)', icon: HeartPulse },
        { to: '/clinician/previsit', label: 'สรุปก่อนพบแพทย์', icon: ClipboardList },
        { to: '/clinician/handover', label: 'Clinical Handover', icon: ClipboardCheck },
      ],
    },
    {
      title: 'ประเมินและสั่งยา',
      items: [
        { to: '/smutthan', label: 'ประเมินสมุฏฐาน', icon: Compass },
        { to: '/prescribe', label: 'สั่งยาแผนไทย & ตรวจ HDI', icon: Pill },
        { to: '/prescription-print', label: 'ใบสั่งยา & ฉลากยา', icon: FileText },
        { to: '/care-plan', label: 'แผนการรักษา & ติดตามผล', icon: CalendarClock },
      ],
    },
    {
      title: 'หลักฐานและแนวทาง',
      items: [
        { to: '/research', label: 'คลังงานวิจัย + รีวิว', icon: BookOpen },
        { to: '/research-hub', label: 'ศูนย์วิจัยสมุนไพรไทย', icon: FlaskConical },
        { to: '/guidelines', label: 'Guideline ร่วมทบทวน', icon: BookCheck },
        { to: '/admin-hdi', label: 'ฐานข้อมูลยาตีกัน (HDI)', icon: Database },
      ],
    },
    {
      title: 'โครงการและธุรกิจ',
      items: [
        { to: '/holistic', label: 'Holistic Care MVP', icon: Layers3 },
        { to: '/value', label: 'Value Proposition', icon: Target },
        { to: '/business', label: 'แดชบอร์ดรายได้ (จำลอง)', icon: TrendingUp },
        { to: '/feasibility', label: 'ศึกษาความเป็นไปได้', icon: Scale },
        { to: '/', label: 'วิสัยทัศน์', icon: Sparkles },
      ],
    },
    {
      title: 'ข้อมูลระบบ',
      items: [
        { to: '/analytics', label: 'ICD-10-TM Analytics', icon: BarChart3 },
        { to: '/inter-rater', label: 'ความสอดคล้องแพทย์', icon: GitCompare },
        { to: '/status', label: 'สถานะระบบต้นแบบ', icon: Info },
        { to: '/yai', label: 'แอปผู้ป่วย ยายพร้อม', icon: Smartphone },
      ],
    },
  ];

  return (
    <>
    {/* Backdrop behind the mobile drawer */}
    {mobileOpen && (
      <div
        className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm lg:hidden no-print"
        onClick={onCloseMobile}
        aria-hidden="true"
      />
    )}
    <aside
      className={`bg-slate-900 text-slate-300 flex flex-col justify-between transition-all duration-300 border-r border-slate-800 shrink-0 no-print fixed inset-y-0 left-0 z-50 w-64 overflow-y-auto lg:static lg:z-auto lg:translate-x-0 ${
        mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
      } ${collapsedDesktop ? 'lg:w-16' : 'lg:w-64'}`}
    >
      <div>
        {/* Brand Header with VejVivat Team Logo */}
        <div className="h-16 flex items-center justify-between px-3 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 via-brand-500/20 to-teal-500/20 p-0.5 border border-amber-500/30 shrink-0 shadow-lg flex items-center justify-center">
              <img
                src={teamLogo}
                alt="VejVivat Thai Medicine AI Crest"
                className="w-full h-full object-contain rounded-lg drop-shadow"
              />
            </div>
            {!collapsed && (
              <div className="truncate">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-white tracking-tight text-sm truncate">
                    VejVivat (เวชวิวัฒน์)
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-amber-400 font-semibold tracking-wider">
                    THAI MEDICINE AI
                  </span>
                  <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse"></span>
                </div>
              </div>
            )}
          </div>
          <button
            onClick={onCloseMobile}
            className="lg:hidden text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            title="ปิดเมนู"
          >
            <X className="w-5 h-5" />
          </button>
          <button
            onClick={onToggle}
            className="hidden lg:block text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            title={collapsed ? 'ขยายแถบเมนู' : 'ย่อแถบเมนู'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Quick Action: Register New Patient */}
        {onOpenIntake && (
          <div className="p-3 pb-1">
            <button
              onClick={onOpenIntake}
              className={`w-full flex items-center justify-center gap-2 bg-gradient-to-r from-brand-600 to-teal-600 hover:from-brand-500 hover:to-teal-500 text-white font-semibold rounded-xl text-xs shadow-md shadow-brand-900/30 hover:shadow-lg transition-all transform active:scale-95 ${
                collapsed ? 'p-2.5' : 'px-3 py-2.5'
              }`}
              title="ลงทะเบียนผู้ป่วยรายใหม่ (Add Patient)"
            >
              <UserPlus className="w-4 h-4 shrink-0 text-amber-300" />
              {!collapsed && <span>+ เพิ่มผู้ป่วยใหม่</span>}
            </button>
          </div>
        )}

        {/* Navigation Links */}
        <nav className="space-y-3 p-3" aria-label="เมนูแพทย์">
          {menuGroups.map((group) => (
            <div key={group.title} className="space-y-0.5">
              {!collapsed ? (
                <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{group.title}</p>
              ) : (
                <div className="mx-3 border-t border-slate-800" aria-hidden="true" />
              )}
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium transition-all group ${
                      isActive ? 'bg-gradient-to-r from-brand-700 to-teal-700 font-semibold text-white shadow-md shadow-brand-950/40' : 'text-slate-400 hover:bg-slate-800/80 hover:text-white'
                    }`
                  }
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon className="h-4 w-4 shrink-0 transition group-hover:text-amber-300" />
                  {!collapsed && (
                    <div className="flex w-full items-center justify-between truncate">
                      <span className="truncate">{item.label}</span>
                      {item.badge && <span className="rounded-full border border-slate-700/60 bg-slate-800/90 px-1.5 py-0.5 font-mono text-[10px] text-brand-300">{item.badge}</span>}
                    </div>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </div>

      {/* Footer / Team Branding & Hackathon Tag */}
      {!collapsed ? (
        <div className="p-3.5 border-t border-slate-800/80 bg-slate-950/50 text-[11px] space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-300">ทีม VejVivat (เวชวิวัฒน์)</span>
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-mono bg-emerald-950/60 border border-emerald-800/50 px-1.5 py-0.2 rounded">
              <ShieldCheck className="w-3 h-3" /> AI Core
            </span>
          </div>
          <div className="text-slate-400 text-[10px] leading-tight">
            Thai Medicine AI Decision Support Platform
          </div>
          <div className="text-slate-500 text-[10px] pt-1 border-t border-slate-800/60 flex items-center justify-between">
            <span>TTM Hackathon 2026</span>
            <span className="text-slate-400">กรมการแพทย์แผนไทยฯ</span>
          </div>
        </div>
      ) : (
        <div className="p-2 border-t border-slate-800 flex justify-center text-slate-500">
          <div className="w-6 h-6 rounded-lg overflow-hidden opacity-60 hover:opacity-100 transition" title="ทีม VejVivat">
            <img src={teamLogo} alt="Logo" className="w-full h-full object-contain" />
          </div>
        </div>
      )}
    </aside>
    </>
  );
};
