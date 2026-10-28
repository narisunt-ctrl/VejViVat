import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Circle, Volume2, VolumeX } from 'lucide-react';
import { LiveCamera, CaptureResult } from '../../components/medsight/LiveCamera';
import { yaiStore, useYai, demoNow } from '../../services/yai/yaiStore';
import { scanSession } from '../../services/yai/scanSession';
import { recognizeThai, OCR_STATUS_TH } from '../../services/yai/thaiOcr';
import { parsePhotos, scanGuidance } from '../../services/yai/scanGuidance';
import { PARSED_FIELD_LABEL, PARSED_ORDER, ParsedLabel } from '../../services/yai/labelParser';
import { CaptureSide } from '../../domain/yai/models';
import { SIDE_INFO, SIDE_ORDER } from '../../domain/yai/policies';
import { BigButton, Card, Notice, PageTitle } from '../../components/yai/ui';

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

export const ScanPage: React.FC = () => {
  const navigate = useNavigate();
  const photos = useYai((s) => s.photos);
  const voice = useYai((s) => !!s.settings.voiceGuide);
  const [sessionIds, setSessionIds] = useState<string[]>(() => scanSession.get());
  const [reading, setReading] = useState<{ count: number; status: string; progress: number }>({ count: 0, status: '', progress: 0 });
  const sessionPhotos = photos.filter((p) => sessionIds.includes(p.id));
  const captured = Array.from(new Set(sessionPhotos.map((p) => p.side).filter((s): s is CaptureSide => !!s)));
  const readable = sessionPhotos.filter((p) => p.ocr?.status === 'DONE');
  const failed = sessionPhotos.some((p) => p.ocr?.status === 'FAILED');
  const parsed = parsePhotos(readable);
  const guidance = scanGuidance(captured, readable.length ? parsed : null);
  const [side, setSide] = useState<CaptureSide>(guidance.side ?? 'FRONT');
  const lastSpoken = useRef('');

  // Follow the guidance once the latest photo has been read; the user can still pick another side
  useEffect(() => {
    if (reading.count === 0 && guidance.side) setSide(guidance.side);
    if (voice && sessionPhotos.length > 0 && reading.count === 0 && guidance.text !== lastSpoken.current) {
      lastSpoken.current = guidance.text;
      speak(guidance.text);
    }
  }, [guidance.side, guidance.text, reading.count, voice, sessionPhotos.length]);

  const onCapture = (r: CaptureResult) => {
    const id = yaiStore.addPhoto({ dataUrl: r.dataUrl, source: r.source, quality: r.quality, cropped: r.cropped, side, capturedAt: demoNow().toISOString() });
    scanSession.add(id);
    setSessionIds(scanSession.get());
    if (voice) speak(`ได้ภาพ${SIDE_INFO[side].label}แล้ว กำลังอ่านข้อความ`);
    setReading((x) => ({ ...x, count: x.count + 1 }));
    recognizeThai(r.dataUrl, (progress, status) => setReading((x) => ({ ...x, progress, status })))
      .then((res) =>
        yaiStore.setPhotoOcr(id, { status: 'DONE', text: res.text, lines: res.lines, confidence: res.confidence, engine: res.engine, at: demoNow().toISOString() })
      )
      .catch(() => yaiStore.setPhotoOcr(id, { status: 'FAILED', text: '', lines: [], confidence: 0, engine: '', at: demoNow().toISOString() }))
      .finally(() => setReading((x) => ({ count: Math.max(0, x.count - 1), status: '', progress: 0 })));
  };

  const readingText =
    reading.count > 0 ? `${OCR_STATUS_TH[reading.status] ?? 'กำลังอ่านข้อความ'}${reading.progress ? ` ${Math.round(reading.progress * 100)}%` : ''}…` : '';

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
      <PageTitle title="ถ่ายรูปยาที่ยายใช้อยู่" subtitle="ถ่ายได้หลายด้าน ระบบจะบอกว่าอ่านอะไรได้แล้วบ้าง" back="/yai" />

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
        <Notice tone={guidance.tone === 'retry' ? 'warn' : 'info'} title={sessionPhotos.length ? guidance.text : 'เริ่มจากด้านหน้า ให้เห็นชื่อยาชัดๆ'} />
        {failed && (
          <Notice tone="warn" title="อ่านข้อความจากบางรูปไม่สำเร็จ">
            ครั้งแรกต้องต่ออินเทอร์เน็ตเพื่อโหลดระบบอ่านภาษาไทย ถ่ายต่อได้ตามปกติ และพิมพ์ข้อมูลเองได้ในขั้นถัดไป
          </Notice>
        )}
        <p className="text-sm text-yai-ink/70">อ่านในเครื่องนี้ด้วย Tesseract ภาษาไทย อาจอ่านผิดได้ คุณยายหรือหลานต้องตรวจทุกช่องอีกครั้ง</p>
      </Card>

      {sessionPhotos.length > 0 && (
        <div className="space-y-3">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {sessionPhotos.map((p) => (
              <figure key={p.id} className="shrink-0">
                <img src={p.dataUrl} alt={`รูป${p.side ? SIDE_INFO[p.side].label : 'ยา'}`} className="h-24 w-20 rounded-xl object-cover" />
                <figcaption className="text-center text-xs">
                  {p.side ? SIDE_INFO[p.side].label : ''}
                  {p.cropped ? ' ✂' : ''}
                  {p.ocr?.status === 'DONE' ? ' ✓' : p.ocr?.status === 'FAILED' ? ' ✕' : ' …'}
                </figcaption>
              </figure>
            ))}
          </div>
          <BigButton size="lg" onClick={() => navigate('/yai/scan/review')}>
            {guidance.tone === 'done' ? 'ครบแล้ว ไปดูข้อมูล' : 'ถ่ายพอแล้ว ไปดูข้อมูล'}
          </BigButton>
        </div>
      )}

      <Notice title="รูปเก็บไว้ในเครื่องนี้เท่านั้น">ไม่ได้ส่งภาพขึ้นอินเทอร์เน็ต และระบบไม่ระบุยาจากสีหรือรูปร่างของเม็ดยา</Notice>
      <button type="button" onClick={() => navigate('/yai/scan/review?onlyThis=1')} className="min-h-[48px] w-full text-lg font-bold text-yai-deep underline">
        ถ่ายไม่ได้ / ไม่มีฉลาก — มีแค่นี้
      </button>
    </div>
  );
};
