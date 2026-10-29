import React from 'react';
import { Link } from 'react-router-dom';
import { LxCard, LxNotice, LxPageHeader } from '../../components/yai/lx/ui';

// Privacy notice for ยายพร้อม (PDPA sections 23 and 26). Describes what the prototype actually does today and
// what changes before real use. Plain Thai; every claim matches the code (data stays in this browser, sharing only
// with consent, no data sales, ads not chosen from health data, no model training on user data).

export const PRIVACY_NOTICE_VERSION = '1.0 · 29 ต.ค. 2569';

const DATA_ROWS: { what: string; examples: string; why: string; basis: string }[] = [
  { what: 'ข้อมูลบัญชีในแอป', examples: 'ชื่อที่แสดง อายุ จังหวัด/อำเภอ', why: 'ทักทาย เรียงคลินิกใกล้บ้าน', basis: 'สัญญาการใช้บริการ (มาตรา 24)' },
  { what: 'ข้อมูลสุขภาพ (ข้อมูลอ่อนไหว)', examples: 'บันทึกอาการ การนอน อารมณ์ ก้าวเดิน น้ำหนัก ความดัน รายการยา รูปฉลากยา', why: 'ให้คุณดูแนวโน้มของตัวเอง เตือนกินยา ตรวจยาตีกับสมุนไพร', basis: 'ความยินยอมโดยชัดแจ้ง (มาตรา 19, 26)' },
  { what: 'ข้อมูลที่ส่งให้คลินิก/ผู้ดูแล', examples: 'สรุปก่อนพบแพทย์ รายการยา การเตือนและการรายงานกินยา ตามหัวข้อที่คุณเลือก', why: 'ให้แพทย์หรือผู้ดูแลช่วยดูแลคุณ', basis: 'ความยินยอมแยกตามผู้รับและหัวข้อ มีวันหมดอายุ (มาตรา 19, 26)' },
  { what: 'รีวิวสมุนไพร', examples: 'ดาว อาการไม่พึงประสงค์ ความเห็น', why: 'แบ่งประสบการณ์กับเพื่อน; ใช้วิจัยแบบไม่ระบุตัวตนเฉพาะเมื่อติ๊กยินยอม', basis: 'ความยินยอม แยกจากการใช้แอป' },
  { what: 'แต้มและยอดก้าวรายสัปดาห์', examples: 'ยอดรวมต่อสัปดาห์', why: 'เพื่อนในกลุ่มเห็นเพื่อเป็นกำลังใจ (ปิดได้)', basis: 'ความยินยอม' },
  { what: 'บันทึกการเข้าถึง', examples: 'ใครเปิดอ่านหรือขออ่านข้อมูลเมื่อไร', why: 'ให้คุณตรวจได้ว่าข้อมูลถูกใช้อย่างไร', basis: 'หน้าที่ตามมาตรา 37' },
];

const RIGHTS: { right: string; how: string }[] = [
  { right: 'ขอดูข้อมูลของตัวเอง (มาตรา 30)', how: 'ดูได้ทุกหน้าในแอป และประวัติการเข้าถึงในหน้าโปรไฟล์' },
  { right: 'ขอรับหรือโอนย้ายข้อมูล (มาตรา 31)', how: 'ต้นแบบยังไม่มีปุ่มส่งออก จะเพิ่มก่อนใช้จริง' },
  { right: 'คัดค้านหรือถอนความยินยอม (มาตรา 19, 32)', how: 'กด "ยกเลิก" ที่การยินยอมแต่ละรายการในหน้าโปรไฟล์ มีผลทันที' },
  { right: 'ขอลบข้อมูล (มาตรา 33)', how: 'ตั้งค่า → ล้างข้อมูลสาธิตทั้งหมด (ลบในเครื่องนี้ทันที)' },
  { right: 'ขอระงับการใช้ (มาตรา 34)', how: 'ยกเลิกการยินยอม หรือหยุดใช้ฟีเจอร์นั้น' },
  { right: 'ขอแก้ไขให้ถูกต้อง (มาตรา 35–36)', how: 'แก้บันทึกและข้อมูลยาได้เอง ระบบเก็บประวัติการแก้ไว้' },
];

