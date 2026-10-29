import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Leaf, MessageSquareQuote, Stethoscope } from 'lucide-react';
import { LxCard, LxLinkRow, LxNotice, LxPageHeader, SourceTag } from '../../components/yai/lx/ui';
import { CertifiedAdBanner } from '../../components/yai/CertifiedAdBanner';
import { ElementHerbsCard } from '../../components/yai/lx/ElementHerbsCard';
import { HERB_CARDS, searchHerbs } from '../../domain/yai/herbDiscovery';
import { isCautionRow, MEDPLANT_SOURCE } from '../../domain/medplant';

// Thai Herbal Discovery: search herbs from the national herbal formulary in this project, with listed indications,
// cautions, interactions and live research search on each detail page. Nothing here recommends a herb to a person.

export const DiscoverPage: React.FC = () => {
  const [q, setQ] = useState('');
  const results = useMemo(() => searchHerbs(q), [q]);

  return (
    <div className="space-y-4">
      <LxPageHeader eyebrow="Thai Herbal Discovery" title="ภูมิปัญญาสมุนไพรไทย" subtitle="ศึกษาอย่างมีหลักฐาน รู้ข้อจำกัด และปรึกษาผู้เชี่ยวชาญก่อนใช้" />

      <ElementHerbsCard />

      <label className="relative block">
        <span className="sr-only">ค้นหาสมุนไพร</span>
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-lx-muted" aria-hidden="true" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ชื่อไทย ชื่อสามัญ หรือชื่อวิทยาศาสตร์ เช่น ขมิ้นชัน, ginger"
          className="min-h-[56px] w-full rounded-2xl border border-lx-line bg-lx-surface pl-12 pr-4 text-lg text-lx-ink placeholder:text-lx-muted focus:border-lx-accent focus:outline-none focus:ring-4 focus:ring-lx-accent/25"
        />
      </label>

      <LxNotice tone="warn" title="ข้อมูลเพื่อการศึกษา ไม่ใช่คำแนะนำให้ใช้">
        สมุนไพรอาจมีผลข้างเคียงหรือเกิดอันตรกิริยากับยาที่ใช้อยู่ หากมีโรคประจำตัว ตั้งครรภ์ หรือใช้ยาประจำ ควรปรึกษาแพทย์แผนไทยหรือเภสัชกรก่อน
      </LxNotice>

      <p className="text-sm text-lx-muted" aria-live="polite">
        พบ {results.length} จาก {HERB_CARDS.length} รายการ
      </p>
      <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {results.map((h) => (
          <li key={h.id}>
            <Link to={`/yai/discover/${h.id}`} className="flex h-full flex-col rounded-3xl border border-lx-line bg-lx-surface p-4 transition hover:border-lx-accent/60">
              <span className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-lx-accent/15 text-lx-accent" aria-hidden="true">
                  <Leaf className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-lg font-semibold leading-snug">{h.thaiName}</span>
                  <span className="block text-sm italic text-lx-muted">{h.scientificName}</span>
                </span>
              </span>
              <span className="mt-3 line-clamp-2 text-sm text-lx-muted">
                {h.listedIndications[0] ?? (h.source === 'MEDPLANT' ? 'มีเฉพาะข้อมูลอันตรกิริยากับยา' : 'ยังไม่มีข้อบ่งใช้ในฐานข้อมูล')}
              </span>
              <span className="mt-auto flex flex-wrap gap-1 pt-3">
                {h.inNationalList && <SourceTag kind="VERIFIED" text="บัญชียาหลักแห่งชาติ" />}
                {h.interactions.length + h.medplant.filter(isCautionRow).length > 0 && (
                  <SourceTag kind="PENDING" text={`ระวังกับยา ${h.interactions.length + h.medplant.filter(isCautionRow).length}`} />
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {results.length === 0 && <p className="rounded-2xl bg-lx-surface p-6 text-center text-base text-lx-muted">ไม่พบสมุนไพรนี้ในฐานข้อมูลต้นแบบ</p>}
      <p className="text-xs text-lx-muted">
        ข้อมูลอันตรกิริยากับยาส่วนใหญ่มาจาก{' '}
        <a href={MEDPLANT_SOURCE.url} target="_blank" rel="noreferrer" className="underline">
          {MEDPLANT_SOURCE.name}
        </a>{' '}
        ({MEDPLANT_SOURCE.reviewStatus})
      </p>

      <div className="grid gap-2 md:grid-cols-2">
        <LxLinkRow to="/yai/herb-reviews" icon={MessageSquareQuote} title="ประสบการณ์จากผู้ใช้" sub="รีวิวจากเพื่อน ๆ (ประสบการณ์ ไม่ใช่หลักฐาน)" />
        <LxLinkRow to="/yai/clinics" icon={Stethoscope} title="ปรึกษาแพทย์แผนไทย" sub="ค้นหาคลินิกที่มีแพทย์แผนไทยใกล้บ้าน" />
        <LxLinkRow to="/yai/food" icon={Leaf} title="อาหารตามธาตุ" sub="รสอาหารที่กิน เทียบกับธาตุ และเมนูที่เข้ากัน" />
        <LxLinkRow to="/yai/herb-sharing" icon={MessageSquareQuote} title="แบ่งปันข้อมูลสมุนไพร" sub="ให้แพทย์ดูแล หรือร่วมวิจัยสมุนไพรไทย (เลือกเอง)" />
      </div>

      <CertifiedAdBanner />
    </div>
  );
};
