import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, FileText, FlaskConical, Loader2, Search, Users } from 'lucide-react';
import { CONDITIONS, EvidenceArticle, EvidenceResult, HERB_OPTIONS, herbForName, searchHerbEvidence, TIER_LABEL } from '../../services/carebridge/herbEvidence';
import { AbstractSummary, fetchAbstracts, overviewOf } from '../../services/carebridge/abstracts';
import {
  CERTAINTY_TH,
  Certainty,
  consensusOf,
  evidenceReviews,
  guidelineReadiness,
  loadReviewer,
  ROLE_TH,
  ReviewerRole,
  saveReviewer,
  topicKeyOf,
  useReviews,
  Verdict,
  VERDICT_TH,
} from '../../services/carebridge/evidenceReviews';

const TIER_CLS = { A: 'bg-emerald-700 text-white', B: 'bg-sky-700 text-white', C: 'bg-slate-500 text-white', PRECLINICAL: 'bg-amber-100 text-amber-900 border border-amber-300' };
const VERDICT_CLS: Record<Verdict, string> = { SUPPORTS: 'bg-emerald-50 text-emerald-800', NO_EFFECT: 'bg-slate-100 text-slate-700', UNCERTAIN: 'bg-amber-50 text-amber-800', HARM_SIGNAL: 'bg-rose-50 text-rose-800' };

/**
 * Evidence finder for one herb: live PubMed search ranked by study type (the automatic heuristic engine),
 * extractive abstract summaries, clinician peer review per article, and a guideline draft once reviews suffice.
 */
