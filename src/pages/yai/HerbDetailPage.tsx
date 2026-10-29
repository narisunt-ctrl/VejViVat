import React, { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, BookOpen, ExternalLink, FlaskConical, MessageSquareQuote, Stethoscope } from 'lucide-react';
import { useYai } from '../../services/yai/yaiStore';
import { LxCard, LxLinkRow, LxNotice, LxPageHeader, SourceTag, btnPrimary } from '../../components/yai/lx/ui';
import { HERB_CARDS, interactionsWithMyMedicines, medplantWithMyMedicines } from '../../domain/yai/herbDiscovery';
import { binomial, EFFECT_KIND_TH, isCautionRow, MEDPLANT_SEVERITY_TH, MEDPLANT_SOURCE, MedplantRow } from '../../domain/medplant';
import { EvidenceResult, EvidenceTier, HERB_OPTIONS, herbForName, HerbOption, searchHerbEvidence, TIER_LABEL } from '../../services/carebridge/herbEvidence';
import { searchLinks } from '../../data/carebridge/research';
import { getElementSummaryForPatient } from '../../services/yai/elementSummaryAdapter';
import { matchHerbsToElement } from '../../domain/yai/herbElement';

// Herb knowledge page. Three kinds of information, labelled separately:
// 1. what the national herbal formulary lists (registered indications, contraindications, precautions);
// 2. research found live in PubMed, counted by study type (the app does not read or grade the papers);
// 3. herb–drug interactions from the project's table, with its evidence level and review status.
// No dosing is shown to consumers, and no sentence says a herb will treat a disease.

const MP_STYLE: Record<MedplantRow['severity'], string> = {
  HIGH: 'bg-lx-alertbg text-lx-alert',
  MODERATE: 'bg-lx-warnbg text-lx-warn',
  LOW: 'bg-lx-surface2 text-lx-ink',
  UNSPECIFIED: 'bg-lx-surface2 text-lx-muted',
};

const SourceLink: React.FC<{ url: string }> = ({ url }) => (
  <a href={url} target="_blank" rel="noreferrer" className="inline-flex min-h-[32px] items-center gap-1 text-xs font-semibold text-lx-link underline-offset-2 hover:underline">
    บทความต้นทาง <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
  </a>
);

