import { describe, it, expect, beforeEach } from 'vitest';
import { buildQuery, HERB_OPTIONS } from '../../services/carebridge/herbEvidence';
import { parseAbstracts } from '../../services/carebridge/abstracts';
import { toFhirPlanDefinition } from '../../services/carebridge/fhirExport';
import { guidelines, topicKeyOf } from '../../services/carebridge/evidenceReviews';
import { GUIDELINE_SOURCES, guidelineSearchUrl } from '../../data/carebridge/guidelineSources';
import { suggestSegments } from '../../services/yai/healthTextClassifier';
import { ALL_CATEGORIES, CATEGORY_LABEL } from '../../domain/yai/journal';

const turmeric = HERB_OPTIONS.find((h) => h.thaiName.includes('ขมิ้นชัน'))!;

describe('holistic journal', () => {
  it('records mind, sleep, movement and life context as their own categories', () => {
    expect(ALL_CATEGORIES).toEqual(expect.arrayContaining(['MOOD', 'SLEEP', 'ACTIVITY', 'LIFE_CONTEXT']));
    expect(ALL_CATEGORIES.every((c) => CATEGORY_LABEL[c])).toBe(true);
    expect(suggestSegments('วันนี้เหงา')[0].category).toBe('MOOD');
    expect(suggestSegments('ตื่นกลางดึกบ่อย')[0].category).toBe('SLEEP');
    // a symptom still wins when the sentence is about pain
    expect(suggestSegments('เดินแล้วเข่าขัด')[0].category).toBe('SYMPTOM');
  });
});

describe('Thai evidence and comparisons with modern drugs', () => {
  it('adds a Thai filter and a modern comparator to the PubMed query', () => {
    const q = buildQuery(turmeric, 'osteoarthritis', { thaiOnly: true, comparator: 'diclofenac' });
    expect(q).toContain('(Thailand[ad] OR Thai[tiab])');
    expect(q).toContain('("diclofenac"[tiab])');
    expect(buildQuery(turmeric)).not.toContain('Thailand');
  });

  it('pulls safety sentences from results and conclusions only, verbatim', () => {
    const xml = `<PubmedArticleSet><PubmedArticle><MedlineCitation><PMID>9</PMID><Article><Abstract>
<AbstractText Label="BACKGROUND">NSAIDs cause gastrointestinal adverse events.</AbstractText>
<AbstractText Label="RESULTS">Pain fell similarly in both groups. Gastrointestinal adverse events were fewer with turmeric than with diclofenac. Liver enzymes were normal.</AbstractText>
<AbstractText Label="CONCLUSIONS">Turmeric was well tolerated.</AbstractText>
</Abstract></Article></MedlineCitation></PubmedArticle></PubmedArticleSet>`;
    const [s] = parseAbstracts(xml);
    expect(s.safetySentences).toEqual(['Gastrointestinal adverse events were fewer with turmeric than with diclofenac.', 'Liver enzymes were normal.']);
    expect(s.safetySentences.join(' ')).not.toContain('NSAIDs cause'); // background is not a finding
  });
});

describe('official guideline sources and FHIR export', () => {
  beforeEach(() => guidelines.reset());

  it('links each medical system to official sources and a PubMed guideline search', () => {
    for (const sys of ['THAI', 'MODERN', 'CHINESE'] as const) {
      expect(GUIDELINE_SOURCES[sys].length).toBeGreaterThan(0);
      expect(GUIDELINE_SOURCES[sys].every((s) => /^https?:\/\//.test(s.url))).toBe(true);
    }
    const tcm = decodeURIComponent(guidelineSearchUrl('CHINESE', 'osteoarthritis'));
    expect(tcm).toContain('"Medicine, Chinese Traditional"[mh]');
    expect(tcm).toContain('"osteoarthritis"[tiab]');
    expect(decodeURIComponent(guidelineSearchUrl('THAI', '', ['Curcuma longa']))).toContain('Thailand[ad]');
  });

  it('exports a guideline as a FHIR R4 PlanDefinition with PubMed citations, tagged as test data', () => {
    const g = guidelines.create({
      topicKey: topicKeyOf('h', 'osteoarthritis'),
      herbId: 'h',
      herbThai: 'ยาแคปซูลขมิ้นชัน',
      condition: 'osteoarthritis',
      recommendation: 'คณะผู้ทบทวนเขียน',
      modern: { text: 'standard care', citation: '10.1234/example-only' },
      chinese: { text: '', citation: '' },
      benefitsNote: '',
      harmsNote: '',
      evidencePmids: ['111', '222'],
      authors: [{ name: 'a', role: 'MODERN' }],
    });
    const fhir = toFhirPlanDefinition(g, null);
    expect(fhir.resourceType).toBe('PlanDefinition');
    expect(fhir.status).toBe('draft');
    expect(fhir.meta.tag[0].code).toBe('HTEST');
    expect(fhir.relatedArtifact.filter((r) => r.type === 'citation').map((r) => r.url)).toEqual(['https://pubmed.ncbi.nlm.nih.gov/111/', 'https://pubmed.ncbi.nlm.nih.gov/222/']);
    expect(fhir.relatedArtifact.find((r) => r.display === 'แผนปัจจุบัน')?.url).toBe('https://doi.org/10.1234/example-only');
    expect(fhir.action[0].description).toBe('คณะผู้ทบทวนเขียน');
  });
});
