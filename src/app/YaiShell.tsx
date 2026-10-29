import React, { useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Home, LineChart, Leaf, Route as RouteIcon, UserRound, Settings } from 'lucide-react';
import { useYai } from '../services/yai/yaiStore';
import { DemoBadge } from '../components/yai/ui';
import yaiLogo from '../assets/yai/yai-logo.webp';

const NAV = [
  { to: '/yai', label: 'หน้าหลัก', en: 'Home', icon: Home, end: true },
  { to: '/yai/insights', label: 'แนวโน้ม', en: 'Insights', icon: LineChart },
  { to: '/yai/discover', label: 'สมุนไพรไทย', en: 'Discover', icon: Leaf },
  { to: '/yai/journey', label: 'เส้นทางของฉัน', en: 'My Journey', icon: RouteIcon },
  { to: '/yai/profile', label: 'โปรไฟล์', en: 'Profile', icon: UserRound },
];

// Screens built on the Premium Longevity design system (dark or light by the user's choice). Every other screen
// (medicines, OCR, reminders, journal, clinics...) keeps its existing light layout, so the shell switches to the
// light theme there instead of restyling clinical screens.
const LX_PREFIXES = ['/yai/insights', '/yai/discover', '/yai/journey', '/yai/profile', '/yai/checkin', '/yai/consult', '/yai/care', '/yai/steps', '/yai/privacy', '/yai/food', '/yai/herb-sharing'];
const isLxPath = (p: string) => p === '/yai' || p === '/yai/' || LX_PREFIXES.some((x) => p === x || p.startsWith(`${x}/`));

/** Patient app chrome: no clinician sidebar or case state, larger type, bottom navigation (side rail on desktop). */
export const YaiShell: React.FC = () => {
  const fontScale = useYai((s) => s.settings.fontScale);
  const userTheme = useYai((s) => s.settings.theme ?? 'dark');
  const persona = useYai((s) => s.settings.persona ?? 'RETIREE');
  const location = useLocation();
  const lx = isLxPath(location.pathname);
  const theme = lx ? userTheme : 'light';

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
    <div className="lx min-h-screen bg-lx-bg text-lx-ink" data-theme={theme}>
      <a href="#yai-main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-white focus:p-2 focus:text-black">
        ข้ามไปเนื้อหา
      </a>

      {/* desktop side rail */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-lx-line bg-lx-surface px-4 py-6 lg:flex">
        <Link to="/yai" className="mb-8 flex items-center gap-3 px-2" aria-label="ยายพร้อม หน้าหลัก">
          <img src={yaiLogo} alt="" className="h-11 w-11 rounded-2xl object-cover object-top" />
          <span className="leading-tight">
            <span className="block text-lg font-semibold">ยายพร้อม</span>
            <span className="block text-xs text-lx-muted">YaiPrompt · Live Better, Longer</span>
          </span>
        </Link>
        <nav aria-label="เมนูหลัก" className="space-y-1">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex min-h-[52px] items-center gap-3 rounded-2xl px-3 text-base font-semibold transition ${isActive ? 'bg-lx-accent/15 text-lx-accent' : 'text-lx-muted hover:bg-lx-surface2 hover:text-lx-ink'}`
              }
            >
              <item.icon className="h-5 w-5" aria-hidden="true" />
              <span>
                {item.label}
                <span className="block text-xs font-normal opacity-70">{item.en}</span>
              </span>
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto space-y-2 px-2 text-xs text-lx-muted">
          <Link to="/yai/profile" className="flex min-h-[44px] items-center gap-2 rounded-xl border border-lx-line px-3 text-sm font-semibold text-lx-ink hover:border-lx-accent/60">
            <span aria-hidden="true">{persona === 'PROFESSIONAL' ? '🧑' : '👵'}</span> สลับผู้ใช้ตัวอย่าง
          </Link>
          <DemoBadge />
          <p>ต้นแบบ ข้อมูลจำลอง ไม่ใช่การวินิจฉัยหรือสั่งยา</p>
        </div>
      </aside>

      <div className="lg:pl-64">
        {!lx && (
          <header className="sticky top-0 z-20 border-b border-lx-line bg-lx-surface/95 backdrop-blur">
            <div className="mx-auto flex max-w-xl items-center justify-between gap-2 px-4 py-2">
              <Link to="/yai" className="flex min-h-[44px] items-center gap-2 lg:hidden" aria-label="ยายพร้อม หน้าหลัก">
                <img src={yaiLogo} alt="" className="h-9 w-9 rounded-xl object-cover object-top" />
                <span className="text-base font-semibold">ยายพร้อม</span>
              </Link>
              <span className="hidden text-sm font-semibold text-lx-muted lg:block">ยา การดูแล และบันทึก</span>
              <div className="flex items-center gap-1">
                <DemoBadge />
                <Link to="/yai/settings" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-lx-surface2" aria-label="ตั้งค่า">
                  <Settings className="h-5 w-5" />
                </Link>
              </div>
            </div>
          </header>
        )}

        <main id="yai-main" className={`mx-auto w-full px-4 pb-32 pt-4 sm:px-6 lg:pb-12 lg:pt-8 ${lx ? 'max-w-xl md:max-w-3xl lg:max-w-6xl' : 'max-w-xl'}`}>
          <Outlet />
        </main>
      </div>

      {/* mobile / tablet bottom navigation */}
      <nav aria-label="เมนูหลัก" className="fixed bottom-0 left-0 right-0 z-30 border-t border-lx-line bg-lx-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <ul className="mx-auto grid max-w-3xl grid-cols-5">
          {NAV.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex min-h-[64px] flex-col items-center justify-center gap-1 px-0.5 text-center text-[11px] font-semibold leading-tight sm:text-xs ${isActive ? 'text-lx-accent' : 'text-lx-muted hover:text-lx-ink'}`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={`flex h-8 w-14 items-center justify-center rounded-full ${isActive ? 'bg-lx-accent/15' : ''}`}>
                      <item.icon className="h-5 w-5" aria-hidden="true" />
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
  );
};
