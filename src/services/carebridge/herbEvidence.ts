import formulary from '../../../data/formulary/thai-formulary.json';

// Find published clinical evidence for a Thai herb or formula in PubMed (NCBI E-utilities, MEDLINE-indexed,
// called directly from the browser; NCBI allows it). Results are real PubMed records with PMID/DOI.
// Ranking is automatic and rule-based on the study type (guideline / systematic review / meta-analysis → RCT →
// other clinical trial; animal or cell studies last). It does not read or summarise the papers and it never says a
// herb works: a clinician must read the abstract or full text.

const EUTILS = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';

export interface HerbOption {
  id: string;
  thaiName: string;
  scientificName: string;
  /** English search terms used in PubMed title/abstract */
  terms: string[];
}

// Extra names researchers use (common names, older botanical names, active compounds, formula transliterations)
const EXTRA_TERMS: Record<string, string[]> = {
  ขิง: ['ginger'],
  ขมิ้นชัน: ['turmeric', 'curcumin'],
  ชะเอมเทศ: ['licorice', 'liquorice'],
  มะระขี้นก: ['bitter melon', 'bitter gourd'],
  ฟ้าทะลายโจร: ['andrographolide'],
  กระเทียม: ['garlic'],
  ไพล: ['Zingiber cassumunar', 'plai'],
  ตรีผลา: ['triphala'],
  สหัศธารา: ['Sahasthara', 'Sahatsatara', 'Sahastara'],
  เถาวัลย์เปรียง: ['Derris scandens'],
  บัวบก: ['gotu kola'],
  ชุมเห็ดเทศ: ['Cassia alata'],
  รางจืด: ['Thunbergia laurifolia'],
  มะขามป้อม: ['Phyllanthus emblica', 'amla', 'Emblica officinalis'],
  นวโกฐ: ['Ya-hom Navakot', 'Navakot'],
  อบเชย: ['cinnamon'],
};

function binomial(scientific: string): string | null {
  const m = scientific.match(/^([A-Z][a-z]+ [a-z]+)/);
  return m ? m[1] : null;
}

export const HERB_OPTIONS: HerbOption[] = (formulary as { drug_code_24: string; thai_name: string; scientific_name: string }[])
  .map((f) => {
    const terms = new Set<string>();
    const b = binomial(f.scientific_name);
    if (b) terms.add(b);
    for (const [key, extra] of Object.entries(EXTRA_TERMS)) if (f.thai_name.includes(key)) extra.forEach((t) => terms.add(t));
    return { id: f.drug_code_24, thaiName: f.thai_name, scientificName: f.scientific_name, terms: [...terms] };
  })
  .filter((h) => h.terms.length > 0)
  // one entry per search (the two Andrographis products search the same thing)
  .filter((h, i, all) => all.findIndex((x) => x.terms.join('|') === h.terms.join('|')) === i);

