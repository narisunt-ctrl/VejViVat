// Revenue simulation for ยายพร้อม × CareBridge working with clinics and hospitals.
// Every number is an editable assumption for planning, not a forecast. Streams are chosen to keep incentives
// clean: patients use the core app free; clinics/hospitals pay for the clinician tools they use.
// Deliberately NOT modelled (and not allowed): pay-to-rank clinic listings, commissions on prescriptions or
// dispensing, selling identifiable patient data.

export interface Assumptions {
  months: number;
  /** partner clinics at month 1, new clinics per month, ceiling */
  clinicsStart: number;
  clinicsPerMonth: number;
  clinicsMax: number;
  /** CareBridge clinic plan (THB / clinic / month) */
  clinicFee: number;
  /** hospitals at month 1 and new hospitals per quarter, ceiling */
  hospitalsStart: number;
  hospitalsPerQuarter: number;
  hospitalsMax: number;
  /** hospital licence (THB / month) and one-time integration (FHIR/HIS) fee */
  hospitalFee: number;
  hospitalSetupFee: number;
  /** active ยายพร้อม patients linked per clinic and per hospital */
  patientsPerClinic: number;
  patientsPerHospital: number;
  /** care-coordination fee the provider pays per active linked patient per month (THB) */
  careFeePerPatient: number;
  /** share of patients' families on an optional family plan, and its price (THB / month) */
  familyAdoption: number;
  familyFee: number;
  /** monthly share of partners that leave (0..1) */
  churn: number;
  /** costs: fixed team + infrastructure (THB / month), cost per active patient, onboarding cost per new partner */
  fixedCost: number;
  costPerPatient: number;
  onboardingCost: number;
  /** cash at month 0 (e.g. grant or seed) */
  startingCash: number;
}

export interface MonthRow {
  month: number;
  clinics: number;
  hospitals: number;
  patients: number;
  revenue: { clinic: number; hospital: number; care: number; family: number };
  totalRevenue: number;
  cost: number;
  profit: number;
  cash: number;
}

export interface Projection {
  rows: MonthRow[];
  breakevenMonth: number | null;
  mrrAt: (month: number) => number;
  lowestCash: number;
}

export type ScenarioId = 'PILOT' | 'PROVINCE' | 'REGION';

const BASE: Omit<Assumptions, 'clinicsStart' | 'clinicsPerMonth' | 'clinicsMax' | 'hospitalsStart' | 'hospitalsPerQuarter' | 'hospitalsMax' | 'fixedCost' | 'startingCash'> = {
  months: 36,
  clinicFee: 1490,
  hospitalFee: 15000,
  hospitalSetupFee: 150000,
  patientsPerClinic: 40,
  patientsPerHospital: 300,
  careFeePerPatient: 30,
  familyAdoption: 0.05,
  familyFee: 49,
  churn: 0.02,
  costPerPatient: 6,
  onboardingCost: 3000,
};

export const SCENARIOS: Record<ScenarioId, { title: string; note: string; a: Assumptions }> = {
  PILOT: {
    title: 'นำร่อง 1 จังหวัด',
    note: 'เริ่มจากโรงพยาบาลชุมชนและคลินิกแผนไทยที่มีแพทย์อาสา (ตามแผน 90 วันของทีม) ทีมเล็ก',
    a: { ...BASE, clinicsStart: 5, clinicsPerMonth: 2, clinicsMax: 40, hospitalsStart: 1, hospitalsPerQuarter: 0.5, hospitalsMax: 4, fixedCost: 180000, startingCash: 1500000 },
  },
  PROVINCE: {
    title: 'ขยายระดับเขตสุขภาพ',
    note: 'หลายจังหวัดในเขตเดียวกัน มีผู้ดูแลลูกค้าและทีมพัฒนาเต็มเวลา',
    a: { ...BASE, clinicsStart: 10, clinicsPerMonth: 6, clinicsMax: 200, hospitalsStart: 2, hospitalsPerQuarter: 2, hospitalsMax: 20, fixedCost: 450000, startingCash: 5000000 },
  },
  REGION: {
    title: 'ระดับประเทศ',
    note: 'ต้องผ่านการรับรองด้านมาตรฐาน/ความปลอดภัยข้อมูล และเชื่อมระบบโรงพยาบาลได้จริง',
    a: { ...BASE, clinicsStart: 20, clinicsPerMonth: 15, clinicsMax: 600, hospitalsStart: 4, hospitalsPerQuarter: 5, hospitalsMax: 60, fixedCost: 1200000, startingCash: 15000000 },
  },
};

