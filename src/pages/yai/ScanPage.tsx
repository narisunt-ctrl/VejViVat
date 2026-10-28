import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Circle, Volume2, VolumeX } from 'lucide-react';
import { LiveCamera, CaptureResult } from '../../components/medsight/LiveCamera';
import { yaiStore, useYai, demoNow } from '../../services/yai/yaiStore';
import { scanSession } from '../../services/yai/scanSession';
import { recognizeThai, OCR_STATUS_TH } from '../../services/yai/thaiOcr';
import { parsePhotos, scanGuidance } from '../../services/yai/scanGuidance';
import { PARSED_FIELD_LABEL, PARSED_ORDER, ParsedLabel } from '../../services/yai/labelParser';
import { CapturedPhoto, CaptureSide } from '../../domain/yai/models';
import { SIDE_INFO, SIDE_ORDER } from '../../domain/yai/policies';
import { BigButton, Card, Notice, PageTitle, inputCls } from '../../components/yai/ui';

function speak(text: string) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'th-TH';
  u.rate = 0.95;
  window.speechSynthesis.speak(u);
}

const FieldChips: React.FC<{ parsed: ParsedLabel | null; dark?: boolean }> = ({ parsed, dark }) => (
  <ul className="flex flex-wrap gap-1.5">
    {PARSED_ORDER.map((k) => {
      const done = !!parsed?.[k];
      return (
        <li
          key={k}
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-sm font-semibold ${
            done ? 'bg-yai-leaf text-white' : dark ? 'bg-white/20 text-white' : 'bg-slate-100 text-yai-ink/70'
          }`}
        >
          {done ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <Circle className="h-4 w-4" aria-hidden="true" />}
          {PARSED_FIELD_LABEL[k]}
          <span className="sr-only">{done ? 'พบแล้ว' : 'ยังไม่พบ'}</span>
        </li>
      );
    })}
  </ul>
);

function saveOcr(photoId: string, status: 'DONE' | 'FAILED', res: { text: string; lines: { text: string; confidence: number }[]; confidence: number; engine: string } | null) {
  yaiStore.setPhotoOcr(photoId, {
    status,
    text: res?.text ?? '',
    lines: res?.lines ?? [],
    confidence: res?.confidence ?? 0,
    engine: res?.engine ?? '',
    at: demoNow().toISOString(),
  });
}

/** One photo with the text that was read from it, for the patient to check, correct or re-read */
const PhotoTextCard: React.FC<{ photo: CapturedPhoto; reading: boolean; onReread: () => void; onRemove: () => void }> = ({ photo, reading, onReread, onRemove }) => {
  const ocrText = (photo.ocr?.editedText ?? photo.ocr?.text ?? '').trim();
  const [text, setText] = useState(ocrText);
  const [dirty, setDirty] = useState(false);
  const [zoom, setZoom] = useState(false);
  useEffect(() => {
    if (!dirty) setText(ocrText);
  }, [ocrText, dirty]);
  const empty = photo.ocr?.status === 'DONE' && !ocrText && photo.ocr.editedText === undefined;
  const failed = photo.ocr?.status === 'FAILED';
  const statusLine = reading || !photo.ocr
    ? 'กำลังอ่านข้อความ…'
    : photo.ocr.verified
    ? '✓ ตรวจแล้ว'
    : failed
    ? 'อ่านไม่สำเร็จ'
    : empty
    ? 'อ่านไม่ออก'
    : `อ่านได้ (มั่นใจ ${Math.round(photo.ocr.confidence)}%) รอตรวจ`;

  return (
    <Card className={`space-y-3 ${photo.ocr?.verified ? 'border-yai-leaf' : ''}`}>
      <div className={zoom ? 'space-y-2' : 'flex items-start gap-3'}>
        <button type="button" onClick={() => setZoom(!zoom)} className="shrink-0" aria-label={zoom ? 'ย่อรูป' : 'ขยายรูปเพื่อเทียบข้อความ'}>
          <img src={photo.dataUrl} alt={`รูป${photo.side ? SIDE_INFO[photo.side].label : 'ยา'}`} className={`${zoom ? 'w-full' : 'h-24 w-20'} rounded-xl object-cover`} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-bold">{photo.side ? SIDE_INFO[photo.side].label : 'รูปยา'}</p>
          <p className={`text-base ${photo.ocr?.verified ? 'font-semibold text-yai-deep' : ''}`}>{statusLine}</p>
          <p className="text-sm text-yai-ink/60">แตะรูปเพื่อ{zoom ? 'ย่อ' : 'ขยายเทียบกับข้อความ'}</p>
        </div>
      </div>

      {(failed || empty) && !reading && (
        <Notice tone="warn" title={failed ? 'อ่านข้อความไม่สำเร็จ' : 'ยังอ่านข้อความไม่ออก'}>
          {failed ? 'ครั้งแรกต้องต่ออินเทอร์เน็ตเพื่อโหลดระบบอ่านภาษาไทย ' : ''}ลองถ่ายใกล้ขึ้นให้ตัวหนังสือใหญ่ ไม่สะท้อนแสง หรือพิมพ์ข้อความบนฉลากเองในช่องด้านล่างก็ได้
        </Notice>
      )}

      {photo.ocr && !reading && (
        <>
          <label className="block">
            <span className="mb-1 block text-base font-semibold">ข้อความที่อ่านได้ ตรงกับฉลากไหมคะ? แก้ได้เลย</span>
            <textarea
              className={`${inputCls} min-h-[140px] py-3 leading-relaxed`}
              value={text}
              placeholder="พิมพ์ข้อความบนฉลาก เช่น ชื่อยา ความแรง วิธีใช้"
              onChange={(e) => {
                setText(e.target.value);
                setDirty(true);
              }}
            />
          </label>
          <BigButton
            variant={photo.ocr.verified && !dirty ? 'secondary' : 'primary'}
            disabled={!text.trim()}
            onClick={() => {
              yaiStore.updatePhotoText(photo.id, text.trim(), true);
              setDirty(false);
            }}
          >
            {photo.ocr.verified && !dirty ? '✓ ตรวจแล้ว' : dirty ? 'บันทึกข้อความที่แก้' : 'ถูกต้องแล้ว'}
          </BigButton>
          <div className="grid grid-cols-2 gap-2">
            <BigButton variant="ghost" onClick={onReread}>
              อ่านใหม่ (ละเอียด)
            </BigButton>
            <BigButton variant="ghost" onClick={onRemove}>
              ลบรูปนี้
            </BigButton>
          </div>
        </>
      )}
    </Card>
  );
};

export const ScanPage: React.FC = () => {
  const navigate = useNavigate();
  const photos = useYai((s) => s.photos);
  const voice = useYai((s) => !!s.settings.voiceGuide);
  const [sessionIds, setSessionIds] = useState<string[]>(() => scanSession.get());
  const [readingIds, setReadingIds] = useState<string[]>([]);
  const [progress, setProgress] = useState({ status: '', value: 0 });
  const sessionPhotos = photos.filter((p) => sessionIds.includes(p.id));
  const captured = Array.from(new Set(sessionPhotos.map((p) => p.side).filter((s): s is CaptureSide => !!s)));
  const readable = sessionPhotos.filter((p) => p.ocr?.status === 'DONE');
  const parsed = parsePhotos(readable);
  const guidance = scanGuidance(captured, readable.length ? parsed : null);
  const [side, setSide] = useState<CaptureSide>(guidance.side ?? 'FRONT');
  const lastSpoken = useRef('');
  const unchecked = sessionPhotos.filter((p) => p.ocr?.status === 'DONE' && !p.ocr.verified).length;

  useEffect(() => {
    if (readingIds.length === 0 && guidance.side) setSide(guidance.side);
    if (voice && sessionPhotos.length > 0 && readingIds.length === 0 && guidance.text !== lastSpoken.current) {
      lastSpoken.current = guidance.text;
      speak(guidance.text);
    }
  }, [guidance.side, guidance.text, readingIds.length, voice, sessionPhotos.length]);

  const read = (photoId: string, source: string, thorough: boolean) => {
    setReadingIds((ids) => [...ids, photoId]);
    recognizeThai(source, (value, status) => setProgress({ value, status }), { thorough })
      .then((res) => saveOcr(photoId, 'DONE', res))
      .catch(() => saveOcr(photoId, 'FAILED', null))
      .finally(() => {
        setReadingIds((ids) => ids.filter((id) => id !== photoId));
        setProgress({ status: '', value: 0 });
      });
  };

  const onCapture = (r: CaptureResult) => {
    const id = yaiStore.addPhoto({ dataUrl: r.dataUrl, source: r.source, quality: r.quality, side, capturedAt: demoNow().toISOString() });
    scanSession.add(id);
    setSessionIds(scanSession.get());
    if (voice) speak(`ได้ภาพ${SIDE_INFO[side].label}แล้ว กำลังอ่านข้อความ`);
    read(id, r.ocrSource, false);
  };

  const readingText =
    readingIds.length > 0 ? `${OCR_STATUS_TH[progress.status] ?? 'กำลังอ่านข้อความ'}${progress.value ? ` ${Math.round(progress.value * 100)}%` : ''}…` : '';

  const hud = (
    <div className="space-y-1.5 rounded-2xl bg-yai-ink/75 p-2.5 text-white backdrop-blur-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="text-lg font-bold">ถ่าย: {SIDE_INFO[side].label}</span>
        {readingText && <span className="text-xs text-white/85">{readingText}</span>}
      </div>
      <FieldChips parsed={readable.length ? parsed : null} dark />
      {sessionPhotos.length > 0 && !readingText && <p className="text-sm font-semibold">{guidance.text}</p>}
    </div>
  );

  return (
    <div className="space-y-4">
      <PageTitle title="ถ่ายรูปยาที่ยายใช้อยู่" subtitle="ใช้ได้กับกล่อง กระปุก แผงยา แคปซูล และถุงยาต้ม" back="/yai" />

      <div className="flex items-center justify-between gap-2">
        <p className="text-base font-semibold">กำลังถ่ายด้านไหน?</p>
        <button
          type="button"
          aria-pressed={voice}
          onClick={() => yaiStore.updateSettings({ voiceGuide: !voice })}
          className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border-2 px-3 text-sm font-bold ${voice ? 'border-yai-deep bg-yai-mint text-yai-deep' : 'border-yai-ink/15 bg-white'}`}
        >
          {voice ? <Volume2 className="h-5 w-5" aria-hidden="true" /> : <VolumeX className="h-5 w-5" aria-hidden="true" />}
          เสียงแนะนำ {voice ? 'เปิด' : 'ปิด'}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {SIDE_ORDER.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={side === s}
            onClick={() => setSide(s)}
            className={`min-h-[52px] rounded-2xl border-2 px-2 text-base font-semibold ${side === s ? 'border-yai-deep bg-yai-mint text-yai-deep' : 'border-yai-ink/15 bg-white'}`}
          >
            {captured.includes(s) ? '✓ ' : ''}
            {SIDE_INFO[s].label}
          </button>
        ))}
      </div>

      <LiveCamera onCapture={onCapture} overlay={hud} />

      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold">อ่านได้แล้ว</h2>
          {readingText && <span className="text-sm font-semibold text-yai-deep" role="status">{readingText}</span>}
        </div>
        <FieldChips parsed={readable.length ? parsed : null} />
        <Notice tone={guidance.tone === 'retry' ? 'warn' : 'info'} title={sessionPhotos.length ? guidance.text : 'ถ่ายใกล้ๆ ให้เห็นชื่อยาชัดๆ ก่อน'} />
        <p className="text-sm text-yai-ink/70">อ่านในเครื่องนี้ด้วยระบบอ่านภาษาไทย อาจอ่านผิดได้ ขอให้คุณยายหรือหลานตรวจข้อความของแต่ละรูปด้านล่าง</p>
      </Card>

      {sessionPhotos.length > 0 && (
        <section className="space-y-3" aria-label="ตรวจข้อความของแต่ละรูป">
          <h2 className="text-xl font-bold">ตรวจข้อความที่อ่านได้</h2>
          {sessionPhotos.map((p) => (
            <PhotoTextCard
              key={p.id}
              photo={p}
              reading={readingIds.includes(p.id)}
              onReread={() => read(p.id, p.dataUrl, true)}
              onRemove={() => {
                yaiStore.removePhoto(p.id);
                scanSession.remove(p.id);
                setSessionIds(scanSession.get());
              }}
            />
          ))}
          {unchecked > 0 && <p className="text-base font-semibold text-yai-warn">ยังไม่ได้ตรวจข้อความ {unchecked} รูป ไปต่อได้ แต่ข้อมูลจะถูกบันทึกว่ายังไม่ได้ตรวจ</p>}
          <BigButton size="lg" onClick={() => navigate('/yai/scan/review')} disabled={readingIds.length > 0}>
            {readingIds.length > 0 ? 'รออ่านข้อความสักครู่…' : 'ไปดูข้อมูลยา'}
          </BigButton>
        </section>
      )}

      <Notice title="รูปเก็บไว้ในเครื่องนี้เท่านั้น">ไม่ได้ส่งภาพขึ้นอินเทอร์เน็ต และระบบไม่ระบุยาจากสีหรือรูปร่างของเม็ดยา</Notice>
      <button type="button" onClick={() => navigate('/yai/scan/review?onlyThis=1')} className="min-h-[48px] w-full text-lg font-bold text-yai-deep underline">
        ถ่ายไม่ได้ / ไม่มีฉลาก — มีแค่นี้
      </button>
    </div>
  );
};
