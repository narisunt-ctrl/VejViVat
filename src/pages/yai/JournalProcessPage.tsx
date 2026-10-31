import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Camera, ScanLine, Sparkles } from 'lucide-react';
import { BigButton, Card, inputCls, Notice, PageTitle } from '../../components/yai/ui';
import { CategoryChip } from '../../components/yai/SourceVerificationChip';
import { VoiceEntryButton } from '../../components/yai/VoiceEntryButton';
import { demoNow, useYai, yaiStore } from '../../services/yai/yaiStore';
import { photoStore } from '../../services/yai/photoStore';
import { readLabel } from '../../services/yai/ocrPipeline';
import { CLASSIFIER_NAME, suggestSegments } from '../../services/yai/healthTextClassifier';
import { JournalDraft, journalDraft, SAMPLE_SENTENCE } from '../../services/yai/journalDraft';
import { VOICE_PROBLEM_TH } from '../../services/yai/thaiVoiceJournal';
import { JournalPhotoTag, PHOTO_TAG_LABEL, SOURCE_LABEL } from '../../domain/yai/journal';

const TAGS: JournalPhotoTag[] = ['MEDICINE_LABEL', 'UNLABELED_MEDICINE', 'FOOD', 'OTHER'];

/** Downscale a photo for the in-browser demo store; the untouched original goes to IndexedDB as evidence */
async function fileToDataUrl(file: File, maxSide = 1600): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', 0.88);
}

const emptyDraft = (): JournalDraft => ({ originalText: '', inputSource: 'MANUAL_TEXT', capturedAt: demoNow().toISOString(), photoIds: [], photoTags: {} });

