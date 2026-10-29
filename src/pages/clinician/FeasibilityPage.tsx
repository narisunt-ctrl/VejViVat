import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, ExternalLink, Scale } from 'lucide-react';
import { formatMTHB, formatTHB, project, SCENARIOS } from '../../services/business/revenueModel';

// Feasibility study for ยายพร้อม × CareBridge. Market facts are quoted with their source (searched 2026-10-29);
// financial figures are computed live from the revenue model's scenarios, so they change if assumptions change.

const SOURCES = {
  nso: { label: 'สำนักงานสถิติแห่งชาติ: รายงานการทำงานของผู้สูงอายุ พ.ศ. 2567 (เผยแพร่ 2568)', url: 'https://nso.go.th/nsoweb/storage/survey_detail/2025/20250327140934_11323.pdf' },
  herbUse: { label: 'TCI ThaiJO: ผลการประเมินนโยบายส่งเสริมการใช้ยาสมุนไพร จ.ขอนแก่น', url: 'https://he01.tci-thaijo.org/index.php/jrhi/article/view/287042' },
  market: { label: 'กรุงเทพธุรกิจ: มูลค่าตลาดสมุนไพรไทย 2567', url: 'https://www.bangkokbiznews.com/health/well-being/1187729' },
  nhso: { label: 'ผู้จัดการออนไลน์ (2562): หน่วยบริการปฐมภูมิแพทย์แผนไทยราว 400 แห่ง', url: 'https://mgronline.com/qol/detail/9620000083379' },
  tele: { label: 'Baker McKenzie: Thailand progressing towards an integrated digital health ecosystem', url: 'https://insightplus.bakermckenzie.com/bm/healthcare-life-sciences/thailand-progressing-towards-an-integrated-digital-health-ecosystem/' },
  samd: { label: 'Tilleke & Gibbins: Thailand introduces UDI labeling requirements for SaMD', url: 'https://www.tilleke.com/insights/thailand-introduces-udi-labeling-requirements-for-software-as-a-medical-device/28/' },
  digital: { label: 'Tilleke & Gibbins: Digital health in Thailand, Vietnam and Indonesia', url: 'https://www.tilleke.com/insights/digital-health-in-thailand-vietnam-and-indonesia/' },
};

const Src: React.FC<{ s: keyof typeof SOURCES }> = ({ s }) => (
  <a href={SOURCES[s].url} target="_blank" rel="noreferrer" className="ml-1 inline-flex items-center gap-0.5 text-xs text-brand-700 underline">
    [ที่มา] <ExternalLink className="h-3 w-3" />
  </a>
);

const RISKS = [
  ['ซอฟต์แวร์ถูกจัดเป็นเครื่องมือแพทย์ (SaMD) ต้องขึ้นทะเบียน', 'ออกแบบเป็นเครื่องมือช่วยตัดสินใจที่แพทย์ตัดสินเอง (ไม่สั่งยาเอง) และปรึกษา อย. เรื่องการจัดประเภทก่อนใช้จริง'],
  ['ข้อมูลสุขภาพเป็นข้อมูลอ่อนไหวตาม PDPA', 'ความยินยอมแยกวัตถุประสงค์ เก็บในไทย เข้ารหัส บันทึกการเข้าถึง ทำ DPIA ก่อนนำร่อง'],
  ['แพทย์แผนปัจจุบันไม่เชื่อหลักฐาน', 'หลักฐานจาก PubMed พร้อม PMID, รีวิวร่วม 2 แผน, Benefit–Harm แบบไม่เหมารวม, เริ่มจากโรคที่มีหลักฐาน (ข้อเข่าเสื่อม)'],
  ['ผู้สูงอายุใช้แอปไม่ได้', 'พูดแทนพิมพ์ ปุ่มใหญ่ ผู้ดูแลช่วยได้ ทดสอบกับผู้ใช้จริงในพื้นที่นำร่อง'],
  ['คลินิกไม่ยอมจ่าย', 'นำร่องฟรีแลกข้อมูลการใช้งาน วัดเวลาที่ประหยัดได้ก่อนตั้งราคา พิจารณาผู้จ่ายเป็นโรงพยาบาลหรือกองทุนแทนคลินิกเล็ก'],
  ['OCR อ่านฉลากในมือถือผิด', 'ให้ยายยืนยันทุกครั้ง ไม่ตั้งเตือนจาก OCR, baseline: Typhoon 2B อ่านชื่อยาถูก 89% แต่ Tesseract บนมือถือ 39% จึงควรใช้เซิร์ฟเวอร์ OCR'],
  ['ระบบเชื่อม HIS/HOSxP ยาก', 'ส่งออก FHIR ก่อน เชื่อมแบบอ่านอย่างเดียวในระยะแรก ทำร่วมกับโรงพยาบาลนำร่องหนึ่งแห่ง'],
];

