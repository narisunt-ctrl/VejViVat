import React from 'react';
import { BellRing, FileCheck2, HelpCircle, History, Pill, ScanLine, ShieldCheck } from 'lucide-react';
import { demoNow, useYai, yaiStore } from '../../services/yai/yaiStore';
import { LxCard, LxLinkRow, LxNotice, LxPageHeader, SourceTag } from '../../components/yai/lx/ui';
import { todaysOccurrences } from '../../services/yai/reminderSchedule';
import { addDays } from '../../domain/yai/wellness';
import { bangkokDate } from '../../domain/yai/journal';
import { useClinicianOrderSync } from '../../services/yai/useOrderSync';

// Medicine & Care hub. All existing features stay where they were (OCR, unlabelled medicines, Evidence Passport,
// verified CareBridge orders, reminders, self-reported dose history); this page only gathers them.
// OCR results stay "รอตรวจสอบ" until confirmed, and an unknown medicine is never guessed.

export const CarePage: React.FC = () => {
  const state = useYai((s) => s);
  useClinicianOrderSync();
  const now = demoNow(state);
  const today = bangkokDate(now);
  const occ = todaysOccurrences(state, now);
  const pending = state.medicines.filter((m) => m.status !== 'PATIENT_CONFIRMED' && m.status !== 'CLINICIAN_VERIFIED');
  const unknown = state.medicines.filter((m) => m.pendingIdentification);
  const orders = state.syncedOrders ?? [];
  const since = addDays(today, -6);
  const week = state.doseLogs.filter((l) => bangkokDate(l.scheduledAt) >= since);
  const counts = {
    taken: week.filter((l) => l.response === 'TAKEN_REPORTED').length,
    notYet: week.filter((l) => l.response === 'NOT_YET_REPORTED').length,
    unsure: week.filter((l) => l.response === 'UNCERTAIN').length,
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <LxPageHeader back="/yai" eyebrow="Medicine & Care" title="ยาและการดูแล" subtitle="สมุดยา สแกนฉลาก แผนยาจากผู้เชี่ยวชาญ และการเตือน" />

      <div className="grid gap-4 md:grid-cols-2">
        <LxCard labelledBy="today-title">
          <h2 id="today-title" className="text-lg font-semibold">
            เตือนกินยาวันนี้
          </h2>
          {occ.length === 0 ? (
            <p className="mt-2 text-base text-lx-muted">วันนี้ไม่มีการเตือน</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {occ.map((o) => {
                const med = state.medicines.find((m) => m.id === o.plan.medicineId);
                const log = state.doseLogs.find((l) => l.id === `${o.plan.id}@${o.key}`);
                return (
                  <li key={o.plan.id + o.key} className="flex items-center justify-between gap-2 rounded-2xl bg-lx-surface2 p-3">
                    <span className="min-w-0">
                      <span className="block truncate text-base font-semibold">{med?.displayName.value ?? 'ยาที่ยังไม่ทราบชื่อ'}</span>
                      <span className="text-sm text-lx-muted">
                        {o.time} น. · {o.plan.source === 'CLINICIAN_ORDER' ? 'ตามแผนที่แพทย์ยืนยัน' : 'เวลาที่คุณตั้งเอง'}
                      </span>
                    </span>
                    {log?.response === 'TAKEN_REPORTED' ? (
                      <SourceTag kind="SELF" text="กินแล้ว (รายงานเอง)" />
                    ) : o.isPast ? (
                      <button type="button" onClick={() => yaiStore.reportDose(o.plan.id, o.key, 'TAKEN_REPORTED')} className="min-h-[44px] shrink-0 rounded-xl bg-lx-accent px-3 text-sm font-semibold text-lx-onaccent">
                        กินแล้ว
                      </button>
                    ) : (
                      <span className="shrink-0 text-sm text-lx-muted">รอเวลา</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </LxCard>

        <LxCard labelledBy="dose-title">
          <h2 id="dose-title" className="text-lg font-semibold">
            การกินยาที่รายงาน 7 วัน
          </h2>
          {week.length === 0 ? (
            <p className="mt-2 text-base text-lx-muted">ยังไม่มีการรายงาน</p>
          ) : (
            <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
              {[
                ['กินแล้ว', counts.taken],
                ['ยังไม่ได้กิน', counts.notYet],
                ['ไม่แน่ใจ', counts.unsure],
              ].map(([label, n]) => (
                <div key={label as string} className="rounded-2xl bg-lx-surface2 p-3">
                  <dd className="num text-2xl font-semibold">{n}</dd>
                  <dt className="text-xs text-lx-muted">{label}</dt>
                </div>
              ))}
            </dl>
          )}
          <p className="mt-2 text-xs text-lx-muted">เป็นสิ่งที่คุณรายงานเอง ไม่ใช่การยืนยันว่ากินยาจริง</p>
        </LxCard>
      </div>

      {(pending.length > 0 || unknown.length > 0) && (
        <LxNotice tone="warn" title={`ยารอตรวจสอบ ${pending.length} รายการ`}>
          ผลจากการสแกนฉลากหรือยาที่ไม่มีฉลากจะยังไม่ถูกใช้ตั้งเตือนตามคำสั่งแพทย์ จนกว่าคุณหรือผู้เชี่ยวชาญยืนยัน{unknown.length ? ` · ยังไม่ทราบชนิด ${unknown.length} รายการ (ระบบไม่เดา)` : ''}
        </LxNotice>
      )}

      <div className="grid gap-2 md:grid-cols-2">
        <LxLinkRow to="/yai/scan" icon={ScanLine} title="ถ่ายภาพฉลากยา (OCR)" sub="อ่านฉลาก แล้วให้คุณตรวจก่อนบันทึก" />
        <LxLinkRow to="/yai/medicines" icon={HelpCircle} title="ยาที่ไม่มีฉลาก" sub="ถ่ายรูปเม็ดยาและบอกเท่าที่รู้ ให้ผู้เชี่ยวชาญช่วยดู" />
        <LxLinkRow to="/yai/medicines" icon={Pill} title="สมุดยาของฉัน" sub={`${state.medicines.length} รายการ`} badge={pending.length ? <SourceTag kind="PENDING" text={`รอตรวจ ${pending.length}`} /> : undefined} />
        <LxLinkRow to="/yai/passport" icon={ShieldCheck} title="Evidence Passport" sub="ที่มาของข้อมูลยาและสมุนไพรแต่ละรายการ" />
        <LxLinkRow
          to="/yai/reminders"
          icon={FileCheck2}
          title="แผนยาที่ผู้เชี่ยวชาญยืนยัน"
          sub={orders.length ? `จาก CareBridge ${orders.length} รายการ` : 'ยังไม่มีแผนจาก CareBridge'}
          badge={orders.length ? <SourceTag kind="VERIFIED" text="ยืนยันแล้ว" /> : undefined}
        />
        <LxLinkRow to="/yai/reminders" icon={BellRing} title="ตั้งเตือนกินยา" sub="ตั้งเองได้เฉพาะยาที่คุณยืนยันแล้ว" />
        <LxLinkRow to="/yai/journal/history" icon={History} title="ประวัติที่บันทึก" sub="รวมการใช้ยาและอาการที่เล่าไว้" />
      </div>
    </div>
  );
};
