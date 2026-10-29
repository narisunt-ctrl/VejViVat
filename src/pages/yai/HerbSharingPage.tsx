import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FlaskConical, HeartHandshake, PhoneCall } from 'lucide-react';
import { demoNow, useYai, yaiStore } from '../../services/yai/yaiStore';
import { LxCard, LxNotice, LxPageHeader, SourceTag, btnPrimary, btnSecondary } from '../../components/yai/lx/ui';
import { canRead } from '../../domain/yai/policies';
import { herbUseRecords, researchRecord, RESEARCH_NOTICE_VERSION } from '../../domain/yai/herbSharing';
import { CAREBRIDGE_RECIPIENT_ID, CAREBRIDGE_RECIPIENT_NAME } from '../../data/yai/demoLinks';

// Herb data sharing with consent. Two purposes, two separate choices:
// A. CARE: the user's clinic on CareBridge sees which herbs she uses (consent scope HERB_DATA, 90 days, revocable).
// B. RESEARCH: a de-identified record for approved research, which may support developing herbal products; plus an
//    optional "contact me about studies". No points or rewards are tied to either choice.

const SOURCE_TH = { MEDICINE_LIST: 'สมุดยา', JOURNAL: 'บันทึก', REVIEW: 'รีวิว' } as const;
const dt = (iso: string) => new Date(iso).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export const HerbSharingPage: React.FC = () => {
  const state = useYai((s) => s);
  const now = demoNow(state);
  const uses = herbUseRecords(state);
  const careOn = canRead(state.consents, CAREBRIDGE_RECIPIENT_ID, 'HERB_DATA', now);
  const careGrant = state.consents.find((c) => c.recipientId === CAREBRIDGE_RECIPIENT_ID && c.scope.includes('HERB_DATA') && !c.revokedAt && (!c.expiresAt || Date.parse(c.expiresAt) > now.getTime()));
  const research = state.settings.herbResearch;
  const [agree, setAgree] = useState(false);
  const preview = researchRecord({ ...state, settings: { ...state.settings, herbResearch: { research: true, contact: research?.contact ?? false, at: '', version: RESEARCH_NOTICE_VERSION } } });

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <LxPageHeader back="/yai/discover" eyebrow="Herb Data Sharing" title="แบ่งปันข้อมูลสมุนไพร" subtitle="เลือกได้เองว่าจะให้ข้อมูลไปเพื่อการดูแล เพื่องานวิจัย หรือไม่ให้เลย" />

      <LxNotice title="สองเรื่องแยกกัน เลือกอย่างใดอย่างหนึ่งหรือไม่เลือกก็ได้">
        การไม่แบ่งปันไม่มีผลต่อการใช้แอปหรือการรักษา และไม่มีแต้มหรือรางวัลสำหรับการตัดสินใจนี้ ยกเลิกได้ทุกเมื่อ
      </LxNotice>

      <LxCard labelledBy="mine">
        <h2 id="mine" className="text-lg font-semibold">
          ข้อมูลสมุนไพรของคุณที่ระบบพบ
        </h2>
        {uses.length === 0 ? (
          <p className="mt-2 text-base text-lx-muted">ยังไม่พบการใช้สมุนไพรในสมุดยา บันทึก หรือรีวิว</p>
        ) : (
          <ul className="mt-3 divide-y divide-lx-line">
            {uses.slice(0, 8).map((u, i) => (
              <li key={`${u.herb}-${u.source}-${i}`} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
                <span>
                  <b>{u.herb}</b> <span className="text-sm text-lx-muted">· {u.detail}</span>
                </span>
                <span className="text-xs text-lx-muted">
                  {SOURCE_TH[u.source]} · {u.date}
                </span>
              </li>
            ))}
          </ul>
        )}
      </LxCard>

      <div className="grid gap-4 md:grid-cols-2">
        {/* A. care */}
        <LxCard labelledBy="care">
          <h2 id="care" className="flex items-center gap-2 text-lg font-semibold">
            <HeartHandshake className="h-5 w-5 text-lx-accent" aria-hidden="true" /> A. เพื่อการดูแลของคุณ
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            <li>ผู้รับ: {CAREBRIDGE_RECIPIENT_NAME} (แพทย์ที่ดูแลคุณ)</li>
            <li>เห็น: สมุนไพรที่ใช้ มาจากสมุดยา บันทึก หรือรีวิว และวันที่</li>
            <li>ใช้เพื่อ: ตรวจว่าสมุนไพรตีกับยาหรือไม่ และวางแผนดูแลร่วมกัน</li>
            <li>มีอายุ 90 วัน ยกเลิกได้ทันที ทุกครั้งที่แพทย์เปิดอ่านจะอยู่ในประวัติการเข้าถึง</li>
          </ul>
          {careOn ? (
            <div className="mt-3 space-y-2">
              <SourceTag kind="VERIFIED" text={`แบ่งปันอยู่ ถึง ${careGrant?.expiresAt ? dt(careGrant.expiresAt) : '-'}`} />
              <button type="button" onClick={() => careGrant && yaiStore.revokeConsent(careGrant.id)} className={`${btnSecondary} w-full`}>
                ยกเลิกการแบ่งปันเพื่อการดูแล
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => yaiStore.grantConsent(CAREBRIDGE_RECIPIENT_ID, CAREBRIDGE_RECIPIENT_NAME, ['HERB_DATA'], 90)} className={`${btnPrimary} mt-3 w-full`}>
              ยินยอมให้แพทย์เห็นข้อมูลสมุนไพร
            </button>
          )}
        </LxCard>

        {/* B. research */}
        <LxCard labelledBy="research">
          <h2 id="research" className="flex items-center gap-2 text-lg font-semibold">
            <FlaskConical className="h-5 w-5 text-lx-accent" aria-hidden="true" /> B. เพื่องานวิจัยสมุนไพรไทย
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            <li>ส่งแบบ<b>ไม่ระบุตัวตน</b>: ไม่มีชื่อ ไม่มีข้อความที่คุณพิมพ์ ใช้ช่วงอายุและเดือนแทนวันที่</li>
            <li>นักวิจัยใช้ได้เฉพาะโครงการที่ผ่านคณะกรรมการจริยธรรมและคณะกรรมการพิจารณาการเข้าถึงข้อมูล</li>
            <li>ผลวิจัยอาจนำไปพัฒนา<b>ผลิตภัณฑ์สมุนไพรเชิงพาณิชย์</b>ร่วมกับผู้ผลิตที่ได้มาตรฐาน</li>
            <li>สมุนไพรกลุ่มที่มีผู้ใช้น้อยกว่า 5 คนจะไม่ถูกแสดง เพื่อไม่ให้ใครถูกระบุตัวได้</li>
            <li>ยกเลิกได้ทุกเมื่อ ระบบหยุดส่งข้อมูลใหม่ทันที แต่ข้อมูลที่ใช้ในงานวิจัยที่ตีพิมพ์แล้วดึงคืนไม่ได้</li>
          </ul>
          {research?.research ? (
            <div className="mt-3 space-y-2">
              <SourceTag kind="VERIFIED" text={`ร่วมวิจัยอยู่ · ยินยอมเมื่อ ${dt(research.at)} · ฉบับ ${research.version}`} />
              <label className="flex min-h-[48px] items-center justify-between gap-3 rounded-2xl bg-lx-surface2 px-3 text-sm">
                <span className="flex items-center gap-2">
                  <PhoneCall className="h-4 w-4 text-lx-accent" aria-hidden="true" /> ติดต่อฉันได้ถ้ามีงานวิจัยที่เหมาะ
                </span>
                <input type="checkbox" className="h-6 w-6 accent-[rgb(var(--lx-accent))]" checked={research.contact} onChange={(e) => yaiStore.setHerbResearch({ contact: e.target.checked })} />
              </label>
              <button type="button" onClick={() => yaiStore.setHerbResearch({ research: false })} className={`${btnSecondary} w-full`}>
                ถอนความยินยอมเพื่องานวิจัย
              </button>
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              <label className="flex items-start gap-3 rounded-2xl bg-lx-surface2 p-3 text-sm">
                <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-[rgb(var(--lx-accent))]" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                ฉันอ่านแล้ว และยินยอมให้ใช้ข้อมูลสมุนไพรแบบไม่ระบุตัวตนเพื่องานวิจัยตามเงื่อนไขด้านบน
              </label>
              <button type="button" disabled={!agree} onClick={() => yaiStore.setHerbResearch({ research: true })} className={`${btnPrimary} w-full`}>
                ร่วมแบ่งปันเพื่องานวิจัย
              </button>
            </div>
          )}
        </LxCard>
      </div>

      <LxCard labelledBy="preview">
        <h2 id="preview" className="text-lg font-semibold">
          ตัวอย่างข้อมูลที่นักวิจัยจะได้รับ (ของคุณ)
        </h2>
        <p className="text-sm text-lx-muted">ส่งเฉพาะเมื่อยินยอมข้อ B และใช้ในรูปสรุปรวมกับผู้ใช้คนอื่นเป็นหลัก</p>
        {!preview || preview.herbs.length === 0 ? (
          <p className="mt-2 text-base text-lx-muted">ยังไม่มีข้อมูลสมุนไพรที่จะส่ง</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-2xl border border-lx-line">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="bg-lx-surface2 text-lx-muted">
                <tr>
                  <th className="p-2 font-semibold">รหัสแทนตัว</th>
                  <th className="p-2 font-semibold">ช่วงอายุ</th>
                  <th className="p-2 font-semibold">สมุนไพร</th>
                  <th className="p-2 font-semibold">สัปดาห์</th>
                  <th className="p-2 font-semibold">ดาว</th>
                  <th className="p-2 font-semibold">อาการไม่พึงประสงค์</th>
                  <th className="p-2 font-semibold">เดือน</th>
                </tr>
              </thead>
              <tbody>
                {preview.herbs.map((h) => (
                  <tr key={h.herb} className="border-t border-lx-line">
                    <td className="num p-2">{preview.pseudoId}</td>
                    <td className="p-2">{preview.ageBand}</td>
                    <td className="p-2">{h.herb}</td>
                    <td className="num p-2">{h.weeksUsed ?? '-'}</td>
                    <td className="num p-2">{h.rating ?? '-'}</td>
                    <td className="p-2">{h.sideEffects === null ? '-' : h.sideEffects === 'NONE' ? 'ไม่มี' : h.sideEffects === 'MILD' ? 'เล็กน้อย' : 'รบกวน'}</td>
                    <td className="p-2">{h.month}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-xs text-lx-muted">
          ต้นแบบใช้ข้อมูลสังเคราะห์ ระบบจริงต้องผ่านคณะกรรมการจริยธรรม มีเจ้าหน้าที่คุ้มครองข้อมูล และรหัสแทนตัวที่สร้างด้วยกุญแจลับของแพลตฟอร์ม · อ่านเพิ่มใน{' '}
          <Link to="/yai/privacy" className="underline">
            ประกาศความเป็นส่วนตัว
          </Link>
        </p>
      </LxCard>
    </div>
  );
};
