import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Building blocks for the YaiPrompt Premium Longevity design system. Colours come only from lx-* tokens so each
// component works in dark and light themes. Touch targets are >= 48px for retirees.

export const LxCard: React.FC<{ children: React.ReactNode; className?: string; as?: 'section' | 'div' | 'article'; labelledBy?: string }> = ({
  children,
  className = '',
  as: Tag = 'section',
  labelledBy,
}) => (
  <Tag aria-labelledby={labelledBy} className={`rounded-3xl border border-lx-line bg-lx-surface p-4 sm:p-5 ${className}`}>
    {children}
  </Tag>
);

export const LxSectionHeader: React.FC<{ id?: string; title: string; eyebrow?: string; action?: { to: string; label: string } }> = ({ id, title, eyebrow, action }) => (
  <div className="mb-3 flex items-end justify-between gap-3">
    <div className="min-w-0">
      {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.14em] text-lx-accent">{eyebrow}</p>}
      <h2 id={id} className="text-xl font-semibold leading-snug">
        {title}
      </h2>
    </div>
    {action && (
      <Link to={action.to} className="inline-flex min-h-[44px] shrink-0 items-center gap-0.5 text-sm font-semibold text-lx-link">
        {action.label} <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    )}
  </div>
);

export const LxPageHeader: React.FC<{ title: string; subtitle?: string; back?: string; eyebrow?: string; right?: React.ReactNode }> = ({ title, subtitle, back, eyebrow, right }) => (
  <header className="mb-5 space-y-2">
    {back && (
      <Link to={back} className="-ml-2 inline-flex min-h-[44px] items-center gap-1 rounded-full px-2 text-base font-semibold text-lx-link">
        <ChevronLeft className="h-5 w-5" aria-hidden="true" /> กลับ
      </Link>
    )}
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.14em] text-lx-accent">{eyebrow}</p>}
        <h1 className="text-[1.75rem] font-semibold leading-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-base text-lx-muted">{subtitle}</p>}
      </div>
      {right}
    </div>
  </header>
);

export type SourceKind = 'SELF' | 'DEVICE' | 'DEMO' | 'VERIFIED' | 'PENDING';
const SOURCE_STYLE: Record<SourceKind, string> = {
  SELF: 'bg-lx-surface2 text-lx-muted',
  DEVICE: 'bg-lx-accent/15 text-lx-link',
  DEMO: 'bg-lx-warnbg text-lx-warn',
  VERIFIED: 'bg-lx-lime/20 text-lx-ink',
  PENDING: 'bg-lx-warnbg text-lx-warn',
};
const SOURCE_TEXT: Record<SourceKind, string> = {
  SELF: 'รายงานเอง',
  DEVICE: 'จากอุปกรณ์',
  DEMO: 'ข้อมูลจำลอง',
  VERIFIED: 'ผู้เชี่ยวชาญยืนยันแล้ว',
  PENDING: 'รอตรวจสอบ',
};

/** Small provenance tag: where a number came from */
export const SourceTag: React.FC<{ kind: SourceKind; text?: string }> = ({ kind, text }) => (
  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${SOURCE_STYLE[kind]}`}>{text ?? SOURCE_TEXT[kind]}</span>
);

export const ProgressBar: React.FC<{ value: number; max: number; label: string }> = ({ value, max, label }) => (
  <div className="h-2.5 w-full overflow-hidden rounded-full bg-lx-surface2" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.min(value, max)}>
    <div className="h-full rounded-full bg-lx-accent transition-[width] motion-reduce:transition-none" style={{ width: `${Math.min(100, (value / Math.max(max, 1)) * 100)}%` }} />
  </div>
);

export const LxNotice: React.FC<{ tone?: 'info' | 'warn' | 'alert'; title: string; children?: React.ReactNode }> = ({ tone = 'info', title, children }) => {
  const cls = tone === 'alert' ? 'bg-lx-alertbg text-lx-alert' : tone === 'warn' ? 'bg-lx-warnbg text-lx-warn' : 'bg-lx-surface2 text-lx-ink';
  return (
    <div className={`rounded-2xl p-3 sm:p-4 ${cls}`} role={tone === 'alert' ? 'alert' : undefined}>
      <p className="font-semibold">{title}</p>
      {children && <div className="mt-1 text-sm leading-relaxed opacity-95">{children}</div>}
    </div>
  );
};

export const LxLinkRow: React.FC<{ to: string; icon: React.ComponentType<{ className?: string }>; title: string; sub?: string; badge?: React.ReactNode }> = ({ to, icon: Icon, title, sub, badge }) => (
  <Link to={to} className="flex min-h-[64px] items-center gap-3 rounded-2xl border border-lx-line bg-lx-surface px-4 py-3 transition hover:border-lx-accent/60">
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lx-accent/15 text-lx-accent" aria-hidden="true">
      <Icon className="h-5 w-5" />
    </span>
    <span className="min-w-0 flex-1">
      <span className="block text-base font-semibold">{title}</span>
      {sub && <span className="block text-sm text-lx-muted">{sub}</span>}
    </span>
    {badge}
    <ChevronRight className="h-5 w-5 shrink-0 text-lx-muted" aria-hidden="true" />
  </Link>
);

export const btnPrimary = 'inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-lx-accent px-5 text-lg font-semibold text-lx-onaccent transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lx-accent/40 disabled:opacity-50';
export const btnSecondary = 'inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border border-lx-line bg-lx-surface2 px-5 text-lg font-semibold text-lx-ink transition hover:border-lx-accent/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lx-accent/40 disabled:opacity-50';
