import React from 'react';
import { Link } from 'react-router-dom';
import { EvidenceOrigin, MedicationStatus, Verification } from '../../domain/yai/models';

// Shared building blocks for the elderly-first patient app: large targets, plain Thai, text labels on every status.

export const DemoBadge: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span className={`inline-flex items-center rounded-full border border-yai-warn/40 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-yai-warn ${className}`}>
    ข้อมูลจำลอง
  </span>
);

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <section className={`rounded-3xl border border-yai-ink/10 bg-white p-4 shadow-sm ${className}`}>{children}</section>
);

export const PageTitle: React.FC<{ title: string; subtitle?: string; back?: string }> = ({ title, subtitle, back }) => (
  <header className="mb-4">
    {back && (
      <Link to={back} className="mb-2 inline-flex min-h-[44px] items-center text-base font-semibold text-yai-deep underline-offset-4 hover:underline">
        ← กลับ
      </Link>
    )}
    <h1 className="text-2xl font-bold leading-snug text-yai-ink">{title}</h1>
    {subtitle && <p className="mt-1 text-base text-yai-ink/75">{subtitle}</p>}
  </header>
);

type BtnVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
const VARIANTS: Record<BtnVariant, string> = {
  primary: 'bg-yai-deep text-white hover:bg-yai-ink focus-visible:ring-yai-teal',
  secondary: 'bg-yai-mint text-yai-ink border border-yai-deep/20 hover:bg-white focus-visible:ring-yai-teal',
  danger: 'bg-yai-alert text-white hover:bg-red-800 focus-visible:ring-red-400',
  ghost: 'bg-transparent text-yai-deep hover:bg-yai-mint focus-visible:ring-yai-teal',
};

export const BigButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; icon?: React.ReactNode; size?: 'lg' | 'md' }
> = ({ variant = 'primary', icon, size = 'md', className = '', children, ...rest }) => (
  <button
    {...rest}
    className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 font-bold transition focus-visible:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-50 ${
      size === 'lg' ? 'min-h-[64px] text-xl' : 'min-h-[52px] text-lg'
    } ${VARIANTS[variant]} ${className}`}
  >
    {icon}
    {children}
  </button>
);

export const BigLink: React.FC<{ to: string; variant?: BtnVariant; icon?: React.ReactNode; size?: 'lg' | 'md'; children: React.ReactNode; className?: string }> = ({
  to,
  variant = 'primary',
  icon,
  size = 'md',
  children,
  className = '',
}) => (
  <Link
    to={to}
    className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 text-center font-bold transition focus-visible:outline-none focus-visible:ring-4 ${
      size === 'lg' ? 'min-h-[64px] text-xl' : 'min-h-[52px] text-lg'
    } ${VARIANTS[variant]} ${className}`}
  >
    {icon}
    {children}
  </Link>
);

const ORIGIN_LABEL: Record<EvidenceOrigin, string> = {
  PHOTO_LABEL: 'พบจากฉลาก',
  PATIENT_VOICE: 'คุณยายบอก',
  CAREGIVER_VOICE: 'หลานบอก',
  CLINICIAN: 'บุคลากรบันทึก',
  MANUAL_ENTRY: 'พิมพ์เอง',
};
export const originLabel = (o: EvidenceOrigin) => ORIGIN_LABEL[o];

