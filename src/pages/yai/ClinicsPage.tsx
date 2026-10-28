import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { DEMO_CLINICS } from '../../data/yai/fixtures';
import { Clinic } from '../../domain/yai/models';
import { Card, DemoBadge, Field, inputCls, PageTitle } from '../../components/yai/ui';

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

export const ClinicsPage: React.FC = () => {
  const [q, setQ] = useState('');
  const [province, setProvince] = useState('');
  const [service, setService] = useState('');
  const provinces = Array.from(new Set(DEMO_CLINICS.map((c) => c.province)));
  const results = useMemo(
    () =>
      DEMO_CLINICS.filter(
        (c) =>
          (!q || c.name.includes(q) || c.district.includes(q)) &&
          (!province || c.province === province) &&
          (!service || c.services.includes(service as Clinic['services'][number]))
      ),
    [q, province, service]
  );

  return (
    <div className="space-y-5">
      <PageTitle title="ไปหาหมอ" subtitle="ค้นหาคลินิกเข้าร่วม แล้วส่งคำขอนัด" />
      <Link to="/yai/appointments" className="block min-h-[48px] text-lg font-bold text-yai-deep underline">
        ดูคำขอนัดของฉัน →
      </Link>

      <Card className="space-y-3">
        <Field label="ค้นหาชื่อคลินิกหรืออำเภอ">
          <input className={inputCls} value={q} onChange={(e) => setQ(e.target.value)} placeholder="เช่น ใบเตย" />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="จังหวัด">
            <select className={inputCls} value={province} onChange={(e) => setProvince(e.target.value)}>
              <option value="">ทุกจังหวัด</option>
              {provinces.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </Field>
          <Field label="บริการ">
            <select className={inputCls} value={service} onChange={(e) => setService(e.target.value)}>
              <option value="">ทุกบริการ</option>
              {Object.entries(SERVICE_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <p className="text-sm text-yai-ink/70">ไม่ใช้ตำแหน่งของเครื่อง เลือกจังหวัดเองได้เลย</p>
      </Card>

      <p className="text-lg font-semibold" role="status">
        พบ {results.length} แห่ง
      </p>
      {results.map((c) => (
        <Link key={c.id} to={`/yai/clinics/${c.id}`} className="block">
          <Card className="space-y-2 hover:border-yai-teal">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xl font-bold">{c.name}</p>
              <DemoBadge className="shrink-0" />
            </div>
            <p className="text-base text-yai-ink/75">
              อ.{c.district} จ.{c.province}
            </p>
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
      <p className="text-sm text-yai-ink/60">รายชื่อคลินิกทั้งหมดเป็นชื่อสมมุติเพื่อการสาธิต ยังไม่ได้ตรวจสอบใบอนุญาตจริง</p>
    </div>
  );
};
