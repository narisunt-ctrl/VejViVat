import { describe, it, expect, beforeEach } from 'vitest';
import { overviewOf, parseAbstracts } from '../../services/carebridge/abstracts';
import type { EvidenceArticle } from '../../services/carebridge/herbEvidence';
import {
  ArticleReview,
  canApprove,
  consensusOf,
  evidenceReviews,
  guidelineReadiness,
  guidelines,
  isApproved,
  overallCertainty,
  topicKeyOf,
} from '../../services/carebridge/evidenceReviews';

const XML = `<?xml version="1.0"?><PubmedArticleSet>
<PubmedArticle><MedlineCitation><PMID Version="1">111</PMID><Article><Abstract>
<AbstractText Label="BACKGROUND" NlmCategory="BACKGROUND">Knee pain is common.</AbstractText>
<AbstractText Label="RESULTS" NlmCategory="RESULTS">Ten RCTs with 1,234 participants were included. Turmeric reduced pain versus placebo (SMD &#x2212;0.5). Heterogeneity was high.</AbstractText>
<AbstractText Label="CONCLUSIONS" NlmCategory="CONCLUSIONS">Turmeric <i>may</i> reduce knee pain; certainty is low.</AbstractText>
</Abstract></Article></MedlineCitation></PubmedArticle>
<PubmedArticle><MedlineCitation><PMID Version="1">222</PMID><Article><Abstract>
<AbstractText>An unstructured abstract. It has a method. The trial found no difference. More trials are needed.</AbstractText>
</Abstract></Article></MedlineCitation></PubmedArticle>
</PubmedArticleSet>`;

describe('research summaries come from the abstract text only', () => {
  it('takes the authors’ conclusion and first result sentences, plus sample-size mentions', () => {
    const [a, b] = parseAbstracts(XML);
    expect(a.pmid).toBe('111');
    expect(a.conclusion).toBe('Turmeric may reduce knee pain; certainty is low.');
    expect(a.keyResult).toBe('Ten RCTs with 1,234 participants were included. Turmeric reduced pain versus placebo (SMD −0.5).');
    expect(a.sizeMentions).toContain('1,234 participants');
    expect(b.conclusion).toBe('The trial found no difference. More trials are needed.');
    expect(b.keyResult).toBeNull();
  });

  it('overview counts tiers and states limitations', () => {
    const art = (tier: EvidenceArticle['tier'], year: number): EvidenceArticle => ({ pmid: `${tier}${year}`, title: '', journal: '', year, pubTypes: [], doi: null, tier, conditionInTitle: false, score: 0 });
    const ov = overviewOf([art('B', 2024), art('PRECLINICAL', 2025), art('C', 2010)]);
    expect(ov.byTier).toEqual({ A: 0, B: 1, C: 1, PRECLINICAL: 1 });
    expect(ov.humanStudies).toBe(2);
    expect(ov.limitations.join(' ')).toMatch(/RCT น้อยกว่า 2/);
    expect(ov.limitations.join(' ')).toMatch(/ยังไม่มี systematic review/);
    expect(ov.limitations.join(' ')).toMatch(/สัตว์\/เซลล์ 1/);
  });
});

const topic = topicKeyOf('herb-1', 'osteoarthritis');
const review = (p: Partial<ArticleReview>): Omit<ArticleReview, 'id' | 'at'> => ({
  topicKey: topic,
  pmid: '1',
  title: 't',
  journal: 'j',
  year: 2024,
  tier: 'B',
  reviewer: 'a',
  role: 'MODERN',
  verdict: 'SUPPORTS',
  certainty: 'MODERATE',
  note: '',
  ...p,
});

