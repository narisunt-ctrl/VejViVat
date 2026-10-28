import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Hospital, LocateFixed, MapPin } from 'lucide-react';
import { DEMO_CLINICS } from '../../data/yai/fixtures';
import { Clinic } from '../../domain/yai/models';
import { Card, DemoBadge, Field, inputCls, PageTitle } from '../../components/yai/ui';
import { useYai, yaiStore } from '../../services/yai/yaiStore';
import { districtsOf, findArea, PROVINCES } from '../../data/yai/thaiAreas';
import { HomeLocation, nearestArea, rankFacilities, ZONE_LABEL, ZoneTier } from '../../domain/yai/facilityRanking';

export const SERVICE_LABEL: Record<Clinic['services'][number], string> = {
  TTM: 'แพทย์แผนไทย',
  PHARMACIST: 'เภสัชกร',
  GERIATRIC: 'ดูแลผู้สูงอายุ',
  MASSAGE: 'นวดไทย',
};
export const ACCESS_LABEL: Record<Clinic['accessibility'][number], string> = {
  WHEELCHAIR: 'รถเข็นเข้าได้',
  CAREGIVER_FRIENDLY: 'ญาติเข้าได้',
  PARKING: 'มีที่จอดรถ',
};

type KindFilter = 'ALL' | 'HOSPITAL' | 'CLINIC';

/** Default home: the patient's recorded province, district centre of "เมือง" (or the first listed district) */
function defaultHome(province: string): HomeLocation {
  const area = findArea(province, 'เมือง') ?? districtsOf(province)[0] ?? findArea('เชียงใหม่', 'เมือง')!;
  return { province: area.province, district: area.district, lat: area.lat, lng: area.lng, source: 'DISTRICT' };
}