export const HerbEvidenceSearch: React.FC<{ initialHerb?: string | null; initialCondition?: string | null }> = ({ initialHerb, initialCondition }) => {
  const [herbId, setHerbId] = useState(() => (initialHerb && herbForName(initialHerb)?.id) || HERB_OPTIONS[1]?.id || HERB_OPTIONS[0].id);
  const [condition, setCondition] = useState(initialCondition ?? '');
  const [result, setResult] = useState<EvidenceResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreclinical, setShowPreclinical] = useState(false);
  const [summaries, setSummaries] = useState<Map<string, AbstractSummary> | null>(null);
  const [sumBusy, setSumBusy] = useState(false);
  const [reviewer, setReviewer] = useState(loadReviewer);
  const reviews = useReviews();
  const herb = HERB_OPTIONS.find((h) => h.id === herbId)!;
  const topicKey = topicKeyOf(herbId, condition);
  const topicReviews = useMemo(() => reviews.filter((r) => r.topicKey === topicKey), [reviews, topicKey]);
  const readiness = guidelineReadiness(topicReviews);

  const run = async () => {
    setBusy(true);
    setError(null);
    setSummaries(null);
    try {
      setResult(await searchHerbEvidence(herb, condition));
    } catch {
      setError('เชื่อมต่อ PubMed ไม่ได้ตอนนี้ ลองใหม่ หรือใช้ลิงก์ค้นหาด้านล่าง');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (initialHerb) void run();
    // run once when opened with a herb from a patient record
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shown = result?.articles.filter((a) => showPreclinical || a.tier !== 'PRECLINICAL') ?? [];
  const hiddenPre = (result?.articles ?? []).filter((a) => a.tier === 'PRECLINICAL').length;
  const ov = result ? overviewOf(result.articles) : null;

  const loadSummaries = async () => {
    setSumBusy(true);
    try {
      setSummaries(await fetchAbstracts(shown.slice(0, 15).map((a) => a.pmid)));
    } catch {
      setError('ดึงบทคัดย่อจาก PubMed ไม่ได้ตอนนี้');
    } finally {
      setSumBusy(false);
    }
  };

  return (
    <section className="space-y-3 rounded-2xl border border-emerald-200 bg-white p-4">
      <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
        <FlaskConical className="h-5 w-5 text-emerald-700" /> หลักฐานวิจัยตามสมุนไพร (ค้นจาก PubMed สด)
      </h2>
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <label className="text-sm">
          <span className="font-semibold text-slate-700">สมุนไพร / ตำรับ</span>
          <select className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2" value={herbId} onChange={(e) => setHerbId(e.target.value)}>
            {HERB_OPTIONS.map((h) => (
              <option key={h.id} value={h.id}>
                {h.thaiName}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="font-semibold text-slate-700">ภาวะ/โรค (ไม่บังคับ)</span>
          <select className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2" value={condition} onChange={(e) => setCondition(e.target.value)}>
            <option value="">ทุกภาวะ</option>
            {CONDITIONS.map((c) => (
              <option key={c.en} value={c.en}>
                {c.th} ({c.en})
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={run} disabled={busy} className="mt-auto flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} ค้นหลักฐาน
        </button>
      </div>
      <p className="text-xs text-slate-500">คำค้น: {herb.terms.join(', ')} · เฉพาะ meta-analysis, systematic review, RCT, clinical trial และแนวทางเวชปฏิบัติใน PubMed</p>

      <div className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-2 text-sm">
        <Users className="h-4 w-4 text-slate-500" />
        <span className="font-semibold">ผู้รีวิว:</span>
        <input
          className="w-40 rounded-lg border border-slate-300 px-2 py-1"
          placeholder="ชื่อ (สาธิต)"
          value={reviewer.name}
          onChange={(e) => {
            const v = { ...reviewer, name: e.target.value };
            setReviewer(v);
            saveReviewer(v);
          }}
        />
        <select
          className="rounded-lg border border-slate-300 px-2 py-1"
          value={reviewer.role}
          onChange={(e) => {
            const v = { ...reviewer, role: e.target.value as ReviewerRole };
            setReviewer(v);
            saveReviewer(v);
          }}
        >
          {(Object.keys(ROLE_TH) as ReviewerRole[]).map((r) => (
            <option key={r} value={r}>
              {ROLE_TH[r]}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="rounded-lg bg-rose-50 p-2 text-sm text-rose-800">{error}</p>}

      {result && ov && (
        <div className="space-y-3">
          <div className="grid gap-2 rounded-xl border border-slate-200 p-3 text-sm sm:grid-cols-2">
            <div>
              <p className="font-bold text-slate-900">ภาพรวมหลักฐาน (สรุปคร่าว ๆ)</p>
              <p>
                พบ {result.total} รายการใน PubMed · ดู {ov.total} รายการแรก: ระดับ A {ov.byTier.A} · RCT {ov.byTier.B} · คลินิกอื่น {ov.byTier.C} · สัตว์/เซลล์ {ov.byTier.PRECLINICAL}
              </p>
              {ov.yearRange && (
                <p className="text-xs text-slate-500">
                  ปีที่ตีพิมพ์ {ov.yearRange[0]}–{ov.yearRange[1]}
                </p>
              )}
            </div>
            <div>
              <p className="font-bold text-slate-900">ข้อจำกัดของหลักฐาน</p>
              <ul className="list-disc pl-5 text-xs text-slate-700">
                {ov.limitations.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={loadSummaries} disabled={sumBusy || shown.length === 0} className="flex min-h-[38px] items-center gap-1.5 rounded-xl border border-emerald-300 px-3 text-sm font-semibold text-emerald-800 disabled:opacity-50">
              {sumBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />} ดูสรุปย่อจากบทคัดย่อ
            </button>
            {hiddenPre > 0 && (
              <button type="button" className="text-xs font-semibold text-amber-700 underline" onClick={() => setShowPreclinical((v) => !v)}>
                {showPreclinical ? 'ซ่อน' : 'แสดง'}งานในสัตว์/เซลล์ {hiddenPre} รายการ
              </button>
            )}
          </div>

          <GuidelineBar ready={readiness.ready} missing={readiness.missing} reviewed={readiness.reviewedArticles} herbId={herbId} condition={condition} />

          {shown.length === 0 && <p className="text-sm text-slate-600">ไม่พบงานวิจัยในคนตามเงื่อนไขนี้ (ไม่ได้แปลว่าไม่มีความเสี่ยงหรือไม่ได้ผล)</p>}
          <ul className="space-y-2">
            {shown.map((a) => (
              <ArticleCard
                key={a.pmid}
                a={a}
                summary={summaries?.get(a.pmid)}
                reviews={topicReviews.filter((r) => r.pmid === a.pmid)}
                reviewer={reviewer}
                topicKey={topicKey}
              />
            ))}
          </ul>
          <p className="text-xs text-slate-500">
            ดึงจาก PubMed เมื่อ {new Date(result.fetchedAt).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })} · จัดอันดับอัตโนมัติตามชนิดการศึกษา (Automatic Heuristic Engine) · สรุปย่อเป็นข้อความจากบทคัดย่อของผู้วิจัยเอง ไม่ได้แต่งหรือแปลความ ·
            ต้องอ่านต้นฉบับก่อนใช้ตัดสินใจ
          </p>
        </div>
      )}
    </section>
  );
};

const GuidelineBar: React.FC<{ ready: boolean; missing: string[]; reviewed: number; herbId: string; condition: string }> = ({ ready, missing, reviewed, herbId, condition }) => (
  <div className={`rounded-xl border p-3 text-sm ${ready ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
    <p className="font-bold text-slate-900">จากรีวิวสู่ Guideline: รีวิวครบแล้ว {reviewed} ฉบับ</p>
    {ready ? (
      <Link to={`/guidelines/new?herb=${herbId}&condition=${encodeURIComponent(condition)}`} className="mt-1 inline-flex min-h-[38px] items-center rounded-xl bg-emerald-700 px-3 font-bold text-white">
        สร้างร่าง Guideline จากรีวิว
      </Link>
    ) : (
      <ul className="mt-1 list-disc pl-5 text-xs text-slate-600">
        {missing.map((m) => (
          <li key={m}>{m}</li>
        ))}
      </ul>
    )}
  </div>
);

const ArticleCard: React.FC<{
  a: EvidenceArticle;
  summary?: AbstractSummary;
  reviews: ReturnType<typeof evidenceReviews.all>;
  reviewer: { name: string; role: ReviewerRole };
  topicKey: string;
}> = ({ a, summary, reviews, reviewer, topicKey }) => {
  const [open, setOpen] = useState(false);
  const [verdict, setVerdict] = useState<Verdict>('UNCERTAIN');
  const [certainty, setCertainty] = useState<Certainty>('LOW');
  const [note, setNote] = useState('');
  const c = consensusOf(reviews);
  return (
    <li className="space-y-2 rounded-xl border border-slate-200 p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${TIER_CLS[a.tier]}`}>{a.tier === 'PRECLINICAL' ? 'ไม่ใช่ในคน' : `ระดับ ${a.tier}`}</span>
        <span className="text-xs text-slate-500">{TIER_LABEL[a.tier]}</span>
        {c.reviewers > 0 && (
          <span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-800">
            รีวิวแล้ว {c.reviewers} คน{c.majority ? ` · ส่วนใหญ่: ${VERDICT_TH[c.majority]}` : ' · ความเห็นยังไม่ตรงกัน'}
          </span>
        )}
      </div>
      <a href={`https://pubmed.ncbi.nlm.nih.gov/${a.pmid}/`} target="_blank" rel="noreferrer" className="block font-semibold text-slate-900 underline decoration-slate-300 hover:text-emerald-800">
        {a.title}
      </a>
      <p className="text-xs text-slate-600">
        {a.journal} · {a.year ?? '-'} · PMID {a.pmid}
        {a.doi && (
          <>
            {' '}
            ·{' '}
            <a href={`https://doi.org/${a.doi}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 underline">
              DOI <ExternalLink className="h-3 w-3" />
            </a>
          </>
        )}
      </p>

      {summary && (
        <div className="space-y-1 rounded-lg bg-emerald-50/60 p-2 text-xs">
          {summary.sizeMentions.length > 0 && <p>ขนาดการศึกษา (จากบทคัดย่อ): {summary.sizeMentions.join(', ')}</p>}
          {summary.keyResult && (
            <p>
              <b>ผลลัพธ์:</b> {summary.keyResult}
            </p>
          )}
          {summary.conclusion && (
            <p>
              <b>ข้อสรุปของผู้วิจัย:</b> {summary.conclusion}
            </p>
          )}
          {!summary.keyResult && !summary.conclusion && <p>ไม่มีบทคัดย่อใน PubMed</p>}
        </div>
      )}

      {reviews.length > 0 && (
        <ul className="space-y-0.5 text-xs">
          {reviews.map((r) => (
            <li key={r.id}>
              <span className={`mr-1 rounded px-1.5 font-semibold ${VERDICT_CLS[r.verdict]}`}>{VERDICT_TH[r.verdict]}</span>
              {r.reviewer} ({ROLE_TH[r.role]}) · ความเชื่อมั่น{CERTAINTY_TH[r.certainty]}
              {r.note && ` · “${r.note}”`}
            </li>
          ))}
        </ul>
      )}

      {open ? (
        <div className="grid gap-2 rounded-lg bg-slate-50 p-2 sm:grid-cols-2">
          <label className="text-xs">
            <span className="font-semibold">ความเห็นต่อประสิทธิผล</span>
            <select className="mt-1 w-full rounded border border-slate-300 px-2 py-1" value={verdict} onChange={(e) => setVerdict(e.target.value as Verdict)}>
              {(Object.keys(VERDICT_TH) as Verdict[]).map((v) => (
                <option key={v} value={v}>
                  {VERDICT_TH[v]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs">
            <span className="font-semibold">ความเชื่อมั่นของหลักฐาน (แบบ GRADE)</span>
            <select className="mt-1 w-full rounded border border-slate-300 px-2 py-1" value={certainty} onChange={(e) => setCertainty(e.target.value as Certainty)}>
              {(Object.keys(CERTAINTY_TH) as Certainty[]).map((v) => (
                <option key={v} value={v}>
                  {CERTAINTY_TH[v]}
                </option>
              ))}
            </select>
          </label>
          <input className="rounded border border-slate-300 px-2 py-1 text-xs sm:col-span-2" placeholder="หมายเหตุสั้น ๆ เช่น กลุ่มตัวอย่างเล็ก ไม่ blind" value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="flex gap-2 sm:col-span-2">
            <button
              type="button"
              disabled={!reviewer.name.trim()}
              onClick={() => {
                evidenceReviews.add({ topicKey, pmid: a.pmid, title: a.title, journal: a.journal, year: a.year, tier: a.tier, reviewer: reviewer.name.trim(), role: reviewer.role, verdict, certainty, note: note.trim() });
                setOpen(false);
                setNote('');
              }}
              className="min-h-[34px] rounded-lg bg-violet-700 px-3 text-xs font-bold text-white disabled:opacity-40"
            >
              บันทึกรีวิว
            </button>
            <button type="button" onClick={() => setOpen(false)} className="min-h-[34px] rounded-lg border border-slate-300 px-3 text-xs">
              ยกเลิก
            </button>
            {!reviewer.name.trim() && <span className="text-xs text-rose-700">ใส่ชื่อผู้รีวิวด้านบนก่อน</span>}
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className="text-xs font-semibold text-violet-700 underline">
          รีวิวงานนี้ (หลังอ่านต้นฉบับ)
        </button>
      )}
    </li>
  );
};
