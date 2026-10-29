import type { EvidenceArticle, EvidenceTier } from './herbEvidence';

// Short research summaries for clinicians, taken from the PubMed abstract itself (NCBI efetch). It is extractive:
// the "สรุป" is the authors' own conclusion and result sentences, plus numbers found in the text. Nothing is
// paraphrased or generated, so it cannot invent a finding; clinicians still read the full abstract or paper.

const EUTILS = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';

export interface AbstractSection {
  label: string;
  text: string;
}

export interface AbstractSummary {
  pmid: string;
  sections: AbstractSection[];
  /** authors' conclusion (CONCLUSION(S) section, or the last two sentences of an unstructured abstract) */
  conclusion: string | null;
  /** first part of the RESULTS section */
  keyResult: string | null;
  /** "n = 1,234 participants", "12 RCTs" … found verbatim in the abstract */
  sizeMentions: string[];
  /** sentences about adverse events / safety / tolerability, verbatim */
  safetySentences: string[];
}

const SAFETY_RE = /adverse|side[- ]effect|safety|\bsafe\b|tolera(b|nce|ted)|toxicit|gastrointestinal|bleeding|hepatotox|liver (injury|enzyme)|nausea|vomit|diarrh|flatulence|dyspeps|rash|dizz/i;

const decode = (s: string) =>
  s
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

const SIZE_RE = /\b(?:n\s*=\s*)?(\d{1,3}(?:,\d{3})+|\d{2,6})\s+(patients|participants|subjects|adults|individuals|people|women|men|children|RCTs|randomi[sz]ed controlled trials|trials|studies)\b/gi;

/** Split at ". " followed by a capital letter or bracket, so "0.5" or "vs. placebo" do not end a sentence */
function sentences(text: string): string[] {
  return text.split(/(?<=[.!?])\s+(?=[A-Z(\[])/).map((s) => s.trim()).filter(Boolean);
}

function firstSentences(text: string, n: number): string {
  return sentences(text).slice(0, n).join(' ');
}

/** Parse an efetch PubmedArticleSet XML into summaries (regex based so it also runs outside the browser) */
export function parseAbstracts(xml: string): AbstractSummary[] {
  const out: AbstractSummary[] = [];
  for (const block of xml.split('<PubmedArticle>').slice(1)) {
    const pmid = block.match(/<PMID[^>]*>(\d+)<\/PMID>/)?.[1];
    if (!pmid) continue;
    const sections: AbstractSection[] = [];
    for (const m of block.matchAll(/<AbstractText([^>]*)>([\s\S]*?)<\/AbstractText>/g)) {
      const label = m[1].match(/Label="([^"]+)"/)?.[1] ?? '';
      const text = decode(m[2]);
      if (text) sections.push({ label: label.toUpperCase(), text });
    }
    const all = sections.map((s) => s.text).join(' ');
    const concl = sections.find((s) => /CONCLUSION|INTERPRETATION/.test(s.label));
    const results = sections.find((s) => /RESULT|FINDING/.test(s.label));
    let conclusion = concl?.text ?? null;
    if (!conclusion && sections.length === 1) {
      conclusion = sentences(all).slice(-2).join(' ') || null;
    }
    const sizeMentions = [...new Set([...all.matchAll(SIZE_RE)].map((m) => m[0].trim()))].slice(0, 4);
    const safetySentences = sections
      .filter((s) => !/BACKGROUND|OBJECTIVE|INTRODUCTION|METHOD/.test(s.label))
      .flatMap((s) => sentences(s.text))
      .filter((x) => SAFETY_RE.test(x))
      .slice(0, 2);
    out.push({ pmid, sections, conclusion, keyResult: results ? firstSentences(results.text, 2) : null, sizeMentions, safetySentences });
  }
  return out;
}

export async function fetchAbstracts(pmids: string[], fetchImpl: typeof fetch = fetch): Promise<Map<string, AbstractSummary>> {
  const result = new Map<string, AbstractSummary>();
  if (pmids.length === 0) return result;
  const res = await fetchImpl(`${EUTILS}/efetch.fcgi?db=pubmed&rettype=abstract&retmode=xml&tool=vejvivat-demo&id=${pmids.join(',')}`);
  if (!res.ok) throw new Error(`PubMed ${res.status}`);
  for (const s of parseAbstracts(await res.text())) result.set(s.pmid, s);
  return result;
}

export interface EvidenceOverview {
  total: number;
  byTier: Record<EvidenceTier, number>;
  humanStudies: number;
  yearRange: [number, number] | null;
  /** automatic limitations, phrased for clinicians */
  limitations: string[];
}

/** Overview of the retrieved set; limitations are rules on counts, not judgements about any one paper */
export function overviewOf(articles: EvidenceArticle[]): EvidenceOverview {
  const byTier: Record<EvidenceTier, number> = { A: 0, B: 0, C: 0, PRECLINICAL: 0 };
  articles.forEach((a) => byTier[a.tier]++);
  const years = articles.map((a) => a.year).filter((y): y is number => !!y);
  const humanStudies = articles.length - byTier.PRECLINICAL;
  const limitations: string[] = [];
  if (humanStudies === 0) limitations.push('ไม่พบงานวิจัยในคนตามเงื่อนไขนี้');
  if (byTier.B < 2) limitations.push('มี RCT น้อยกว่า 2 ฉบับ');
  if (byTier.A === 0) limitations.push('ยังไม่มี systematic review / meta-analysis / แนวทางเวชปฏิบัติ');
  if (byTier.PRECLINICAL > 0) limitations.push(`มีงานในสัตว์/เซลล์ ${byTier.PRECLINICAL} ฉบับ ซึ่งใช้อ้างผลในคนไม่ได้`);
  if (years.length && Math.max(...years) < new Date().getFullYear() - 5) limitations.push('งานล่าสุดเก่ากว่า 5 ปี');
  limitations.push('จัดอันดับจากชนิดการศึกษาเท่านั้น ยังไม่ได้ประเมินคุณภาพ อคติ หรือขนาดผล');
  return { total: articles.length, byTier, humanStudies, yearRange: years.length ? [Math.min(...years), Math.max(...years)] : null, limitations };
}