export const SourceChip: React.FC<{ origin: EvidenceOrigin; synthetic?: boolean; confidence?: number; verification?: Verification }> = ({
  origin,
  synthetic,
  confidence,
  verification,
}) => (
  <span className="inline-flex flex-wrap items-center gap-1 text-xs">
    <span className="rounded-full bg-yai-mint px-2 py-0.5 font-semibold text-yai-deep">{ORIGIN_LABEL[origin]}</span>
    {synthetic && <span className="rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-yai-warn">อ่านจากตัวอย่าง ไม่ใช่จากรูปจริง</span>}
    {typeof confidence === 'number' && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">ความมั่นใจของ OCR {Math.round(confidence * 100)}%</span>}
    {verification === 'DEMO_REVIEW' && <span className="rounded-full bg-violet-50 px-2 py-0.5 font-semibold text-violet-800">ทบทวนจำลอง</span>}
  </span>
);

const STATUS: Record<MedicationStatus, { label: string; cls: string }> = {
  DRAFT: { label: 'ร่าง ยังไม่ยืนยัน', cls: 'bg-slate-100 text-slate-800 border-slate-300' },
  INSUFFICIENT_INFORMATION: { label: 'ข้อมูลยังไม่ครบ', cls: 'bg-amber-50 text-yai-warn border-yai-warn/40' },
  PATIENT_CONFIRMED: { label: 'คุณยายยืนยันว่าใช้อยู่', cls: 'bg-yai-mint text-yai-deep border-yai-deep/30' },
  REQUIRES_CLINICIAN_REVIEW: { label: 'รอเภสัชกรตรวจสอบ', cls: 'bg-amber-50 text-yai-warn border-yai-warn/40' },
  CLINICIAN_VERIFIED: { label: 'ทบทวนแล้ว (จำลอง)', cls: 'bg-violet-50 text-violet-800 border-violet-300' },
};
export const MedStatusChip: React.FC<{ status: MedicationStatus }> = ({ status }) => (
  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-sm font-semibold ${STATUS[status].cls}`}>{STATUS[status].label}</span>
);

export const Notice: React.FC<{ tone?: 'info' | 'warn' | 'alert'; title: string; children?: React.ReactNode }> = ({ tone = 'info', title, children }) => {
  const cls =
    tone === 'alert'
      ? 'border-yai-alert/40 bg-red-50 text-red-900'
      : tone === 'warn'
      ? 'border-yai-warn/40 bg-amber-50 text-amber-950'
      : 'border-yai-deep/20 bg-yai-mint text-yai-ink';
  return (
    <div role={tone === 'alert' ? 'alert' : 'status'} className={`rounded-2xl border p-4 ${cls}`}>
      <p className="text-base font-bold">{title}</p>
      {children && <div className="mt-1 text-base leading-relaxed">{children}</div>}
    </div>
  );
};

/** Read text aloud when the browser supports Thai speech synthesis; otherwise the button explains why it can't. */
export const SpeakButton: React.FC<{ text: string }> = ({ text }) => {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const [msg, setMsg] = React.useState('');
  return (
    <span className="inline-flex flex-col">
      <button
        type="button"
        onClick={() => {
          if (!supported) {
            setMsg('เครื่องนี้อ่านออกเสียงไม่ได้');
            return;
          }
          window.speechSynthesis.cancel();
          const u = new SpeechSynthesisUtterance(text);
          u.lang = 'th-TH';
          u.rate = 0.9;
          window.speechSynthesis.speak(u);
        }}
        className="inline-flex min-h-[44px] items-center gap-1 rounded-xl px-3 text-base font-semibold text-yai-deep hover:bg-yai-mint"
        aria-label="อ่านออกเสียง"
      >
        🔊 ฟังเสียง
      </button>
      {msg && <span className="text-sm text-yai-warn">{msg}</span>}
    </span>
  );
};

export const Field: React.FC<{ label: string; children: React.ReactNode; hint?: string }> = ({ label, children, hint }) => (
  <label className="block">
    <span className="mb-1 block text-base font-semibold text-yai-ink">{label}</span>
    {children}
    {hint && <span className="mt-1 block text-sm text-yai-ink/70">{hint}</span>}
  </label>
);

export const inputCls =
  'w-full min-h-[52px] rounded-2xl border border-yai-ink/20 bg-white px-4 text-lg text-yai-ink placeholder:text-yai-ink/40 focus:border-yai-teal focus:outline-none focus:ring-4 focus:ring-yai-teal/20';

export function formatThaiDateTime(iso: string) {
  return new Date(iso).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Bangkok' });
}
