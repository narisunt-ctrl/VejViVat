import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Crop, Flashlight, ImagePlus, Zap } from 'lucide-react';
import { FrameQuality, measureFrame } from '../../services/yai/frameQuality';
import { detectQuad, warpToCanvas } from '../../services/yai/edgeDetector';
import { Quad, STABLE_DRIFT, STABLE_TICKS, cornerDrift, scaleQuad } from '../../services/yai/quadGeometry';

// Live camera with a cheap quality check, a label-outline detector drawn over the preview,
// manual capture by default, optional auto-capture once the outline holds still, torch when the
// device supports it, and a gallery upload that works even without camera permission.
// When an outline is found the captured photo is flattened (perspective-corrected) before OCR.

type CamState = 'IDLE' | 'REQUEST_PERMISSION' | 'PREVIEW' | 'NO_PERMISSION' | 'UNSUPPORTED';

export interface CaptureResult {
  dataUrl: string;
  source: 'CAMERA' | 'UPLOAD';
  quality: { brightness: number; sharpness: number; glare: number };
  /** true when the label outline was detected and the image was flattened */
  cropped: boolean;
}

const MAX_SIDE = 1600;
const ANALYSIS_W = 160;
const DETECT_W = 320;
const AUTO_STABLE_TICKS = 4;
const TICK_MS = 300;

