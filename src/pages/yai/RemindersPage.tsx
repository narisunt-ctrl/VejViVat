import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useYai, yaiStore, demoNow } from '../../services/yai/yaiStore';
import { todaysOccurrences, bangkokNowLabel } from '../../services/yai/reminderSchedule';
import { canCreateReminder, canRead, isValidTime } from '../../domain/yai/policies';
import { DoseSelfReport } from '../../domain/yai/models';
import { orderStatusLabels } from '../../domain/yai/prescriptionSync';
import { linkForPatient } from '../../data/yai/demoLinks';
import { useClinicianOrderSync } from '../../services/yai/useOrderSync';
import { BigButton, Card, Field, inputCls, Notice, PageTitle, formatThaiDateTime } from '../../components/yai/ui';

const TONE_CLS = { ok: 'bg-emerald-50 text-emerald-900 border-emerald-300', wait: 'bg-amber-50 text-amber-950 border-yai-warn/40', stop: 'bg-red-50 text-red-900 border-red-300' };

const RESPONSES: { value: DoseSelfReport; label: string }[] = [
  { value: 'TAKEN_REPORTED', label: 'กินแล้ว' },
  { value: 'NOT_YET_REPORTED', label: 'ยังไม่ได้กิน' },
  { value: 'UNCERTAIN', label: 'ไม่แน่ใจ' },
];
const RESPONSE_LABEL: Record<DoseSelfReport, string> = { TAKEN_REPORTED: 'บอกว่ากินแล้ว', NOT_YET_REPORTED: 'บอกว่ายังไม่ได้กิน', UNCERTAIN: 'ไม่แน่ใจ' };

