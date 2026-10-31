import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Pencil, Plus, Trash2, Volume2, VolumeX } from 'lucide-react';
import { BigButton, Card, formatThaiDateTime, inputCls, Notice, PageTitle } from '../../components/yai/ui';
import { CategoryChip, SourceVerificationChip } from '../../components/yai/SourceVerificationChip';
import { demoNow, useYai, yaiStore } from '../../services/yai/yaiStore';
import { journalDraft } from '../../services/yai/journalDraft';
import { suggestSegments } from '../../services/yai/healthTextClassifier';
import { speakThai, stopSpeaking } from '../../services/yai/thaiVoiceJournal';
import { FeelingPicker } from '../../components/yai/FeelingPicker';
import { charsPerSec } from '../../domain/yai/voiceFeatures';
import type { FeelingTag } from '../../domain/yai/models';
import { ALL_CATEGORIES, bangkokDate, CATEGORY_LABEL, JournalCategory, PHOTO_TAG_LABEL, SuggestedSegment } from '../../domain/yai/journal';

const CATEGORIES: JournalCategory[] = ALL_CATEGORIES;

/** Screen 3 "ยายตรวจสอบ": nothing is stored until the patient presses a save button */
export const JournalReviewPage: React.FC = () => {
  const navigate = useNavigate();
  const photos = useYai((s) => s.photos);
  const [draft] = useState(() => journalDraft.get());
  const [reviewedText, setReviewedText] = useState(draft?.originalText ?? '');
  const [segments, setSegments] = useState<SuggestedSegment[]>(() => suggestSegments(draft?.originalText ?? ''));
  const [editing, setEditing] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [feelings, setFeelings] = useState<FeelingTag[]>([]);

  useEffect(() => () => stopSpeaking(), []);

  if (!draft) {
    return (
      <div className="space-y-4">
        <PageTitle title="ยายตรวจสอบ" back="/yai" />
        <Notice title="ยังไม่มีข้อมูลที่รอตรวจ">
          <Link to="/yai" className="font-bold text-yai-deep underline">
            กลับไปเล่าหรือพิมพ์ที่หน้าแรก
          </Link>
        </Notice>
      </div>
    );
  }

  const draftPhotos = draft.photoIds.map((id) => photos.find((p) => p.id === id)).filter(Boolean) as typeof photos;
  const unlabeled = draft.photoIds.filter((id) => draft.photoTags[id] === 'UNLABELED_MEDICINE');
  const changeSeg = (id: string, p: Partial<SuggestedSegment>) => setSegments((ss) => ss.map((s) => (s.id === id ? { ...s, ...p, correctedByUser: true } : s)));

  const readBack = () => {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    const parts = segments.map((s) => `${CATEGORY_LABEL[s.category]}: ${s.unknown ? 'ยังไม่ทราบ' : s.text}`).join(' ');
    // reads back only what was captured; no medical conclusion
    setSpeaking(speakThai(`หนูได้ยินว่า ${reviewedText || 'มีรูป'} ${parts ? `แยกได้เป็น ${parts}` : ''}`));
  };

  const save = (patientSaidComplete: boolean) => {
    stopSpeaking();
    const kept = segments.filter((s) => s.text.trim() || s.unknown);
    const linkedMedicineIds: string[] = [];
    if (unlabeled.length) {
      const said = kept.filter((s) => s.category === 'MEDICINE_USE_REPORT').map((s) => s.text).join(' ') || reviewedText || 'ยาไม่มีฉลากจากรูป';
      linkedMedicineIds.push(yaiStore.addPendingMedicine(said, unlabeled));
    }
    yaiStore.saveJournalEntry({
      originalText: draft.originalText,
      reviewedText: reviewedText.trim(),
      inputSource: draft.inputSource,
      capturedAt: draft.capturedAt,
      segments: kept,
      photoIds: draft.photoIds,
      photoTags: draft.photoIds.map((id) => draft.photoTags[id] ?? 'OTHER'),
      ocrEngine: draft.ocrEngine,
      linkedMedicineIds,
      patientSaidComplete,
      isSynthetic: !!draft.isSyntheticSample,
    });
    if (feelings.length) yaiStore.setFeelings(feelings);
    if (draft.voice) yaiStore.addVoiceSample(draft.voice, charsPerSec(draft.originalText, draft.voice.voicedSec));
    journalDraft.clear();
    navigate(`/yai/journal/history?date=${bangkokDate(draft.capturedAt)}&saved=1`);
  };

  return (
    <div className="space-y-5">
      <PageTitle title="ยายตรวจสอบก่อนบันทึก" subtitle="ขั้นที่ 2 จาก 2 · ถูกต้องไหมคะ แก้ได้ทุกช่อง" back="/yai/journal/process" />

      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <SourceVerificationChip source={draft.inputSource} status="DRAFT" synthetic={draft.isSyntheticSample} />
          <span className="text-sm text-yai-ink/70">{formatThaiDateTime(draft.capturedAt)}</span>
        </div>
        {draft.originalText && (
          <div>
            <p className="text-sm font-semibold text-yai-ink/70">ข้อความเดิม (เก็บไว้ ไม่ถูกแก้)</p>
            <p className="whitespace-pre-line rounded-2xl bg-slate-50 p-3 text-lg">{draft.originalText}</p>
          </div>
        )}
        {draft.ocrEngine && <p className="text-sm text-yai-ink/70">อ่านจากรูปด้วย {draft.ocrEngine} · ความมั่นใจของ OCR ไม่ได้บอกว่าข้อมูลยาถูกต้อง</p>}
        {editing ? (
          <label className="block">
            <span className="mb-1 block text-base font-semibold">ข้อความที่ยายแก้</span>
            <textarea className={`${inputCls} min-h-[120px] py-3`} value={reviewedText} onChange={(e) => setReviewedText(e.target.value)} />
            <button type="button" className="mt-2 min-h-[44px] text-base font-bold text-yai-deep underline" onClick={() => setSegments(suggestSegments(reviewedText))}>
              ให้หนูแยกหมวดใหม่จากข้อความที่แก้
            </button>
          </label>
        ) : (
          reviewedText !== draft.originalText && <p className="rounded-2xl bg-yai-mint p-3 text-lg">{reviewedText}</p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <BigButton variant="secondary" icon={<Pencil className="h-5 w-5" />} onClick={() => setEditing((e) => !e)} aria-pressed={editing}>
            ✏️ {editing ? 'แก้เสร็จแล้ว' : 'แก้ไข'}
          </BigButton>
          <BigButton variant="secondary" icon={speaking ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />} onClick={readBack}>
            {speaking ? 'หยุดอ่าน' : 'ให้หนูอ่านทวน'}
          </BigButton>
        </div>
      </Card>

      {draftPhotos.length > 0 && (
        <Card className="space-y-2">
          <h2 className="text-lg font-bold">รูปที่แนบ</h2>
          <div className="grid grid-cols-2 gap-2">
            {draftPhotos.map((p) => (
              <figure key={p.id} className="rounded-xl border border-yai-ink/10 p-1">
                <img src={p.dataUrl} alt="รูปที่ถ่าย" className="h-32 w-full rounded-lg object-contain bg-slate-50" />
                <figcaption className="text-center text-sm font-semibold">{PHOTO_TAG_LABEL[draft.photoTags[p.id] ?? 'OTHER']}</figcaption>
              </figure>
            ))}
          </div>
          {unlabeled.length > 0 && <Notice tone="warn" title="ยาไม่มีฉลาก: จะบันทึกเป็น 'ยังไม่ทราบชนิด' รอผู้เชี่ยวชาญระบุ ไม่มีการตั้งเตือน" />}
        </Card>
      )}

      <Card className="space-y-3">
        <h2 className="text-lg font-bold">หนูแยกได้แบบนี้ ถูกไหมคะ</h2>
        {segments.length === 0 && <p className="text-base text-yai-ink/70">ยังไม่มีข้อความให้แยก เพิ่มได้ด้านล่าง หรือบันทึกเฉพาะรูปก็ได้</p>}
        {segments.map((s) => (
          <div key={s.id} className="space-y-2 rounded-2xl border border-yai-ink/10 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CategoryChip category={s.category} />
              {s.unknown && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-sm font-semibold text-yai-warn">ยังไม่ทราบ</span>}
            </div>
            {editing ? (
              <>
                <select className={inputCls} value={s.category} aria-label="หมวด" onChange={(e) => changeSeg(s.id, { category: e.target.value as JournalCategory })}>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_LABEL[c]}
                    </option>
                  ))}
                </select>
                <input className={inputCls} value={s.text} aria-label="ข้อความ" onChange={(e) => changeSeg(s.id, { text: e.target.value })} />
              </>
            ) : (
              <p className="text-xl">{s.text}</p>
            )}
            {s.category === 'MEDICINE_USE_REPORT' && <p className="text-sm text-violet-900">เป็นคำบอกเล่าของยาย ไม่ใช่คำสั่งยา และไม่ตั้งเวลาเตือน</p>}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                aria-pressed={!!s.unknown}
                onClick={() => changeSeg(s.id, { unknown: !s.unknown })}
                className={`min-h-[52px] rounded-2xl border-2 text-base font-bold ${s.unknown ? 'border-yai-warn bg-amber-50' : 'border-yai-ink/15 bg-white'}`}
              >
                ไม่ทราบ
              </button>
              <button
                type="button"
                onClick={() => setSegments((ss) => ss.filter((x) => x.id !== s.id))}
                className="inline-flex min-h-[52px] items-center justify-center gap-1 rounded-2xl border-2 border-yai-ink/15 bg-white text-base font-bold text-yai-alert"
              >
                <Trash2 className="h-5 w-5" aria-hidden="true" /> เอาออก
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          className="inline-flex min-h-[48px] items-center gap-1 text-lg font-bold text-yai-deep underline"
          onClick={() => {
            setEditing(true);
            setSegments((ss) => [...ss, { id: `seg-new-${Date.now()}`, category: 'OTHER', text: '', correctedByUser: true }]);
          }}
        >
          <Plus className="h-5 w-5" aria-hidden="true" /> เพิ่มเรื่องที่ยังขาด
        </button>
      </Card>

      <Card className="space-y-2">
        <FeelingPicker look="light" value={feelings} onChange={setFeelings} />
        <p className="text-sm text-yai-ink/70">หนูถามแทนการเดาจากน้ำเสียง สิ่งที่เลือกจะบันทึกเป็นความรู้สึกที่บอกเอง</p>
        {draft.voice && <p className="text-sm text-yai-ink/70">วัดลักษณะเสียงในเครื่องแล้ว (ทดลอง): ความเร็ว ช่วงหยุด ระดับและความดังของเสียง เก็บเป็นตัวเลขเท่านั้น ไม่เก็บไฟล์เสียง</p>}
      </Card>

      <div className="space-y-2">
        <BigButton size="lg" onClick={() => save(false)}>
          ✅ ถูกต้อง บันทึกเลย
        </BigButton>
        <BigButton variant="secondary" onClick={() => save(true)}>
          มีแค่นี้ บันทึก
        </BigButton>
        <BigButton
          variant="ghost"
          onClick={() => {
            stopSpeaking();
            journalDraft.clear();
            navigate('/yai');
          }}
        >
          ยกเลิก ไม่บันทึก
        </BigButton>
      </div>
      <p className="text-center text-sm text-yai-ink/60">บันทึกเมื่อ {formatThaiDateTime(demoNow().toISOString())} · เป็นคำบอกเล่าของผู้ป่วย ไม่ใช่การวินิจฉัย</p>
    </div>
  );
};
