import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Ban, Calculator, Table2, TrendingUp } from 'lucide-react';
import { DEMO_CLINICS } from '../../data/yai/fixtures';
import { Assumptions, formatMTHB, formatTHB, project, ScenarioId, SCENARIOS, simulatedClinicRevenue } from '../../services/business/revenueModel';

// Revenue simulation dashboard (synthetic). Palette = reference categorical slots 1–5, validated for CVD
// separation; three slots are below 3:1 on white, so the legend and a table view are always available.

const STREAMS = [
  { key: 'clinic', label: 'ค่าบริการคลินิก', color: '#2a78d6' },
  { key: 'hospital', label: 'โรงพยาบาล (ใบอนุญาต + เชื่อมระบบ)', color: '#eb6834' },
  { key: 'care', label: 'ค่าประสานการดูแลต่อผู้ป่วย', color: '#1baf7a' },
  { key: 'family', label: 'แผนครอบครัว (สมัครใจ)', color: '#eda100' },
  { key: 'ads', label: 'แบนเนอร์สินค้าที่ผ่านการรับรอง', color: '#e87ba4' },
] as const;

const short = (v: number) => (Math.abs(v) >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)} ล.` : Math.abs(v) >= 1000 ? `${Math.round(v / 1000)} พัน` : `${Math.round(v)}`);

const FIELDS: { key: keyof Assumptions; label: string; step: number; pct?: boolean }[] = [
  { key: 'clinicsStart', label: 'คลินิกเริ่มต้น', step: 1 },
  { key: 'clinicsPerMonth', label: 'คลินิกใหม่/เดือน', step: 1 },
  { key: 'clinicsMax', label: 'คลินิกสูงสุด', step: 10 },
  { key: 'clinicFee', label: 'ค่าบริการคลินิก (บาท/เดือน)', step: 100 },
  { key: 'hospitalsStart', label: 'โรงพยาบาลเริ่มต้น', step: 1 },
  { key: 'hospitalsPerQuarter', label: 'โรงพยาบาลใหม่/ไตรมาส', step: 0.5 },
  { key: 'hospitalFee', label: 'ใบอนุญาตโรงพยาบาล (บาท/เดือน)', step: 1000 },
  { key: 'hospitalSetupFee', label: 'ค่าเชื่อมระบบครั้งเดียว (บาท)', step: 10000 },
  { key: 'patientsPerClinic', label: 'ผู้ป่วยยายพร้อม/คลินิก', step: 5 },
  { key: 'patientsPerHospital', label: 'ผู้ป่วยยายพร้อม/โรงพยาบาล', step: 50 },
  { key: 'careFeePerPatient', label: 'ค่าประสานการดูแล (บาท/คน/เดือน)', step: 5 },
  { key: 'familyAdoption', label: 'สัดส่วนครอบครัวที่สมัครแผนครอบครัว', step: 0.01, pct: true },
  { key: 'familyFee', label: 'แผนครอบครัว (บาท/เดือน)', step: 10 },
  { key: 'adRevenuePerUser', label: 'รายได้โฆษณา (บาท/ผู้ใช้/เดือน)', step: 0.5 },
  { key: 'churn', label: 'อัตราเลิกใช้/เดือน', step: 0.005, pct: true },
  { key: 'fixedCost', label: 'ต้นทุนคงที่ (บาท/เดือน)', step: 10000 },
  { key: 'costPerPatient', label: 'ต้นทุนต่อผู้ป่วย (บาท/เดือน)', step: 1 },
  { key: 'startingCash', label: 'เงินตั้งต้น (บาท)', step: 100000 },
];

export const BusinessDashboardPage: React.FC = () => {
  const [scenario, setScenario] = useState<ScenarioId>('PROVINCE');
  const [a, setA] = useState<Assumptions>(SCENARIOS.PROVINCE.a);
  const [showTable, setShowTable] = useState(false);
  const [showInputs, setShowInputs] = useState(false);
  const p = useMemo(() => project(a), [a]);
  const last = p.rows[p.rows.length - 1];
  const chartRows = p.rows.map((r) => ({ month: r.month, ...r.revenue, cash: Math.round(r.cash), cost: Math.round(r.cost) }));
  const fundingNeed = Math.max(0, -Math.min(0, p.lowestCash));
  const clinicsTable = simulatedClinicRevenue(DEMO_CLINICS, a);

  const pick = (id: ScenarioId) => {
    setScenario(id);
    setA(SCENARIOS[id].a);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5 py-4 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <TrendingUp className="h-6 w-6 text-brand-700" /> แดชบอร์ดรายได้ (จำลอง)
          </h1>
          <p className="text-sm text-slate-600">รายได้จากการเชื่อมยายพร้อมกับคลินิกและโรงพยาบาล {a.months} เดือน · ทุกตัวเลขเป็นสมมติฐานที่ปรับได้ ไม่ใช่การพยากรณ์</p>
        </div>
        <Link to="/feasibility" className="rounded-xl border border-brand-300 px-3 py-2 text-sm font-semibold text-brand-800">
          อ่านการศึกษาความเป็นไปได้ →
        </Link>
      </header>

      <div className="flex flex-wrap gap-2" role="group" aria-label="สถานการณ์จำลอง">
        {(Object.keys(SCENARIOS) as ScenarioId[]).map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={scenario === id}
            onClick={() => pick(id)}
            className={`rounded-xl border px-4 py-2 text-left text-sm ${scenario === id ? 'border-brand-700 bg-brand-700 text-white' : 'border-slate-300 bg-white text-slate-700'}`}
          >
            <span className="block font-bold">{SCENARIOS[id].title}</span>
            <span className={`block text-xs ${scenario === id ? 'text-white/80' : 'text-slate-500'}`}>{SCENARIOS[id].note}</span>
          </button>
        ))}
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5" aria-label="ตัวชี้วัดหลัก">
        <Kpi label="รายได้ประจำต่อเดือน (เดือน 12)" value={formatTHB(p.mrrAt(12))} />
        <Kpi label={`รายได้ประจำต่อเดือน (เดือน ${a.months})`} value={formatTHB(p.mrrAt(a.months))} />
        <Kpi label="เดือนที่เริ่มกำไรต่อเนื่อง" value={p.breakevenMonth ? `เดือนที่ ${p.breakevenMonth}` : `ยังไม่ถึงใน ${a.months} เดือน`} tone={p.breakevenMonth ? 'good' : 'warn'} />
        <Kpi label="เงินทุนที่ต้องหาเพิ่ม" value={fundingNeed ? formatMTHB(fundingNeed) : 'เงินตั้งต้นพอ'} tone={fundingNeed ? 'warn' : 'good'} />
        <Kpi label={`ปลายเดือน ${a.months}`} value={`${Math.round(last.clinics)} คลินิก · ${Math.round(last.hospitals)} รพ.`} sub={`ผู้ป่วยยายพร้อม ~${Math.round(last.patients).toLocaleString('th-TH')} คน`} />
      </section>

      <section className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold text-slate-900">รายได้รายเดือนแยกตามแหล่ง</h2>
          <button type="button" onClick={() => setShowTable((v) => !v)} className="flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold">
            <Table2 className="h-3.5 w-3.5" /> {showTable ? 'ดูเป็นกราฟ' : 'ดูเป็นตาราง'}
          </button>
        </div>
        {showTable ? (
          <div className="max-h-80 overflow-auto">
            <table className="w-full text-right text-xs">
              <thead className="sticky top-0 bg-white text-slate-500">
                <tr>
                  <th className="p-1 text-left">เดือน</th>
                  {STREAMS.map((s) => (
                    <th key={s.key} className="p-1">
                      {s.label}
                    </th>
                  ))}
                  <th className="p-1">ต้นทุน</th>
                  <th className="p-1">กำไร</th>
                  <th className="p-1">เงินสดสะสม</th>
                </tr>
              </thead>
              <tbody>
                {p.rows.map((r) => (
                  <tr key={r.month} className="border-t border-slate-100">
                    <td className="p-1 text-left">{r.month}</td>
                    {STREAMS.map((s) => (
                      <td key={s.key} className="p-1">
                        {Math.round(r.revenue[s.key]).toLocaleString('th-TH')}
                      </td>
                    ))}
                    <td className="p-1">{Math.round(r.cost).toLocaleString('th-TH')}</td>
                    <td className={`p-1 ${r.profit < 0 ? 'text-rose-700' : ''}`}>{Math.round(r.profit).toLocaleString('th-TH')}</td>
                    <td className="p-1">{Math.round(r.cash).toLocaleString('th-TH')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartRows} margin={{ top: 8, right: 8, left: 8, bottom: 0 }} barCategoryGap={2}>
                <CartesianGrid vertical={false} stroke="#e7e5e0" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#6b6a65' }} interval={2} />
                <YAxis tickFormatter={short} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#6b6a65' }} width={56} />
                <Tooltip formatter={(v: number, name: string) => [formatTHB(v), name]} labelFormatter={(m) => `เดือนที่ ${m}`} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {STREAMS.map((s, i) => (
                  <Bar key={s.key} dataKey={s.key} name={s.label} stackId="rev" fill={s.color} stroke="#ffffff" strokeWidth={1} radius={i === STREAMS.length - 1 ? [4, 4, 0, 0] : 0} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="text-base font-bold text-slate-900">เงินสดสะสม</h2>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartRows} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#e7e5e0" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#6b6a65' }} interval={2} />
              <YAxis tickFormatter={short} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#6b6a65' }} width={56} />
              <Tooltip formatter={(v: number) => [formatTHB(v), 'เงินสดสะสม']} labelFormatter={(m) => `เดือนที่ ${m}`} />
              <ReferenceLine y={0} stroke="#9a9890" />
              {p.breakevenMonth && <ReferenceLine x={p.breakevenMonth} stroke="#1baf7a" strokeDasharray="4 4" label={{ value: 'เริ่มกำไร', fontSize: 11, fill: '#3d3c38', position: 'insideTopRight' }} />}
              <Line type="monotone" dataKey="cash" name="เงินสดสะสม" stroke="#2a78d6" strokeWidth={2} dot={false} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4">
        <button type="button" onClick={() => setShowInputs((v) => !v)} className="flex items-center gap-2 text-base font-bold text-slate-900" aria-expanded={showInputs}>
          <Calculator className="h-5 w-5 text-brand-700" /> ปรับสมมติฐาน {showInputs ? '▲' : '▼'}
        </button>
        {showInputs && (
          <>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {FIELDS.map((f) => (
                <label key={f.key} className="text-xs">
                  <span className="font-semibold text-slate-700">
                    {f.label}
                    {f.pct ? ' (%)' : ''}
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={f.pct ? f.step * 100 : f.step}
                    value={f.pct ? +(Number(a[f.key]) * 100).toFixed(2) : Number(a[f.key])}
                    onChange={(e) => {
                      const v = Math.max(0, Number(e.target.value) || 0);
                      setA({ ...a, [f.key]: f.pct ? v / 100 : v });
                    }}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                  />
                </label>
              ))}
            </div>
            <button type="button" onClick={() => setA(SCENARIOS[scenario].a)} className="text-xs font-semibold text-brand-700 underline">
              คืนค่าสถานการณ์ "{SCENARIOS[scenario].title}"
            </button>
          </>
        )}
      </section>

      <section className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="text-base font-bold text-slate-900">เคสจำลอง: รายได้ต่อเดือนจากสถานพยาบาลที่เข้าร่วม</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="text-left text-xs text-slate-500">
              <tr>
                <th className="p-1">สถานพยาบาล (สมมุติ)</th>
                <th className="p-1 text-right">ผู้ป่วยยายพร้อม</th>
                <th className="p-1 text-right">ค่าบริการ</th>
                <th className="p-1 text-right">ค่าประสานการดูแล</th>
                <th className="p-1 text-right">รวม/เดือน</th>
              </tr>
            </thead>
            <tbody>
              {clinicsTable.map((c) => (
                <tr key={c.id} className="border-t border-slate-100">
                  <td className="p-1">
                    {c.name} <span className="text-xs text-slate-400">{c.isHospital ? 'รพ.' : 'คลินิก'}</span>
                  </td>
                  <td className="p-1 text-right">{c.patients}</td>
                  <td className="p-1 text-right">{c.subscription.toLocaleString('th-TH')}</td>
                  <td className="p-1 text-right">{c.care.toLocaleString('th-TH')}</td>
                  <td className="p-1 text-right font-semibold">{c.total.toLocaleString('th-TH')}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-300 font-bold">
                <td className="p-1">รวม {clinicsTable.length} แห่ง</td>
                <td className="p-1 text-right">{clinicsTable.reduce((s, c) => s + c.patients, 0).toLocaleString('th-TH')}</td>
                <td colSpan={2} />
                <td className="p-1 text-right">{clinicsTable.reduce((s, c) => s + c.total, 0).toLocaleString('th-TH')}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="text-xs text-slate-500">ชื่อและจำนวนผู้ป่วยเป็นข้อมูลจำลอง คำนวณจากสมมติฐานด้านบน</p>
      </section>

      <section className="space-y-2 rounded-2xl border border-rose-200 bg-rose-50/60 p-4">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
          <Ban className="h-5 w-5 text-rose-700" /> รายได้ที่ไม่ทำ (เพื่อไม่ให้ผลประโยชน์ขัดกับการดูแลผู้ป่วย)
        </h2>
        <ul className="list-disc pl-5 text-sm text-slate-800">
          <li>ไม่รับเงินเพื่อจัดอันดับคลินิกให้สูงขึ้น: การค้นหาหมอเรียงตามระยะทางและโซนเท่านั้น</li>
          <li>ไม่รับค่าคอมมิชชันจากการสั่งยาหรือจ่ายยา และไม่รับเงินจากผู้ผลิตเพื่อให้ยาของตนถูกแนะนำ</li>
          <li>ไม่ขายข้อมูลที่ระบุตัวผู้ป่วย การใช้ข้อมูลเพื่อวิจัยต้องได้รับความยินยอมแยก ไม่ระบุตัวตน และผ่านคณะกรรมการจริยธรรม</li>
          <li>ฟังก์ชันหลักของผู้ป่วยใช้ฟรี (บันทึก เตือนยา Evidence Passport ส่งข้อมูลให้หมอ)</li>
          <li>โฆษณาในแอปยายพร้อม: เฉพาะสินค้าที่มีทะเบียน อย. ใบอนุญาตโฆษณา และ GMP ไม่อ้างรักษาโรค ติดป้าย “โฆษณา” ซ่อนได้ ไม่เลือกจากข้อมูลสุขภาพ และไม่แสดงในหน้ายา เตือนยา หรือหน้าคุยกับหมอ ผู้ลงโฆษณาซื้ออันดับคลินิกหรือมีผลต่อหลักฐานที่แพทย์เห็นไม่ได้</li>
        </ul>
      </section>
    </div>
  );
};

const Kpi: React.FC<{ label: string; value: string; sub?: string; tone?: 'good' | 'warn' }> = ({ label, value, sub, tone }) => (
  <div className={`rounded-2xl border p-3 ${tone === 'good' ? 'border-emerald-300 bg-emerald-50' : tone === 'warn' ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white'}`}>
    <p className="text-xs font-semibold text-slate-500">{label}</p>
    <p className="text-lg font-bold text-slate-900">{value}</p>
    {sub && <p className="text-xs text-slate-500">{sub}</p>}
  </div>
);
