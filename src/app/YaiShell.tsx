import React, { useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Home, ClipboardPlus, MessagesSquare, UserRound, Settings } from 'lucide-react';
import { useYai } from '../services/yai/yaiStore';
import { DemoBadge } from '../components/yai/ui';
import yaiLogo from '../assets/yai/yai-logo.webp';

const NAV = [
  { to: '/yai', label: 'หน้าหลัก', icon: Home, end: true },
  { to: '/yai/health', label: 'บันทึกสุขภาพ', icon: ClipboardPlus },
  { to: '/yai/ask', label: 'ถามคุณหมอ', icon: MessagesSquare },
  { to: '/yai/profile', label: 'โปรไฟล์', icon: UserRound },
];

/** Patient app chrome: no clinician sidebar or case state, larger type, bottom navigation. */
export const YaiShell: React.FC = () => {
  const fontScale = useYai((s) => s.settings.fontScale);
  const location = useLocation();
  // home has its own brand bar from the mockup
  const isHome = location.pathname === '/yai' || location.pathname === '/yai/';

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
    <div className="min-h-screen bg-yai-sky text-yai-ink">
      <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col bg-yai-paper shadow-none sm:shadow-xl">
        <a href="#yai-main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-white focus:p-2">
          ข้ามไปเนื้อหา
        </a>
        {!isHome && (
          <header className="sticky top-0 z-30 flex items-center justify-between gap-2 bg-yai-green px-4 py-2 text-white">
            <Link to="/yai" className="flex min-h-[44px] items-center gap-2" aria-label="ยายพร้อม หน้าแรก">
              <img src={yaiLogo} alt="" className="h-10 w-10 rounded-2xl bg-white object-cover object-top" />
              <span className="leading-tight">
                <span className="block text-lg font-bold text-white">ยายพร้อม</span>
                <span className="block text-xs text-white/80">โดย เวชวิวัฒน์ · ต้นแบบ</span>
              </span>
            </Link>
            <div className="flex items-center gap-1">
              <DemoBadge />
              <Link to="/yai/settings" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25" aria-label="ตั้งค่า">
                <Settings className="h-6 w-6" />
              </Link>
            </div>
          </header>
        )}

        <main id="yai-main" className="flex-1 px-4 pb-32 pt-4">
          <Outlet />
        </main>

        <nav
          aria-label="เมนูหลัก"
          className="fixed bottom-0 left-1/2 z-30 w-full max-w-xl -translate-x-1/2 rounded-t-3xl border-t border-yai-ink/10 bg-white px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(0,0,0,0.08)]"
        >
          <ul className="grid grid-cols-4">
            {NAV.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex min-h-[64px] flex-col items-center justify-center gap-0.5 rounded-xl text-xs font-semibold sm:text-sm ${
                      isActive ? 'text-yai-green' : 'text-yai-ink/60 hover:text-yai-ink'
                    }`
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