export const ClinicsPage: React.FC = () => {
  const patientProvince = useYai((s) => s.patient.province);
  const saved = useYai((s) => s.settings.home);
  const home = saved ?? defaultHome(patientProvince);
  const [kind, setKind] = useState<KindFilter>('ALL');
  const [ttmOnly, setTtmOnly] = useState(true);
  const [q, setQ] = useState('');
  const [geoMsg, setGeoMsg] = useState<string | null>(null);

  const setArea = (province: string, district: string) => {
    const a = findArea(province, district) ?? districtsOf(province)[0];
    if (a) yaiStore.updateSettings({ home: { province: a.province, district: a.district, lat: a.lat, lng: a.lng, source: 'DISTRICT' } });
  };

  const useDevice = () => {
    if (!('geolocation' in navigator)) {
      setGeoMsg('เครื่องนี้หาตำแหน่งไม่ได้ เลือกอำเภอเองได้เลยค่ะ');
      return;
    }
    setGeoMsg('กำลังหาตำแหน่ง…');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const a = nearestArea(lat, lng);
        yaiStore.updateSettings({ home: { province: a.province, district: a.district, lat, lng, source: 'DEVICE' } });
        setGeoMsg(null);
      },
      () => setGeoMsg('ไม่ได้รับอนุญาตให้ใช้ตำแหน่ง เลือกอำเภอเองได้เลยค่ะ'),
      { timeout: 10_000, maximumAge: 600_000 }
    );
  };

  const ranked = useMemo(
    () =>
      rankFacilities(
        DEMO_CLINICS.filter(
          (c) =>
            (kind === 'ALL' || (c.kind ?? 'CLINIC') === kind) &&
            (!ttmOnly || c.hasTtmDoctor || c.services.includes('TTM')) &&
            (!q || c.name.includes(q) || c.district.includes(q) || c.province.includes(q))
        ),
        home
      ),
    [kind, ttmOnly, q, home]
  );
  const tiers = ([0, 1, 2, 3] as ZoneTier[]).map((t) => ({ t, items: ranked.filter((r) => r.tier === t) })).filter((g) => g.items.length);

  return (
    <div className="space-y-5">
      <PageTitle title="ไปหาหมอ" subtitle="โรงพยาบาลที่มีแพทย์แผนไทยและคลินิก เรียงจากใกล้บ้านยายที่สุด" />
      <Link to="/yai/appointments" className="block min-h-[48px] text-lg font-bold text-yai-deep underline">
        ดูคำขอนัดของฉัน →
      </Link>

      <Card className="space-y-3">
        <p className="flex items-center gap-2 text-lg font-bold">
          <MapPin className="h-5 w-5 text-yai-deep" aria-hidden="true" /> บ้านยายอยู่ที่ อ.{home.district} จ.{home.province}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Field label="จังหวัด">
            <select className={inputCls} value={home.province} onChange={(e) => setArea(e.target.value, 'เมือง')}>
              {PROVINCES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </Field>
          <Field label="อำเภอ/เขต">
            <select className={inputCls} value={home.district} onChange={(e) => setArea(home.province, e.target.value)}>
              {districtsOf(home.province).map((a) => (
                <option key={a.district}>{a.district}</option>
              ))}
            </select>
          </Field>
        </div>
        <button type="button" onClick={useDevice} className="inline-flex min-h-[48px] items-center gap-2 text-lg font-bold text-yai-deep underline">
          <LocateFixed className="h-5 w-5" aria-hidden="true" /> ใช้ตำแหน่งปัจจุบันของเครื่อง
        </button>
        {geoMsg && <p className="text-base text-yai-warn">{geoMsg}</p>}
        <p className="text-sm text-yai-ink/70">
          {home.source === 'DEVICE' ? 'ใช้ตำแหน่งจากเครื่อง' : 'ใช้จุดกลางอำเภอ'} · ตำแหน่งเก็บไว้ในเครื่องนี้เท่านั้น ไม่ส่งไปที่ใด · ระยะทางเป็นเส้นตรงโดยประมาณ
        </p>
      </Card>

      <div className="grid grid-cols-3 gap-2" role="group" aria-label="ประเภทสถานพยาบาล">
        {(
          [
            ['ALL', 'ทั้งหมด'],
            ['HOSPITAL', 'โรงพยาบาล'],
            ['CLINIC', 'คลินิก'],
          ] as [KindFilter, string][]
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            aria-pressed={kind === k}
            onClick={() => setKind(k)}
            className={`min-h-[52px] rounded-2xl border-2 text-base font-bold ${kind === k ? 'border-yai-deep bg-yai-mint text-yai-deep' : 'border-yai-ink/15 bg-white'}`}
          >
            {label}
          </button>
        ))}
      </div>
      <label className="flex min-h-[48px] items-center gap-3 text-lg">
        <input type="checkbox" className="h-6 w-6 accent-yai-deep" checked={ttmOnly} onChange={(e) => setTtmOnly(e.target.checked)} />
        เฉพาะที่มีแพทย์แผนไทย
      </label>
      <Field label="ค้นหาชื่อ อำเภอ หรือจังหวัด">
        <input className={inputCls} value={q} onChange={(e) => setQ(e.target.value)} placeholder="เช่น สันทราย" />
      </Field>

      <p className="text-lg font-semibold" role="status">
        พบ {ranked.length} แห่ง
      </p>
      {tiers.map(({ t, items }) => (
        <section key={t} className="space-y-3">
          <h2 className="text-lg font-bold text-yai-deep">{ZONE_LABEL[t]}</h2>
          {items.map(({ facility: c, km }) => (
            <Link key={c.id} to={`/yai/clinics/${c.id}`} className="block">
              <Card className="space-y-2 hover:border-yai-teal">
                <div className="flex items-start justify-between gap-2">
                  <p className="flex items-start gap-2 text-xl font-bold">
                    {c.kind === 'HOSPITAL' ? (
                      <Hospital className="mt-1 h-6 w-6 shrink-0 text-sky-700" aria-label="โรงพยาบาล" />
                    ) : (
                      <Building2 className="mt-1 h-6 w-6 shrink-0 text-yai-deep" aria-label="คลินิก" />
                    )}
                    {c.name}
                  </p>
                  <DemoBadge className="shrink-0" />
                </div>
                <p className="text-base text-yai-ink/75">
                  อ.{c.district} จ.{c.province}
                  {km !== null && <b className="ml-2 text-yai-ink">ประมาณ {km < 10 ? km.toFixed(1) : Math.round(km)} กม.</b>}
                </p>
                {c.hours && <p className="text-sm text-yai-ink/70">เวลาทำการ: {c.hours} (ข้อมูลจำลอง)</p>}
                <div className="flex flex-wrap gap-1.5">
                  {c.services.map((s) => (
                    <span key={s} className="rounded-full bg-yai-mint px-2.5 py-0.5 text-sm font-semibold text-yai-deep">
                      {SERVICE_LABEL[s]}
                    </span>
                  ))}
                  {c.accessibility.map((a) => (
                    <span key={a} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-sm text-slate-700">
                      {ACCESS_LABEL[a]}
                    </span>
                  ))}
                </div>
              </Card>
            </Link>
          ))}
        </section>
      ))}
      <p className="text-sm text-yai-ink/60">รายชื่อโรงพยาบาลและคลินิกทั้งหมดเป็นชื่อสมมุติเพื่อการสาธิต ยังไม่ได้ตรวจสอบใบอนุญาตหรือบริการจริง</p>
    </div>
  );
};
