import { describe, it, expect } from 'vitest';
import { binomial, isCautionRow, medplantDrugKey, medplantHerbFor, medplantMatchesForNames, medplantScreeningRules, MEDPLANT_HERBS, MEDPLANT_ROWS, MEDPLANT_SOURCE, rowsForHerb } from '../domain/medplant';
import { getAllInteractionsDatabase, getScreeningRules, checkHerbDrugInteractions } from '../services/interactionMatcher';
import { FORMULARY_CARDS, HERB_CARDS, MEDPLANT_CARDS, FORBIDDEN_CLAIMS } from '../domain/yai/herbDiscovery';
import { screenPatientInteractions } from '../domain/yai/interactionCheck';
import { createSeedState } from '../data/yai/fixtures';

describe('medplant import', () => {
  it('keeps every row with a normalised severity and an https link to medplant', () => {
    expect(MEDPLANT_ROWS.length).toBe(699);
    expect(MEDPLANT_HERBS.length).toBe(70);
    for (const r of MEDPLANT_ROWS) {
      expect(['HIGH', 'MODERATE', 'LOW', 'UNSPECIFIED']).toContain(r.severity);
      const u = new URL(r.url);
      expect(u.protocol).toBe('https:');
      expect(u.hostname).toBe('medplant.mahidol.ac.th');
    }
    expect(MEDPLANT_ROWS.filter((r) => r.severityRaw === '-').every((r) => r.severity === 'UNSPECIFIED')).toBe(true);
    expect(MEDPLANT_ROWS.filter((r) => r.severityRaw === 'รุนแรงมาก').every((r) => r.severity === 'HIGH')).toBe(true);
    expect(MEDPLANT_SOURCE.reviewStatus).toMatch(/รอ/);
  });

  it('keeps "no effect" and "reduces side effects" apart from cautions', () => {
    const noEffect = MEDPLANT_ROWS.filter((r) => r.effectKind === 'NO_EFFECT_REPORTED');
    expect(noEffect.length).toBeGreaterThan(0);
    expect(noEffect.every((r) => r.effect.startsWith('ไม่'))).toBe(true);
    expect(noEffect.some(isCautionRow)).toBe(false);
    // a mixed finding stays a caution
    expect(MEDPLANT_ROWS.filter((r) => r.effect.includes('ลดฤทธิ์ของยาและเพิ่มผลข้างเคียง')).every((r) => r.effectKind === 'CAUTION')).toBe(true);
    expect(MEDPLANT_ROWS.filter((r) => /ขัดแย้ง/.test(r.effect)).every((r) => r.effectKind === 'CONFLICTING' && isCautionRow(r))).toBe(true);
  });

  it('matches herbs by botanical name, so ขมิ้นอ้อย never stands in for ขมิ้นชัน', () => {
    expect(binomial('Curcuma longa L.')).toBe('curcuma longa');
    expect(binomial('Brassica spp.')).toBeNull();
    const turmeric = medplantHerbFor('ยาแคปซูลขมิ้นชัน', 'Curcuma longa L.')!;
    expect(turmeric.scientificName).toMatch(/^Curcuma longa/);
    expect(medplantHerbFor('ขมิ้นอ้อย', 'Curcuma zedoaria (Burg) Roscoe')!.id).not.toBe(turmeric.id);
    expect(rowsForHerb(turmeric.id).some((r) => /warfarin/i.test(r.drugName))).toBe(true);
  });

  it('gives drug classes no matching key and matches only recorded medicine names', () => {
    expect(medplantDrugKey({ drugName: 'กลุ่มยา: ยาต้านการแข็งตัวของเลือด', drugIsClass: true })).toBeNull();
    expect(medplantDrugKey({ drugName: 'Penicillin G', drugIsClass: false })).toBe('penicillin');
    const garlic = rowsForHerb(medplantHerbFor('กระเทียม', 'Allium sativum L.')!.id);
    expect(medplantMatchesForNames(garlic, ['Warfarin (ยาตัวอย่าง)']).length).toBeGreaterThan(0);
    expect(medplantMatchesForNames(garlic, [])).toHaveLength(0);
  });
});

describe('Yai herb cards with medplant data', () => {
  it('adds herbs that are only in the interaction database and links formulary herbs to it', () => {
    expect(HERB_CARDS.length).toBe(FORMULARY_CARDS.length + MEDPLANT_CARDS.length);
    expect(MEDPLANT_CARDS.length).toBeGreaterThan(40);
    expect(MEDPLANT_CARDS.every((c) => c.source === 'MEDPLANT' && c.medplant.length > 0 && !c.inNationalList && c.listedIndications.length === 0)).toBe(true);
    expect(FORMULARY_CARDS.find((c) => c.thaiName.includes('ขมิ้นชัน'))!.medplant.length).toBeGreaterThan(0);
  });

  it('carries no cure or safety claim in imported text shown to users', () => {
    const text = MEDPLANT_ROWS.map((r) => `${r.effect} ${r.recommendation}`).join(' ');
    expect(text).not.toMatch(FORBIDDEN_CLAIMS);
  });
});

describe('CareBridge screening with medplant rules', () => {
  const base = getAllInteractionsDatabase();
  const extra = medplantScreeningRules(base);

  it('adds only moderate/high cautions with links, never duplicating the reviewed table', () => {
    expect(extra.length).toBeGreaterThan(50);
    expect(extra.every((r) => r.source_db === 'MEDPLANT' && r.source_url?.startsWith('https://medplant.mahidol.ac.th/') && ['HIGH', 'MODERATE'].includes(r.severity_code))).toBe(true);
    expect(extra.some((r) => r.herb_thai_name.length < 3)).toBe(false);
    expect(extra.some((r) => r.drug_generic_name.startsWith('กลุ่มยา'))).toBe(false);
    // ขมิ้น + warfarin is already HDI-001 in the reviewed table
    expect(extra.some((r) => r.herb_thai_name.startsWith('ขมิ้น') && /warfarin/i.test(r.drug_generic_name))).toBe(false);
    expect(getScreeningRules().length).toBe(base.length + extra.length);
  });

  it('flags a medplant pair the reviewed table does not have (garlic + warfarin)', () => {
    const s = createSeedState();
    const screen = screenPatientInteractions(
      {
        medicines: s.medicines,
        journal: [
          {
            ...s.journal![0],
            id: 'j-garlic',
            recordedLocalDate: '2026-10-28',
            status: 'PATIENT_CONFIRMED',
            segments: [{ id: 'g', category: 'FOOD_CONSUMED', text: 'กินกระเทียมดองทุกวัน', correctedByUser: false }],
          },
        ],
        syncedOrders: [],
      },
      getScreeningRules(),
      '2026-10-01'
    );
    const garlic = screen.flags.find((f) => f.rule.herb_thai_name === 'กระเทียม' && /warfarin/i.test(f.rule.drug_generic_name));
    expect(garlic?.rule.source_db).toBe('MEDPLANT');
  });

  it('keeps the existing prescribing check working and adds imported pairs', () => {
    const meds = [{ drug_id: 'X', generic_name: 'Warfarin sodium', strength_mg: 3, timing: 'เย็น' }] as never;
    const turmeric = checkHerbDrugInteractions(meds, '410000000122019150011402', 'ขมิ้นชัน');
    expect(turmeric.filter((m) => !m.interaction.source_db)).toHaveLength(1);
  });
});
