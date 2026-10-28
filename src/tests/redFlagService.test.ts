import { describe, it, expect } from 'vitest';
import { RedFlagService } from '../services/redFlagService';
import { SyntheticCase } from '../types/patient';

describe('RedFlagService', () => {
  const baseCase: SyntheticCase = {
    case_id: 'TEST-001',
    patient_info: {
      hn: 'HN-9999',
      name: 'นายทดสอบ ปลอดภัย',
      gender: 'ชาย',
      sex_code: '1',
      age: 45,
      birth_date: '1981-01-01',
      province: 'กรุงเทพมหานคร',
      province_code: '10',
      region: 'กลาง',
      occupation: 'รับจ้าง',
      birth_element: 'ปถวีธาตุ',
    },
    current_encounter: {
      vn: 'VN-001',
      date: '2026-10-18',
      time: '10:00',
      season: 'ฤดูฝน',
      ambient_context: {
        location: 'กทม.',
        latitude: 13.7,
        longitude: 100.5,
        temperature_c: 32,
        relative_humidity: 65,
        weather_condition: 'แจ่มใส',
        kala_period: 'กาล 2',
      },
      chief_complaint: 'ปวดตึงบ่า',
      vitals: {
        btemp: 36.6,
        sbp: 120,
        dbp: 80,
        pr: 72,
        rr: 18,
        weight_kg: 65,
        height_cm: 170,
        bmi: 22.5,
      },
      symptoms: ['ปวดตึงบ่า ต้นคอ'],
    },
    chronic_diseases: [],
    current_medications: [],
    intended_ttm_prescription: {
      drug_code_24: '410000000102019150011401',
      herb_name: 'ขมิ้นชัน',
      dose_per_admin: 2,
      unit: 'แคปซูล',
      frequency_per_day: 3,
      timing: 'หลังอาหาร',
      days: 7,
      total_dispensed: 42,
      calculated_daily_dose_units: 6,
      calculated_daily_dose_mg: 3000,
      instruction: 'กินหลังอาหาร',
      is_overdose_demo: false,
    },
    planned_procedure: {
      code: '9007710',
      name: 'นวดไทยเพื่อการบำบัดรักษา',
      fee: 250,
    },
    expected_demo_outcome: {
      interaction_level: 'ไม่มีข้อมูล',
      interaction_count: 0,
      dosage_warning: 'ปกติ',
      smutthan_dominant: 'วาโยธาตุ',
    },
    history_episodes: [],
  };

  it('should evaluate a normal patient as SAFE_FOR_TTM with no procedure restrictions', () => {
    const res = RedFlagService.evaluatePatientSafety(baseCase);
    expect(res.hasCriticalRedFlags).toBe(false);
    expect(res.hasWarnings).toBe(false);
    expect(res.overallStatus).toBe('SAFE_FOR_TTM');
    expect(res.procedureStatus.canPerformMassage).toBe(true);
    expect(res.alerts.length).toBe(0);
  });

  it('should detect Hypertensive Crisis and prohibit all procedures when BP >= 160/100', () => {
    const highBpCase: SyntheticCase = {
      ...baseCase,
      current_encounter: {
        ...baseCase.current_encounter,
        vitals: {
          ...baseCase.current_encounter.vitals,
          sbp: 175,
          dbp: 105,
        },
      },
    };

    const res = RedFlagService.evaluatePatientSafety(highBpCase);
    expect(res.hasCriticalRedFlags).toBe(true);
    expect(res.overallStatus).toBe('EMERGENCY_REFERRAL_REQUIRED');
    expect(res.procedureStatus.canPerformMassage).toBe(false);
    expect(res.alerts.some((a) => a.id === 'RF-BP-STAGE2')).toBe(true);
  });

  it('should detect high fever >= 38.5C as absolute contraindication for massage', () => {
    const feverCase: SyntheticCase = {
      ...baseCase,
      current_encounter: {
        ...baseCase.current_encounter,
        vitals: {
          ...baseCase.current_encounter.vitals,
          btemp: 38.8,
        },
      },
    };

    const res = RedFlagService.evaluatePatientSafety(feverCase);
    expect(res.hasCriticalRedFlags).toBe(true);
    expect(res.procedureStatus.canPerformMassage).toBe(false);
    expect(res.alerts.some((a) => a.id === 'RF-TEMP-HIGH')).toBe(true);
  });

  it('should detect Acute Stroke FAST symptoms and trigger emergency referral', () => {
    const strokeCase: SyntheticCase = {
      ...baseCase,
      current_encounter: {
        ...baseCase.current_encounter,
        chief_complaint: 'มีอาการปากเบี้ยวและแขนขาอ่อนแรงครึ่งซีก',
        symptoms: ['อ่อนแรงครึ่งซีก', 'ปากเบี้ยว', 'พูดไม่ชัด'],
      },
    };

    const res = RedFlagService.evaluatePatientSafety(strokeCase);
    expect(res.hasCriticalRedFlags).toBe(true);
    expect(res.overallStatus).toBe('EMERGENCY_REFERRAL_REQUIRED');
    expect(res.alerts.some((a) => a.id === 'RF-SYM-STROKE')).toBe(true);
    expect(res.sbarSummary.situation).toContain('อ่อนแรงครึ่งซีก');
  });

  it('should flag Warfarin anticoagulant use as precaution for massage bleeding', () => {
    const warfarinCase: SyntheticCase = {
      ...baseCase,
      current_medications: [
        {
          drug_id: 'MED-01',
          generic_name: 'Warfarin sodium',
          brand_name: 'Orfarin 3mg',
          dosage_form: 'Tablet',
          strength_mg: 3,
          dose_per_admin_mg: 3,
          frequency_per_day: 1,
          timing: 'ก่อนนอน',
          days: 30,
          calculated_daily_dose_mg: 3,
          route: 'Oral',
        },
      ],
    };

    const res = RedFlagService.evaluatePatientSafety(warfarinCase);
    expect(res.hasWarnings).toBe(true);
    expect(res.alerts.some((a) => a.id === 'RF-MED-WARFARIN')).toBe(true);
  });

  it('does not treat missing vitals as normal readings', () => {
    const missingCase: SyntheticCase = {
      ...baseCase,
      current_encounter: {
        ...baseCase.current_encounter,
        vitals: { ...baseCase.current_encounter.vitals, sbp: undefined as unknown as number, dbp: undefined as unknown as number, pr: 0 },
      },
    };
    const res = RedFlagService.evaluatePatientSafety(missingCase);
    expect(res.overallStatus).not.toBe('SAFE_FOR_TTM');
    const missing = res.alerts.find((a) => a.id === 'RF-VITALS-MISSING');
    expect(missing?.title).toContain('ความดันโลหิต');
    expect(missing?.title).toContain('ชีพจร');
    expect(res.sbarSummary.background).toContain('ไม่ได้วัด');
    expect(res.sbarSummary.background).not.toContain('120/80');
  });

  it('still flags a measured crisis when another vital is missing', () => {
    const res = RedFlagService.evaluatePatientSafety({
      ...baseCase,
      current_encounter: {
        ...baseCase.current_encounter,
        vitals: { ...baseCase.current_encounter.vitals, sbp: 185, dbp: undefined as unknown as number },
      },
    });
    expect(res.alerts.some((a) => a.id === 'RF-BP-CRISIS')).toBe(true);
    expect(res.hasCriticalRedFlags).toBe(true);
  });
});
