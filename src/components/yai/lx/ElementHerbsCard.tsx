import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Flame, Droplets, Wind, Mountain } from 'lucide-react';
import { useYai } from '../../../services/yai/yaiStore';
import { getElementSummaryForPatient } from '../../../services/yai/elementSummaryAdapter';
import { HERB_CARDS } from '../../../domain/yai/herbDiscovery';
import { HerbElementMatch, matchHerbsToElement, MyElement } from '../../../domain/yai/herbElement';
import { LxCard, LxSectionHeader, SourceTag } from './ui';

const ELEMENT_ICON: Record<MyElement, React.ComponentType<{ className?: string }>> = { fire: Flame, water: Droplets, wind: Wind, earth: Mountain };
const dt = (iso: string) => new Date(iso).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const HerbChip: React.FC<{ m: HerbElementMatch; tone?: 'warn' | 'alert' }> = ({ m, tone }) => (
  <li>
    <Link
      to={`/yai/discover/${m.card.id}`}
      className={`inline-flex min-h-[44px] items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-semibold transition hover:border-lx-accent/60 ${
        tone === 'alert' ? 'border-lx-alert/40 bg-lx-alertbg text-lx-alert' : tone === 'warn' ? 'border-lx-warn/40 bg-lx-warnbg text-lx-warn' : 'border-lx-line bg-lx-surface2'
      }`}
    >
      {m.card.thaiName.replace(/^ยา(แคปซูล)?/, '')}
      <span className="text-xs font-normal opacity-80">รส{m.card.taste}</span>
    </Link>
  </li>
);

/**
 * "สมุนไพรกับธาตุของคุณ": compares the tastes the Smutthan assessment gives for today's element with each formulary
 * herb's taste. Information to discuss with a Thai traditional medicine doctor; not a recommendation or prescription.
 */
export const ElementHerbsCard: React.FC = () => {
  const patientId = useYai((s) => s.patient.id);
  const medicines = useYai((s) => s.medicines);
  const summary = useMemo(() => getElementSummaryForPatient(patientId), [patientId]);
  const r = useMemo(() => matchHerbsToElement(summary, HERB_CARDS, medicines), [summary, medicines]);
  const Icon = r.element ? ELEMENT_ICON[r.element] : Wind;

  return (
    <LxCard labelledBy="element-title" className="relative overflow-hidden">
      <LxSectionHeader id="element-title" eyebrow="Thai Element" title="สมุนไพรกับธาตุของคุณ" />
      {summary.status !== 'AVAILABLE' ? (
        <div className="space-y-2">
          <p className="text-base">ยังเทียบไม่ได้ เพราะยังขาด: {summary.missingInputs.join(', ')}</p>
          <p className="text-sm text-lx-muted">ต้องมีผลประเมินธาตุจากคลินิกที่เชื่อมไว้ก่อน ระบบไม่เดาธาตุหรือใส่ค่าปกติแทน</p>
          <Link to="/yai/clinics" className="inline-flex min-h-[44px] items-center text-sm font-semibold text-lx-link">
            หาคลินิกแพทย์แผนไทยเพื่อประเมินธาตุ
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-2xl bg-lx-surface2 p-3">
              <p className="text-xs text-lx-muted">ธาตุเจ้าเรือน (ตามวันเกิด ไม่เปลี่ยน)</p>
              <p className="text-lg font-semibold">{summary.birthElement ?? 'ยังไม่มีข้อมูล'}</p>
            </div>
            <div className="rounded-2xl bg-lx-surface2 p-3">
              <p className="text-xs text-lx-muted">สมุฏฐานที่เด่นจากการประเมินล่าสุด</p>
              <p className="flex items-center gap-2 text-lg font-semibold">
                <Icon className="h-5 w-5 text-lx-accent" aria-hidden="true" /> {summary.dynamic.dominantTh}
              </p>
              <p className="text-sm text-lx-muted">{summary.dynamic.state}</p>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-lx-muted">รสที่ตำราระบุสำหรับสมุฏฐานนี้</p>
            <ul className="mt-1 flex flex-wrap gap-1.5">
              {summary.dynamic.recommendedTaste.map((t) => (
                <li key={t} className="rounded-full bg-lx-accent/15 px-3 py-1 text-sm text-lx-ink">
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold">สมุนไพรในบัญชียาหลักที่มีรสตรงกับที่ตำราระบุ ({r.matches.length})</p>
            {r.matches.length ? (
              <ul className="mt-2 flex flex-wrap gap-2">
                {r.matches.map((m) => (
                  <HerbChip key={m.card.id} m={m} />
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-lx-muted">ไม่มีรายการที่รสตรงและไม่มีข้อควรระวังกับยาของคุณ</p>
            )}
          </div>

          {r.withMedicineCaution.length > 0 && (
            <div className="rounded-2xl bg-lx-alertbg p-3 text-lx-alert">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <AlertTriangle className="h-4 w-4" aria-hidden="true" /> รสตรง แต่มีข้อควรระวังกับยาในสมุดยาของคุณ ห้ามเริ่มใช้เองก่อนปรึกษา
              </p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {r.withMedicineCaution.map((m) => (
                  <HerbChip key={m.card.id} m={m} tone="alert" />
                ))}
              </ul>
            </div>
          )}

          {r.textCautions.length > 0 && (
            <div className="rounded-2xl bg-lx-warnbg p-3 text-lx-warn">
              <p className="text-sm font-semibold">{r.textCautions[0].textCaution}</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {r.textCautions.map((m) => (
                  <HerbChip key={m.card.id} m={m} tone="warn" />
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap gap-1">
            <SourceTag kind="DEMO" />
            <SourceTag kind="SELF" text={`ประเมินเมื่อ ${dt(summary.assessedAt)}`} />
          </div>
          <p className="text-xs text-lx-muted">
            เป็นการเทียบรสยาตามตำราแพทย์แผนไทย ไม่ใช่การแนะนำหรือสั่งยา ไม่ได้บอกว่าตัวไหนดีที่สุด แพทย์แผนไทยเป็นผู้เลือกตำรับและขนาดหลังตรวจจริง · {summary.source} · {summary.ruleVersion}
          </p>
        </div>
      )}
    </LxCard>
  );
};
