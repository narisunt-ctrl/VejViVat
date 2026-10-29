import { describe, it, expect } from 'vitest';
import { project, SCENARIOS, simulatedClinicRevenue, Assumptions } from '../services/business/revenueModel';

const base: Assumptions = { ...SCENARIOS.PILOT.a };

describe('revenue simulation', () => {
  it('runs every scenario for the full horizon with consistent totals', () => {
    for (const s of Object.values(SCENARIOS)) {
      const p = project(s.a);
      expect(p.rows).toHaveLength(s.a.months);
      for (const r of p.rows) {
        const sum = r.revenue.clinic + r.revenue.hospital + r.revenue.care + r.revenue.family;
        expect(r.totalRevenue).toBeCloseTo(sum, 6);
        expect(r.profit).toBeCloseTo(r.totalRevenue - r.cost, 6);
        expect(r.clinics).toBeLessThanOrEqual(s.a.clinicsMax + 1e-9);
        expect(r.hospitals).toBeLessThanOrEqual(s.a.hospitalsMax + 1e-9);
      }
      // cash is starting cash plus all profits
      expect(p.rows[p.rows.length - 1].cash).toBeCloseTo(s.a.startingCash + p.rows.reduce((t, r) => t + r.profit, 0), 4);
    }
  });

  it('breakeven is the first month from which every later month is profitable', () => {
    const p = project(SCENARIOS.PROVINCE.a);
    expect(p.breakevenMonth).not.toBeNull();
    const i = p.breakevenMonth! - 1;
    expect(p.rows.slice(i).every((r) => r.profit >= 0)).toBe(true);
    if (i > 0) expect(p.rows[i - 1].profit).toBeLessThan(0);
  });

  it('no partners and a fixed cost never break even and burn the fixed cost', () => {
    const p = project({ ...base, clinicsStart: 0, clinicsPerMonth: 0, hospitalsStart: 0, hospitalsPerQuarter: 0 });
    expect(p.breakevenMonth).toBeNull();
    expect(p.rows[0].totalRevenue).toBe(0);
    expect(p.lowestCash).toBeCloseTo(base.startingCash - base.fixedCost * base.months, 4);
  });

  it('higher churn means fewer clinics; recurring revenue excludes one-time setup fees', () => {
    const low = project({ ...base, churn: 0 });
    const high = project({ ...base, churn: 0.1 });
    expect(high.rows[23].clinics).toBeLessThan(low.rows[23].clinics);
    const p = project({ ...base, hospitalsStart: 1, hospitalsPerQuarter: 0 });
    expect(p.rows[0].revenue.hospital).toBe(base.hospitalFee + base.hospitalSetupFee);
    expect(p.mrrAt(1)).toBeCloseTo(p.rows[0].totalRevenue - base.hospitalSetupFee, 6);
  });

  it('simulated clinic cases are deterministic and use the assumptions', () => {
    const clinics = [
      { id: 'clinic-a', name: 'A', kind: 'CLINIC' },
      { id: 'hosp-b', name: 'B', kind: 'HOSPITAL' },
    ];
    const one = simulatedClinicRevenue(clinics, base);
    expect(simulatedClinicRevenue(clinics, base)).toEqual(one);
    expect(one[0].subscription).toBe(base.clinicFee);
    expect(one[1].subscription).toBe(base.hospitalFee);
    expect(one[0].total).toBe(one[0].subscription + one[0].patients * base.careFeePerPatient);
  });
});
