import { describe, it, expect, beforeEach } from 'vitest';
import { DEMO_CLINICS, DEMO_PATIENT_ID } from '../../data/yai/fixtures';
import { findArea } from '../../data/yai/thaiAreas';
import { haversineKm, nearestArea, rankFacilities, zoneTier } from '../../domain/yai/facilityRanking';
import { drugKey, herbAliases, screenPatientInteractions } from '../../domain/yai/interactionCheck';
import { getAllInteractionsDatabase } from '../../services/interactionMatcher';
import { yaiStore } from '../../services/yai/yaiStore';
import { clinicianMessages } from '../../services/yai/clinicianMessages';
import { isCitationLink, searchLinks, TEAM_REFERENCES } from '../../data/carebridge/research';
import { CAREBRIDGE_RECIPIENT_ID } from '../../data/yai/demoLinks';

const home = (province: string, district: string) => {
  const a = findArea(province, district)!;
  return { province, district, lat: a.lat, lng: a.lng, source: 'DISTRICT' as const };
};

describe('facility finder: own zone first, then nearest', () => {
  it('ranks same district, then same province, then same region, then far away', () => {
    const ranked = rankFacilities(DEMO_CLINICS, home('เชียงใหม่', 'สันทราย'));
    const tiers = ranked.map((r) => r.tier);
    expect([...tiers].sort()).toEqual(tiers); // never goes back to a nearer zone
    expect(ranked[0].facility.district).toBe('สันทราย');
    expect(ranked.find((r) => r.facility.province === 'ลำพูน')?.tier).toBe(2);
    expect(ranked[ranked.length - 1].tier).toBe(3);
    // inside a zone, closer first
    const inProvince = ranked.filter((r) => r.tier === 1).map((r) => r.km!);
    expect([...inProvince].sort((a, b) => a - b)).toEqual(inProvince);
  });

  it('a nearby facility in another province does not jump ahead of the home province', () => {
    // Lamphun (other province, same region) is closer to Hang Dong than Chom Thong is, but Chom Thong is in her province
    const ranked = rankFacilities(DEMO_CLINICS, home('เชียงใหม่', 'หางดง'));
    const idx = (id: string) => ranked.findIndex((r) => r.facility.id === id);
    expect(idx('hosp-chomthong')).toBeLessThan(idx('hosp-lamphun'));
  });

  it('has both hospitals with Thai traditional medicine and clinics, all labelled fictional', () => {
    expect(DEMO_CLINICS.some((c) => c.kind === 'HOSPITAL' && c.hasTtmDoctor)).toBe(true);
    expect(DEMO_CLINICS.some((c) => c.kind === 'CLINIC')).toBe(true);
    expect(DEMO_CLINICS.every((c) => c.name.includes('(สมมุติ)') && c.verification === 'DEMO_LISTING')).toBe(true);
  });

  it('distance and zone helpers', () => {
    expect(haversineKm({ lat: 18.79, lng: 98.98 }, { lat: 13.75, lng: 100.5 })).toBeGreaterThan(550);
    expect(nearestArea(18.86, 99.05).district).toBe('สันทราย');
    expect(zoneTier({ province: 'ขอนแก่น', district: 'เมือง' }, { province: 'นครราชสีมา', district: 'เมือง' })).toBe(2);
  });
});

describe('interaction screen for doctor follow-up', () => {
  beforeEach(() => yaiStore.reset());
  const rules = getAllInteractionsDatabase();

  it('flags turmeric reported in the journal with warfarin in the medicine list, citing both sources', () => {
    const s = yaiStore.getState();
    const screen = screenPatientInteractions({ medicines: s.medicines, journal: s.journal ?? [], syncedOrders: [] }, rules, '2000-01-01');
    const hdi1 = screen.flags.find((f) => f.rule.interaction_id === 'HDI-001');
    expect(hdi1).toBeTruthy();
    expect(hdi1!.drugSources.some((d) => d.kind === 'MEDICINE_LIST')).toBe(true);
    expect(hdi1!.herbSources.some((h) => h.kind === 'JOURNAL' || h.kind === 'MEDICINE_LIST')).toBe(true);
    expect(screen.flags[0].rule.severity_code).toBe('HIGH');
    expect(screen.unidentifiedCount).toBe(1); // the unlabeled decoction keeps the screen incomplete
  });

  it('finds nothing without a matching drug, and never claims safety', () => {
    const screen = screenPatientInteractions({ medicines: [], journal: yaiStore.getState().journal ?? [], syncedOrders: [] }, rules, '2000-01-01');
    expect(screen.flags).toHaveLength(0);
    expect(screen.rulesChecked).toBe(rules.length);
  });

  it('alias and drug-key normalisation', () => {
    const plai = rules.find((r) => r.herb_thai_name.includes('ไพล'))!;
    expect(herbAliases(plai)).toContain('ไพล');
    const garlic = rules.find((r) => r.herb_thai_name === 'กระเทียมสกัด')!;
    expect(herbAliases(garlic)).toContain('กระเทียม');
    expect(drugKey(rules.find((r) => r.drug_generic_name.startsWith('Aspirin'))!)).toBe('aspirin');
  });
});

describe('doctor → patient alert', () => {
  beforeEach(() => {
    yaiStore.reset();
    clinicianMessages.reset();
  });

  it('a sent message can be acknowledged once by the patient', () => {
    const m = clinicianMessages.send({
      patientId: DEMO_PATIENT_ID,
      fromRecipientId: CAREBRIDGE_RECIPIENT_ID,
      fromName: 'คลินิกจำลอง',
      kind: 'INTERACTION_ALERT',
      title: 't',
      body: 'b',
      ruleId: 'HDI-001',
    });
    expect(clinicianMessages.forPatient(DEMO_PATIENT_ID)).toHaveLength(1);
    clinicianMessages.acknowledge(m.id);
    const first = clinicianMessages.forPatient(DEMO_PATIENT_ID)[0].acknowledgedAt;
    expect(first).toBeTruthy();
    clinicianMessages.acknowledge(m.id);
    expect(clinicianMessages.forPatient(DEMO_PATIENT_ID)[0].acknowledgedAt).toBe(first);
    expect(clinicianMessages.forPatient('someone-else')).toHaveLength(0);
  });
});

describe('research library', () => {
  it('teammate claims stay pending with no invented DOI/PMID', () => {
    expect(TEAM_REFERENCES.every((r) => r.display_state === 'RESEARCH_REVIEW_PENDING' && r.doi_or_pmid === null && !r.citation_verified)).toBe(true);
  });

  it('search links go to the real databases, newest first on PubMed', () => {
    const links = searchLinks('knee osteoarthritis');
    expect(links[0].url).toBe('https://pubmed.ncbi.nlm.nih.gov/?term=knee%20osteoarthritis&sort=date');
    expect(links.map((l) => new URL(l.url).hostname)).toEqual(['pubmed.ncbi.nlm.nih.gov', 'scholar.google.com', 'clinicaltrials.gov']);
  });

  it('a recorded paper needs a real link or DOI', () => {
    expect(isCitationLink('https://doi.org/10.1234/example-only')).toBe(true);
    expect(isCitationLink('10.1234/example-only')).toBe(true);
    expect(isCitationLink('PMID 12345')).toBe(false);
    expect(isCitationLink('')).toBe(false);
  });
});
