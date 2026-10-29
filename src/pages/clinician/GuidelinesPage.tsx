import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { BookCheck, CheckCircle2, ExternalLink, Printer, ShieldAlert, Scale } from 'lucide-react';
import formulary from '../../../data/formulary/thai-formulary.json';
import type { ThaiHerbFormularyItem } from '../../types/drug';
import { HERB_OPTIONS, CONDITIONS } from '../../services/carebridge/herbEvidence';
import { GUIDELINE_SOURCES, guidelineSearchUrl, MedicalSystem, SYSTEM_TH } from '../../data/carebridge/guidelineSources';
import { toFhirPlanDefinition } from '../../services/carebridge/fhirExport';
import { getAllInteractionsDatabase } from '../../services/interactionMatcher';
import { herbAliases, SEVERITY_TH } from '../../domain/yai/interactionCheck';
import {
  CERTAINTY_TH,
  consensusOf,
  GuidelineDraft,
  guidelineReadiness,
  guidelines,
  loadReviewer,
  overallCertainty,
  ROLE_TH,
  ReviewerRole,
  saveReviewer,
  topicKeyOf,
  useGuidelines,
  useReviews,
  VERDICT_TH,
} from '../../services/carebridge/evidenceReviews';

// Integrated Guideline Viewer (Thai / modern / Chinese medicine side by side, each with its source) and
// Benefit–Harm comparison, built from clinician peer reviews. The system assembles; clinicians write and approve.

const FORMULARY = formulary as unknown as ThaiHerbFormularyItem[];
const formularyItem = (herbId: string) => FORMULARY.find((f) => f.drug_code_24 === herbId) ?? null;
const conditionTh = (en: string) => CONDITIONS.find((c) => c.en === en)?.th ?? (en || 'ทุกภาวะ');
const isCitation = (s: string) => /^https?:\/\/\S+$/.test(s.trim()) || /^10\.\d{4,9}\/\S+$/.test(s.trim());
const citationHref = (s: string) => (s.trim().startsWith('10.') ? `https://doi.org/${s.trim()}` : s.trim());

function herbInteractions(item: ThaiHerbFormularyItem | null) {
  if (!item) return [];
  const name = item.thai_name.replace(/\s+/g, '');
  return getAllInteractionsDatabase().filter((r) => herbAliases(r).some((a) => name.includes(a)));
}

