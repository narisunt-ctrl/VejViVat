import React, { useMemo, useState } from 'react';
import { AlertTriangle, ExternalLink, FlaskConical, Scale, Users } from 'lucide-react';
import { yaiStore } from '../../services/yai/yaiStore';
import { herbSignals, HerbSignal, K_MIN, syntheticCohort } from '../../domain/yai/herbSharing';
import { DataAccessType, researchRequests, useResearchRequests } from '../../services/carebridge/researchRequests';

// Thai herb research hub on CareBridge: de-identified real-world signals from consenting ยายพร้อม users
// (synthetic cohort + this browser's consenting user), research requests with ethics and data-access gates,
// study recruitment counts, and the path from signal to a registered product with conflict-of-interest rules.
// Signals are hypotheses for research, not evidence of effect.

const ACCESS_TH: Record<DataAccessType, string> = { AGGREGATE: 'ข้อมูลสรุปรวม', IN_PLATFORM: 'วิเคราะห์ในระบบ (ข้อมูลไม่ออกนอกระบบ)', RECRUITMENT: 'หาผู้เข้าร่วมวิจัย' };
const STATUS_TH = { SUBMITTED: 'รอคณะกรรมการพิจารณาการเข้าถึงข้อมูล', ETHICS_PENDING: 'รอเลขอนุมัติจริยธรรม', APPROVED: 'อนุมัติ (จำลอง)', DECLINED: 'ไม่อนุมัติ' } as const;
const STATUS_CLS = { SUBMITTED: 'bg-sky-100 text-sky-800', ETHICS_PENDING: 'bg-amber-100 text-amber-900', APPROVED: 'bg-emerald-100 text-emerald-800', DECLINED: 'bg-slate-200 text-slate-700' } as const;

const PIPELINE = [
  { step: 'สัญญาณจากผู้ใช้', text: 'ข้อมูลไม่ระบุตัวตนจากผู้ที่ยินยอม บอกว่าสมุนไพรใดถูกใช้มาก ทนได้แค่ไหน' },
  { step: 'ตรวจหลักฐานเดิม', text: 'ค้นงานวิจัยและ Guideline ที่มีอยู่ (คลังงานวิจัย + รีวิว)' },
  { step: 'ตั้งโจทย์ + หานักวิจัย', text: 'นักวิจัยยื่นโครงการผ่านหน้านี้ ผ่านจริยธรรมและคณะกรรมการข้อมูล' },
  { step: 'ทดลองทางคลินิก', text: 'ขึ้นทะเบียนการทดลอง หาผู้เข้าร่วมจากผู้ที่ยินยอมให้ติดต่อเท่านั้น' },
  { step: 'พัฒนาตำรับและผลิต', text: 'ร่วมกับคณะเภสัชหรือผู้ผลิตที่ได้ GMP; ใช้ตำรับดั้งเดิมต้องดู พ.ร.บ.คุ้มครองภูมิปัญญาการแพทย์แผนไทย และแบ่งประโยชน์' },
  { step: 'ขึ้นทะเบียน อย.', text: 'ตาม พ.ร.บ.ผลิตภัณฑ์สมุนไพร พ.ศ. 2562 อ้างสรรพคุณได้เท่าที่ได้รับอนุญาต' },
];

const COI_RULES = [
  'ฝั่งผลิตภัณฑ์แยกนิติบุคคลจากแพลตฟอร์มยายพร้อม/CareBridge',
  'หน้าสมุนไพรไทยไม่เรียงอันดับหรือเน้นสินค้าในเครือ ข้อมูลหลักฐานแสดงเท่ากับสมุนไพรอื่น',
  'การ์ดธาตุ คำเตือนยาตีกัน และเมนูอาหาร ห้ามมีชื่อสินค้า',
  'โฆษณาสินค้าในเครือใช้กติกาเดียวกับผู้ลงโฆษณารายอื่น (ทะเบียน อย. ใบอนุญาตโฆษณา GMP ป้ายโฆษณา) และเปิดเผยว่าเป็นสินค้าในเครือ',
  'แพทย์ใน CareBridge ไม่ได้รับส่วนแบ่งจากการสั่งหรือแนะนำสินค้าในเครือ',
  'ไม่ให้แต้มหรือรางวัลแลกกับการยินยอมแบ่งปันข้อมูลเพื่อวิจัย',
];

