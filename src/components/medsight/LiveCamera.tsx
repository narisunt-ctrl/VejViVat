import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Flashlight, ImagePlus, Zap } from 'lucide-react';
import { FrameQuality, measureFrame } from '../../services/yai/frameQuality';

// Live camera with a cheap quality check on a downsampled preview, manual capture by default,
// optional auto-capture after several consecutive good frames, torch when the device supports it,
// and a gallery upload that works even without camera permission.

type CamState = 'IDLE' | 'REQUEST_PERMISSION' | 'PREVIEW' | 'NO_PERMISSION' | 'UNSUPPORTED';

export interface CaptureResult {
  dataUrl: string;
  source: 'CAMERA' | 'UPLOAD';
  quality: { brightness: number; sharpness: number; glare: number };
  /** higher-resolution copy used only for OCR, not stored */
  ocrSource: string;
  /** untouched full-resolution original (camera frame or the uploaded file), kept in IndexedDB */
  original: Promise<Blob | null>;
}

const MAX_SIDE = 1600;
// Small label text needs more pixels than the stored preview, so OCR gets a larger copy
const OCR_MAX_SIDE = 2400;
const ANALYSIS_W = 160;
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
  const q = measureFrame(ctx.getImageData(0, 0, canvas.width, canvas.height));
  return q;
}

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
  const stableRef = useRef(0);

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
    const ocrSource = drawScaled(v, v.videoWidth, v.videoHeight, OCR_MAX_SIDE).canvas.toDataURL('image/jpeg', 0.92);
    const full = drawScaled(v, v.videoWidth, v.videoHeight, Number.MAX_SAFE_INTEGER).canvas;
    const original = new Promise<Blob | null>((resolve) => full.toBlob(resolve, 'image/jpeg', 0.95));
    onCapture({ dataUrl: canvas.toDataURL('image/jpeg', 0.82), source: 'CAMERA', quality: { brightness: q.brightness, sharpness: q.sharpness, glare: q.glare }, ocrSource, original });
  }, [onCapture]);

  // Low-rate quality loop on a tiny frame; auto-capture only after consecutive good frames
  useEffect(() => {
    if (cam !== 'PREVIEW') return;
    const id = window.setInterval(() => {
      const v = videoRef.current;
      if (!v || !v.videoWidth || busy) return;
      const q = qualityOf(v, v.videoWidth, v.videoHeight);
      setQuality(q);
      stableRef.current = q.status === 'OK' ? stableRef.current + 1 : 0;
      if (auto && stableRef.current >= AUTO_STABLE_TICKS) capture();
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [cam, auto, busy, capture]);

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
    img.onload = () => {
      const q = qualityOf(img, img.naturalWidth, img.naturalHeight);
      const { canvas } = drawScaled(img, img.naturalWidth, img.naturalHeight, MAX_SIDE);
      const ocrSource = drawScaled(img, img.naturalWidth, img.naturalHeight, OCR_MAX_SIDE).canvas.toDataURL('image/jpeg', 0.92);
      URL.revokeObjectURL(url);
      onCapture({ dataUrl: canvas.toDataURL('image/jpeg', 0.82), source: 'UPLOAD', quality: { brightness: q.brightness, sharpness: q.sharpness, glare: q.glare }, ocrSource, original: Promise.resolve(file) });
      if (fileRef.current) fileRef.current.value = '';
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
  };

  const statusText =
    cam !== 'PREVIEW' ? '' : !quality ? 'กำลังเตรียมกล้อง…' : quality.status === 'OK' ? (auto ? 'พร้อมถ่าย ถือนิ่งๆ ระบบจะถ่ายให้' : 'พร้อมถ่าย') : quality.guidance;

  return (
    <div className="space-y-3">
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-3xl bg-yai-ink">
        {cam === 'PREVIEW' ? (
          <>
            <video ref={videoRef} playsInline muted className="h-full w-full object-cover" aria-label="ภาพจากกล้อง" />
            {/* Region guide: where to place the label */}
            <div
              className={`pointer-events-none absolute inset-[12%] rounded-3xl border-4 ${quality?.status === 'OK' ? 'border-yai-leaf' : 'border-white/70'} transition-colors`}
              aria-hidden="true"
            />
            {overlay && <div className="absolute inset-x-0 top-0 p-2">{overlay}</div>}
            {flash && <div className="absolute inset-0 bg-white/70" aria-hidden="true" />}
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center text-white">
            <Camera className="h-16 w-16 opacity-80" aria-hidden="true" />
            {cam === 'IDLE' && (
              <p className="text-xl">
                ถ่ายใกล้ๆ ให้ตัวหนังสือใหญ่เต็มกรอบ
                <span className="mt-2 block text-base text-white/80">ไม่ต้องเห็นทั้งกล่อง ใช้ได้กับกล่อง กระปุก แผงยา และถุงยาต้ม</span>
              </p>
            )}
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

      <p className="min-h-[2rem] text-center text-lg font-semibold" role="status" aria-live="polite">
        {busy ? 'กำลังบันทึกรูป…' : statusText}
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

      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl border border-yai-deep/20 bg-yai-mint text-lg font-bold text-yai-ink"
      >
        <ImagePlus className="h-6 w-6" aria-hidden="true" />
        เลือกรูปจากเครื่อง
      </button>
    </div>
  );
};