/** One medplant record: drug, effect, severity as given, recommendation, link to the article */
const MedplantItem: React.FC<{ r: MedplantRow }> = ({ r }) => (
  <li className="rounded-2xl border border-lx-line p-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-base font-semibold">{r.drugName}</span>
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${MP_STYLE[r.severity]}`}>ความรุนแรง{MEDPLANT_SEVERITY_TH[r.severity]}</span>
    </div>
    <p className="mt-1 text-sm">{r.effect}</p>
    {r.recommendation && <p className="mt-1 text-sm text-lx-muted">{r.recommendation}</p>}
    <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-lx-muted">
      {r.preclinicalHint && <span>อาจเป็นการศึกษาในสัตว์/หลอดทดลอง</span>}
      <SourceLink url={r.url} />
    </p>
  </li>
);

const TIER_ORDER: EvidenceTier[] = ['A', 'B', 'C', 'PRECLINICAL'];
const SEVERITY_STYLE: Record<string, string> = {
  HIGH: 'bg-lx-alertbg text-lx-alert',
  MODERATE: 'bg-lx-warnbg text-lx-warn',
  LOW: 'bg-lx-surface2 text-lx-ink',
  UNCLEAR: 'bg-lx-surface2 text-lx-muted',
};

export const HerbDetailPage: React.FC = () => {
  const { id } = useParams();
  const medicines = useYai((s) => s.medicines);
  const patientId = useYai((s) => s.patient.id);
  const elementMatch = useMemo(() => matchHerbsToElement(getElementSummaryForPatient(patientId), HERB_CARDS, medicines), [patientId, medicines]);
  const card = HERB_CARDS.find((h) => h.id === id);
  const [result, setResult] = useState<EvidenceResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!card) {
    return (
      <div className="space-y-4">
        <LxPageHeader back="/yai/discover" title="ไม่พบสมุนไพรนี้" />
      </div>
    );
  }

  const sciTerm = binomial(card.scientificName);
  const option: HerbOption | null =
    HERB_OPTIONS.find((o) => o.id === card.id) ?? herbForName(card.thaiName) ?? (sciTerm ? { id: card.id, thaiName: card.thaiName, scientificName: card.scientificName, terms: [sciTerm] } : null);
  const mine = interactionsWithMyMedicines(card, medicines);
  const mineMp = medplantWithMyMedicines(card, medicines);
  const mpCaution = card.medplant.filter(isCautionRow);
  const mpOther = card.medplant.filter((r) => !isCautionRow(r));
  const query = option ? option.terms.map((t) => `"${t}"`).join(' OR ') : card.scientificName;

  const search = async () => {
    if (!option) return;
    setBusy(true);
    setError('');
    try {
      setResult(await searchHerbEvidence(option));
    } catch {
      setError('เชื่อมต่อ PubMed ไม่ได้ ลองใหม่อีกครั้ง หรือเปิดลิงก์ค้นหาด้านล่าง');
    } finally {
      setBusy(false);
    }
  };

  const tierCount = (t: EvidenceTier) => result?.articles.filter((a) => a.tier === t).length ?? 0;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <LxPageHeader back="/yai/discover" eyebrow="Thai Herbal Discovery" title={card.thaiName} subtitle={`${card.scientificName} · ${card.commonName}`} />

      <div className="flex flex-wrap gap-1.5">
        {card.inNationalList && <SourceTag kind="VERIFIED" text="อยู่ในบัญชียาหลักแห่งชาติด้านสมุนไพร" />}
        <SourceTag kind="SELF" text={`${card.type} · ${card.form}`} />
        {card.taste && <SourceTag kind="SELF" text={`รส${card.taste}`} />}
        <SourceTag kind="PENDING" text={card.reviewStatus} />
        {elementMatch.matches.some((m) => m.card.id === card.id) && <SourceTag kind="DEVICE" text="รสตรงกับที่ตำราระบุสำหรับธาตุของคุณ (ไม่ใช่คำแนะนำให้ใช้)" />}
        {elementMatch.withMedicineCaution.some((m) => m.card.id === card.id) && <SourceTag kind="PENDING" text="รสตรงกับธาตุของคุณ แต่มีข้อควรระวังกับยาที่ใช้อยู่" />}
        {elementMatch.textCautions.some((m) => m.card.id === card.id) && <SourceTag kind="PENDING" text="ตำราให้ระวังรสร้อนเมื่อธาตุไฟเด่น" />}
      </div>

      {(mine.length > 0 || mineMp.length > 0) && (
        <LxNotice tone="alert" title="มีข้อควรระวังกับยาในสมุดยาของคุณ">
          {mine.map((m) => (
            <span key={m.interaction.id + m.medicine} className="block">
              {m.medicine}: {m.interaction.severityTh}
            </span>
          ))}
          {mineMp.map((m) => (
            <span key={m.row.id + m.name} className="block">
              {m.name}: {m.row.effect} (ความรุนแรง{MEDPLANT_SEVERITY_TH[m.row.severity]} · ฐานข้อมูลมหิดล)
            </span>
          ))}
          <span className="mt-1 block">อย่าเริ่ม หยุด หรือเปลี่ยนยาเอง ปรึกษาแพทย์หรือเภสัชกรก่อน</span>
        </LxNotice>
      )}

      {card.source === 'MEDPLANT' && (
        <LxNotice title="สมุนไพรนี้ไม่อยู่ในบัญชียาหลักของฐานข้อมูลต้นแบบ">
          หน้านี้แสดงเฉพาะอันตรกิริยากับยาจากฐานข้อมูลมหิดลและงานวิจัยจาก PubMed ยังไม่มีข้อมูลข้อบ่งใช้หรือข้อห้ามใช้
        </LxNotice>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {card.source === 'FORMULARY' && (
        <LxCard labelledBy="ind-title">
          <h2 id="ind-title" className="flex items-center gap-2 text-lg font-semibold">
            <BookOpen className="h-5 w-5 text-lx-accent" aria-hidden="true" /> ข้อบ่งใช้ตามบัญชียาหลักแห่งชาติ
          </h2>
          {card.listedIndications.length ? (
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-base">
              {card.listedIndications.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-base text-lx-muted">ยังไม่มีข้อมูล</p>
          )}
          <p className="mt-3 text-sm text-lx-muted">เป็นข้อบ่งใช้ที่ประกาศในบัญชียา (การใช้ตามภูมิปัญญาและการขึ้นทะเบียน) ไม่ได้รับรองว่าได้ผลกับทุกคน และไม่ใช่คำแนะนำให้เริ่มใช้</p>
        </LxCard>
        )}

        <LxCard labelledBy="ev-title">
          <h2 id="ev-title" className="flex items-center gap-2 text-lg font-semibold">
            <FlaskConical className="h-5 w-5 text-lx-accent" aria-hidden="true" /> หลักฐานงานวิจัยในคน
          </h2>
          {!result ? (
            <>
              <p className="mt-2 text-base text-lx-muted">ค้นงานวิจัยจริงจาก PubMed แล้วนับตามประเภทการศึกษา</p>
              {option ? (
                <button type="button" onClick={search} disabled={busy} className={`${btnPrimary} mt-3 w-full`}>
                  {busy ? 'กำลังค้น…' : 'ค้นหาหลักฐานจาก PubMed'}
                </button>
              ) : (
                <p className="mt-3 text-sm text-lx-muted">ยังไม่มีคำค้นสำหรับตำรับนี้ ใช้ลิงก์ค้นหาด้านล่าง</p>
              )}
              {error && <p className="mt-2 text-sm font-semibold text-lx-alert">{error}</p>}
            </>
          ) : (
            <>
              <p className="mt-2 text-sm text-lx-muted">
                พบทั้งหมด {result.total.toLocaleString('th-TH')} รายการ แสดง {result.articles.length} รายการที่เกี่ยวข้องที่สุด
              </p>
              <dl className="mt-3 space-y-1.5">
                {TIER_ORDER.map((t) => (
                  <div key={t} className="flex items-center justify-between gap-2 rounded-xl bg-lx-surface2 px-3 py-2 text-sm">
                    <dt>{TIER_LABEL[t]}</dt>
                    <dd className="num shrink-0 font-semibold">{tierCount(t)}</dd>
                  </div>
                ))}
              </dl>
              <ul className="mt-3 space-y-2">
                {result.articles.slice(0, 5).map((a) => (
                  <li key={a.pmid} className="rounded-xl border border-lx-line p-3 text-sm">
                    <a href={`https://pubmed.ncbi.nlm.nih.gov/${a.pmid}/`} target="_blank" rel="noreferrer" className="font-semibold text-lx-link underline-offset-2 hover:underline">
                      {a.title}
                    </a>
                    <p className="text-xs text-lx-muted">
                      {a.journal} {a.year ?? ''} · PMID {a.pmid} · ระดับ {a.tier === 'PRECLINICAL' ? 'สัตว์/เซลล์' : a.tier}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </LxCard>
      </div>

      <LxCard labelledBy="lim-title">
        <h2 id="lim-title" className="text-lg font-semibold">
          ข้อจำกัดของหลักฐาน
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-base text-lx-muted">
          <li>ระดับ A/B/C จัดอัตโนมัติจากประเภทการศึกษาเท่านั้น ระบบไม่ได้อ่านหรือประเมินคุณภาพงานวิจัย</li>
          <li>งานวิจัยใช้ตำรับ ขนาด และกลุ่มคนต่างกัน ผลจึงอาจไม่ตรงกับผลิตภัณฑ์หรือตัวคุณ</li>
          <li>การศึกษาในสัตว์หรือเซลล์ไม่ใช่หลักฐานว่าได้ผลในคน</li>
          <li>ข้อมูลในหน้านี้สถานะ “{card.reviewStatus}” ต้องให้ผู้เชี่ยวชาญตรวจก่อนใช้ตัดสินใจ</li>
        </ul>
      </LxCard>

      <div className="grid gap-4 lg:grid-cols-2">
        {card.source === 'FORMULARY' && (
        <LxCard labelledBy="caution-title">
          <h2 id="caution-title" className="flex items-center gap-2 text-lg font-semibold">
            <AlertTriangle className="h-5 w-5 text-lx-warn" aria-hidden="true" /> ข้อควรระวัง
          </h2>
          {card.contraindications.length > 0 && (
            <>
              <p className="mt-3 text-sm font-semibold text-lx-muted">ห้ามใช้</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-base">
                {card.contraindications.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </>
          )}
          <dl className="mt-3 space-y-2">
            {card.precautions.map((p) => (
              <div key={p.label} className="rounded-xl bg-lx-surface2 p-3">
                <dt className="text-sm font-semibold text-lx-muted">{p.label}</dt>
                <dd className="text-base">{p.text}</dd>
              </div>
            ))}
          </dl>
        </LxCard>
        )}

        <LxCard labelledBy="hdi-title">
          <h2 id="hdi-title" className="text-lg font-semibold">
            อันตรกิริยากับยา (ตารางของโครงการ)
          </h2>
          {card.interactions.length === 0 ? (
            <p className="mt-2 text-base text-lx-muted">ยังไม่มีข้อมูลในฐานข้อมูลต้นแบบ (ไม่ได้แปลว่าไม่มีอันตรกิริยา)</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {card.interactions.map((i) => (
                <li key={i.id} className="rounded-2xl border border-lx-line p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-base font-semibold">{i.drug}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${SEVERITY_STYLE[i.severity]}`}>{i.severityTh}</span>
                  </div>
                  <p className="mt-1 text-sm">{i.effect}</p>
                  <p className="mt-1 text-sm text-lx-muted">{i.advice}</p>
                  <p className="mt-1 text-xs text-lx-muted">
                    ระดับหลักฐาน {i.evidenceLevel} · แหล่ง: {i.sources} · {i.reviewStatus}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </LxCard>
      </div>

      <LxCard labelledBy="mp-title">
        <h2 id="mp-title" className="text-lg font-semibold">
          อันตรกิริยากับยา จากฐานข้อมูล Herb-Drug มหาวิทยาลัยมหิดล
        </h2>
        <p className="mt-1 text-sm text-lx-muted">{MEDPLANT_SOURCE.reviewStatus} · ระดับความรุนแรงตามที่แหล่งข้อมูลระบุ</p>
        {card.medplant.length === 0 ? (
          <p className="mt-3 text-base text-lx-muted">ไม่พบสมุนไพรนี้ในฐานข้อมูลที่นำเข้า (ไม่ได้แปลว่าไม่มีอันตรกิริยา)</p>
        ) : (
          <>
            <p className="mt-3 text-sm font-semibold">ควรระวัง หรือผลยังขัดแย้ง {mpCaution.length} รายการ</p>
            {mpCaution.length > 0 && (
              <ul className="mt-2 grid gap-2 md:grid-cols-2">
                {mpCaution.map((r) => (
                  <MedplantItem key={r.id} r={r} />
                ))}
              </ul>
            )}
            {mpOther.length > 0 && (
              <details className="mt-3 rounded-2xl bg-lx-surface2 p-3">
                <summary className="min-h-[44px] cursor-pointer text-sm font-semibold">รายงานว่าไม่พบผลต่อยา หรือช่วยลดผลข้างเคียง ({mpOther.length} รายการ)</summary>
                <p className="mt-1 text-xs text-lx-muted">เป็นผลของการศึกษานั้นๆ เท่านั้น ไม่ได้รับรองว่าใช้ร่วมกันได้</p>
                <ul className="mt-2 grid gap-2 md:grid-cols-2">
                  {mpOther.map((r) => (
                    <li key={r.id} className="rounded-xl border border-lx-line p-3 text-sm">
                      <span className="font-semibold">{r.drugName}</span> · {EFFECT_KIND_TH[r.effectKind]}
                      <span className="block text-lx-muted">{r.effect}</span>
                      <SourceLink url={r.url} />
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </>
        )}
        <p className="mt-3 text-xs text-lx-muted">
          ที่มา:{' '}
          <a href={MEDPLANT_SOURCE.url} target="_blank" rel="noreferrer" className="underline">
            {MEDPLANT_SOURCE.name}
          </a>{' '}
          · {MEDPLANT_SOURCE.permission}
        </p>
      </LxCard>

      <LxCard labelledBy="src-title">
        <h2 id="src-title" className="text-lg font-semibold">
          แหล่งอ้างอิง
        </h2>
        <p className="mt-2 text-base">{card.sourceReference || 'ยังไม่ระบุ'}</p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {searchLinks(query).map((l) => (
            <li key={l.url}>
              <a href={l.url} target="_blank" rel="noreferrer" className="inline-flex min-h-[44px] items-center gap-1 rounded-xl border border-lx-line px-3 text-sm font-semibold text-lx-link">
                {l.label} <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      </LxCard>

      <div className="grid gap-2 md:grid-cols-2">
        <LxLinkRow to="/yai/clinics" icon={Stethoscope} title="ปรึกษาผู้เชี่ยวชาญ" sub="แพทย์แผนไทยหรือเภสัชกร ก่อนเริ่มใช้" />
        <LxLinkRow to="/yai/herb-reviews" icon={MessageSquareQuote} title="ประสบการณ์จากผู้ใช้" sub="รีวิวจากเพื่อน ๆ (ไม่ใช่หลักฐาน)" />
      </div>
      <p className="text-center text-xs text-lx-muted">
        ขนาดการใช้ไม่แสดงในแอปผู้ใช้ ให้ผู้เชี่ยวชาญเป็นผู้แนะนำ ·{' '}
        <Link to="/yai/discover" className="underline">
          กลับไปค้นหา
        </Link>
      </p>
    </div>
  );
};