export function project(a: Assumptions): Projection {
  const rows: MonthRow[] = [];
  let clinics = 0;
  let hospitals = 0;
  let cash = a.startingCash;
  for (let m = 1; m <= a.months; m++) {
    const prevClinics = clinics;
    const prevHospitals = hospitals;
    const addClinics = m === 1 ? a.clinicsStart : a.clinicsPerMonth;
    const addHospitals = m === 1 ? a.hospitalsStart : m % 3 === 1 ? a.hospitalsPerQuarter * 1 : 0;
    clinics = Math.min(a.clinicsMax, clinics * (1 - a.churn) + addClinics);
    hospitals = Math.min(a.hospitalsMax, hospitals * (1 - a.churn) + addHospitals);
    const newClinics = Math.max(0, clinics - prevClinics * (1 - a.churn));
    const newHospitals = Math.max(0, hospitals - prevHospitals * (1 - a.churn));
    const patients = clinics * a.patientsPerClinic + hospitals * a.patientsPerHospital;
    const revenue = {
      clinic: clinics * a.clinicFee,
      hospital: hospitals * a.hospitalFee + newHospitals * a.hospitalSetupFee,
      care: patients * a.careFeePerPatient,
      family: patients * a.familyAdoption * a.familyFee,
    };
    const totalRevenue = revenue.clinic + revenue.hospital + revenue.care + revenue.family;
    const cost = a.fixedCost + patients * a.costPerPatient + (newClinics + newHospitals) * a.onboardingCost;
    const profit = totalRevenue - cost;
    cash += profit;
    rows.push({ month: m, clinics, hospitals, patients, revenue, totalRevenue, cost, profit, cash });
  }
  // first month from which every later month is profitable
  let breakevenMonth: number | null = null;
  for (let i = rows.length - 1; i >= 0 && rows[i].profit >= 0; i--) breakevenMonth = rows[i].month;
  const recurring = (r: MonthRow) => r.revenue.clinic + r.hospitals * a.hospitalFee + r.revenue.care + r.revenue.family;
  return {
    rows,
    breakevenMonth,
    mrrAt: (month) => (rows[month - 1] ? recurring(rows[month - 1]) : 0),
    lowestCash: Math.min(a.startingCash, ...rows.map((r) => r.cash)),
  };
}

/** Simulated partner clinics: deterministic numbers from the clinic id so the demo is stable (synthetic) */
export function simulatedClinicRevenue(clinics: { id: string; name: string; kind?: string }[], a: Assumptions) {
  return clinics.map((c) => {
    const h = [...c.id].reduce((s, ch) => (s * 31 + ch.charCodeAt(0)) % 997, 7);
    const isHospital = c.kind === 'HOSPITAL';
    const patients = Math.round((isHospital ? a.patientsPerHospital : a.patientsPerClinic) * (0.5 + (h % 100) / 100));
    const subscription = isHospital ? a.hospitalFee : a.clinicFee;
    const care = patients * a.careFeePerPatient;
    return { id: c.id, name: c.name, isHospital, patients, subscription, care, total: subscription + care };
  });
}

export const formatTHB = (v: number) => `${Math.round(v).toLocaleString('th-TH')} บาท`;
export const formatMTHB = (v: number) => `${(v / 1_000_000).toLocaleString('th-TH', { maximumFractionDigits: 2 })} ล้านบาท`;