export const FeasibilityPage: React.FC = () => {
  const pilot = useMemo(() => project(SCENARIOS.PILOT.a), []);
  const prov = useMemo(() => project(SCENARIOS.PROVINCE.a), []);
  const a = SCENARIOS.PROVINCE.a;
  const perClinicRevenue = a.clinicFee + a.patientsPerClinic * (a.careFeePerPatient + a.familyAdoption * a.familyFee + a.adRevenuePerUser);
  const perClinicCost = a.patientsPerClinic * a.costPerPatient;
  const clinicsToCoverFixed = Math.ceil(a.fixedCost / (perClinicRevenue - perClinicCost));
  const need = (p: ReturnType<typeof project>) => Math.max(0, -Math.min(0, p.lowestCash));

  return (
    <div className="mx-auto max-w-4xl space-y-5 py-4 sm:px-6">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <Scale className="h-6 w-6 text-brand-700" /> การศึกษาความเป็นไปได้: ยายพร้อม × CareBridge
        </h1>
        <p className="text-sm text-slate-600">ฉบับร่างสำหรับทีมและอาจารย์ที่ปรึกษา · ข้อมูลตลาดอ้างอิงแหล่งที่ค้นเมื่อ 29 ต.ค. 2569 · ตัวเลขการเงินคำนวณจากโมเดลในแดชบอร์ดรายได้</p>
      </header>

      <section className="space-y-2 rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-4">
        <h2 className="text-lg font-bold text-emerald-900">สรุป: เป็นไปได้แบบมีเงื่อนไข · แนะนำให้นำร่อง 1 จังหวัด</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li>ปัญหาชัดเจนและวัดได้: โรงพยาบาลใช้ยาสมุนไพรทดแทนยาแผนปัจจุบันต่ำกว่าเป้ากระทรวงมาก</li>
          <li>ต้นแบบทำงานได้ครบเส้นทาง (บ้าน → แพทย์ → หลักฐาน → สั่งยา → เตือนยา → ติดตาม) และมีเทสต์อัตโนมัติมากกว่า 100 รายการ</li>
          <li>เงื่อนไขก่อนใช้กับผู้ป่วยจริง: ระบบหลังบ้านที่ปลอดภัย, DPIA ตาม PDPA, ปรึกษา อย. เรื่องการจัดประเภทซอฟต์แวร์, โรงพยาบาลนำร่องที่มีแพทย์แผนไทยและแพทย์อาสา</li>
          <li>
            การเงินตามสมมติฐาน: นำร่อง{' '}
            {need(pilot)
              ? `ต้องหาเงินทุนเพิ่มประมาณ ${formatMTHB(need(pilot))}`
              : `ใช้เงินตั้งต้น ${formatMTHB(SCENARIOS.PILOT.a.startingCash)} พอ (เงินสดต่ำสุด ${formatMTHB(pilot.lowestCash)})`}{' '}
            และเริ่มกำไรต่อเนื่องเดือนที่ {pilot.breakevenMonth ?? '-'} · ระดับเขตสุขภาพเริ่มกำไรต่อเนื่องเดือนที่ {prov.breakevenMonth ?? '-'}
          </li>
        </ul>
      </section>

      <Section title="1. ปัญหาและโอกาส">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            ผู้สูงอายุ 60 ปีขึ้นไปราว 14.16 ล้านคน หรือ 20.2% ของประชากร (ข้อมูลปี 2567) ซึ่งเป็นกลุ่มที่ใช้ยาหลายตัวและสมุนไพรร่วมกัน
            <Src s="nso" />
          </li>
          <li>
            งานวิจัยในพื้นที่พบอัตราการใช้ยาสมุนไพรทดแทนยาแผนปัจจุบันเพียงร้อยละ 3.57–4.03 ต่ำกว่าเกณฑ์ร้อยละ 10 ที่กระทรวงสาธารณสุขกำหนด
            <Src s="herbUse" />
          </li>
          <li>
            ตลาดสมุนไพรไทยปี 2567 มีมูลค่าราว 63,045 ล้านบาท (ตัวเลขจากสื่อ ควรตรวจกับรายงานต้นทาง)
            <Src s="market" />
          </li>
          <li>
            มีหน่วยบริการปฐมภูมิแพทย์แผนไทยราว 400 แห่ง (ข้อมูลปี 2562 อาจไม่เป็นปัจจุบัน ต้องขอข้อมูลล่าสุดจากกรมการแพทย์แผนไทยฯ)
            <Src s="nhso" />
          </li>
        </ul>
        <p className="text-xs text-slate-500">
          ช่องว่างที่ระบบนี้แก้: แพทย์แผนปัจจุบันไม่เห็นว่าผู้ป่วยกินสมุนไพรอะไร ไม่มีหลักฐานพร้อมใช้ตอนสั่งยา และไม่มีแนวทางที่ทั้งสองแผนยอมรับร่วมกัน
        </p>
      </Section>

      <Section title="2. ความเป็นไปได้ด้านตลาดและลูกค้า">
        <ul className="list-disc space-y-1 pl-5">
          <li>ผู้ใช้: ผู้สูงอายุและผู้ดูแล (ฟรี) · ผู้จ่าย: คลินิกแผนไทย/ร้านยา (แผนรายเดือน) และโรงพยาบาล (ใบอนุญาต + เชื่อมระบบ)</li>
          <li>ยังไม่รู้: ความยินดีจ่ายของคลินิกและโรงพยาบาล จำนวนผู้ป่วยที่จะใช้จริงต่อคลินิก ต้องวัดในการนำร่อง</li>
          <li>คู่แข่งทางอ้อม: แอปเตือนยาทั่วไป และระบบเวชระเบียนโรงพยาบาล แต่ยังไม่มีระบบที่เชื่อมข้อมูลสมุนไพรจากบ้านกับหลักฐานและ Guideline แบบสองแผน</li>
        </ul>
      </Section>

      <Section title="3. ความเป็นไปได้ด้านเทคนิค">
        <p className="font-semibold">ทำได้แล้วในต้นแบบ</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>บันทึกสุขภาพด้วยเสียง/ข้อความ/รูป, Evidence Passport, ยืนยันก่อนบันทึก</li>
          <li>คำสั่งยา → จ่ายยา → เตือนยา แบบมีเวอร์ชันและด่านความปลอดภัย</li>
          <li>ค้นหลักฐาน PubMed อัตโนมัติ สรุปจากบทคัดย่อ รีวิวร่วม → Guideline → ส่งออก FHIR</li>
          <li>OCR ฉลากยาไทยผ่านเซิร์ฟเวอร์ (Typhoon 2B อ่านชื่อยาถูก 89% บนชุดทดสอบ)</li>
        </ul>
        <p className="font-semibold">ยังต้องทำ</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>ระบบหลังบ้าน ฐานข้อมูลกลาง การยืนยันตัวตนแพทย์และผู้ป่วย บันทึกการเข้าถึงที่แก้ไขไม่ได้</li>
          <li>เชื่อม HIS/HOSxP, แจ้งเตือนแบบ push, ทดสอบกับโทรศัพท์จริงของผู้สูงอายุ</li>
        </ul>
      </Section>

      <Section title="4. ความเป็นไปได้ด้านกฎหมายและกำกับดูแล">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Telemedicine อยู่ภายใต้แนวทางของแพทยสภา ประกาศกระทรวงสาธารณสุขเรื่องมาตรฐานการให้บริการ และแนวทางเภสัชกรรมทางไกลของสภาเภสัชกรรม
            <Src s="tele" />
          </li>
          <li>
            ซอฟต์แวร์ที่ใช้วินิจฉัย ติดตาม หรือรักษา อาจถูกจัดเป็นเครื่องมือแพทย์ภายใต้ พ.ร.บ.เครื่องมือแพทย์ ข้อมูลส่วนบุคคลอยู่ภายใต้ PDPA
            <Src s="digital" />
          </li>
          <li>
            ประกาศฉลากเครื่องมือแพทย์ฉบับใหม่กำหนดให้ SaMD ความเสี่ยงประเภท 2–4 ต้องมี UDI มีผล 20 มิถุนายน 2569
            <Src s="samd" />
          </li>
          <li>การสั่งยาทำโดยผู้ประกอบวิชาชีพเท่านั้น ระบบนี้จึงออกแบบให้ไม่สั่งยาเอง ไม่สร้างเวลาเตือนจาก OCR และให้แพทย์ยืนยันทุกขั้น</li>
        </ul>
        <p className="text-xs text-slate-500">ส่วนนี้เป็นข้อมูลเบื้องต้นจากบทความ ไม่ใช่คำแนะนำทางกฎหมาย ต้องปรึกษาที่ปรึกษากฎหมายและ อย. ก่อนเปิดใช้จริง</p>
      </Section>

      <Section title="5. ความเป็นไปได้ด้านการเงิน (จากแดชบอร์ดรายได้)">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-slate-500">
            <tr>
              <th className="p-1">สถานการณ์</th>
              <th className="p-1 text-right">รายได้/เดือน (เดือน 12)</th>
              <th className="p-1 text-right">รายได้/เดือน (เดือน 36)</th>
              <th className="p-1 text-right">เริ่มกำไรต่อเนื่อง</th>
              <th className="p-1 text-right">เงินทุนที่ต้องหาเพิ่ม</th>
            </tr>
          </thead>
          <tbody>
            {(Object.keys(SCENARIOS) as (keyof typeof SCENARIOS)[]).map((id) => {
              const p = project(SCENARIOS[id].a);
              return (
                <tr key={id} className="border-t border-slate-100">
                  <td className="p-1">{SCENARIOS[id].title}</td>
                  <td className="p-1 text-right">{formatTHB(p.mrrAt(12))}</td>
                  <td className="p-1 text-right">{formatTHB(p.mrrAt(36))}</td>
                  <td className="p-1 text-right">{p.breakevenMonth ? `เดือนที่ ${p.breakevenMonth}` : 'ไม่ถึงใน 36 เดือน'}</td>
                  <td className="p-1 text-right">{need(p) ? formatMTHB(need(p)) : 'เงินตั้งต้นพอ'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p>
          ต่อคลินิกหนึ่งแห่ง (ระดับเขต): รายได้ประมาณ {formatTHB(perClinicRevenue)}/เดือน ต้นทุนผันแปร {formatTHB(perClinicCost)}/เดือน จึงต้องมีราว {clinicsToCoverFixed.toLocaleString('th-TH')} คลินิก
          (ไม่นับโรงพยาบาล) เพื่อครอบคลุมต้นทุนคงที่ {formatTHB(a.fixedCost)}/เดือน
        </p>
        <p className="text-xs text-slate-500">
          ตัวแปรที่มีผลมากที่สุด: จำนวนผู้ป่วยที่ใช้จริงต่อคลินิก ค่าประสานการดูแลต่อผู้ป่วย และต้นทุนทีม · ปรับดูได้ที่{' '}
          <Link to="/business" className="underline">
            แดชบอร์ดรายได้
          </Link>
        </p>
      </Section>

      <Section title="6. ความเป็นไปได้ด้านปฏิบัติการ">
        <ul className="list-disc space-y-1 pl-5">
          <li>ทีมขั้นต่ำ: นักพัฒนา 2, ผู้ดูแลคลินิก/อบรม 1, ที่ปรึกษาคลินิก (แพทย์แผนไทย + แพทย์แผนปัจจุบัน + เภสัชกร)</li>
          <li>ใช้แนวทาง 5C: เลือกโรคที่ตรงงานแพทย์ หลักฐานน่าเชื่อถือ มีแพทย์ต้นแบบ ไม่เพิ่มขั้นตอน และวัดผลต่อเนื่อง</li>
          <li>นำร่อง 90 วันตามแผนของทีม: ออกแบบร่วม (วัน 1–30), ใช้จริงแบบควบคุม (31–60), ประเมินผล (61–90)</li>
        </ul>
      </Section>

      <Section title="7. ความเสี่ยงและวิธีลดความเสี่ยง">
        <table className="w-full text-sm">
          <tbody>
            {RISKS.map(([risk, mitigation]) => (
              <tr key={risk} className="border-t border-slate-100 align-top">
                <td className="w-2/5 p-1">
                  <AlertTriangle className="mr-1 inline h-4 w-4 text-amber-600" />
                  {risk}
                </td>
                <td className="p-1 text-slate-700">{mitigation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="8. เกณฑ์ตัดสินใจหลังนำร่อง 90 วัน (ข้อเสนอ ให้ทีมกำหนดตัวเลขร่วมกับโรงพยาบาล)">
        <ul className="space-y-1">
          {[
            'แพทย์แผนปัจจุบันใช้หน้าสรุปและหลักฐานจริงอย่างสม่ำเสมอ และรายงานว่าไม่เพิ่มภาระงาน',
            'ไม่มีเหตุการณ์ไม่พึงประสงค์ร้ายแรงที่เกิดจากระบบ และจับคู่ยาที่อาจตีกันได้ก่อนสั่งยา',
            'ผู้สูงอายุบันทึกสม่ำเสมอโดยไม่ต้องให้คนช่วยทุกครั้ง',
            'มี Guideline อย่างน้อยหนึ่งเรื่องที่ทั้งแพทย์แผนปัจจุบันและแพทย์แผนไทยอนุมัติ',
            'คลินิก/โรงพยาบาลนำร่องยินดีจ่ายตามราคาที่ทดสอบ หรือมีผู้จ่ายรายอื่นรองรับ',
          ].map((c) => (
            <li key={c} className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> {c}
            </li>
          ))}
        </ul>
        <p className="text-xs text-slate-500">ไม่ใช้จำนวนใบสั่งยาสมุนไพรที่เพิ่มขึ้นเป็นตัวชี้วัดความสำเร็จเพียงอย่างเดียว</p>
      </Section>

      <Section title="แหล่งอ้างอิง">
        <ul className="list-disc space-y-1 pl-5 text-xs">
          {Object.values(SOURCES).map((s) => (
            <li key={s.url}>
              <a href={s.url} target="_blank" rel="noreferrer" className="underline">
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-800">
    <h2 className="text-base font-bold text-slate-900">{title}</h2>
    {children}
  </section>
);
