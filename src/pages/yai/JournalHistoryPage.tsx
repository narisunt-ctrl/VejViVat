import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ShieldCheck, FileText } from 'lucide-react';
import { BigButton, Card, formatThaiDateTime, inputCls, Notice, PageTitle } from '../../components/yai/ui';
import { DailyHeatmap } from '../../components/yai/DailyHeatmap';
import { CategoryChip, SourceVerificationChip } from '../../components/yai/SourceVerificationChip';
import { demoNow, useYai, yaiStore } from '../../services/yai/yaiStore';
import { bangkokDate, CATEGORY_LABEL, isConfirmed, JournalCategory, JournalEntry, PHOTO_TAG_LABEL, thaiDateLabel } from '../../domain/yai/journal';

const CATEGORIES: JournalCategory[] = ['SYMPTOM', 'MEDICINE_USE_REPORT', 'FOOD_CONSUMED', 'OTHER'];

/** Screen 4 "ผลลัพธ์และประวัติ": confirmed entries by day, with provenance and version history */
export const JournalHistoryPage: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const state = useYai((s) => s);
  const today = bangkokDate(demoNow(state));
  const selected = params.get('date');
  const entries = (state.journal ?? []).filter(isConfirmed);
  const shown = selected ? entries.filter((e) => e.recordedLocalDate === selected) : entries.slice(0, 20);
  const byDate = shown.reduce<Record<string, JournalEntry[]>>((acc, e) => {
    (acc[e.recordedLocalDate] ??= []).push(e);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <PageTitle title="ประวัติบันทึกสุขภาพ" subtitle="เฉพาะที่ยายยืนยันแล้ว เรียงจากล่าสุด" back="/yai" />
      {params.get('saved') && <Notice title="บันทึกแล้วค่ะ ปฏิทินอัปเดตแล้ว" />}

      <Card>
        <DailyHeatmap
          entries={entries}
          today={today}
          selected={selected}
          onSelect={(d) => setParams(d === selected ? {} : { date: d })}
        />
      </Card>

      {selected && (
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xl font-bold">{thaiDateLabel(selected)}</h2>
          <button type="button" className="min-h-[44px] text-base font-bold text-yai-deep underline" onClick={() => setParams({})}>
            ดูทุกวัน
          </button>
        </div>
      )}
      {shown.length === 0 && <p className="text-lg text-yai-ink/70">{selected ? 'วันนั้นยังไม่มีบันทึก' : 'ยังไม่มีบันทึก'}</p>}

      {Object.entries(byDate).map(([date, list]) => (
        <section key={date} className="space-y-3">
          {!selected && <h2 className="text-lg font-bold">{thaiDateLabel(date)} · {list.length} รายการ</h2>}
          {list.map((e) => (
            <EntryCard key={e.id} entry={e} photos={state.photos} medicines={state.medicines} />
          ))}
        </section>
      ))}

      <div className="grid grid-cols-2 gap-3">
        <Link to="/yai/passport" className="flex min-h-[64px] items-center justify-center gap-2 rounded-2xl bg-yai-mint px-3 text-center text-base font-bold text-yai-deep">
          <ShieldCheck className="h-6 w-6" aria-hidden="true" /> Evidence Passport
        </Link>
        <Link to="/yai/previsit" className="flex min-h-[64px] items-center justify-center gap-2 rounded-2xl bg-yai-mint px-3 text-center text-base font-bold text-yai-deep">
          <FileText className="h-6 w-6" aria-hidden="true" /> ข้อมูลให้หมอ
        </Link>
      </div>
    </div>
  );
};

