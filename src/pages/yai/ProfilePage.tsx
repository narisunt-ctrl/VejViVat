import React from 'react';
import { Link } from 'react-router-dom';
import { Eye, LifeBuoy, Moon, Pill, Route as RouteIcon, Settings, Sun, Users, Watch } from 'lucide-react';
import { useYai, yaiStore } from '../../services/yai/yaiStore';
import { LxCard, LxLinkRow, LxPageHeader, SourceTag } from '../../components/yai/lx/ui';
import { WELLNESS_GOALS } from '../../domain/yai/wellness';
import { PersonaSwitcher } from '../../components/yai/lx/PersonaSwitcher';
import type { AuditAction } from '../../domain/yai/models';

// Profile & Privacy: who I am, goals, text size and theme, consent management, connected devices, data sharing
// and the access history (the app's own audit log, so the user sees every read and share).

const SCOPE_TH: Record<string, string> = { PREVISIT_REPORT: 'สรุปก่อนพบแพทย์', MEDICINES: 'รายการยา', APPOINTMENTS: 'นัดหมาย', REMINDER_ALERTS: 'การเตือนและข้อความ' };

const ACTION_TH: Partial<Record<AuditAction, string>> = {
  CONSENT_GRANTED: 'ให้ความยินยอมแบ่งปันข้อมูล',
  CONSENT_REVOKED: 'ยกเลิกความยินยอม',
  PREVISIT_READ: 'ผู้เชี่ยวชาญเปิดอ่านสรุปก่อนพบแพทย์',
  PREVISIT_READ_DENIED: 'มีการขออ่านข้อมูลแต่ไม่มีสิทธิ์ (ถูกปฏิเสธ)',
  DOSE_REPORTS_READ: 'คลินิกเปิดอ่านการรายงานกินยา',
  DOSE_REPORTS_READ_DENIED: 'มีการขออ่านการกินยาแต่ไม่มีสิทธิ์ (ถูกปฏิเสธ)',
  ORDER_SYNCED: 'รับแผนยาที่แพทย์ยืนยันจาก CareBridge',
  ORDER_SYNC_REJECTED: 'ไม่รับแผนยาที่ไม่ผ่านเงื่อนไข',
  DEVICE_LINKED: 'เชื่อมอุปกรณ์',
  JOURNAL_SAVED: 'บันทึกสมุดสุขภาพ',
  CHECKIN_SAVED: 'เช็กอินรายวัน',
  MEDICINE_SAVED: 'บันทึกยา',
  APPOINTMENT_REQUESTED: 'ขอนัดหมาย',
};
const READ_ACTIONS: AuditAction[] = ['PREVISIT_READ', 'PREVISIT_READ_DENIED', 'DOSE_REPORTS_READ', 'DOSE_REPORTS_READ_DENIED', 'CONSENT_GRANTED', 'CONSENT_REVOKED', 'ORDER_SYNCED', 'ORDER_SYNC_REJECTED', 'DEVICE_LINKED'];
const dt = (iso: string) => new Date(iso).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export const ProfilePage: React.FC = () => {
  const state = useYai((s) => s);
  const name = state.patient.displayName.replace(/\s*\(.*\)\s*$/, '');
  const home = state.settings.home;
  const theme = state.settings.theme ?? 'dark';
  const link = state.settings.deviceLink ?? 'NONE';
  const goals = WELLNESS_GOALS.filter((g) => (state.settings.goals ?? WELLNESS_GOALS.map((x) => x.id)).includes(g.id));
  const now = Date.now();
  const consents = state.consents;
  const access = state.audit.filter((a) => READ_ACTIONS.includes(a.action)).slice(0, 12);
  const researchShared = (state.herbReviews ?? []).filter((r) => r.isSelf && r.consentResearch).length;

  return (
    <div className="space-y-4">
      <LxPageHeader eyebrow="Profile & Privacy" title="โปรไฟล์และความเป็นส่วนตัว" />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4">
          <PersonaSwitcher />
          <LxCard>
            <div className="flex items-center gap-4">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-lx-lime text-2xl font-semibold text-lx-forest" aria-hidden="true">
                {state.settings.persona === 'PROFESSIONAL' ? '🧑' : '👵'}
              </span>
              <div className="min-w-0">
                <p className="truncate text-xl font-semibold">{name}</p>
                <p className="text-sm text-lx-muted">
                  อายุ {state.patient.age} ปี · {home ? `อ.${home.district}` : `จ.${state.patient.province}`}
                </p>
                <SourceTag kind="DEMO" text="ผู้ใช้ตัวอย่าง" />
              </div>
            </div>
          </LxCard>

          <LxCard labelledBy="display-title">
            <h2 id="display-title" className="text-lg font-semibold">
              การแสดงผล
            </h2>
            <p className="mt-3 text-sm font-semibold text-lx-muted">ขนาดตัวอักษร</p>
            <div className="mt-1 grid grid-cols-3 gap-2" role="group" aria-label="ขนาดตัวอักษร">
              {([100, 125, 150] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  aria-pressed={state.settings.fontScale === f}
                  onClick={() => yaiStore.updateSettings({ fontScale: f })}
                  className={`min-h-[52px] rounded-2xl border font-semibold ${state.settings.fontScale === f ? 'border-lx-accent bg-lx-accent text-lx-onaccent' : 'border-lx-line bg-lx-surface2'}`}
                  style={{ fontSize: `${f / 100}rem` }}
                >
                  ก
                </button>
              ))}
            </div>
            <p className="mt-4 text-sm font-semibold text-lx-muted">ธีม</p>
            <div className="mt-1 grid grid-cols-2 gap-2" role="group" aria-label="ธีม">
              {(
                [
                  ['dark', 'มืด', Moon],
                  ['light', 'สว่าง', Sun],
                ] as const
              ).map(([t, label, Icon]) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={theme === t}
                  onClick={() => yaiStore.updateSettings({ theme: t })}
                  className={`inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border text-base font-semibold ${theme === t ? 'border-lx-accent bg-lx-accent text-lx-onaccent' : 'border-lx-line bg-lx-surface2'}`}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" /> {label}
                </button>
              ))}
            </div>
          </LxCard>

          <LxCard labelledBy="goals-title">
            <h2 id="goals-title" className="text-lg font-semibold">
              เป้าหมายสุขภาพ
            </h2>
            <ul className="mt-2 flex flex-wrap gap-2">
              {goals.map((g) => (
                <li key={g.id} className="rounded-full bg-lx-surface2 px-3 py-1 text-sm">
                  {g.title}
                </li>
              ))}
              {goals.length === 0 && <li className="text-sm text-lx-muted">ยังไม่ได้เลือก</li>}
            </ul>
            <Link to="/yai/journey" className="mt-3 inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-lx-link">
              <RouteIcon className="h-4 w-4" aria-hidden="true" /> แก้ไขเป้าหมาย
            </Link>
          </LxCard>
        </div>

        <div className="space-y-4">
          <LxCard labelledBy="consent-title">
            <h2 id="consent-title" className="text-lg font-semibold">
              การยินยอมแบ่งปันข้อมูล
            </h2>
            {consents.length === 0 ? (
              <p className="mt-2 text-base text-lx-muted">ยังไม่ได้แบ่งปันข้อมูลกับใคร ข้อมูลอยู่ในเครื่องนี้เท่านั้น</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {consents.map((c) => {
                  const active = !c.revokedAt && (!c.expiresAt || Date.parse(c.expiresAt) > now);
                  return (
                    <li key={c.id} className="rounded-2xl bg-lx-surface2 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold">{c.recipientName}</p>
                          <p className="text-sm text-lx-muted">{c.scope.map((x) => SCOPE_TH[x] ?? x).join(', ')}</p>
                          <p className="text-xs text-lx-muted">
                            {c.revokedAt ? `ยกเลิกแล้ว ${dt(c.revokedAt)}` : c.expiresAt ? `${active ? 'หมดอายุ' : 'หมดอายุแล้ว'} ${dt(c.expiresAt)}` : ''}
                          </p>
                        </div>
                        {active && (
                          <button type="button" onClick={() => yaiStore.revokeConsent(c.id)} className="min-h-[44px] shrink-0 rounded-xl border border-lx-line px-3 text-sm font-semibold text-lx-alert">
                            ยกเลิก
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="mt-3 space-y-2">
              <LxLinkRow to="/yai/family" icon={Users} title="ผู้ดูแลและครอบครัว" sub="เพิ่มหรือยกเลิกผู้ที่เห็นข้อมูล" />
            </div>
          </LxCard>

          <LxCard labelledBy="sharing-title">
            <h2 id="sharing-title" className="text-lg font-semibold">
              การแบ่งปันอื่นๆ
            </h2>
            <label className="mt-3 flex min-h-[52px] items-center justify-between gap-3 rounded-2xl bg-lx-surface2 px-3">
              <span className="text-base">ให้เพื่อนเห็นแต้มรายสัปดาห์ (ไม่ใช่ข้อมูลสุขภาพ)</span>
              <input type="checkbox" className="h-6 w-6 accent-[rgb(var(--lx-accent))]" checked={state.settings.shareScore ?? true} onChange={(e) => yaiStore.updateSettings({ shareScore: e.target.checked })} />
            </label>
            <p className="mt-2 text-sm text-lx-muted">รีวิวสมุนไพรที่คุณยินยอมให้ใช้วิจัยแบบไม่ระบุตัวตน: {researchShared} รายการ</p>
          </LxCard>

          <LxCard labelledBy="device-title">
            <h2 id="device-title" className="text-lg font-semibold">
              อุปกรณ์สุขภาพที่เชื่อมต่อ
            </h2>
            <div className="mt-3">
              <LxLinkRow
                to="/yai/health"
                icon={Watch}
                title={link === 'NONE' ? 'ยังไม่เชื่อมอุปกรณ์' : link === 'WATCH_DEMO' ? 'สมาร์ทวอทช์ (จำลอง)' : 'โทรศัพท์ (จำลอง)'}
                sub="ของจริงต้องใช้แอปมือถือที่เชื่อม Health Connect / Apple Health"
              />
            </div>
          </LxCard>
        </div>

        <div className="space-y-4">
          <LxCard labelledBy="access-title">
            <h2 id="access-title" className="flex items-center gap-2 text-lg font-semibold">
              <Eye className="h-5 w-5 text-lx-accent" aria-hidden="true" /> ประวัติการเข้าถึงข้อมูล
            </h2>
            {access.length === 0 ? (
              <p className="mt-2 text-base text-lx-muted">ยังไม่มีใครเข้าถึงหรือขอข้อมูลของคุณ</p>
            ) : (
              <ol className="mt-3 space-y-2">
                {access.map((a) => (
                  <li key={a.id} className="border-l-2 border-lx-accent/50 pl-3">
                    <p className="text-sm font-semibold">{ACTION_TH[a.action] ?? a.action}</p>
                    <p className="text-xs text-lx-muted">
                      {dt(a.at)} · {a.actor}
                    </p>
                  </li>
                ))}
              </ol>
            )}
            <p className="mt-3 text-xs text-lx-muted">บันทึกทุกครั้งที่มีการขออ่าน แบ่งปัน หรือยกเลิก (ข้อมูลจำลองในเครื่องนี้)</p>
          </LxCard>

          <div className="space-y-2">
            <LxLinkRow to="/yai/care" icon={Pill} title="ยาและการดูแล" sub="สมุดยา สแกนฉลาก เตือนกินยา" />
            <LxLinkRow to="/yai/settings" icon={Settings} title="ตั้งค่าเพิ่มเติม" sub="ข้อมูลจำลอง เสียงนำทาง OCR" />
            <LxLinkRow to="/yai/help" icon={LifeBuoy} title="ช่วยเหลือและฉุกเฉิน" sub="โทร 1669" />
          </div>
          <button type="button" onClick={() => yaiStore.clearDemoWellness()} className="min-h-[48px] w-full rounded-2xl border border-dashed border-lx-line text-sm font-semibold text-lx-muted hover:text-lx-ink">
            ลบข้อมูลสุขภาพตัวอย่าง (เพื่อดูหน้าจอเมื่อยังไม่มีข้อมูล)
          </button>
        </div>
      </div>
    </div>
  );
};