function drawScaled(source: CanvasImageSource, w: number, h: number, maxSide: number) {
  const scale = Math.min(1, maxSide / Math.max(w, h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return { canvas, ctx };
}

function qualityOf(source: CanvasImageSource, w: number, h: number) {
  const { canvas, ctx } = drawScaled(source, w, h, ANALYSIS_W);
  return measureFrame(ctx.getImageData(0, 0, canvas.width, canvas.height));
}

type QuadInfo = { quad: Quad; w: number; h: number };

export const LiveCamera: React.FC<{ onCapture: (r: CaptureResult) => void; busy?: boolean; overlay?: React.ReactNode }> = ({ onCapture, busy, overlay }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [cam, setCam] = useState<CamState>('IDLE');
  const [quality, setQuality] = useState<FrameQuality | null>(null);
  const [auto, setAuto] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [flash, setFlash] = useState(false);
  const [edgeOn, setEdgeOn] = useState(true);
  const [outline, setOutline] = useState<(QuadInfo & { stable: boolean }) | null>(null);
  const [detectMs, setDetectMs] = useState(0);
  const [uploadBusy, setUploadBusy] = useState(false);
  const stableRef = useRef(0);
  const quadStableRef = useRef(0);
  const lastQuadRef = useRef<QuadInfo | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  // Release the camera when leaving the page or when the tab goes to the background
  useEffect(() => {
    const onHide = () => {
      if (document.hidden) {
        stop();
        setCam((c) => (c === 'PREVIEW' ? 'IDLE' : c));
      }
    };
    document.addEventListener('visibilitychange', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      stop();
    };
  }, [stop]);

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCam('UNSUPPORTED');
      return;
    }
    setCam('REQUEST_PERMISSION');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      const track = stream.getVideoTracks()[0];
      const caps = (track.getCapabilities?.() ?? {}) as MediaTrackCapabilities & { torch?: boolean };
      setTorchSupported(!!caps.torch);
      setCam('PREVIEW');
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => undefined);
        }
      });
    } catch (err) {
      setCam((err as DOMException)?.name === 'NotAllowedError' ? 'NO_PERMISSION' : 'UNSUPPORTED');
    }
  };

  /** Flatten the label if we have an outline for this frame; otherwise keep the full image */
  const finish = useCallback(
    (full: HTMLCanvasElement, quadInfo: QuadInfo | null, source: CaptureResult['source'], q: FrameQuality) => {
      let out = full;
      let cropped = false;
      if (edgeOn && quadInfo) {
        try {
          out = warpToCanvas(full, scaleQuad(quadInfo.quad, full.width / quadInfo.w, full.height / quadInfo.h), MAX_SIDE);
          cropped = true;
        } catch {
          out = full;
        }
      }
      onCapture({ dataUrl: out.toDataURL('image/jpeg', 0.85), source, quality: { brightness: q.brightness, sharpness: q.sharpness, glare: q.glare }, cropped });
    },
    [edgeOn, onCapture]
  );

  const capture = useCallback(() => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const q = qualityOf(v, v.videoWidth, v.videoHeight);
    const { canvas } = drawScaled(v, v.videoWidth, v.videoHeight, MAX_SIDE);
    setFlash(true);
    setTimeout(() => setFlash(false), 150);
    // Short buzz so the user knows the photo was taken without looking at the screen
    navigator.vibrate?.(60);
    stableRef.current = 0;
    quadStableRef.current = 0;
    finish(canvas, lastQuadRef.current, 'CAMERA', q);
  }, [finish]);

  // Low-rate loop: quality on a tiny frame, outline detection on a small one, auto-capture when steady
  useEffect(() => {
    if (cam !== 'PREVIEW') return;
    const id = window.setInterval(() => {
      const v = videoRef.current;
      if (!v || !v.videoWidth || busy) return;
      const q = qualityOf(v, v.videoWidth, v.videoHeight);
      setQuality(q);
      stableRef.current = q.status === 'OK' ? stableRef.current + 1 : 0;

      let outlineSteady = false;
      if (edgeOn) {
        const { canvas, ctx } = drawScaled(v, v.videoWidth, v.videoHeight, DETECT_W);
        const det = detectQuad(ctx.getImageData(0, 0, canvas.width, canvas.height));
        if (det) {
          setDetectMs(Math.round(det.ms));
          const prev = lastQuadRef.current;
          const drift = prev ? cornerDrift(prev.quad, det.quad, canvas.width, canvas.height) : 1;
          quadStableRef.current = drift < STABLE_DRIFT ? quadStableRef.current + 1 : 0;
          lastQuadRef.current = { quad: det.quad, w: canvas.width, h: canvas.height };
          outlineSteady = quadStableRef.current >= STABLE_TICKS;
          setOutline({ quad: det.quad, w: canvas.width, h: canvas.height, stable: outlineSteady });
        } else {
          quadStableRef.current = 0;
          lastQuadRef.current = null;
          setOutline(null);
        }
      }
      if (auto) {
        // With edges on, wait for a steady outline; if none is ever found, fall back to a longer steady-quality wait
        const ready = edgeOn
          ? (outlineSteady && q.status === 'OK') || (!lastQuadRef.current && stableRef.current >= AUTO_STABLE_TICKS * 2)
          : stableRef.current >= AUTO_STABLE_TICKS;
        if (ready) capture();
      }
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [cam, auto, busy, capture, edgeOn]);

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: !torchOn } as MediaTrackConstraintSet] });
      setTorchOn(!torchOn);
    } catch {
      setTorchSupported(false);
    }
  };

  const onFile = (file: File | undefined) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = async () => {
      setUploadBusy(true);
      const q = qualityOf(img, img.naturalWidth, img.naturalHeight);
      const { canvas } = drawScaled(img, img.naturalWidth, img.naturalHeight, MAX_SIDE);
      URL.revokeObjectURL(url);
      let quadInfo: QuadInfo | null = null;
      if (edgeOn) {
        const small = drawScaled(img, img.naturalWidth, img.naturalHeight, DETECT_W);
        const det = detectQuad(small.ctx.getImageData(0, 0, small.canvas.width, small.canvas.height));
        if (det) quadInfo = { quad: det.quad, w: small.canvas.width, h: small.canvas.height };
      }
      finish(canvas, quadInfo, 'UPLOAD', q);
      setUploadBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
  };

  const statusText = (() => {
    if (cam !== 'PREVIEW') return '';
    if (!quality) return 'กำลังเตรียมกล้อง…';
    if (quality.status !== 'OK') return quality.guidance;
    if (edgeOn) {
      if (!outline) return 'ยังไม่เจอขอบฉลาก ให้เห็นกล่องทั้งใบ วางบนพื้นสีเข้มจะเจอง่ายขึ้น';
      if (!outline.stable) return 'เจอขอบฉลากแล้ว ถือนิ่งๆ อีกนิด';
      return auto ? 'ขอบนิ่งแล้ว ระบบกำลังถ่ายให้' : 'ขอบนิ่งแล้ว กดถ่ายได้เลย';
    }
    return auto ? 'พร้อมถ่าย ถือนิ่งๆ ระบบจะถ่ายให้' : 'พร้อมถ่าย';
  })();

  return (
    <div className="space-y-3">
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-3xl bg-yai-ink">
        {cam === 'PREVIEW' ? (
          <>
            <video ref={videoRef} playsInline muted className="h-full w-full object-cover" aria-label="ภาพจากกล้อง" />
            {/* Same aspect as the video and "slice" scaling, so the outline lines up with object-cover */}
            {outline ? (
              <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${outline.w} ${outline.h}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
                <polygon
                  points={outline.quad.map((p) => `${p.x},${p.y}`).join(' ')}
                  fill={outline.stable ? 'rgba(110,171,115,0.18)' : 'rgba(255,255,255,0.08)'}
                  stroke={outline.stable ? '#6EAB73' : '#ffffff'}
                  strokeWidth={3}
                  vectorEffect="non-scaling-stroke"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <div className={`pointer-events-none absolute inset-[12%] rounded-3xl border-4 ${quality?.status === 'OK' ? 'border-yai-leaf/70' : 'border-white/60'}`} aria-hidden="true" />
            )}
            {overlay && <div className="absolute inset-x-0 top-0 p-2">{overlay}</div>}
            {flash && <div className="absolute inset-0 bg-white/70" aria-hidden="true" />}
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center text-white">
            <Camera className="h-16 w-16 opacity-80" aria-hidden="true" />
            {cam === 'IDLE' && <p className="text-xl">วางกล่องหรือซองยาให้เห็นทั้งใบ แล้วกดเปิดกล้อง</p>}
            {cam === 'REQUEST_PERMISSION' && <p className="text-xl">กรุณากด "อนุญาต" ให้ใช้กล้อง</p>}
            {cam === 'NO_PERMISSION' && (
              <p className="text-xl">
                ยังไม่ได้อนุญาตให้ใช้กล้อง
                <span className="mt-2 block text-base text-white/80">เปิดสิทธิ์กล้องในตั้งค่าเบราว์เซอร์ หรือเลือกรูปจากเครื่องแทนได้</span>
              </p>
            )}
            {cam === 'UNSUPPORTED' && <p className="text-xl">เครื่องหรือเบราว์เซอร์นี้เปิดกล้องไม่ได้ เลือกรูปจากเครื่องแทนได้ค่ะ</p>}
          </div>
        )}
      </div>

      <p className="min-h-[2rem] text-center text-lg font-semibold" role="status" aria-live="polite" data-detect-ms={detectMs}>
        {busy || uploadBusy ? 'กำลังเตรียมรูป…' : statusText}
      </p>

      {cam === 'PREVIEW' ? (
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <button
            type="button"
            onClick={() => setAuto(!auto)}
            aria-pressed={auto}
            className={`flex min-h-[56px] flex-col items-center justify-center rounded-2xl border-2 text-sm font-bold ${auto ? 'border-yai-deep bg-yai-mint text-yai-deep' : 'border-yai-ink/15 bg-white'}`}
          >
            <Zap className="h-5 w-5" aria-hidden="true" />
            ถ่ายอัตโนมัติ {auto ? 'เปิด' : 'ปิด'}
          </button>
          <button
            type="button"
            onClick={capture}
            disabled={busy}
            className="h-20 w-20 rounded-full border-[6px] border-yai-deep bg-white shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-yai-teal disabled:opacity-50"
            aria-label="ถ่ายรูป"
          />
          {torchSupported ? (
            <button
              type="button"
              onClick={toggleTorch}
              aria-pressed={torchOn}
              className={`flex min-h-[56px] flex-col items-center justify-center rounded-2xl border-2 text-sm font-bold ${torchOn ? 'border-yai-warn bg-amber-50' : 'border-yai-ink/15 bg-white'}`}
            >
              <Flashlight className="h-5 w-5" aria-hidden="true" />
              ไฟฉาย
            </button>
          ) : (
            <span />
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={start}
          disabled={cam === 'REQUEST_PERMISSION'}
          className="flex min-h-[64px] w-full items-center justify-center gap-2 rounded-2xl bg-yai-deep text-xl font-bold text-white disabled:opacity-50"
        >
          <Camera className="h-7 w-7" aria-hidden="true" />
          {cam === 'NO_PERMISSION' || cam === 'UNSUPPORTED' ? 'ลองเปิดกล้องอีกครั้ง' : 'เปิดกล้อง'}
        </button>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => {
            const next = !edgeOn;
            setEdgeOn(next);
            setOutline(null);
            lastQuadRef.current = null;
          }}
          aria-pressed={edgeOn}
          className={`flex min-h-[56px] items-center justify-center gap-1.5 rounded-2xl border-2 text-base font-bold ${edgeOn ? 'border-yai-deep bg-yai-mint text-yai-deep' : 'border-yai-ink/15 bg-white'}`}
        >
          <Crop className="h-5 w-5" aria-hidden="true" />
          ตัดขอบอัตโนมัติ {edgeOn ? 'เปิด' : 'ปิด'}
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploadBusy}
          className="flex min-h-[56px] items-center justify-center gap-1.5 rounded-2xl border border-yai-deep/20 bg-yai-mint text-base font-bold text-yai-ink disabled:opacity-50"
        >
          <ImagePlus className="h-5 w-5" aria-hidden="true" />
          เลือกรูปจากเครื่อง
        </button>
      </div>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
    </div>
  );
};