const SERVICES: { name: string; gets: string; note: string }[] = [
  { name: 'ระบบแปลงเสียงของเบราว์เซอร์', gets: 'เสียงพูดตอนกด "กดพูด"', note: 'บางเบราว์เซอร์ส่งเสียงไปประมวลผลที่เซิร์ฟเวอร์ของผู้ผลิตเบราว์เซอร์ ซึ่งอาจอยู่ต่างประเทศ ถ้าไม่ต้องการ ใช้การพิมพ์หรือแตะเช็กอินแทน' },
  { name: 'ตัวอ่านฉลากในเครื่อง (Tesseract.js)', gets: 'ไม่มี รูปอยู่ในเครื่องคุณ', note: 'เบราว์เซอร์ดาวน์โหลดโปรแกรมอ่านจาก cdn.jsdelivr.net ครั้งแรก' },
  { name: 'เซิร์ฟเวอร์อ่านฉลากของโครงการ', gets: 'รูปฉลาก (เฉพาะเมื่อคุณกดอนุญาต)', note: 'ยังไม่เปิดใช้บนเว็บนี้ เซิร์ฟเวอร์ไม่เก็บรูป ถ้าเซิร์ฟเวอร์ตั้งค่าให้ใช้ Typhoon OCR API ของ SCB 10X รูปที่อ่านไม่ชัดจะถูกส่งต่อไปที่นั่น (แจ้งในหน้าขออนุญาตแล้ว) ระบบจริงตั้งใจรัน Typhoon บนเซิร์ฟเวอร์ของโครงการเอง' },
  { name: 'PubMed (หอสมุดแพทย์สหรัฐฯ)', gets: 'ชื่อสมุนไพรที่ค้น', note: 'ไม่ส่งข้อมูลส่วนตัวของคุณ' },
  { name: 'Google Fonts', gets: 'คำขอไฟล์ฟอนต์', note: 'ไม่ส่งข้อมูลสุขภาพ' },
];