export const ResearchHubPage: React.FC = () => {
  const cohort = useMemo(() => syntheticCohort(), []);
  // one audited read of this browser's de-identified record (null unless the user opted in to research)
  const [live] = useState(() => yaiStore.readHerbResearchRecord('carebridge-research-hub'));
  const records = useMemo(() => (live ? [...cohort, live] : cohort), [cohort, live]);
  const signals = useMemo(() => herbSignals(records), [records]);
  const contactable = records.filter((r) => r.contactable).length;
  const requests = useResearchRequests();

  const [form, setForm] = useState({ researcher: '', institution: '', herb: '', question: '', access: 'AGGREGATE' as DataAccessType, ethicsRef: '' });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [refDraft, setRefDraft] = useState<Record<string, string>>({});

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.researcher.trim() || !form.institution.trim() || !form.herb || !form.question.trim()) {
      setMsg({ ok: false, text: 'กรอกชื่อ หน่วยงาน สมุนไพร และคำถามวิจัยให้ครบ' });
      return;
    }
    researchRequests.submit(form);
    setMsg({ ok: true, text: form.ethicsRef.trim() ? 'ส่งคำขอแล้ว รอคณะกรรมการพิจารณาการเข้าถึงข้อมูล' : 'ส่งคำขอแล้ว ต้องเพิ่มเลขอนุมัติจริยธรรมก่อนจึงพิจารณาได้' });
    setForm({ researcher: '', institution: '', herb: '', question: '', access: 'AGGREGATE', ethicsRef: '' });
  };

  const signalFor = (herb: string): HerbSignal | undefined => signals.find((s) => s.herb === herb);

  return (
    <div className="mx-auto max-w-6xl space-y-6 py-4 sm:px-6">
      <header className="space-y-1 border-b border-slate-200 pb-4">
        <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900">
          <FlaskConical className="h-5 w-5 text-teal-700" /> ศูนย์วิจัยสมุนไพรไทย (Research Hub)
        </h1>
        <p className="text-sm text-slate-600">สัญญาณจากผู้ใช้ยายพร้อมที่ยินยอม · คำขอใช้ข้อมูลของนักวิจัย · หาผู้เข้าร่วมวิจัย · เส้นทางสู่ผลิตภัณฑ์</p>
        <p className="inline-block rounded-lg bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-900">ข้อมูลสังเคราะห์ {cohort.length} ราย{live ? ' + ผู้ใช้ในเบราว์เซอร์นี้ที่ยินยอม 1 ราย' : ''} · การอนุมัติของคณะกรรมการเป็นการจำลอง</p>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold text-slate-500">ผู้ยินยอมให้ใช้ข้อมูลวิจัย</p>
          <p className="text-2xl font-bold tabular-nums text-slate-900">{records.length.toLocaleString('th-TH')}</p>
          <p className="text-xs text-slate-500">ไม่ระบุตัวตน: รหัสแทนตัว ช่วงอายุ เดือน</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold text-slate-500">ยินยอมให้ติดต่อเข้าร่วมวิจัย</p>
          <p className="text-2xl font-bold tabular-nums text-slate-900">{contactable.toLocaleString('th-TH')}</p>
          <p className="text-xs text-slate-500">ระบบเป็นผู้ส่งคำเชิญ นักวิจัยไม่เห็นชื่อหรือเบอร์</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold text-slate-500">ขนาดกลุ่มขั้นต่ำที่แสดงผล</p>
          <p className="text-2xl font-bold tabular-nums text-slate-900">{K_MIN} คน</p>
          <p className="text-xs text-slate-500">กลุ่มเล็กกว่านี้ซ่อน เพื่อไม่ให้ระบุตัวบุคคลได้</p>
        </div>
      </section>

      <section className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="text-base font-bold text-slate-900">สัญญาณต่อสมุนไพร</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-xs text-slate-500">
              <tr className="border-b border-slate-200">
                <th className="p-2">สมุนไพร</th>
                <th className="p-2 text-right">ผู้ใช้</th>
                <th className="p-2 text-right">ดาวเฉลี่ย</th>
                <th className="p-2 text-right">มีอาการไม่พึงประสงค์</th>
                <th className="p-2 text-right">อาการรบกวน</th>
                <th className="p-2 text-right">จะบอกต่อ</th>
                <th className="p-2 text-right">ใช้ (สัปดาห์, มัธยฐาน)</th>
                <th className="p-2">หลักฐานเดิม</th>
                <th className="p-2" />
              </tr>
            </thead>
            <tbody>
              {signals.map((s) => (
                <tr key={s.herb} className="border-b border-slate-100">
                  <td className="p-2 font-semibold">{s.herb}</td>
                  <td className="p-2 text-right tabular-nums">{s.suppressed ? `< ${K_MIN}` : s.users}</td>
                  {s.suppressed ? (
                    <td className="p-2 text-slate-500" colSpan={5}>
                      ซ่อนไว้ (กลุ่มเล็กเกินไป)
                    </td>
                  ) : (
                    <>
                      <td className="p-2 text-right tabular-nums">{s.avgRating ?? '-'}</td>
                      <td className="p-2 text-right tabular-nums">{s.adverseShare ?? '-'}%</td>
                      <td className="p-2 text-right tabular-nums">{s.bothersomeShare ?? '-'}%</td>
                      <td className="p-2 text-right tabular-nums">{s.recommendShare ?? '-'}%</td>
                      <td className="p-2 text-right tabular-nums">{s.medianWeeks ?? '-'}</td>
                    </>
                  )}
                  <td className="p-2">
                    <a href={`https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(s.herb === 'ขมิ้นชัน' ? 'curcuma longa' : s.herb)}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 underline">
                      PubMed <ExternalLink className="h-3 w-3" />
                    </a>
                  </td>
                  <td className="p-2">
                    {!s.suppressed && (
                      <button type="button" onClick={() => setForm((f) => ({ ...f, herb: s.herb }))} className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold hover:border-teal-600">
                        ตั้งโจทย์วิจัย
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="flex items-start gap-2 text-xs text-slate-600">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" /> เป็นสัญญาณสำหรับตั้งโจทย์วิจัยเท่านั้น ผู้ใช้เลือกมารีวิวเองและรายงานเอง ไม่มีกลุ่มเปรียบเทียบ จึงสรุปไม่ได้ว่าสมุนไพรได้ผล
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
            <Users className="h-4 w-4 text-teal-700" /> ยื่นคำขอใช้ข้อมูลวิจัย
          </h2>
          <form onSubmit={submit} className="space-y-2 text-sm">
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="block">
                ผู้วิจัยหลัก
                <input id="rr-researcher" value={form.researcher} onChange={(e) => setForm({ ...form, researcher: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5" />
              </label>
              <label className="block">
                หน่วยงาน
                <input id="rr-institution" value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5" />
              </label>
            </div>
            <label className="block">
              สมุนไพร
              <select id="rr-herb" value={form.herb} onChange={(e) => setForm({ ...form, herb: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5">
                <option value="">เลือก</option>
                {signals.filter((s) => !s.suppressed).map((s) => (
                  <option key={s.herb} value={s.herb}>
                    {s.herb}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              คำถามวิจัย
              <textarea id="rr-question" value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} rows={2} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5" />
            </label>
            <fieldset>
              <legend>รูปแบบการเข้าถึง</legend>
              <div className="mt-1 flex flex-wrap gap-2">
                {(Object.keys(ACCESS_TH) as DataAccessType[]).map((a) => (
                  <label key={a} className={`cursor-pointer rounded-lg border px-2 py-1 text-xs font-semibold ${form.access === a ? 'border-teal-600 bg-teal-50 text-teal-800' : 'border-slate-300'}`}>
                    <input type="radio" name="rr-access" className="sr-only" checked={form.access === a} onChange={() => setForm({ ...form, access: a })} />
                    {ACCESS_TH[a]}
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="block">
              เลขที่อนุมัติคณะกรรมการจริยธรรม (ถ้ามี)
              <input id="rr-ethics" value={form.ethicsRef} onChange={(e) => setForm({ ...form, ethicsRef: e.target.value })} placeholder="เช่น COA ของสถาบัน" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5" />
            </label>
            <button type="submit" className="rounded-lg bg-teal-700 px-4 py-2 font-semibold text-white hover:bg-teal-800">
              ส่งคำขอ
            </button>
            {msg && <p className={`text-xs font-semibold ${msg.ok ? 'text-emerald-700' : 'text-rose-700'}`}>{msg.text}</p>}
          </form>
          <p className="text-xs text-slate-500">ได้เฉพาะข้อมูลสรุปรวมหรือการวิเคราะห์ในระบบ ไม่มีการส่งข้อมูลระบุตัวตนออกไป</p>
        </section>

        <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="text-base font-bold text-slate-900">คำขอและการพิจารณา</h2>
          {requests.length === 0 ? (
            <p className="text-sm text-slate-500">ยังไม่มีคำขอ</p>
          ) : (
            <ul className="space-y-2">
              {requests.map((r) => {
                const sig = signalFor(r.herb);
                return (
                  <li key={r.id} className="space-y-1.5 rounded-xl border border-slate-200 p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold">
                        {r.herb} · {r.researcher} ({r.institution})
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_CLS[r.status]}`}>{STATUS_TH[r.status]}</span>
                    </div>
                    <p className="text-slate-700">{r.question}</p>
                    <p className="text-xs text-slate-500">
                      {ACCESS_TH[r.access]} · จริยธรรม: {r.ethicsRef || 'ยังไม่มี'}
                    </p>
                    {r.status === 'ETHICS_PENDING' && (
                      <div className="flex gap-2">
                        <input value={refDraft[r.id] ?? ''} onChange={(e) => setRefDraft({ ...refDraft, [r.id]: e.target.value })} placeholder="เลขอนุมัติจริยธรรม" aria-label="เลขอนุมัติจริยธรรม" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-2 py-1 text-xs" />
                        <button type="button" onClick={() => {
                            researchRequests.addEthicsRef(r.id, refDraft[r.id] ?? '');
                            setMsg(null);
                          }} className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold">
                          เพิ่ม
                        </button>
                      </div>
                    )}
                    {r.status === 'SUBMITTED' && (
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => researchRequests.decide(r.id, true, 'อนุมัติให้ใช้ตามรูปแบบที่ขอ (จำลอง)')} className="rounded-lg bg-emerald-700 px-3 py-1 text-xs font-semibold text-white">
                          คณะกรรมการอนุมัติ (จำลอง)
                        </button>
                        <button type="button" onClick={() => researchRequests.decide(r.id, false, 'ไม่อนุมัติ (จำลอง)')} className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold">
                          ไม่อนุมัติ
                        </button>
                      </div>
                    )}
                    {r.status === 'APPROVED' && sig && !sig.suppressed && (
                      <div className="rounded-lg bg-emerald-50 p-2 text-xs text-emerald-900">
                        {r.access === 'RECRUITMENT' ? (
                          <>ผู้ใช้{r.herb}ที่ยินยอมให้ติดต่อ: {sig.contactable ?? `น้อยกว่า ${K_MIN}`} คน · ระบบจะส่งคำเชิญแทนนักวิจัย ผู้สนใจติดต่อกลับเอง</>
                        ) : (
                          <>ผลสรุปรวม: ผู้ใช้ {sig.users} คน · ดาวเฉลี่ย {sig.avgRating} · อาการไม่พึงประสงค์ {sig.adverseShare}% · จะบอกต่อ {sig.recommendShare}%</>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="text-base font-bold text-slate-900">จากสัญญาณสู่ผลิตภัณฑ์สมุนไพรไทย</h2>
        <ol className="grid gap-2 md:grid-cols-3">
          {PIPELINE.map((p, i) => (
            <li key={p.step} className="rounded-xl bg-slate-50 p-3 text-sm">
              <p className="text-xs font-bold text-teal-700">ขั้นที่ {i + 1}</p>
              <p className="font-semibold">{p.step}</p>
              <p className="text-slate-600">{p.text}</p>
            </li>
          ))}
        </ol>
        <p className="text-xs text-slate-500">ข้อมูลจากแอปช่วยเลือกว่าควรวิจัยสมุนไพรตัวไหน แต่สรรพคุณของผลิตภัณฑ์ต้องพิสูจน์ด้วยงานวิจัยและผ่าน อย. ก่อน</p>
      </section>

      <section className="space-y-2 rounded-2xl border border-rose-200 bg-rose-50/60 p-4">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
          <Scale className="h-5 w-5 text-rose-700" /> กติกาผลประโยชน์ทับซ้อน
        </h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-800">
          {COI_RULES.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </section>
    </div>
  );
};
