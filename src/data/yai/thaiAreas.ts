// District centre points (approximate) used to rank facilities by distance from the patient's home area.
// Only the districts used by the demo facilities are listed; coordinates are rough centres, not addresses.

export type ThaiRegion = 'เหนือ' | 'กลาง' | 'ตะวันออกเฉียงเหนือ';

export interface ThaiArea {
  province: string;
  district: string;
  region: ThaiRegion;
  lat: number;
  lng: number;
}

export const THAI_AREAS: ThaiArea[] = [
  { province: 'เชียงใหม่', district: 'เมือง', region: 'เหนือ', lat: 18.79, lng: 98.98 },
  { province: 'เชียงใหม่', district: 'สันทราย', region: 'เหนือ', lat: 18.85, lng: 99.04 },
  { province: 'เชียงใหม่', district: 'หางดง', region: 'เหนือ', lat: 18.69, lng: 98.92 },
  { province: 'เชียงใหม่', district: 'แม่ริม', region: 'เหนือ', lat: 18.91, lng: 98.94 },
  { province: 'เชียงใหม่', district: 'สันกำแพง', region: 'เหนือ', lat: 18.75, lng: 99.12 },
  { province: 'เชียงใหม่', district: 'จอมทอง', region: 'เหนือ', lat: 18.42, lng: 98.68 },
  { province: 'ลำพูน', district: 'เมือง', region: 'เหนือ', lat: 18.58, lng: 99.01 },
  { province: 'กรุงเทพมหานคร', district: 'บางกอกน้อย', region: 'กลาง', lat: 13.77, lng: 100.47 },
  { province: 'กรุงเทพมหานคร', district: 'จตุจักร', region: 'กลาง', lat: 13.83, lng: 100.56 },
  { province: 'กรุงเทพมหานคร', district: 'ปทุมวัน', region: 'กลาง', lat: 13.74, lng: 100.53 },
  { province: 'นนทบุรี', district: 'เมือง', region: 'กลาง', lat: 13.86, lng: 100.51 },
  { province: 'ขอนแก่น', district: 'เมือง', region: 'ตะวันออกเฉียงเหนือ', lat: 16.44, lng: 102.84 },
  { province: 'ขอนแก่น', district: 'บ้านไผ่', region: 'ตะวันออกเฉียงเหนือ', lat: 16.06, lng: 102.73 },
  { province: 'นครราชสีมา', district: 'เมือง', region: 'ตะวันออกเฉียงเหนือ', lat: 14.97, lng: 102.1 },
  { province: 'นครราชสีมา', district: 'ปากช่อง', region: 'ตะวันออกเฉียงเหนือ', lat: 14.71, lng: 101.42 },
];

export const PROVINCES = Array.from(new Set(THAI_AREAS.map((a) => a.province)));
export const districtsOf = (province: string) => THAI_AREAS.filter((a) => a.province === province);
export const findArea = (province: string, district: string) => THAI_AREAS.find((a) => a.province === province && a.district === district) ?? null;
