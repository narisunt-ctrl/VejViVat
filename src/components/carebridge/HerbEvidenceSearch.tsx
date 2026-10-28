import React, { useEffect, useState } from 'react';
import { ExternalLink, FlaskConical, Loader2, Search } from 'lucide-react';
import { CONDITIONS, EvidenceResult, HERB_OPTIONS, herbForName, searchHerbEvidence, TIER_LABEL } from '../../services/carebridge/herbEvidence';

const TIER_CLS = { A: 'bg-emerald-700 text-white', B: 'bg-sky-700 text-white', C: 'bg-slate-500 text-white', PRECLINICAL: 'bg-amber-100 text-amber-900 border border-amber-300' };

/** Evidence finder for one herb: live PubMed search, ranked by study type; the clinician reads and judges */
export const HerbEvidenceSearch: React.FC<{ initialHerb?: string | null; initialCondition?: string | null }> = ({ initialHerb, initialCondition }) => {
  const [herbId, setHerbId] = useState(() => (initialHerb && herbForName(initialHerb)?.id) || HERB_OPTIONS[1]?.id || HERB_OPTIONS[0].id);
  const [condition, setCondition] = useState(initialCondition ?? '');
  const [result, setResult] = useState<EvidenceResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreclinical, setShowPreclinical] = useState(false);
  const herb = HERB_OPTIONS.find((h) => h.id === herbId)!;

  const run = async () => {
    setBusy(true);
    setError(null);
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
  const hiddenPre = (result?.articles.length ?? 0) - (result?.articles.filter((a) => a.tier !== 'PRECLINICAL').length ?? 0);

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
      <p className="text-xs text-slate-500">
        คำค้น: {herb.terms.join(', ')} · เฉพาะ meta-analysis, systematic review, RCT, clinical trial และแนวทางเวชปฏิบัติที่อยู่ใน PubMed
      </p>

      {error && <p className="rounded-lg bg-rose-50 p-2 text-sm text-rose-800">{error}</p>}
      {result && (
        <div className="space-y-2">
          <p className="text-sm text-slate-700">
            พบ {result.total} รายการใน PubMed · แสดง {result.articles.length} รายการแรก เรียงตามระดับหลักฐานแล้วตามความใหม่
            {hiddenPre > 0 && (
              <button type="button" className="ml-2 text-xs font-semibold text-amber-700 underline" onClick={() => setShowPreclinical((v) => !v)}>
                {showPreclinical ? 'ซ่อน' : 'แสดง'}งานในสัตว์/เซลล์ {hiddenPre} รายการ
              </button>
            )}
          </p>
          {shown.length === 0 && <p className="text-sm text-slate-600">ไม่พบงานวิจัยในคนตามเงื่อนไขนี้ (ไม่ได้แปลว่าไม่มีความเสี่ยงหรือไม่ได้ผล)</p>}
          <ul className="space-y-2">
            {shown.map((a) => (
              <li key={a.pmid} className="rounded-xl border border-slate-200 p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${TIER_CLS[a.tier]}`}>{a.tier === 'PRECLINICAL' ? 'ไม่ใช่ในคน' : `ระดับ ${a.tier}`}</span>
                  <span className="text-xs text-slate-500">{TIER_LABEL[a.tier]}</span>
                </div>
                <a href={`https://pubmed.ncbi.nlm.nih.gov/${a.pmid}/`} target="_blank" rel="noreferrer" className="mt-1 block font-semibold text-slate-900 underline decoration-slate-300 hover:text-emerald-800">
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
              </li>
            ))}
          </ul>
          <p className="text-xs text-slate-500">
            ดึงจาก PubMed เมื่อ {new Date(result.fetchedAt).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })} · จัดอันดับอัตโนมัติตามชนิดการศึกษา ไม่ได้อ่านหรือสรุปเนื้อหา
            ไม่ได้ประเมินคุณภาพหรืออคติของงาน ต้องอ่านบทคัดย่อและต้นฉบับก่อนใช้ประกอบการตัดสินใจ
          </p>
        </div>
      )}
    </section>
  );
};