export const RemindersPage: React.FC = () => {
  const state = useYai((s) => s);
  const [params] = useSearchParams();
  useClinicianOrderSync();
  const now = demoNow(state);
  const occurrences = todaysOccurrences(state, now);
  // clinician-order medicines get reminders only from the synced order, never a second patient-set schedule
  const eligible = state.medicines.filter((m) => !m.linkedOrderKey && canCreateReminder(m, 'PATIENT_CONFIRMED').ok);
  const link = linkForPatient(state.patient.id);
  const linkGrants = link ? state.consents.filter((c) => c.recipientId === link.recipientId && !c.revokedAt) : [];
  const linked = !!link && canRead(state.consents, link.recipientId, 'REMINDER_ALERTS', now);
  const orders = state.syncedOrders ?? [];
  const [showHistory, setShowHistory] = useState<string | null>(null);
  const [medId, setMedId] = useState(params.get('medicine') ?? eligible[0]?.id ?? '');
  // no pre-filled clock time: the patient picks the time she actually uses
  const [times, setTimes] = useState<string[]>(['']);
  const [confirmed, setConfirmed] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'info' | 'alert'; text: string } | null>(null);
  const [notifyState, setNotifyState] = useState<string>(() =>
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission
  );
  const medName = (id: string) => state.medicines.find((m) => m.id === id)?.displayName.value ?? 'ยา';
  const logFor = (key: string, planId: string) => state.doseLogs.find((l) => l.id === `${planId}@${key}`);

  return (
    <div className="space-y-5">
      <PageTitle title="เตือนกินยา" subtitle="เตือนเฉพาะยาที่ยืนยันแล้ว ตามเวลาที่คุณยายเลือก" />

      <Card className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-lg">
            เวลาตอนนี้ <b>{bangkokNowLabel(now).time} น.</b>
          </p>
          {state.demoClockOffsetMinutes !== 0 && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-sm font-semibold text-yai-warn">จำลองเวลา</span>}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <BigButton variant="secondary" onClick={() => yaiStore.shiftDemoClock(60)}>
            เลื่อนเวลา +1 ชม.
          </BigButton>
          <BigButton variant="ghost" onClick={() => yaiStore.shiftDemoClock(0)}>
            เวลาจริง
          </BigButton>
        </div>
        <p className="text-sm text-yai-ink/70">ปุ่มเลื่อนเวลาใช้สำหรับการสาธิตเท่านั้น</p>
      </Card>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">วันนี้</h2>
        {occurrences.length === 0 && <p className="text-lg text-yai-ink/70">ยังไม่มีการเตือนที่ตั้งไว้</p>}
        {occurrences.map((o) => {
          const log = logFor(o.key, o.plan.id);
          return (
            <Card key={o.key + o.plan.id} className={o.isPast && !log ? 'border-yai-teal' : ''}>
              <p className="text-2xl font-bold">{o.time} น.</p>
              <p className="text-lg">{medName(o.plan.medicineId)}</p>
              <p className="text-sm text-yai-ink/70">
                ตั้งตาม:{' '}
                {o.plan.source === 'CLINICIAN_ORDER'
                  ? `คำสั่งที่ผู้สั่งใช้ยารับรอง (ข้อมูลจำลอง) ฉบับที่ ${o.plan.orderRef?.sourceVersion ?? '-'}`
                  : 'เวลาที่คุณยายตั้งเอง (ไม่ใช่คำสั่งแพทย์)'}{' '}
                · ยืนยันเวลาเมื่อ {formatThaiDateTime(o.plan.verifiedAt)}
              </p>
              {o.isPast ? (
                <>
                  <p className="mt-3 text-lg font-semibold">ยายรับประทานยาแล้วหรือยัง?</p>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {RESPONSES.map((r) => (
                      <button
                        key={r.value}
                        type="button"
                        aria-pressed={log?.response === r.value}
                        onClick={() => yaiStore.reportDose(o.plan.id, o.key, r.value)}
                        className={`min-h-[56px] rounded-2xl border-2 text-base font-bold ${log?.response === r.value ? 'border-yai-deep bg-yai-mint' : 'border-yai-ink/15 bg-white'}`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                  {log && <p className="mt-2 text-sm text-yai-ink/70">บันทึกว่า "{RESPONSE_LABEL[log.response]}" แล้ว (เป็นสิ่งที่บอกเอง ไม่ใช่การยืนยันว่ากลืนยาจริง)</p>}
                  {log?.response === 'NOT_YET_REPORTED' && <Notice tone="warn" title="ถ้าลืมกิน อย่ากินเพิ่มเป็นสองเท่า ถามเภสัชกรหรือคุณหมอก่อนนะคะ" />}
                </>
              ) : (
                <p className="mt-2 text-base text-yai-deep">จะเตือนเมื่อถึงเวลา</p>
              )}
            </Card>
          );
        })}
      </section>

      <Card className="space-y-3">
        <h2 className="text-xl font-bold">ยาตามคำสั่งแพทย์</h2>
        <p className="text-sm font-semibold text-yai-warn">เชื่อมข้อมูลจำลองภายในแอป ไม่ได้เชื่อมกับระบบโรงพยาบาลจริง และไม่มีแจ้งเตือนเบื้องหลัง</p>
        {!link ? (
          <p className="text-base">ผู้ป่วยนี้ยังไม่ได้เชื่อมกับคลินิกใด</p>
        ) : linked ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-yai-mint p-3">
            <span className="text-base">
              รับคำสั่งยาจาก <b>{link.recipientName}</b> และแชร์รายงานการกินยาให้คลินิกนี้
            </span>
            <button type="button" className="min-h-[44px] text-base font-bold text-yai-alert underline" onClick={() => linkGrants.forEach((c) => yaiStore.revokeConsent(c.id))}>
              ยกเลิกการเชื่อม
            </button>
          </div>
        ) : (
          <>
            <p className="text-base">
              ยังไม่ได้อนุญาตให้ <b>{link.recipientName}</b> ส่งคำสั่งยามาตั้งเตือน และดูว่ายายรายงานว่ากินยาแล้วหรือยัง
            </p>
            <BigButton variant="secondary" onClick={() => yaiStore.grantConsent(link.recipientId, link.recipientName, ['REMINDER_ALERTS', 'MEDICINES'], 90)}>
              อนุญาต 90 วัน (ยกเลิกได้ทุกเมื่อ)
            </BigButton>
          </>
        )}
        {orders.length === 0 && <p className="text-base text-yai-ink/70">ยังไม่มีคำสั่งยาจากคลินิก</p>}
        {orders.map((r) => {
          const s = r.snapshot;
          return (
            <div key={r.key} className="space-y-2 rounded-2xl border border-yai-ink/10 p-3">
              <p className="text-lg font-bold">{s.medicineName ?? 'ยังไม่ระบุชื่อยา'}</p>
              <p className="text-base">
                {s.dosePerAdministration ?? '-'} · {s.directions ?? 'ไม่มีวิธีใช้'}
              </p>
              <div className="flex flex-wrap gap-1">
                {orderStatusLabels(r).map((l) => (
                  <span key={l.key} className={`inline-flex rounded-full border px-2.5 py-0.5 text-sm font-semibold ${TONE_CLS[l.tone]}`}>
                    {l.label}
                  </span>
                ))}
              </div>
              {r.decision.kind === 'ACTIVE' ? (
                <p className="text-base">
                  เวลาเตือน: <b>{r.decision.times.join(', ')} น.</b> (เภสัชกรตกลงเวลากับยายแล้ว)
                </p>
              ) : (
                <p className="text-base text-amber-950">{r.decision.reason}</p>
              )}
              <p className="text-sm text-yai-ink/70">
                ฉบับที่ {s.sourceVersion} · อัปเดต {formatThaiDateTime(s.lastChangedAt)} · ที่มา: {s.sourceSystem} (ข้อมูลจำลอง)
              </p>
              <button type="button" className="min-h-[40px] text-sm font-bold text-yai-deep underline" onClick={() => setShowHistory(showHistory === r.key ? null : r.key)}>
                {showHistory === r.key ? 'ซ่อนประวัติ' : 'ดูประวัติคำสั่งยา'}
              </button>
              {showHistory === r.key && (
                <ul className="space-y-1 text-sm">
                  {r.history.map((h) => (
                    <li key={h.version}>
                      ฉบับที่ {h.version}: {h.status === 'ACTIVE' ? 'เตือนตามเวลา' : h.status === 'PENDING_SCHEDULE_REVIEW' ? 'รอทบทวน' : 'หยุดเตือน'}
                      {h.reason ? ` (${h.reason})` : ''} · {formatThaiDateTime(h.importedAt)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
        {(state.orderNotices ?? []).slice(0, 3).map((n) => (
          <Notice key={n.id} title={n.text} />
        ))}
      </Card>

      <Card className="space-y-4">
        <h2 className="text-xl font-bold">ตั้งเตือนเอง (ไม่ใช่คำสั่งแพทย์)</h2>
        {eligible.length === 0 ? (
          <p className="text-lg">ยังไม่มียาที่ยืนยันแล้ว ต้องยืนยันรายการยาก่อนจึงจะตั้งเตือนได้</p>
        ) : (
          <>
            <Field label="ยา" hint="แสดงเฉพาะยาที่ยืนยันแล้ว ระบบไม่ตั้งเตือนจากข้อความบนฉลากเอง">
              <select className={inputCls} value={medId} onChange={(e) => setMedId(e.target.value)}>
                {eligible.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.displayName.value}
                  </option>
                ))}
              </select>
            </Field>
            {times.map((t, i) => (
              <div key={i} className="flex items-end gap-2">
                <Field label={`เวลาที่ ${i + 1}`}>
                  <input type="time" className={inputCls} value={t} onChange={(e) => setTimes(times.map((x, j) => (j === i ? e.target.value : x)))} />
                </Field>
                {times.length > 1 && (
                  <button type="button" className="min-h-[52px] px-3 text-base font-bold text-yai-alert" onClick={() => setTimes(times.filter((_, j) => j !== i))}>
                    ลบ
                  </button>
                )}
              </div>
            ))}
            {times.length < 4 && (
              <button type="button" className="min-h-[44px] text-lg font-bold text-yai-deep underline" onClick={() => setTimes([...times, ''])}>
                + เพิ่มเวลา
              </button>
            )}
            <label className="flex min-h-[56px] items-start gap-3 text-lg">
              <input type="checkbox" className="mt-1 h-7 w-7 shrink-0 accent-yai-deep" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
              ยืนยันว่าเวลานี้ตรงกับที่คุณหมอสั่งหรือที่คุณยายใช้อยู่จริง
            </label>
            <BigButton
              disabled={!confirmed || !times.every(isValidTime)}
              onClick={() => {
                const res = yaiStore.createReminder(medId, times, 'PATIENT_CONFIRMED');
                setMsg(res.ok ? { tone: 'info', text: 'เริ่มเตือนแล้ว' } : { tone: 'alert', text: res.reason ?? 'ตั้งเตือนไม่สำเร็จ' });
                if (res.ok) setConfirmed(false);
              }}
            >
              เริ่มเตือน
            </BigButton>
            {msg && <Notice tone={msg.tone} title={msg.text} />}
          </>
        )}
      </Card>

      <Card className="space-y-2">
        <h2 className="text-xl font-bold">แจ้งเตือนบนเครื่อง</h2>
        {notifyState === 'unsupported' ? (
          <p className="text-base">เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือน จะเห็นการเตือนเมื่อเปิดแอปนี้อยู่เท่านั้น</p>
        ) : notifyState === 'granted' ? (
          <p className="text-base">อนุญาตแล้ว แต่ต้นแบบนี้ยังเตือนเฉพาะตอนเปิดแอปอยู่ ยังไม่มีระบบส่งแจ้งเตือนเบื้องหลัง</p>
        ) : (
          <>
            <p className="text-base">ต้นแบบนี้เตือนเมื่อเปิดแอปอยู่ เบราว์เซอร์บนมือถือบางรุ่นอาจไม่แจ้งเตือนเมื่อปิดแอป</p>
            <BigButton variant="secondary" onClick={() => Notification.requestPermission().then(setNotifyState)}>
              อนุญาตการแจ้งเตือน
            </BigButton>
          </>
        )}
      </Card>
    </div>
  );
};