export const PrivacyPage: React.FC = () => (
  <div className="mx-auto max-w-4xl space-y-4">
    <LxPageHeader back="/yai/profile" eyebrow="Privacy Notice" title="ประกาศความเป็นส่วนตัว" subtitle={`ยายพร้อม · ฉบับ ${PRIVACY_NOTICE_VERSION}`} />

    <LxNotice tone="warn" title="ต้นแบบเพื่อการสาธิต">
      เว็บนี้ใช้ข้อมูลสังเคราะห์ ข้อมูลทั้งหมดอยู่ในเบราว์เซอร์ของคุณเท่านั้น ไม่มีเซิร์ฟเวอร์เก็บข้อมูลสุขภาพ ประกาศฉบับใช้จริงจะระบุผู้ควบคุมข้อมูล ช่องทางติดต่อ และเจ้าหน้าที่คุ้มครองข้อมูล (DPO) และผ่านการตรวจจากนักกฎหมายก่อนเปิดให้ผู้ป่วยใช้
    </LxNotice>

    <LxCard labelledBy="p-summary">
      <h2 id="p-summary" className="text-lg font-semibold">
        สรุปสั้น
      </h2>
      <ul className="mt-2 list-disc space-y-1.5 pl-5 text-base">
        <li>ข้อมูลสุขภาพของคุณเป็นข้อมูลอ่อนไหว เราใช้เมื่อคุณยินยอมเท่านั้น</li>
        <li>แพทย์ คลินิก หรือผู้ดูแลเห็นข้อมูลได้เฉพาะหัวข้อที่คุณเลือก มีวันหมดอายุ และยกเลิกได้ทุกเมื่อ</li>
        <li>ทุกครั้งที่มีคนเปิดอ่านหรือขออ่าน คุณเห็นในหน้าโปรไฟล์ รวมครั้งที่ถูกปฏิเสธ</li>
        <li>เราไม่ขายข้อมูล ไม่ใช้ข้อมูลสุขภาพเลือกโฆษณา และไม่นำข้อมูลของคุณไปฝึก AI</li>
      </ul>
    </LxCard>

    <LxCard labelledBy="p-data">
      <h2 id="p-data" className="text-lg font-semibold">
        ข้อมูลที่เก็บ ใช้ทำอะไร และฐานทางกฎหมาย
      </h2>
      <div className="mt-3 overflow-x-auto rounded-2xl border border-lx-line">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-lx-surface2 text-lx-muted">
            <tr>
              <th className="p-3 font-semibold">ข้อมูล</th>
              <th className="p-3 font-semibold">ตัวอย่าง</th>
              <th className="p-3 font-semibold">ใช้เพื่อ</th>
              <th className="p-3 font-semibold">ฐาน (พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล)</th>
            </tr>
          </thead>
          <tbody>
            {DATA_ROWS.map((r) => (
              <tr key={r.what} className="border-t border-lx-line align-top">
                <td className="p-3 font-semibold">{r.what}</td>
                <td className="p-3 text-lx-muted">{r.examples}</td>
                <td className="p-3">{r.why}</td>
                <td className="p-3 text-lx-muted">{r.basis}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm text-lx-muted">
        เก็บไว้ในเบราว์เซอร์นี้จนกว่าคุณจะลบ ในระบบจริงจะกำหนดระยะเวลาเก็บแต่ละประเภท และลบหรือทำให้ไม่ระบุตัวตนเมื่อครบกำหนด
      </p>
    </LxCard>

    <div className="grid gap-4 md:grid-cols-2">
      <LxCard labelledBy="p-share">
        <h2 id="p-share" className="text-lg font-semibold">
          การแบ่งปันข้อมูล
        </h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-base">
          <li>คลินิกหรือแพทย์ที่คุณยินยอม เมื่อคลินิกรับข้อมูลไปใช้ดูแลคุณ คลินิกต้องดูแลข้อมูลนั้นตามกฎหมายด้วย</li>
          <li>ผู้ดูแลหรือครอบครัวที่คุณเพิ่ม ตามหัวข้อที่เลือก</li>
          <li>เพื่อนในกลุ่มเห็นเฉพาะชื่อ แต้ม และยอดก้าวรายสัปดาห์ (ปิดได้)</li>
          <li>ผู้ลงโฆษณาไม่ได้รับข้อมูลใดๆ โฆษณาเลือกตามวันที่ ไม่ใช่ข้อมูลของคุณ</li>
        </ul>
      </LxCard>
      <LxCard labelledBy="p-ai">
        <h2 id="p-ai" className="text-lg font-semibold">
          AI และระบบอัตโนมัติในแอป
        </h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-base">
          <li>ใช้อ่านฉลากยา แปลงเสียงเป็นข้อความ และช่วยจัดหมวดบันทึก ผลเป็นร่างที่คุณตรวจก่อนบันทึกทุกครั้ง</li>
          <li>ไม่มี AI วินิจฉัยโรค สั่งยา หรือบอกขนาดยา และไม่ใช้ผลอ่านฉลากตั้งเตือนยาตามคำสั่งแพทย์</li>
          <li>การเตือนยาตีกับสมุนไพรมาจากฐานข้อมูลที่อ้างอิงได้ "ไม่พบ" ไม่ได้แปลว่าปลอดภัย</li>
        </ul>
      </LxCard>
    </div>

    <LxCard labelledBy="p-services">
      <h2 id="p-services" className="text-lg font-semibold">
        บริการภายนอกที่แอปเรียกใช้
      </h2>
      <ul className="mt-3 space-y-2">
        {SERVICES.map((s) => (
          <li key={s.name} className="rounded-2xl bg-lx-surface2 p-3">
            <p className="font-semibold">{s.name}</p>
            <p className="text-sm">ได้รับ: {s.gets}</p>
            <p className="text-sm text-lx-muted">{s.note}</p>
          </li>
        ))}
      </ul>
    </LxCard>

    <LxCard labelledBy="p-rights">
      <h2 id="p-rights" className="text-lg font-semibold">
        สิทธิของคุณและวิธีใช้สิทธิ
      </h2>
      <dl className="mt-3 grid gap-2 md:grid-cols-2">
        {RIGHTS.map((r) => (
          <div key={r.right} className="rounded-2xl bg-lx-surface2 p-3">
            <dt className="font-semibold">{r.right}</dt>
            <dd className="text-sm text-lx-muted">{r.how}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-sm text-lx-muted">คุณมีสิทธิร้องเรียนต่อสำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล (สคส.) หากเห็นว่าการใช้ข้อมูลไม่เป็นไปตามกฎหมาย</p>
    </LxCard>

    <LxCard labelledBy="p-security">
      <h2 id="p-security" className="text-lg font-semibold">
        ความปลอดภัยและการเปลี่ยนแปลงประกาศ
      </h2>
      <p className="mt-2 text-base">
        ระบบจริงจะเข้ารหัสข้อมูลทั้งตอนเก็บและตอนส่ง แยกสิทธิ์ตามบทบาท สำรองข้อมูล และแจ้งเหตุข้อมูลรั่วต่อ สคส. ภายใน 72 ชั่วโมงตามมาตรา 37 หากประกาศนี้เปลี่ยนในสาระสำคัญ แอปจะแจ้งและขอความยินยอมใหม่เมื่อจำเป็น
      </p>
      <p className="mt-3 text-sm text-lx-muted">
        จัดการความยินยอมได้ที่{' '}
        <Link to="/yai/profile" className="font-semibold text-lx-link underline">
          โปรไฟล์และความเป็นส่วนตัว
        </Link>
      </p>
    </LxCard>
  </div>
);