// ---------------- list ----------------
export const GuidelinesPage: React.FC = () => {
  const all = useGuidelines();
  return (
    <div className="mx-auto max-w-5xl space-y-4 py-4 sm:px-6">
      <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900">
        <BookCheck className="h-6 w-6 text-emerald-700" /> Guideline ที่แพทย์ร่วมกันทบทวน
      </h1>
      <p className="text-sm text-slate-600">
        เริ่มจากค้นหลักฐานใน <Link to="/research" className="font-semibold text-emerald-700 underline">คลังงานวิจัย</Link> → แพทย์แผนปัจจุบันและแพทย์แผนไทยช่วยกันรีวิว → เมื่อรีวิวครบเกณฑ์จะสร้างร่าง
        Guideline ได้ → อนุมัติเมื่อได้รับความเห็นชอบจากทั้งสองฝ่าย
      </p>
      {all.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">ยังไม่มี Guideline</p>
      ) : (
        <ul className="space-y-2">
          {all.map((g) => (
            <li key={g.id}>
              <Link to={`/guidelines/${g.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-4 hover:border-emerald-400">
                <span className="font-bold text-slate-900">
                  {g.herbThai} · {conditionTh(g.condition)} <span className="text-xs font-normal text-slate-500">ฉบับที่ {g.version}</span>
                </span>
                <StatusBadge g={g} />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-slate-500">ข้อมูลสาธิต เก็บในเบราว์เซอร์นี้ ยังไม่ใช่แนวทางเวชปฏิบัติของสถานพยาบาลหรือหน่วยงานใด</p>
    </div>
  );
};

const StatusBadge: React.FC<{ g: GuidelineDraft }> = ({ g }) =>
  g.status === 'APPROVED' ? (
    <span className="rounded-full bg-emerald-700 px-3 py-0.5 text-xs font-bold text-white">อนุมัติแล้ว (สาธิต)</span>
  ) : (
    <span className="rounded-full bg-amber-100 px-3 py-0.5 text-xs font-bold text-amber-900">ร่าง รออนุมัติ</span>
  );

// ---------------- new draft ----------------
export const GuidelineNewPage: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const herbId = params.get('herb') ?? '';
  const condition = params.get('condition') ?? '';
  const herb = HERB_OPTIONS.find((h) => h.id === herbId);
  const reviews = useReviews().filter((r) => r.topicKey === topicKeyOf(herbId, condition));
  const readiness = guidelineReadiness(reviews);
  const [form, setForm] = useState({ recommendation: '', modernText: '', modernCitation: '', chineseText: '', chineseCitation: '', benefitsNote: '', harmsNote: '' });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });
  if (!herb) return <p className="p-6 text-sm">ไม่พบสมุนไพร เริ่มจากคลังงานวิจัย</p>;

  const citationsOk = (!form.modernText.trim() || isCitation(form.modernCitation)) && (!form.chineseText.trim() || isCitation(form.chineseCitation));
  const humanPmids = [...new Set(reviews.filter((r) => r.tier !== 'PRECLINICAL').map((r) => r.pmid))];
  const authors = [...new Map(reviews.map((r) => [r.reviewer, { name: r.reviewer, role: r.role }])).values()];

  return (
    <div className="mx-auto max-w-4xl space-y-4 py-4 sm:px-6">
      <h1 className="text-xl font-bold text-slate-900">
        ร่าง Guideline: {herb.thaiName} · {conditionTh(condition)}
      </h1>
      {!readiness.ready && (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">ยังไม่ครบเกณฑ์: {readiness.missing.join(' · ')}</p>
      )}
      <p className="text-sm text-slate-600">
        จากรีวิว {reviews.length} รายการ บทความในคน {humanPmids.length} ฉบับ ผู้รีวิว {authors.map((a) => `${a.name} (${ROLE_TH[a.role]})`).join(', ')}
      </p>
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm">
        <Area label="ข้อแนะนำของคณะผู้ทบทวน * (เขียนเอง ระบบไม่สร้างข้อความแนะนำให้)" value={form.recommendation} onChange={set('recommendation')} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Area label="แผนปัจจุบัน: การรักษามาตรฐาน/ทางเลือกเปรียบเทียบ" value={form.modernText} onChange={set('modernText')} />
          <Input label="อ้างอิงแผนปัจจุบัน (ลิงก์หรือ DOI)" value={form.modernCitation} onChange={set('modernCitation')} bad={!!form.modernText.trim() && !isCitation(form.modernCitation)} />
          <Area label="แผนจีน: มุมมอง/หลักฐาน (ถ้ามี)" value={form.chineseText} onChange={set('chineseText')} />
          <Input label="อ้างอิงแผนจีน (ลิงก์หรือ DOI)" value={form.chineseCitation} onChange={set('chineseCitation')} bad={!!form.chineseText.trim() && !isCitation(form.chineseCitation)} />
          <Sources system="MODERN" condition={condition} />
          <Sources system="CHINESE" condition={condition} />
          <Area label="ประโยชน์ที่คณะผู้ทบทวนเห็น" value={form.benefitsNote} onChange={set('benefitsNote')} />
          <Area label="ความเสี่ยง/ข้อควรระวังที่คณะผู้ทบทวนเห็น" value={form.harmsNote} onChange={set('harmsNote')} />
        </div>
        <button
          type="button"
          disabled={!readiness.ready || !form.recommendation.trim() || !citationsOk}
          onClick={() => {
            const g = guidelines.create({
              topicKey: topicKeyOf(herbId, condition),
              herbId,
              herbThai: herb.thaiName,
              condition,
              recommendation: form.recommendation.trim(),
              modern: { text: form.modernText.trim(), citation: form.modernCitation.trim() },
              chinese: { text: form.chineseText.trim(), citation: form.chineseCitation.trim() },
              benefitsNote: form.benefitsNote.trim(),
              harmsNote: form.harmsNote.trim(),
              evidencePmids: humanPmids,
              authors,
            });
            navigate(`/guidelines/${g.id}`);
          }}
          className="min-h-[42px] rounded-xl bg-emerald-700 px-4 font-bold text-white disabled:opacity-40"
        >
          บันทึกร่าง
        </button>
      </div>
    </div>
  );
};

const Area: React.FC<{ label: string; value: string; onChange: React.ChangeEventHandler<HTMLTextAreaElement> }> = ({ label, value, onChange }) => (
  <label className="block">
    <span className="font-semibold text-slate-700">{label}</span>
    <textarea className="mt-1 min-h-[80px] w-full rounded-lg border border-slate-300 p-2" value={value} onChange={onChange} />
  </label>
);
const Input: React.FC<{ label: string; value: string; onChange: React.ChangeEventHandler<HTMLInputElement>; bad?: boolean }> = ({ label, value, onChange, bad }) => (
  <label className="block">
    <span className="font-semibold text-slate-700">{label}</span>
    <input className={`mt-1 w-full rounded-lg border p-2 ${bad ? 'border-rose-400' : 'border-slate-300'}`} value={value} onChange={onChange} placeholder="https://… หรือ 10.xxxx/…" />
    {bad && <span className="text-xs text-rose-700">ต้องมีลิงก์หรือ DOI</span>}
  </label>
);

// ---------------- integrated viewer ----------------
export const GuidelineViewPage: React.FC = () => {
  const { id = '' } = useParams();
  const all = useGuidelines();
  const g = all.find((x) => x.id === id) ?? null;
  const reviews = useReviews().filter((r) => g && r.topicKey === g.topicKey);
  const item = g ? formularyItem(g.herbId) : null;
  const hdi = useMemo(() => herbInteractions(item), [item]);
  const [approver, setApprover] = useState(loadReviewer);
  const [msg, setMsg] = useState<string | null>(null);
  if (!g) return <p className="p-6 text-sm">ไม่พบ Guideline</p>;

  const byArticle = g.evidencePmids.map((pmid) => {
    const rs = reviews.filter((r) => r.pmid === pmid);
    return { pmid, title: rs[0]?.title ?? pmid, year: rs[0]?.year, tier: rs[0]?.tier, consensus: consensusOf(rs) };
  });
  const supports = byArticle.filter((a) => a.consensus.majority === 'SUPPORTS').length;
  const noEffect = byArticle.filter((a) => a.consensus.majority === 'NO_EFFECT').length;
  const unclear = byArticle.length - supports - noEffect;
  const harmReviews = reviews.filter((r) => r.verdict === 'HARM_SIGNAL');
  const certainty = overallCertainty(reviews);

  return (
    <div className="mx-auto max-w-6xl space-y-4 py-4 print:max-w-none sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Link to="/guidelines" className="text-sm font-semibold text-emerald-700 underline print:hidden">
            ← Guideline ทั้งหมด
          </Link>
          <h1 className="text-xl font-bold text-slate-900">
            {g.herbThai} สำหรับ{conditionTh(g.condition)}
          </h1>
          <p className="text-sm text-slate-600">
            ฉบับที่ {g.version} · ความเชื่อมั่นโดยรวม (จากรีวิว): <b>{CERTAINTY_TH[certainty]}</b> · ผู้ร่าง {g.authors.map((a) => `${a.name} (${ROLE_TH[a.role]})`).join(', ')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge g={g} />
          <button type="button" onClick={() => window.print()} className="flex min-h-[36px] items-center gap-1 rounded-lg border border-slate-300 px-3 text-sm print:hidden">
            <Printer className="h-4 w-4" /> พิมพ์
          </button>
          <button
            type="button"
            onClick={() => {
              const blob = new Blob([JSON.stringify(toFhirPlanDefinition(g, item), null, 2)], { type: 'application/fhir+json' });
              const a = document.createElement('a');
              a.href = URL.createObjectURL(blob);
              a.download = `guideline-${g.id}-v${g.version}.fhir.json`;
              a.click();
              URL.revokeObjectURL(a.href);
            }}
            className="flex min-h-[36px] items-center gap-1 rounded-lg border border-slate-300 px-3 text-sm print:hidden"
            title="ส่งออกเป็น FHIR R4 PlanDefinition เพื่อแลกเปลี่ยนกับระบบอื่นหรือเผยแพร่ในระดับสากล"
          >
            ส่งออก FHIR
          </button>
        </div>
      </div>

      <section className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-4">
        <p className="text-sm font-bold text-emerald-900">ข้อแนะนำของคณะผู้ทบทวน</p>
        <p className="whitespace-pre-line text-base text-slate-900">{g.recommendation}</p>
      </section>

      <section aria-label="Integrated Guideline Viewer" className="grid gap-3 lg:grid-cols-3">
        <Column title="แผนไทย" tone="emerald" source={item ? `${item.source_reference} · ${item.verification_status}` : null}>
          {item ? (
            <>
              <p className="font-semibold">{item.thai_name}</p>
              <p className="text-xs text-slate-600">{item.scientific_name} · {item.dosage_form} {item.strength_per_unit}</p>
              <p className="mt-1 font-semibold">ข้อบ่งใช้ในตำรา</p>
              <ul className="list-disc pl-5">{item.indications.map((x) => <li key={x}>{x}</li>)}</ul>
              <p className="mt-1 font-semibold">ขนาดมาตรฐานผู้ใหญ่</p>
              <p>
                ครั้งละ {item.standard_dosing.adult.dose_per_admin} {item.standard_dosing.adult.dose_unit} วันละ {item.standard_dosing.adult.frequency_per_day} ครั้ง {item.standard_dosing.adult.timing} · ไม่เกิน {item.standard_dosing.adult.max_duration_days} วัน
              </p>
              {item.nlem_status === 'ใช่' && <p className="mt-1 text-xs font-semibold text-emerald-800">{item.nlem_category}</p>}
              <Sources system="THAI" condition={g.condition} />
            </>
          ) : (
            <p>ไม่พบในบัญชียาของระบบ</p>
          )}
        </Column>
        <Column title="แผนปัจจุบัน" tone="sky" source={g.modern.citation || null}>
          {g.modern.text ? <p className="whitespace-pre-line">{g.modern.text}</p> : <Sources system="MODERN" condition={g.condition} empty />}
        </Column>
        <Column title="แผนจีน" tone="rose" source={g.chinese.citation || null}>
          {g.chinese.text ? <p className="whitespace-pre-line">{g.chinese.text}</p> : <Sources system="CHINESE" condition={g.condition} empty />}
        </Column>
      </section>

      <section aria-label="Benefit–Harm Comparison" className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
          <Scale className="h-5 w-5 text-slate-700" /> เปรียบเทียบประโยชน์และความเสี่ยง
        </h2>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1 rounded-xl bg-emerald-50 p-3 text-sm">
            <p className="font-bold text-emerald-900">ประสิทธิผล</p>
            <p>
              บทความในคน {byArticle.length} ฉบับ: ผู้รีวิวส่วนใหญ่เห็นว่าสนับสนุน {supports} · ไม่พบประโยชน์ {noEffect} · ยังสรุปไม่ได้ {unclear}
            </p>
            {g.benefitsNote && <p className="text-slate-700">“{g.benefitsNote}”</p>}
          </div>
          <div className="space-y-1 rounded-xl bg-rose-50 p-3 text-sm">
            <p className="flex items-center gap-1 font-bold text-rose-900">
              <ShieldAlert className="h-4 w-4" /> ผลข้างเคียงและข้อห้าม
            </p>
            {item && (
              <ul className="list-disc pl-5">
                {item.contraindications.map((x) => (
                  <li key={x}>{x}</li>
                ))}
                <li>{item.precautions.drug_interactions}</li>
              </ul>
            )}
            {hdi.map((r) => (
              <p key={r.interaction_id} className="text-xs">
                {r.interaction_id}: {r.herb_thai_name} + {r.drug_generic_name} (ความรุนแรง{SEVERITY_TH[r.severity_code]})
              </p>
            ))}
            {harmReviews.length > 0 && <p className="text-xs font-semibold">ผู้รีวิวพบสัญญาณอันตราย {harmReviews.length} รายการ</p>}
            {g.harmsNote && <p className="text-slate-700">“{g.harmsNote}”</p>}
          </div>
          <div className="space-y-1 rounded-xl bg-slate-50 p-3 text-sm">
            <p className="font-bold text-slate-900">ข้อจำกัดของหลักฐาน</p>
            <ul className="list-disc pl-5 text-xs">
              <li>ความเชื่อมั่นโดยรวม{CERTAINTY_TH[certainty]} จากการรีวิวของคณะผู้ทบทวน</li>
              <li>RCT {byArticle.filter((a) => a.tier === 'B').length} ฉบับ · review/meta-analysis {byArticle.filter((a) => a.tier === 'A').length} ฉบับ</li>
              <li>ผู้รีวิว {new Set(reviews.map((r) => r.reviewer)).size} คน จาก {new Set(reviews.map((r) => r.role)).size} สาขา</li>
              <li>ข้อมูลยาแผนไทยในระบบยัง “{item?.verification_status ?? 'ไม่ทราบ'}”</li>
              <li>ยังไม่ได้ผ่านคณะกรรมการเภสัชกรรมและการบำบัด (PTC) ของสถานพยาบาลจริง</li>
            </ul>
          </div>
        </div>
        <details className="text-sm">
          <summary className="cursor-pointer font-semibold">หลักฐานที่ใช้ ({byArticle.length} ฉบับ)</summary>
          <ul className="mt-1 space-y-1">
            {byArticle.map((a) => (
              <li key={a.pmid}>
                <a href={`https://pubmed.ncbi.nlm.nih.gov/${a.pmid}/`} target="_blank" rel="noreferrer" className="underline">
                  {a.title}
                </a>{' '}
                <span className="text-xs text-slate-500">
                  {a.year ?? ''} · ระดับ {a.tier} · รีวิว {a.consensus.reviewers} คน{a.consensus.majority ? ` · ${VERDICT_TH[a.consensus.majority]}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </details>
      </section>

      <section className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 text-sm print:hidden">
        <p className="font-bold">การอนุมัติ (ต้องได้ทั้งแพทย์แผนปัจจุบันและแพทย์แผนไทย)</p>
        {g.approvals.length === 0 ? (
          <p className="text-slate-600">ยังไม่มีผู้อนุมัติ</p>
        ) : (
          g.approvals.map((a) => (
            <p key={a.name} className="flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> {a.name} ({ROLE_TH[a.role]}) · {new Date(a.at).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}
            </p>
          ))
        )}
        {g.status === 'DRAFT' && (
          <div className="flex flex-wrap items-center gap-2">
            <input className="rounded-lg border border-slate-300 px-2 py-1" placeholder="ชื่อผู้อนุมัติ" value={approver.name} onChange={(e) => setApprover({ ...approver, name: e.target.value })} />
            <select className="rounded-lg border border-slate-300 px-2 py-1" value={approver.role} onChange={(e) => setApprover({ ...approver, role: e.target.value as ReviewerRole })}>
              {(Object.keys(ROLE_TH) as ReviewerRole[]).map((r) => (
                <option key={r} value={r}>
                  {ROLE_TH[r]}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                saveReviewer(approver);
                const res = guidelines.approve(g.id, approver.name, approver.role);
                setMsg(res.ok ? 'บันทึกการอนุมัติแล้ว' : res.reason ?? 'อนุมัติไม่ได้');
              }}
              className="min-h-[36px] rounded-lg bg-emerald-700 px-3 font-bold text-white"
            >
              อนุมัติ (สาธิต)
            </button>
            {msg && <span className="text-xs">{msg}</span>}
          </div>
        )}
        <p className="text-xs text-slate-500">แก้ไขเนื้อหาหลังอนุมัติจะกลับเป็นร่างและต้องอนุมัติใหม่ · ข้อมูลสาธิต ไม่ใช่แนวทางเวชปฏิบัติจริง</p>
      </section>
    </div>
  );
};

const TONE = { emerald: 'border-emerald-300 bg-emerald-50/50', sky: 'border-sky-300 bg-sky-50/50', rose: 'border-rose-300 bg-rose-50/50' };
const Column: React.FC<{ title: string; tone: keyof typeof TONE; source: string | null; children: React.ReactNode }> = ({ title, tone, source, children }) => (
  <div className={`space-y-1 rounded-2xl border p-4 text-sm ${TONE[tone]}`}>
    <p className="text-base font-bold text-slate-900">{title}</p>
    {children}
    <p className="border-t border-slate-200 pt-1 text-xs text-slate-600">
      ที่มา:{' '}
      {source ? (
        isCitation(source) ? (
          <a href={citationHref(source)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 underline">
            {source} <ExternalLink className="h-3 w-3" />
          </a>
        ) : (
          source
        )
      ) : (
        'ยังไม่มี'
      )}
    </p>
  </div>
);

const Sources: React.FC<{ system: MedicalSystem; condition: string; empty?: boolean }> = ({ system, condition, empty }) => (
  <div className="space-y-1 text-slate-600">
    {empty && <p>ยังไม่มีข้อมูลที่คณะผู้ทบทวนตรวจแล้ว</p>}
    <p className="text-xs font-semibold">แหล่ง Guideline ทางการ{SYSTEM_TH[system]}:</p>
    <div className="flex flex-wrap gap-1">
      {GUIDELINE_SOURCES[system].map((src) => (
        <a key={src.url} href={src.url} target="_blank" rel="noreferrer" title={src.note} className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-xs underline">
          {src.name}
        </a>
      ))}
      <a href={guidelineSearchUrl(system, condition)} target="_blank" rel="noreferrer" className="rounded border border-emerald-300 bg-white px-1.5 py-0.5 text-xs font-semibold text-emerald-800 underline">
        ค้น Guideline{SYSTEM_TH[system]}ใน PubMed
      </a>
    </div>
  </div>
);
