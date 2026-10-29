import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Leaf, Mic, UtensilsCrossed } from 'lucide-react';
import { demoNow, useYai } from '../../services/yai/yaiStore';
import { getElementSummaryForPatient } from '../../services/yai/elementSummaryAdapter';
import { bangkokDate, thaiDateLabel } from '../../domain/yai/journal';
import { tastesIn } from '../../domain/yai/herbElement';
import { dietContext, eatenFoods, menuIdeas, tasteBalance } from '../../domain/yai/foodElement';
import { FOOD_TABLE_STATUS } from '../../data/yai/thaiFoodTastes';
import { LxCard, LxLinkRow, LxNotice, LxPageHeader, SourceTag, btnPrimary } from '../../components/yai/lx/ui';

// อาหารตามธาตุ: today's element and tastes from the clinic-linked Smutthan assessment (unchanged formula), what the
// user said she ate this week and its tastes, menu ideas that fit the element after chronic conditions and medicines
// are taken into account. The food→taste table is waiting for expert review and the page says so.

export const FoodPage: React.FC = () => {
  const state = useYai((s) => s);
  const today = bangkokDate(demoNow(state));
  const summary = useMemo(() => getElementSummaryForPatient(state.patient.id), [state.patient.id]);
  const recommended = summary.status === 'AVAILABLE' ? [...new Set(summary.dynamic.recommendedTaste.flatMap(tastesIn))] : [];
  const eaten = eatenFoods(state, today, 7);
  const balance = tasteBalance(eaten, recommended);
  const ideas = menuIdeas(summary, state);
  const ctx = dietContext(summary, state);
  const maxCount = Math.max(1, ...balance.rows.map((r) => r.count));

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <LxPageHeader back="/yai" eyebrow="Food by Element" title="อาหารตามธาตุ" subtitle="กินให้สมดุลตามหลักแพทย์แผนไทย โดยคำนึงถึงโรคประจำตัวและยาที่ใช้ก่อนเสมอ" />

      {summary.status !== 'AVAILABLE' ? (
        <LxNotice tone="warn" title="ยังประเมินธาตุไม่ได้">
          ยังขาด: {summary.missingInputs.join(', ')} · ระบบไม่เดาธาตุหรือใส่ค่าปกติแทน ดูรสของอาหารที่กินด้านล่างได้ แต่ยังไม่มีเมนูแนะนำ
        </LxNotice>
      ) : (
        <LxCard labelledBy="food-element">
          <h2 id="food-element" className="text-lg font-semibold">
            สมุฏฐานเด่นวันนี้: {summary.dynamic.dominantTh}
          </h2>
          <p className="text-sm text-lx-muted">
            {summary.dynamic.state} · ธาตุเจ้าเรือน {summary.birthElement ?? 'ยังไม่มีข้อมูล'}
          </p>
          <p className="mt-3 text-sm font-semibold text-lx-muted">รสที่ตำราระบุ</p>
          <ul className="mt-1 flex flex-wrap gap-1.5">
            {summary.dynamic.recommendedTaste.map((t) => (
              <li key={t} className="rounded-full bg-lx-accent/15 px-3 py-1 text-sm">
                {t}
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-1">
            <SourceTag kind="DEMO" />
            <SourceTag kind="SELF" text={summary.source} />
          </div>
        </LxCard>
      )}

      {ctx.conditions.length > 0 && (
        <LxNotice tone="warn" title="โรคประจำตัวมาก่อนธาตุ">
          ในข้อมูลที่เชื่อมไว้มี: {ctx.conditions.join(', ')}
          {ctx.hypertension || ctx.kidney ? ' · จึงไม่แสดงเมนูรสเค็ม' : ''}
          {ctx.diabetes ? ' · จึงไม่แสดงเมนูหวาน' : ''} · ควรให้แพทย์หรือนักโภชนาการทบทวนก่อนปรับอาหาร
        </LxNotice>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <LxCard labelledBy="taste-balance">
          <h2 id="taste-balance" className="text-lg font-semibold">
            รสที่กินสัปดาห์นี้
          </h2>
          <p className="text-sm text-lx-muted">
            จากอาหารที่เล่าในบันทึก 7 วัน · รู้จักเมนู {balance.recognised} รายการ{balance.unrecognised ? ` · ยังไม่รู้จัก ${balance.unrecognised}` : ''}
          </p>
          {balance.recognised === 0 ? (
            <p className="mt-3 rounded-2xl bg-lx-surface2 p-4 text-base text-lx-muted">ยังไม่มีอาหารที่ระบบรู้จักในสัปดาห์นี้</p>
          ) : (
            <ul className="mt-3 space-y-2" aria-label="จำนวนครั้งของแต่ละรส">
              {balance.rows.map((r) => (
                <li key={r.taste} className="grid grid-cols-[4.5rem_minmax(0,1fr)_2rem] items-center gap-2 text-sm">
                  <span className={r.recommended ? 'font-semibold' : 'text-lx-muted'}>รส{r.taste}</span>
                  <span className="h-3 overflow-hidden rounded-full bg-lx-surface2" aria-hidden="true">
                    <span className={`block h-full rounded-full ${r.recommended ? 'bg-lx-accent' : 'bg-lx-muted/50'}`} style={{ width: `${(r.count / maxCount) * 100}%` }} />
                  </span>
                  <span className="num text-right">{r.count}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-lx-muted">แถบสีเขียว = รสที่ตำราระบุสำหรับธาตุวันนี้ เป็นการสังเกต ไม่ใช่คะแนน</p>
        </LxCard>

        <LxCard labelledBy="eaten">
          <h2 id="eaten" className="text-lg font-semibold">
            อาหารที่เล่าไว้
          </h2>
          {eaten.length === 0 ? (
            <div className="mt-3 space-y-3">
              <p className="text-base text-lx-muted">ยังไม่มีบันทึกอาหาร 7 วันนี้</p>
              <Link to="/yai/checkin" className={btnPrimary}>
                <Mic className="h-5 w-5" aria-hidden="true" /> เล่าว่ากินอะไร
              </Link>
            </div>
          ) : (
            <ul className="mt-3 divide-y divide-lx-line">
              {eaten.slice(0, 8).map((e, i) => (
                <li key={`${e.date}-${i}`} className="py-2">
                  <p className="text-base">{e.text}</p>
                  <p className="text-xs text-lx-muted">
                    {thaiDateLabel(e.date)}
                    {e.foods.length ? ` · ${e.foods.map((f) => `${f.name} (รส${f.tastes.join(' ')})`).join(', ')}` : ' · ยังไม่รู้จักเมนูนี้'}
                    {e.synthetic ? ' · ตัวอย่าง' : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </LxCard>
      </div>

      <LxCard labelledBy="menu">
        <h2 id="menu" className="flex items-center gap-2 text-lg font-semibold">
          <UtensilsCrossed className="h-5 w-5 text-lx-accent" aria-hidden="true" /> เมนูที่รสเข้ากับธาตุวันนี้
        </h2>
        {ideas.length === 0 ? (
          <p className="mt-2 text-base text-lx-muted">{summary.status === 'AVAILABLE' ? 'ไม่มีเมนูที่เข้าเงื่อนไขหลังกรองตามโรคประจำตัว' : 'ต้องมีผลประเมินธาตุจากคลินิกก่อน'}</p>
        ) : (
          <ul className="mt-3 grid gap-2 md:grid-cols-2">
            {ideas.map((m) => (
              <li key={m.food.id} className="rounded-2xl border border-lx-line p-3">
                <p className="font-semibold">{m.food.name}</p>
                <p className="text-sm text-lx-muted">
                  รส{m.food.tastes.join(' ')} · ตรงกับ: {m.matchedTastes.map((t) => `รส${t}`).join(', ')}
                </p>
                {m.notes.map((n) => (
                  <p key={n} className="mt-1 text-sm text-lx-warn">
                    {n}
                  </p>
                ))}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-lx-muted">{FOOD_TABLE_STATUS} · ไม่นับแคลอรี ไม่ได้อ้างว่าอาหารรักษาโรค · ถ้าแพ้อาหารหรือมีโรคที่ยังไม่ได้บันทึก ให้ถามแพทย์ก่อน</p>
      </LxCard>

      <div className="grid gap-2 md:grid-cols-2">
        <LxLinkRow to="/yai/discover" icon={Leaf} title="สมุนไพรกับธาตุของคุณ" sub="เทียบรสยาตามตำรา พร้อมข้อควรระวังกับยา" />
        <LxLinkRow to="/yai/herb-sharing" icon={Leaf} title="แบ่งปันข้อมูลสมุนไพร" sub="ให้แพทย์ดูแล หรือร่วมงานวิจัย (เลือกเองได้)" />
      </div>
    </div>
  );
};
