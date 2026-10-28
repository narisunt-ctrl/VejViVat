import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Circle } from 'lucide-react';
import { LiveCamera, CaptureResult } from '../../components/medsight/LiveCamera';
import { yaiStore, useYai, demoNow } from '../../services/yai/yaiStore';
import { scanSession } from '../../services/yai/scanSession';
import { CaptureSide } from '../../domain/yai/models';
import { nextRecommendedSide, SIDE_INFO, SIDE_ORDER } from '../../domain/yai/policies';
import { BigButton, Card, Notice, PageTitle } from '../../components/yai/ui';

export const ScanPage: React.FC = () => {
  const navigate = useNavigate();
  const photos = useYai((s) => s.photos);
  const [sessionIds, setSessionIds] = useState<string[]>(() => scanSession.get());
  const [busy, setBusy] = useState(false);
  const sessionPhotos = photos.filter((p) => sessionIds.includes(p.id));
  const captured = Array.from(new Set(sessionPhotos.map((p) => p.side).filter((s): s is CaptureSide => !!s)));
  const suggested = nextRecommendedSide(captured);
  const [side, setSide] = useState<CaptureSide>(suggested ?? 'FRONT');

  const onCapture = (r: CaptureResult) => {
    setBusy(true);
    const id = yaiStore.addPhoto({ dataUrl: r.dataUrl, source: r.source, quality: r.quality, side, capturedAt: demoNow().toISOString() });
    scanSession.add(id);
    const ids = scanSession.get();
    setSessionIds(ids);
    // Move the selector to the next missing side so the next shot is labelled correctly
    const nowCaptured = Array.from(new Set([...captured, side]));
    const next = nextRecommendedSide(nowCaptured);
    if (next) setSide(next);
    setBusy(false);
  };

  return (
    <div className="space-y-4">
      <PageTitle title="ถ่ายรูปยาที่ยายใช้อยู่" subtitle="ถ่ายได้หลายด้าน ไม่ต้องครบทุกด้าน" back="/yai" />

      {sessionPhotos.length > 0 && suggested && (
        <Notice title={`เยี่ยมมาก! ต่อไปลองถ่าย${SIDE_INFO[suggested].label}`}>{SIDE_INFO[suggested].why}</Notice>
      )}

      <div>
        <p className="mb-2 text-base font-semibold">กำลังถ่ายด้านไหน?</p>
        <div className="grid grid-cols-2 gap-2">
          {SIDE_ORDER.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={side === s}
              onClick={() => setSide(s)}
              className={`min-h-[52px] rounded-2xl border-2 px-2 text-base font-semibold ${side === s ? 'border-yai-deep bg-yai-mint text-yai-deep' : 'border-yai-ink/15 bg-white'}`}
            >
              {SIDE_INFO[s].label}
            </button>
          ))}
        </div>
      </div>

      <LiveCamera onCapture={onCapture} busy={busy} />

      <Card>
        <h2 className="text-lg font-bold">ถ่ายไปแล้ว</h2>
        <ul className="mt-2 space-y-2">
          {SIDE_ORDER.map((s) => {
            const done = captured.includes(s);
            return (
              <li key={s} className="flex items-center gap-2 text-lg">
                {done ? <CheckCircle2 className="h-6 w-6 text-yai-leaf" aria-hidden="true" /> : <Circle className="h-6 w-6 text-yai-ink/30" aria-hidden="true" />}
                <span className={done ? 'font-semibold' : 'text-yai-ink/70'}>{SIDE_INFO[s].label}</span>
                <span className="sr-only">{done ? 'ถ่ายแล้ว' : 'ยังไม่ได้ถ่าย'}</span>
              </li>
            );
          })}
        </ul>
        <p className="mt-2 text-sm text-yai-ink/70">คุณยายเป็นคนเลือกว่ารูปไหนคือด้านไหน ระบบยังไม่ได้ตรวจจับด้านของกล่องเอง</p>
      </Card>

      {sessionPhotos.length > 0 && (
        <div className="space-y-3">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {sessionPhotos.map((p) => (
              <figure key={p.id} className="shrink-0">
                <img src={p.dataUrl} alt={`รูป${p.side ? SIDE_INFO[p.side].label : 'ยา'}`} className="h-24 w-20 rounded-xl object-cover" />
                <figcaption className="text-center text-xs">{p.side ? SIDE_INFO[p.side].label : ''}</figcaption>
              </figure>
            ))}
          </div>
          <BigButton size="lg" onClick={() => navigate('/yai/scan/review')}>
            {suggested ? 'ถ่ายพอแล้ว ไปดูข้อมูล' : 'ครบแล้ว ไปดูข้อมูล'}
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
