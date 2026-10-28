import { describe, it, expect, beforeEach } from 'vitest';
import { buildQuery, classifyTier, HERB_OPTIONS, herbForName, rankArticles, searchHerbEvidence, toArticle } from '../../services/carebridge/herbEvidence';
import { consults } from '../../services/carebridge/consults';

const turmeric = HERB_OPTIONS.find((h) => h.thaiName.includes('ขมิ้นชัน'))!;

describe('herb evidence search', () => {
  it('maps herbs to scientific and research names', () => {
    expect(turmeric.terms).toEqual(expect.arrayContaining(['Curcuma longa', 'turmeric', 'curcumin']));
    expect(HERB_OPTIONS.find((h) => h.thaiName === 'ยาสหัศธารา')?.terms).toContain('Sahasthara');
    expect(herbForName('ขมิ้นชันแคปซูล (ตัวอย่าง)')?.id).toBe(turmeric.id);
    expect(herbForName('Warfarin (ยาตัวอย่าง)')).toBeNull();
  });

  it('only asks PubMed for clinical study types and guidelines', () => {
    const q = buildQuery(turmeric, 'osteoarthritis');
    expect(q).toContain('"Curcuma longa"[tiab]');
    expect(q).toContain('"osteoarthritis"[tiab]');
    expect(q).toMatch(/meta-analysis\[pt\].*randomized controlled trial\[pt\].*guideline\[pt\]/);
  });

  it('ranks reviews/guidelines above RCTs above other trials, and animal studies last', () => {
    expect(classifyTier(['Systematic Review', 'Meta-Analysis'], 'Curcumin for knee osteoarthritis', 'BMC')).toBe('A');
    expect(classifyTier(['Journal Article'], 'x', 'Cochrane Database Syst Rev')).toBe('A');
    expect(classifyTier(['Randomized Controlled Trial'], 'x', 'J')).toBe('B');
    expect(classifyTier(['Clinical Trial'], 'x', 'J')).toBe('C');
    expect(classifyTier(['Meta-Analysis'], 'Curcumin in MASLD animal models: a meta-analysis', 'J')).toBe('PRECLINICAL');
    const ranked = rankArticles(
      [
        { pmid: '1', title: 'rct', journal: 'J', year: 2025, pubTypes: [], doi: null, tier: 'B', conditionInTitle: false },
        { pmid: '2', title: 'rats', journal: 'J', year: 2026, pubTypes: [], doi: null, tier: 'PRECLINICAL', conditionInTitle: false },
        { pmid: '3', title: 'meta', journal: 'J', year: 2015, pubTypes: [], doi: null, tier: 'A', conditionInTitle: false },
      ],
      2026
    );
    expect(ranked.map((a) => a.pmid)).toEqual(['3', '1', '2']);
  });

  it('turns a PubMed summary into an article with PMID and DOI', () => {
    const a = toArticle(
      { uid: '40731001', title: 'Effect of turmeric products on knee osteoarthritis: a systematic review', fulljournalname: 'BMC complementary medicine and therapies', pubdate: '2025 Jul 29', pubtype: ['Systematic Review'], articleids: [{ idtype: 'doi', value: '10.1234/example-only' }] },
      'osteoarthritis'
    );
    expect(a).toMatchObject({ pmid: '40731001', year: 2025, tier: 'A', doi: '10.1234/example-only', conditionInTitle: true });
  });

  it('calls esearch then esummary and returns ranked records', async () => {
    const calls: string[] = [];
    const fake = (async (url: string) => {
      calls.push(url);
      const body = url.includes('esearch')
        ? { esearchresult: { count: '2', idlist: ['11', '22'] } }
        : {
            result: {
              uids: ['11', '22'],
              '11': { uid: '11', title: 'Turmeric RCT in knee osteoarthritis', source: 'J', pubdate: '2024', pubtype: ['Randomized Controlled Trial'] },
              '22': { uid: '22', title: 'Curcumin meta-analysis', source: 'J', pubdate: '2023', pubtype: ['Meta-Analysis'] },
            },
          };
      return { ok: true, status: 200, json: async () => body } as Response;
    }) as unknown as typeof fetch;
    const r = await searchHerbEvidence(turmeric, 'osteoarthritis', fake);
    expect(calls[0]).toContain('eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi');
    expect(calls[1]).toContain('esummary.fcgi');
    expect(calls[1]).toContain('id=11,22');
    expect(r.total).toBe(2);
    expect(r.articles.map((a) => a.pmid)).toEqual(['22', '11']);
  });

  it('reports a network failure instead of inventing results', async () => {
    const failing = (async () => ({ ok: false, status: 503, json: async () => ({}) }) as Response) as unknown as typeof fetch;
    await expect(searchHerbEvidence(turmeric, 'cough', failing)).rejects.toThrow('PubMed 503');
  });
});

describe('modern → Thai traditional medicine consult', () => {
  beforeEach(() => consults.reset());
  it('a consult can be accepted once and carries the attached rules', () => {
    const c = consults.request({ patientId: 'p1', from: 'แพทย์', question: 'ทบทวนสมุนไพร', ruleIds: ['HDI-001'] });
    expect(consults.all()[0].ruleIds).toEqual(['HDI-001']);
    consults.accept(c.id);
    const at = consults.all()[0].acceptedAt;
    expect(at).toBeTruthy();
    consults.accept(c.id);
    expect(consults.all()[0].acceptedAt).toBe(at);
  });
});
