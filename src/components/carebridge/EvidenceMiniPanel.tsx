import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookCheck, FlaskConical, Loader2 } from 'lucide-react';
import { EvidenceResult, herbForName, searchHerbEvidence } from '../../services/carebridge/herbEvidence';
import { overviewOf } from '../../services/carebridge/abstracts';
import { useGuidelines } from '../../services/carebridge/evidenceReviews';

/**
 * Evidence at the point of prescribing: when a herb is selected on /prescribe, show how much clinical evidence
 * PubMed has (ranked by study type) and whether a clinician-approved guideline exists. No extra clicks or typing.
 */
export const EvidenceMiniPanel: React.FC<{ herbName: string }> = ({ herbName }) => {
  const herb = herbForName(herbName);
  const all = useGuidelines();
  const [result, setResult] = useState<EvidenceResult | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');

  useEffect(() => {
    if (!herb) return;
    let alive = true;
    setState('loading');
    setResult(null);
    searchHerbEvidence(herb)
      .then((r) => alive && (setResult(r), setState('idle')))
      .catch(() => alive && setState('error'));
    return () => {
      alive = false;
    };
  }, [herb?.id]);

  if (!herb) return null;
  const gl = all.filter((g) => g.herbId === herb.id);
  const approved = gl.find((g) => g.status === 'APPROVED');
  const ov = result ? overviewOf(result.articles) : null;
  const top = result?.articles.filter((a) => a.tier !== 'PRECLINICAL').slice(0, 2) ?? [];

  return (
    <section className="space-y-2 rounded-2xl border border-emerald-200 bg-white p-3 text-sm shadow-soft">
      <p className="flex items-center gap-1.5 font-bold text-slate-900">
        <FlaskConical className="h-4 w-4 text-emerald-700" /> หลักฐานของ {herb.thaiName.replace(/^ยา(แคปซูล)?/, '')}
      </p>
      {state === 'loading' && (
        <p className="flex items-center gap-1 text-xs text-slate-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> กำลังค้น PubMed…
        </p>
      )}
      {state === 'error' && <p className="text-xs text-slate-500">ค้น PubMed ไม่ได้ตอนนี้</p>}
      {ov && (
        <>
          <p className="text-xs">
            PubMed {result!.total} รายการ · ระดับ A {ov.byTier.A} · RCT {ov.byTier.B} · คลินิกอื่น {ov.byTier.C}
          </p>
          <ul className="space-y-0.5 text-xs">
            {top.map((a) => (
              <li key={a.pmid}>
                <a href={`https://pubmed.ncbi.nlm.nih.gov/${a.pmid}/`} target="_blank" rel="noreferrer" className="underline">
                  [{a.tier}] {a.title}
                </a>{' '}
                ({a.year})
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="flex items-center gap-1 text-xs">
        <BookCheck className="h-3.5 w-3.5 text-emerald-700" />
        {approved ? (
          <Link to={`/guidelines/${approved.id}`} className="font-semibold text-emerald-800 underline">
            มี Guideline ที่อนุมัติแล้ว (สาธิต)
          </Link>
        ) : gl.length ? (
          <Link to={`/guidelines/${gl[0].id}`} className="underline">
            มีร่าง Guideline รออนุมัติ
          </Link>
        ) : (
          <span className="text-slate-500">ยังไม่มี Guideline ที่แพทย์ทบทวน</span>
        )}
      </p>
      <Link to={`/research?herb=${encodeURIComponent(herb.thaiName)}`} className="text-xs font-semibold text-emerald-700 underline">
        ดูหลักฐานทั้งหมด / รีวิว
      </Link>
    </section>
  );
};
