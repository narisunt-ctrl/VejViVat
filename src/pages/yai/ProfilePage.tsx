import React from 'react';
import { Link } from 'react-router-dom';
import { BellRing, ChevronRight, Leaf, LifeBuoy, Pill, ScanLine, Settings, Trophy, Users, Watch } from 'lucide-react';
import { useYai } from '../../services/yai/yaiStore';
import { PageTitle } from '../../components/yai/ui';

export const ProfilePage: React.FC = () => {
  const state = useYai((s) => s);
  const name = state.patient.displayName.replace(/\s*\(.*\)\s*$/, '');
  const home = state.settings.home;
  const link = state.settings.deviceLink ?? 'NONE';
  const pending = state.medicines.filter((m) => m.status !== 'PATIENT_CONFIRMED' && m.status !== 'CLINICIAN_VERIFIED').length;

  const menus = [
    { to: '/yai/medicines', label: 'ยาของยาย', sub: pending ? `${pending} รายการรอตรวจ` : undefined, icon: Pill },
    { to: '/yai/reminders', label: 'เตือนกินยา', icon: BellRing },
    { to: '/yai/scan', label: 'สแกนฉลากยา', icon: ScanLine },
    { to: '/yai/health', label: 'เชื่อมนับก้าว', sub: link === 'NONE' ? 'ยังไม่เชื่อม' : link === 'WATCH_DEMO' ? 'สมาร์ทวอทช์ (จำลอง)' : 'โทรศัพท์ (จำลอง)', icon: Watch },
    { to: '/yai/leaderboard', label: 'คะแนนกับเพื่อน', sub: `เพื่อน ${(state.friends ?? []).length} คน`, icon: Trophy },
    { to: '/yai/herb-reviews', label: 'รีวิวสมุนไพร', icon: Leaf },
    { to: '/yai/family', label: 'ผู้ดูแลและการแบ่งปันข้อมูล', icon: Users },
    { to: '/yai/settings', label: 'ตั้งค่า ขนาดตัวอักษร ความเป็นส่วนตัว', icon: Settings },
    { to: '/yai/help', label: 'ขอความช่วยเหลือ', icon: LifeBuoy },
  ];

  return (
    <div className="space-y-5">
      <PageTitle title="โปรไฟล์" />
      <section className="flex items-center gap-4 rounded-3xl bg-yai-green p-4 text-white">
        <span className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white/70 bg-white text-4xl" aria-hidden="true">
          👵
        </span>
        <div className="min-w-0">
          <p className="break-words text-2xl font-bold">{name}</p>
          <p className="text-base text-white/90">
            อายุ {state.patient.age} ปี · {home ? `อ.${home.district}` : `จ.${state.patient.province}`}
          </p>
        </div>
      </section>
      <ul className="space-y-2">
        {menus.map((m) => (
          <li key={m.to + m.label}>
            <Link to={m.to} className="flex min-h-[64px] items-center gap-3 rounded-2xl border border-yai-ink/10 bg-white px-4 shadow-sm">
              <m.icon className="h-7 w-7 shrink-0 text-yai-green" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-bold">{m.label}</span>
                {m.sub && <span className="block text-sm text-yai-ink/60">{m.sub}</span>}
              </span>
              <ChevronRight className="h-5 w-5 text-yai-ink/40" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};
