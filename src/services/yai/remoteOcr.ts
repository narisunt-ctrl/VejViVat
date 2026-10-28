// Client for the YaiPrompt OCR server (ocr-server/). The browser only knows the server URL;
// the Typhoon API key lives in the server environment and is never shipped to the app.

export const OCR_API_URL: string = (import.meta.env.VITE_OCR_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';

export type RemoteMode = 'fast' | 'accurate' | 'auto';

export interface RemoteOcrResult {
  engine: string;
  model: string;
  preprocess: string;
  text: string;
  lines: { text: string; confidence: number | null }[];
  /** 0..100, or null when the engine does not report confidence (Typhoon) */
  confidence: number | null;
  latencyMs: number;
  imageSha256: string;
  fallbackReason: string | null;
}

// "accurate" may run Typhoon OCR on the server's own small GPU, measured at 1-2 minutes per image
const TIMEOUT_MS: Record<RemoteMode, number> = { fast: 45_000, auto: 45_000, accurate: 240_000 };

export async function remoteOcr(image: Blob, mode: RemoteMode): Promise<RemoteOcrResult> {
  if (!OCR_API_URL) throw new Error('OCR server not configured');
  const form = new FormData();
  form.append('file', image, 'label.jpg');
  form.append('mode', mode);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS[mode]);
  try {
    const res = await fetch(`${OCR_API_URL}/ocr`, { method: 'POST', body: form, signal: ctrl.signal });
    if (!res.ok) throw new Error(`OCR server ${res.status}`);
    const body = await res.json();
    const r = body.result;
    const pct = (v: number | null | undefined) => (typeof v === 'number' ? v * 100 : null);
    return {
      engine: r.engine,
      model: r.model,
      preprocess: r.preprocess,
      text: r.text,
      lines: (r.lines ?? []).map((l: { text: string; confidence?: number | null }) => ({ text: l.text, confidence: pct(l.confidence) })),
      confidence: pct(r.confidence),
      latencyMs: r.latency_ms,
      imageSha256: r.image_sha256,
      fallbackReason: body.fallback_reason ?? null,
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  return (await fetch(dataUrl)).blob();
}
