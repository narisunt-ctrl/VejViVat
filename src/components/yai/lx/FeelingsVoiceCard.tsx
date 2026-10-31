import React from 'react';
import { Link } from 'react-router-dom';
import { demoNow, useYai, yaiStore } from '../../../services/yai/yaiStore';
import { bangkokDate } from '../../../domain/yai/journal';
import { FEELINGS, feelingCounts, voiceBaseline, VOICE_BASELINE_MIN, voiceObservations } from '../../../domain/yai/voiceFeatures';
import { LxCard, SourceTag, btnSecondary } from './ui';

/**
 * Insights card for the holistic check-in: how often the user said they felt tired, refreshed, worried or calm,
 * and, when the user turned it on, how today's voice compares with their own usual voice (experimental, never an
 * emotion label).
 */
export const FeelingsVoiceCard: React.FC<{ days: 7 | 30 }> = ({ days }) => {
  const state = useYai((s) => s);
  const today = bangkokDate(demoNow(state));
  const counts = feelingCounts(state.checkins ?? [], today, days);
  const any = counts.some((c) => c.days > 0);
  const on = !!state.settings.voiceMeasures;
  const samples = state.voiceSamples ?? [];
  const base = voiceBaseline(samples, today);
  const latest = samples[0];
  const obs = latest && latest.date === today ? voiceObservations(latest, base) : [];

  return (
    <LxCard as="article" labelledBy="feel-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="feel-title" className="text-lg font-semibold">
          ความรู้สึกที่บอกไว้ · {days} วัน
        </h2>
        <SourceTag kind="SELF" />
      </div>
      {any ? (
        <ul className="mt-3 grid grid-cols-2 gap-2">
          {counts.map((c) => {
            const f = FEELINGS.find((x) => x.tag === c.tag)!;
            return (
              <li key={c.tag} className="rounded-2xl bg-lx-surface2 p-3">
                <p className="text-sm text-lx-muted">
                  <span aria-hidden="true">{f.emoji}</span> {f.label}
                </p>
                <p className="num text-2xl font-semibold">
                  {c.days} <span className="text-sm font-normal text-lx-muted">วัน</span>
                </p>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-2 text-lx-muted">
          ยังไม่ได้บอกความรู้สึก เลือกได้ตอน
          <Link to="/yai/checkin" className="text-lx-link underline">
            เช็กอิน
          </Link>
          หรือหลังพูดบันทึก
        </p>
      )}

      <div className="mt-4 border-t border-lx-line pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">เสียงของฉัน เทียบกับปกติของตัวเอง</h3>
          <SourceTag kind="PENDING" text="ทดลอง" />
        </div>
        {!on ? (
          <>
            <p className="mt-2 text-sm text-lx-muted">
              เมื่อเปิด แอปจะวัดความเร็วพูด ช่วงหยุด ระดับและความดังของเสียงในเครื่องนี้ตอนพูดบันทึก เก็บเป็นตัวเลขเท่านั้น ไม่เก็บและไม่ส่งไฟล์เสียง ใช้เทียบกับเสียงปกติของคุณเอง ไม่ได้ทายอารมณ์หรือวินิจฉัยโรค
            </p>
            <label className="mt-3 flex min-h-[48px] items-center gap-3">
              <input type="checkbox" className="h-6 w-6 accent-[rgb(var(--lx-accent))]" checked={false} onChange={() => yaiStore.setVoiceMeasures(true)} />
              ยินยอมให้วัดลักษณะเสียงในเครื่องนี้
            </label>
          </>
        ) : (
          <>
            {base.stats ? (
              obs.length ? (
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {obs.map((o) => (
                    <li key={o.metric}>วันนี้{o.words}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2">{latest?.date === today ? 'วันนี้เสียงใกล้เคียงกับปกติของคุณ' : 'วันนี้ยังไม่ได้พูดบันทึก'}</p>
              )
            ) : (
              <p className="mt-2 text-lx-muted">
                วัดเสียงแล้ว {samples.length} ครั้ง ใช้เป็นค่าปกติได้เฉพาะครั้งก่อนวันนี้ ({base.samples}/{VOICE_BASELINE_MIN} ครั้งใน 4 สัปดาห์) ครบแล้วจึงจะเทียบกับปกติของคุณได้
              </p>
            )}
            <p className="mt-2 text-xs text-lx-muted">เสียงเปลี่ยนได้จากหลายอย่าง เช่น หวัด เสียงรอบข้าง หรือตำแหน่งโทรศัพท์ ถ้าวันไหนเสียงต่างไป ลองถามตัวเองว่ารู้สึกอย่างไร มากกว่าเชื่อตัวเลข</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <button className={btnSecondary} onClick={() => yaiStore.setVoiceMeasures(false)}>
                ปิดการวัดเสียง
              </button>
              <button className={btnSecondary} onClick={() => window.confirm(`ลบตัวเลขเสียงทั้งหมด ${samples.length} ครั้ง?`) && yaiStore.clearVoiceSamples()} disabled={!samples.length}>
                ลบข้อมูลเสียงทั้งหมด
              </button>
            </div>
          </>
        )}
      </div>
    </LxCard>
  );
};
