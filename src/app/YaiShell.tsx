import React, { useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Home, Pill, Stethoscope, BellRing, LifeBuoy, Settings } from 'lucide-react';
import { useYai } from '../services/yai/yaiStore';
import { DemoBadge } from '../components/yai/ui';

const NAV = [
  { to: '/yai', label: 'หน้าแรก', icon: Home, end: true },
  { to: '/yai/medicines', label: 'ยาของยาย', icon: Pill },
  { to: '/yai/clinics', label: 'ไปหาหมอ', icon: Stethoscope },
  { to: '/yai/reminders', label: 'เตือนกินยา', icon: BellRing },
  { to: '/yai/help', label: 'ช่วยเหลือ', icon: LifeBuoy },
];

/** Patient app chrome: no clinician sidebar or case state, larger type, bottom navigation. */
export const YaiShell: React.FC = () => {
  const fontScale = useYai((s) => s.settings.fontScale);
  const location = useLocation();

  // Tailwind sizes are rem-based, so scaling the root font scales the whole patient app
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.style.fontSize;
    root.style.fontSize = `${fontScale}%`;
    return () => {
      root.style.fontSize = previous;
    };
  }, [fontScale]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-yai-mint/60 text-yai-ink">
      <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col bg-yai-paper shadow-none sm:shadow-xl">
        <a href="#yai-main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-white focus:p-2">
          ข้ามไปเนื้อหา
        </a>
        <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-yai-ink/10 bg-yai-paper/95 px-4 py-2 backdrop-blur">
          <Link to="/yai" className="flex min-h-[44px] items-center gap-2" aria-label="ยายพร้อม หน้าแรก">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-yai-deep text-xl text-white" aria-hidden="true">
              ย
            </span>
            <span className="leading-tight">
              <span className="block text-lg font-bold text-yai-deep">ยายพร้อม</span>
              <span className="block text-xs text-yai-ink/70">โดย เวชวิวัฒน์ · ต้นแบบ</span>
            </span>
          </Link>
          <div className="flex items-center gap-1">
            <DemoBadge />
            <Link to="/yai/settings" className="flex h-11 w-11 items-center justify-center rounded-xl text-yai-deep hover:bg-yai-mint" aria-label="ตั้งค่า">
              <Settings className="h-6 w-6" />
            </Link>
          </div>
        </header>

        <main id="yai-main" className="flex-1 px-4 pb-32 pt-4">
          <Outlet />
        </main>

        <nav
          aria-label="เมนูหลัก"
          className="fixed bottom-0 left-1/2 z-30 w-full max-w-xl -translate-x-1/2 border-t border-yai-ink/10 bg-white/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur"
        >
          <ul className="grid grid-cols-5">
            {NAV.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex min-h-[64px] flex-col items-center justify-center gap-0.5 rounded-xl text-xs font-semibold sm:text-sm ${
                      isActive ? 'text-yai-deep' : 'text-yai-ink/60 hover:text-yai-deep'
                    } ${item.to === '/yai/help' ? 'text-yai-alert' : ''}`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span className={`flex h-8 w-12 items-center justify-center rounded-full ${isActive ? 'bg-yai-mint' : ''}`}>
                        <item.icon className="h-6 w-6" aria-hidden="true" />
                      </span>
                      {item.label}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
};