describe('peer review → guideline', () => {
  beforeEach(() => {
    evidenceReviews.reset();
    guidelines.reset();
  });

  it('one review per reviewer per article; consensus needs a clear majority', () => {
    evidenceReviews.add(review({ reviewer: 'a', verdict: 'UNCERTAIN' }));
    evidenceReviews.add(review({ reviewer: 'a', verdict: 'SUPPORTS' }));
    evidenceReviews.add(review({ reviewer: 'b', role: 'TTM', verdict: 'NO_EFFECT' }));
    const rs = evidenceReviews.forTopic(topic);
    expect(rs).toHaveLength(2);
    expect(consensusOf(rs).majority).toBeNull(); // 1 vs 1
    evidenceReviews.add(review({ reviewer: 'c', role: 'PHARMACIST', verdict: 'SUPPORTS' }));
    expect(consensusOf(evidenceReviews.forTopic(topic)).majority).toBe('SUPPORTS');
  });

  it('a guideline needs 3 human articles with 2+ reviewers each, from both modern and Thai medicine', () => {
    for (const pmid of ['1', '2']) {
      evidenceReviews.add(review({ pmid, reviewer: 'a', role: 'MODERN' }));
      evidenceReviews.add(review({ pmid, reviewer: 'b', role: 'TTM' }));
    }
    // animal studies never count
    evidenceReviews.add(review({ pmid: '3', tier: 'PRECLINICAL', reviewer: 'a' }));
    evidenceReviews.add(review({ pmid: '3', tier: 'PRECLINICAL', reviewer: 'b', role: 'TTM' }));
    expect(guidelineReadiness(evidenceReviews.forTopic(topic)).ready).toBe(false);
    evidenceReviews.add(review({ pmid: '4', reviewer: 'a' }));
    evidenceReviews.add(review({ pmid: '4', reviewer: 'b', role: 'TTM' }));
    const r = guidelineReadiness(evidenceReviews.forTopic(topic));
    expect(r).toMatchObject({ ready: true, reviewedArticles: 3 });
    expect(guidelineReadiness(evidenceReviews.forTopic(topic).filter((x) => x.role !== 'TTM')).missing.join()).toMatch(/แพทย์แผนไทย/);
  });

  it('approval needs both a modern and a Thai traditional medicine doctor; editing resets approval', () => {
    const g = guidelines.create({
      topicKey: topic,
      herbId: 'herb-1',
      herbThai: 'ยาแคปซูลขมิ้นชัน',
      condition: 'osteoarthritis',
      recommendation: '',
      modern: { text: 'standard care', citation: 'not a link' },
      chinese: { text: '', citation: '' },
      benefitsNote: '',
      harmsNote: '',
      evidencePmids: ['1'],
      authors: [],
    });
    expect(canApprove(g, 'x').ok).toBe(false); // no recommendation yet
    guidelines.update(g.id, { recommendation: 'คณะผู้ทบทวนเขียนเอง', modern: { text: 'standard care', citation: 'not a link' } });
    expect(guidelines.approve(g.id, 'x', 'MODERN').reason).toMatch(/ลิงก์หรือ DOI/);
    guidelines.update(g.id, { modern: { text: 'standard care', citation: 'https://example.org/guideline' } });
    expect(guidelines.approve(g.id, 'dr-a', 'MODERN').ok).toBe(true);
    expect(guidelines.get(g.id)!.status).toBe('DRAFT');
    expect(guidelines.approve(g.id, 'dr-a', 'TTM').ok).toBe(false); // same person twice
    expect(guidelines.approve(g.id, 'dr-b', 'TTM').ok).toBe(true);
    expect(guidelines.get(g.id)!.status).toBe('APPROVED');
    guidelines.update(g.id, { harmsNote: 'เพิ่มข้อควรระวัง' });
    expect(guidelines.get(g.id)!.status).toBe('DRAFT');
    expect(guidelines.get(g.id)!.approvals).toHaveLength(0);
    expect(isApproved([{ role: 'MODERN' }, { role: 'PHARMACIST' }])).toBe(false);
  });

  it('overall certainty comes from supporting human-study reviews, very low if none', () => {
    expect(overallCertainty([])).toBe('VERY_LOW');
    const rs = [review({ certainty: 'LOW' }), review({ certainty: 'LOW', reviewer: 'b' }), review({ certainty: 'HIGH', reviewer: 'c', tier: 'PRECLINICAL' })].map((r, i) => ({ ...r, id: String(i), at: '' }));
    expect(overallCertainty(rs)).toBe('LOW');
  });
});
