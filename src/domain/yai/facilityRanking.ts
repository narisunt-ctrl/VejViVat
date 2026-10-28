import type { Clinic } from './models';
import { THAI_AREAS, ThaiArea } from '../../data/yai/thaiAreas';

// Rank hospitals and clinics for the patient: her own zone first (district → province → region), then by
// straight-line distance inside each zone. Pure, so it is unit-tested; the location never leaves the device.

export interface HomeLocation {
  province: string;
  district: string;
  lat: number;
  lng: number;
  /** DISTRICT = picked from the list (district centre), DEVICE = from the browser's location permission */
  source: 'DISTRICT' | 'DEVICE';
}

export type ZoneTier = 0 | 1 | 2 | 3;
export const ZONE_LABEL: Record<ZoneTier, string> = {
  0: 'ในอำเภอเดียวกับยาย',
  1: 'ในจังหวัดเดียวกัน',
  2: 'ในภาคเดียวกัน',
  3: 'ไกลออกไป',
};

export interface RankedFacility {
  facility: Clinic;
  tier: ZoneTier;
  km: number | null;
}

/** Great-circle distance in km */
export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

const regionOf = (province: string) => THAI_AREAS.find((a) => a.province === province)?.region ?? null;

/** Nearest listed district to a device position, so a GPS fix still gets a zone */
export function nearestArea(lat: number, lng: number): ThaiArea {
  return THAI_AREAS.reduce((best, a) => (haversineKm({ lat, lng }, a) < haversineKm({ lat, lng }, best) ? a : best));
}

export function zoneTier(home: Pick<HomeLocation, 'province' | 'district'>, f: Pick<Clinic, 'province' | 'district'>): ZoneTier {
  if (f.province === home.province && f.district === home.district) return 0;
  if (f.province === home.province) return 1;
  const r = regionOf(home.province);
  if (r && r === regionOf(f.province)) return 2;
  return 3;
}

export function rankFacilities(facilities: Clinic[], home: HomeLocation): RankedFacility[] {
  return facilities
    .map((facility) => ({
      facility,
      tier: zoneTier(home, facility),
      km: typeof facility.lat === 'number' && typeof facility.lng === 'number' ? haversineKm(home, { lat: facility.lat, lng: facility.lng }) : null,
    }))
    .sort((a, b) => a.tier - b.tier || (a.km ?? Infinity) - (b.km ?? Infinity) || a.facility.name.localeCompare(b.facility.name, 'th'));
}