const EntryCard: React.FC<{ entry: JournalEntry; photos: ReturnType<typeof yaiStore.getState>['photos']; medicines: ReturnType<typeof yaiStore.getState>['medicines'] }> = ({
  entry: e,
  photos,
  medicines,
}) => {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(e.reviewedText);
  const [segs, setSegs] = useState(e.segments);
  const entryPhotos = e.photoIds.map((id) => photos.find((p) => p.id === id)).filter(Boolean) as typeof photos;

  return (
    <Card className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SourceVerificationChip source={e.inputSource} status={e.status} synthetic={e.isSynthetic} />
        <span className="text-sm text-yai-ink/70">{formatThaiDateTime(e.capturedAt)}</span>
      </div>
      {editing ? (
        <div className="space-y-2">
          <textarea className={`${inputCls} min-h-[96px] py-3`} value={text} onChange={(ev) => setText(ev.target.value)} aria-label="ข้อความ" />
          {segs.map((s) => (
            <div key={s.id} className="grid grid-cols-[auto_1fr] gap-2">
              <select
                className={`${inputCls} !w-auto`}
                value={s.category}
                aria-label="หมวด"
                onChange={(ev) => setSegs(segs.map((x) => (x.id === s.id ? { ...x, category: ev.target.value as JournalCategory, correctedByUser: true } : x)))}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABEL[c]}
                  </option>
                ))}
              </select>
              <input
                className={inputCls}
                value={s.text}
                aria-label="ข้อความในหมวด"
                onChange={(ev) => setSegs(segs.map((x) => (x.id === s.id ? { ...x, text: ev.target.value, correctedByUser: true } : x)))}
              />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-2">
            <BigButton
              onClick={() => {
                yaiStore.editJournalEntry(e.id, text.trim(), segs.filter((s) => s.text.trim() || s.unknown));
                setEditing(false);
              }}
            >
              บันทึกการแก้ไข
            </BigButton>
            <BigButton
              variant="ghost"
              onClick={() => {
                setText(e.reviewedText);
                setSegs(e.segments);
                setEditing(false);
              }}
            >
              ยกเลิก
            </BigButton>
          </div>
        </div>
      ) : (
        <>
          {e.reviewedText && <p className="text-lg">{e.reviewedText}</p>}
          <ul className="space-y-1">
            {e.segments.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-2">
                <CategoryChip category={s.category} />
                <span className="text-base">{s.unknown ? `${s.text || ''} (ยังไม่ทราบ)` : s.text}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      {entryPhotos.length > 0 && (
        <div className="flex gap-2 overflow-x-auto">
          {entryPhotos.map((p, i) => (
            <figure key={p.id} className="shrink-0">
              <img src={p.dataUrl} alt="รูปที่แนบ" className="h-20 w-20 rounded-lg object-cover" />
              <figcaption className="text-center text-xs">{PHOTO_TAG_LABEL[e.photoTags?.[i] ?? 'OTHER']}</figcaption>
            </figure>
          ))}
        </div>
      )}
      {(e.linkedMedicineIds ?? []).map((id) => {
        const m = medicines.find((x) => x.id === id);
        return m ? (
          <Link key={id} to={`/yai/medicines/${id}`} className="block text-base font-bold text-yai-deep underline">
            ดูในสมุดยา: {m.displayName.value ?? 'ยาที่ยังไม่ทราบชนิด'} (รอผู้เชี่ยวชาญระบุ)
          </Link>
        ) : null;
      })}
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-yai-ink/70">
        <span>
          {e.revision > 1 ? `แก้ไขแล้ว ${e.revision - 1} ครั้ง · ข้อความเดิมและรูปยังเก็บไว้` : 'ยังไม่เคยแก้ไข'}
          {e.patientSaidComplete ? ' · ยายบอกว่ามีแค่นี้' : ''}
          {e.ocrEngine ? ` · OCR: ${e.ocrEngine}` : ''}
        </span>
        {!editing && (
          <button type="button" className="min-h-[44px] text-base font-bold text-yai-deep underline" onClick={() => setEditing(true)}>
            แก้ไข
          </button>
        )}
      </div>
      {e.history && e.history.length > 0 && (
        <details className="rounded-xl bg-slate-50 p-2 text-sm">
          <summary className="min-h-[36px] cursor-pointer font-semibold">ดูฉบับก่อนหน้า</summary>
          <p className="mt-1">ข้อความเดิมที่ได้ยิน/พิมพ์: {e.originalText || '(มีแต่รูป)'}</p>
          {e.history.map((h) => (
            <p key={h.revision} className="mt-1">
              ฉบับที่ {h.revision} ({formatThaiDateTime(h.editedAt)}): {h.reviewedText}
            </p>
          ))}
        </details>
      )}
    </Card>
  );
};
