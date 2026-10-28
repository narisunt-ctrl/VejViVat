// Cheap preview-frame metrics for the scanner. Thresholds are initial guesses for the demo and
// must be calibrated on real devices; the guidance text only reflects what was actually measured.

export interface FrameLike {
  data: Uint8ClampedArray | number[];
  width: number;
  height: number;
}

export interface FrameQuality {
  /** mean luma 0..255 */
  brightness: number;
  /** mean absolute luma gradient; higher means sharper edges/text */
  sharpness: number;
  /** fraction of near-white pixels, a proxy for glare */
  glare: number;
  status: 'TOO_DARK' | 'TOO_BRIGHT' | 'GLARE' | 'BLURRY' | 'OK';
  guidance: string;
}

export const QUALITY_THRESHOLDS = { dark: 50, bright: 225, glare: 0.18, sharp: 9 };

export function measureFrame(frame: FrameLike): FrameQuality {
  const { data, width, height } = frame;
  const luma = new Float32Array(width * height);
  let sum = 0;
  let glarePixels = 0;
  for (let i = 0; i < width * height; i++) {
    const y = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
    luma[i] = y;
    sum += y;
    if (y > 245) glarePixels++;
  }
  const n = Math.max(1, width * height);
  let grad = 0;
  let gradCount = 0;
  for (let y = 0; y < height - 1; y++) {
    for (let x = 0; x < width - 1; x++) {
      const i = y * width + x;
      grad += Math.abs(luma[i + 1] - luma[i]) + Math.abs(luma[i + width] - luma[i]);
      gradCount += 2;
    }
  }
  const brightness = sum / n;
  const sharpness = gradCount ? grad / gradCount : 0;
  const glare = glarePixels / n;

  let status: FrameQuality['status'] = 'OK';
  let guidance = 'ภาพชัดพอแล้ว กดถ่ายได้เลย';
  if (brightness < QUALITY_THRESHOLDS.dark) {
    status = 'TOO_DARK';
    guidance = 'ภาพมืดไป ลองหันเข้าหาแสงหรือเปิดไฟฉาย';
  } else if (glare > QUALITY_THRESHOLDS.glare) {
    status = 'GLARE';
    guidance = 'มีแสงสะท้อน ลองเอียงกล่องเล็กน้อย';
  } else if (brightness > QUALITY_THRESHOLDS.bright) {
    status = 'TOO_BRIGHT';
    guidance = 'ภาพสว่างจ้าไป ลองถอยออกจากแสงเล็กน้อย';
  } else if (sharpness < QUALITY_THRESHOLDS.sharp) {
    status = 'BLURRY';
    guidance = 'ภาพยังไม่ชัด ถือกล้องให้นิ่ง หรือขยับเข้าใกล้อีกนิด';
  }
  return { brightness, sharpness, glare, status, guidance };
}