/** Screen 2 "AI จัดข้อมูล": take the input (voice transcript, typed text, photos), show the suggested grouping */
export const JournalProcessPage: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const mode = params.get('mode') ?? 'text';
  const photos = useYai((s) => s.photos);
  const cloudConsent = useYai((s) => s.settings.cloudOcrConsent === true);
  const [draft, setDraft] = useState<JournalDraft>(() => {
    const d = journalDraft.get();
    if (d) return d;
    const fresh = emptyDraft();
    journalDraft.set(fresh);
    return fresh;
  });
  const [ocrBusy, setOcrBusy] = useState<string | null>(null);
  const [ocrMsg, setOcrMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const update = (p: Partial<JournalDraft> | ((d: JournalDraft) => Partial<JournalDraft>)) => {
    setDraft((d) => {
      const next = { ...d, ...(typeof p === 'function' ? p(d) : p) };
      journalDraft.set(next);
      return next;
    });
  };

  useEffect(() => {
    if (mode === 'photo' && draft.photoIds.length === 0) fileRef.current?.click();
    // only on first open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const segments = useMemo(() => suggestSegments(draft.originalText), [draft.originalText]);
  const draftPhotos = draft.photoIds.map((id) => photos.find((p) => p.id === id)).filter(Boolean) as typeof photos;

  const addFiles = async (files: FileList | null) => {
    if (!files) return;
    const ids: string[] = [];
    for (const file of Array.from(files).slice(0, 4)) {
      const dataUrl = await fileToDataUrl(file);
      const id = yaiStore.addPhoto({ dataUrl, source: 'UPLOAD', capturedAt: demoNow().toISOString() });
      if (photoStore.available()) {
        photoStore
          .put(id, file)
          .then((ok) => ok && yaiStore.setPhotoMeta(id, { originalStored: true }))
          .catch(() => undefined);
      }
      ids.push(id);
    }
    update((d) => ({ photoIds: [...d.photoIds, ...ids], inputSource: d.originalText ? d.inputSource : 'PHOTO_OCR' }));
  };

  const readPhoto = async (photoId: string, dataUrl: string) => {
    setOcrBusy(photoId);
    setOcrMsg(null);
    try {
      const r = await readLabel(dataUrl, { thorough: false, allowCloud: cloudConsent });
      const text = r.text.trim();
      if (!text) {
        setOcrMsg('อ่านข้อความจากรูปนี้ไม่ได้ พิมพ์หรือเล่าแทนได้ค่ะ');
      } else {
        update((d) => ({
          originalText: [d.originalText, text].filter(Boolean).join('\n'),
          inputSource: d.originalText && d.inputSource !== 'PHOTO_OCR' ? d.inputSource : 'PHOTO_OCR',
          ocrEngine: `${r.engine} (${r.provider === 'server' ? 'เซิร์ฟเวอร์' : 'ในเครื่อง'})`,
        }));
        setOcrMsg(`อ่านได้ว่า… (ยังไม่แน่ใจ ช่วยตรวจความถูกต้องในขั้นต่อไป)${r.fallbackReason ? ` · ${r.fallbackReason}` : ''}`);
      }
    } catch {
      setOcrMsg('ระบบอ่านข้อความไม่พร้อมตอนนี้ พิมพ์หรือเล่าแทนได้ค่ะ');
    } finally {
      setOcrBusy(null);
    }
  };

  const canContinue = draft.originalText.trim().length > 0 || draft.photoIds.length > 0;

  return (
    <div className="space-y-5">
      <PageTitle title="หนูช่วยจัดข้อมูลให้" subtitle="ขั้นที่ 1 จาก 2 · ยังไม่บันทึกจนกว่ายายจะยืนยัน" back="/yai" />

      {draft.voiceProblem && <Notice tone="warn" title={VOICE_PROBLEM_TH[draft.voiceProblem]} />}

      {mode === 'voice' && draft.inputSource === 'VOICE_TRANSCRIPT' && draft.originalText && (
        <Card className="space-y-2">
          <h2 className="text-lg font-bold">หนูได้ยินว่า</h2>
          <p className="rounded-2xl bg-yai-mint p-3 text-xl">{draft.originalText}</p>
          <p className="text-sm text-yai-ink/70">ข้อความนี้มาจากเสียงที่เบราว์เซอร์แปลงได้จริง ถ้าไม่ตรง แก้ได้ในขั้นต่อไป</p>
          <VoiceEntryButton
            label="พูดใหม่"
            onTranscript={(t, voice) => update({ originalText: t, inputSource: 'VOICE_TRANSCRIPT', capturedAt: demoNow().toISOString(), isSyntheticSample: false, voice })}
            onFallback={(p) => update({ voiceProblem: p })}
          />
        </Card>
      )}

      {(mode !== 'voice' || draft.inputSource !== 'VOICE_TRANSCRIPT' || !draft.originalText) && (
        <Card className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-lg font-bold">{mode === 'photo' ? 'เล่าเพิ่มเกี่ยวกับรูป (ไม่บังคับ)' : 'วันนี้เป็นอย่างไรบ้าง พิมพ์ได้เลยค่ะ'}</span>
            <textarea
              className={`${inputCls} min-h-[140px] py-3`}
              value={draft.originalText}
              placeholder="เช่น ปวดเข่า กินยาหลังอาหารเช้า แล้วกินข้าวต้ม"
              onChange={(e) =>
                update({ originalText: e.target.value, inputSource: draft.inputSource === 'PHOTO_OCR' && draft.photoIds.length ? 'PHOTO_OCR' : 'MANUAL_TEXT', isSyntheticSample: false })
              }
            />
          </label>
          <button
            type="button"
            className="min-h-[44px] text-base font-bold text-yai-deep underline"
            onClick={() => update({ originalText: SAMPLE_SENTENCE, inputSource: 'MANUAL_TEXT', isSyntheticSample: true })}
          >
            ใช้ประโยคตัวอย่าง (ข้อมูลจำลอง สำหรับสาธิต)
          </button>
          {draft.isSyntheticSample && <p className="text-sm font-semibold text-yai-warn">ข้อความนี้เป็นประโยคตัวอย่าง ไม่ใช่เสียงหรือคำพิมพ์ของยาย</p>}
        </Card>
      )}

      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold">รูป</h2>
          <span className="text-sm text-yai-ink/70">ไม่บังคับ · ถ่ายเท่าที่มี</span>
        </div>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
        <BigButton variant="secondary" icon={<Camera className="h-6 w-6" />} onClick={() => fileRef.current?.click()}>
          {draftPhotos.length ? 'ถ่าย/เลือกรูปเพิ่ม' : 'ถ่ายรูป หรือเลือกรูป'}
        </BigButton>
        {draftPhotos.map((p) => {
          const tag = draft.photoTags[p.id];
          return (
            <div key={p.id} className="space-y-2 rounded-2xl border border-yai-ink/10 p-3">
              <img src={p.dataUrl} alt="รูปที่ถ่าย" className="max-h-56 w-full rounded-xl object-contain bg-slate-50" />
              <p className="text-base font-semibold">รูปนี้คืออะไร (เลือกหรือไม่เลือกก็ได้)</p>
              <div className="grid grid-cols-2 gap-2">
                {TAGS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={tag === t}
                    onClick={() => update({ photoTags: { ...draft.photoTags, [p.id]: tag === t ? undefined : t } })}
                    className={`min-h-[52px] rounded-2xl border-2 text-base font-bold ${tag === t ? 'border-yai-deep bg-yai-mint' : 'border-yai-ink/15 bg-white'}`}
                  >
                    {PHOTO_TAG_LABEL[t]}
                  </button>
                ))}
              </div>
              {tag === 'MEDICINE_LABEL' && (
                <div className="space-y-2">
                  <BigButton variant="secondary" disabled={ocrBusy !== null} icon={<ScanLine className="h-6 w-6" />} onClick={() => readPhoto(p.id, p.dataUrl)}>
                    {ocrBusy === p.id ? 'กำลังอ่านข้อความ…' : 'อ่านข้อความบนฉลาก'}
                  </BigButton>
                  <p className="text-sm text-yai-ink/70">
                    ใช้ระบบอ่านฉลากเดิมของแอป {cloudConsent ? '(อาจส่งรูปไปเซิร์ฟเวอร์ตามที่ยายอนุญาต)' : '(อ่านในเครื่อง)'} · ต้องการถ่ายหลายด้าน?{' '}
                    <Link to="/yai/scan" className="font-bold text-yai-deep underline">
                      สแกนฉลากแบบละเอียด
                    </Link>
                  </p>
                </div>
              )}
              {tag === 'UNLABELED_MEDICINE' && (
                <p className="rounded-xl bg-amber-50 p-2 text-base text-amber-950">
                  ยาไม่มีฉลากจะถูกบันทึกเป็น "ยังไม่ทราบชนิด" รอผู้เชี่ยวชาญช่วยระบุ ระบบไม่เดาชนิดยาจากสีหรือรูปร่าง และไม่ตั้งเตือน เล่าเพิ่มได้ว่าได้มาจากไหน ใช้อย่างไร
                </p>
              )}
              <button type="button" className="min-h-[44px] text-base font-bold text-yai-alert" onClick={() => update({ photoIds: draft.photoIds.filter((id) => id !== p.id) })}>
                เอารูปนี้ออก
              </button>
            </div>
          );
        })}
        {ocrMsg && <Notice tone="info" title={ocrMsg} />}
      </Card>

      {segments.length > 0 && (
        <Card className="space-y-2">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Sparkles className="h-5 w-5 text-yai-deep" aria-hidden="true" /> หนูลองแยกให้ดูก่อน
          </h2>
          <ul className="space-y-2">
            {segments.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-2 rounded-2xl bg-yai-mint/60 p-3">
                <CategoryChip category={s.category} />
                <span className="text-lg">{s.text}</span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-yai-ink/70">
            จัดหมวดด้วย{CLASSIFIER_NAME} · แหล่งข้อมูล: {SOURCE_LABEL[draft.inputSource]} · คำบอกเล่าเรื่องยาไม่ใช่คำสั่งยา และไม่ตั้งเวลาเตือนเอง
          </p>
        </Card>
      )}

      <BigButton size="lg" disabled={!canContinue} onClick={() => navigate('/yai/journal/review')}>
        ต่อไป: ให้ยายตรวจ
      </BigButton>
      <BigButton
        variant="ghost"
        onClick={() => {
          journalDraft.clear();
          navigate('/yai');
        }}
      >
        ยกเลิก ไม่บันทึก
      </BigButton>
    </div>
  );
};