/** Match a medicine name the patient recorded to a formulary herb, e.g. "ขมิ้นชันแคปซูล (ตัวอย่าง)" → ขมิ้นชัน */
export function herbForName(name: string): HerbOption | null {
  const n = name.replace(/\s+/g, '');
  return (
    HERB_OPTIONS.find((h) => Object.keys(EXTRA_TERMS).some((k) => n.includes(k) && h.thaiName.includes(k))) ??
    HERB_OPTIONS.find((h) => n.includes(h.thaiName.replace(/^ยา(แคปซูล)?/, '').split(/[\s/(]/)[0])) ??
    null
  );
}

export const CONDITIONS: { en: string; th: string }[] = [
  { en: 'osteoarthritis', th: 'ข้อเสื่อม' },
  { en: 'dyspepsia', th: 'อาหารไม่ย่อย' },
  { en: 'low back pain', th: 'ปวดหลัง' },
  { en: 'muscle pain', th: 'ปวดกล้ามเนื้อ' },
  { en: 'common cold', th: 'หวัด' },
  { en: 'cough', th: 'ไอ' },
  { en: 'constipation', th: 'ท้องผูก' },
  { en: 'insomnia', th: 'นอนไม่หลับ' },
  { en: 'diabetes', th: 'เบาหวาน' },
  { en: 'hypertension', th: 'ความดันโลหิตสูง' },
  { en: 'hyperlipidemia', th: 'ไขมันในเลือดสูง' },
];

const STUDY_FILTER =
  '(meta-analysis[pt] OR systematic review[pt] OR randomized controlled trial[pt] OR clinical trial[pt] OR practice guideline[pt] OR guideline[pt])';

export function buildQuery(herb: HerbOption, condition?: string): string {
  const herbPart = `(${herb.terms.map((t) => `"${t}"[tiab]`).join(' OR ')})`;
  const cond = condition?.trim() ? ` AND ("${condition.trim()}"[tiab])` : '';
  return `${herbPart}${cond} AND ${STUDY_FILTER}`;
}

export type EvidenceTier = 'A' | 'B' | 'C' | 'PRECLINICAL';
export const TIER_LABEL: Record<EvidenceTier, string> = {
  A: 'A · แนวทางเวชปฏิบัติ / ทบทวนวรรณกรรมอย่างเป็นระบบ / meta-analysis',
  B: 'B · การทดลองแบบสุ่มมีกลุ่มควบคุม (RCT)',
  C: 'C · การศึกษาทางคลินิกอื่น',
  PRECLINICAL: 'ศึกษาในสัตว์หรือเซลล์ ไม่ใช่หลักฐานในคน',
};

export interface EvidenceArticle {
  pmid: string;
  title: string;
  journal: string;
  year: number | null;
  pubTypes: string[];
  doi: string | null;
  tier: EvidenceTier;
  conditionInTitle: boolean;
  score: number;
}

const PRECLINICAL_RE = /\b(rats?|mice|mouse|murine|animal models?|in vitro|cell lines?|zebrafish|rabbits?)\b/i;

export function classifyTier(pubTypes: string[], title: string, journal: string): EvidenceTier {
  if (PRECLINICAL_RE.test(title)) return 'PRECLINICAL';
  if (pubTypes.some((t) => /meta-analysis|systematic review|guideline/i.test(t)) || /cochrane/i.test(journal)) return 'A';
  if (pubTypes.some((t) => /randomized controlled trial/i.test(t))) return 'B';
  return 'C';
}

const TIER_WEIGHT: Record<EvidenceTier, number> = { A: 30, B: 20, C: 10, PRECLINICAL: 0 };

export function rankArticles(articles: Omit<EvidenceArticle, 'score'>[], nowYear = new Date().getFullYear()): EvidenceArticle[] {
  return articles
    .map((a) => ({ ...a, score: TIER_WEIGHT[a.tier] + (a.conditionInTitle ? 5 : 0) + (a.year ? Math.max(0, 10 - (nowYear - a.year)) / 2 : 0) }))
    .sort((a, b) => b.score - a.score || (b.year ?? 0) - (a.year ?? 0));
}

interface SummaryRecord {
  uid: string;
  title: string;
  fulljournalname?: string;
  source?: string;
  pubdate?: string;
  pubtype?: string[];
  articleids?: { idtype: string; value: string }[];
}

export function toArticle(r: SummaryRecord, condition?: string): Omit<EvidenceArticle, 'score'> {
  const journal = r.fulljournalname || r.source || '';
  const pubTypes = r.pubtype ?? [];
  const year = Number((r.pubdate ?? '').slice(0, 4)) || null;
  const title = (r.title ?? '').replace(/<[^>]+>/g, '');
  return {
    pmid: r.uid,
    title,
    journal,
    year,
    pubTypes,
    doi: r.articleids?.find((a) => a.idtype === 'doi')?.value ?? null,
    tier: classifyTier(pubTypes, title, journal),
    conditionInTitle: !!condition && title.toLowerCase().includes(condition.toLowerCase()),
  };
}

export interface EvidenceResult {
  query: string;
  total: number;
  articles: EvidenceArticle[];
  fetchedAt: string;
}

/** Search PubMed for one herb (and optional condition), then rank by study type. Throws on network failure. */
export async function searchHerbEvidence(herb: HerbOption, condition?: string, fetchImpl: typeof fetch = fetch): Promise<EvidenceResult> {
  const query = buildQuery(herb, condition);
  const cacheKey = `herb-evidence:${query}`;
  try {
    const cached = globalThis.sessionStorage?.getItem(cacheKey);
    if (cached) return JSON.parse(cached) as EvidenceResult;
  } catch {
    // no cache available
  }
  const search = await fetchImpl(`${EUTILS}/esearch.fcgi?db=pubmed&retmode=json&retmax=25&sort=relevance&tool=vejvivat-demo&term=${encodeURIComponent(query)}`);
  if (!search.ok) throw new Error(`PubMed ${search.status}`);
  const s = (await search.json()) as { esearchresult: { count: string; idlist: string[] } };
  const ids = s.esearchresult.idlist;
  let records: SummaryRecord[] = [];
  if (ids.length) {
    const summary = await fetchImpl(`${EUTILS}/esummary.fcgi?db=pubmed&retmode=json&tool=vejvivat-demo&id=${ids.join(',')}`);
    if (!summary.ok) throw new Error(`PubMed ${summary.status}`);
    const sj = (await summary.json()) as { result: Record<string, SummaryRecord> & { uids: string[] } };
    records = sj.result.uids.map((u) => sj.result[u]);
  }
  const result: EvidenceResult = {
    query,
    total: Number(s.esearchresult.count) || 0,
    articles: rankArticles(records.map((r) => toArticle(r, condition))),
    fetchedAt: new Date().toISOString(),
  };
  try {
    globalThis.sessionStorage?.setItem(cacheKey, JSON.stringify(result));
  } catch {
    // ignore
  }
  return result;
}
