"""OCR engines shared by the API server and the benchmark.

- PaddleOCR PP-OCRv5 with the Thai recognizer ``th_PP-OCRv5_mobile_rec``: runs locally, fast, no data leaves the server.
- Typhoon OCR 1.5 (API model ``typhoon-ocr``): higher Thai accuracy, sends the image to the Typhoon API.
  The API key is read from the server environment (``TYPHOON_OCR_API_KEY``) and never sent to browsers.

Preprocessing mirrors the browser's OpenCV.js worker so benchmark numbers match what the app does.
"""

from __future__ import annotations

import hashlib
import os
import re
import tempfile
import time
from dataclasses import asdict, dataclass, field
from typing import Optional

import cv2
import numpy as np

def _load_dotenv() -> None:
    """Read ocr-server/.env (git-ignored) so the Typhoon key never has to be typed into a shell or committed.
    Real environment variables win over the file."""
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
    if not os.path.exists(path):
        return
    with open(path, encoding="utf-8") as fh:
        for raw in fh:
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


_load_dotenv()

PADDLE_DET_MODEL = os.environ.get("PADDLE_DET_MODEL", "PP-OCRv5_mobile_det")
PADDLE_REC_MODEL = os.environ.get("PADDLE_REC_MODEL", "th_PP-OCRv5_mobile_rec")
TYPHOON_MODEL = os.environ.get("TYPHOON_MODEL", "typhoon-ocr")
TYPHOON_TASK = os.environ.get("TYPHOON_TASK_TYPE", "v1.5")


@dataclass
class OcrLine:
    text: str
    confidence: Optional[float] = None  # 0..1; None when the engine does not report one (Typhoon)
    box: Optional[list] = None  # polygon [[x, y], ...] in the processed image


@dataclass
class OcrResult:
    engine: str
    model: str
    preprocess: str
    text: str
    lines: list = field(default_factory=list)
    confidence: Optional[float] = None
    latency_ms: float = 0.0
    image_sha256: str = ""

    def to_dict(self) -> dict:
        d = asdict(self)
        d["lines"] = [asdict(l) if isinstance(l, OcrLine) else l for l in self.lines]
        return d


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def decode_image(data: bytes) -> np.ndarray:
    arr = np.frombuffer(data, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("not a readable image")
    return img


def preprocess(img: np.ndarray, mode: str) -> np.ndarray:
    """raw: unchanged. clahe: resize to ~2000 px long side, grayscale, CLAHE, 3x3 median denoise (same steps as the OpenCV.js worker)."""
    if mode == "raw":
        return img
    if mode != "clahe":
        raise ValueError(f"unknown preprocess mode {mode}")
    h, w = img.shape[:2]
    long_side = max(h, w)
    if long_side < 2000:
        scale = 2000 / long_side
        img = cv2.resize(img, (round(w * scale), round(h * scale)), interpolation=cv2.INTER_CUBIC)
    elif long_side > 2400:
        scale = 2400 / long_side
        img = cv2.resize(img, (round(w * scale), round(h * scale)), interpolation=cv2.INTER_AREA)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    gray = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(gray)
    gray = cv2.medianBlur(gray, 3)
    return cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)


class PaddleEngine:
    name = "paddleocr"

    def __init__(self) -> None:
        self._ocr = None

    @property
    def model(self) -> str:
        return f"PP-OCRv5 ({PADDLE_DET_MODEL} + {PADDLE_REC_MODEL})"

    def _get(self):
        if self._ocr is None:
            from paddleocr import PaddleOCR  # heavy import, only when first used

            self._ocr = PaddleOCR(
                text_detection_model_name=PADDLE_DET_MODEL,
                text_recognition_model_name=PADDLE_REC_MODEL,
                use_doc_orientation_classify=False,
                use_doc_unwarping=False,
                use_textline_orientation=False,
                # PaddlePaddle 3.3 + oneDNN fails on some CPUs (Windows: ConvertPirAttribute2RuntimeAttribute);
                # off by default, set PADDLE_ENABLE_MKLDNN=1 to try it for speed on Linux servers
                enable_mkldnn=os.environ.get("PADDLE_ENABLE_MKLDNN", "0") == "1",
            )
        return self._ocr

    def available(self) -> bool:
        try:
            import paddleocr  # noqa: F401

            return True
        except Exception:
            return False

    def run(self, img: np.ndarray, preprocess_mode: str, image_sha256: str = "") -> OcrResult:
        processed = preprocess(img, preprocess_mode)
        t0 = time.perf_counter()
        results = self._get().predict(processed)
        latency = (time.perf_counter() - t0) * 1000
        lines: list[OcrLine] = []
        for res in results:
            data = res.json.get("res", res.json) if hasattr(res, "json") else res
            texts = data.get("rec_texts", [])
            scores = data.get("rec_scores", [])
            polys = data.get("rec_polys", data.get("dt_polys", []))
            for i, t in enumerate(texts):
                poly = polys[i] if i < len(polys) else None
                lines.append(
                    OcrLine(
                        text=str(t).strip(),
                        confidence=float(scores[i]) if i < len(scores) else None,
                        box=np.asarray(poly).tolist() if poly is not None else None,
                    )
                )
        lines = [l for l in lines if l.text]
        confs = [l.confidence for l in lines if l.confidence is not None]
        return OcrResult(
            engine=self.name,
            model=self.model,
            preprocess=preprocess_mode,
            text="\n".join(l.text for l in lines),
            lines=lines,
            confidence=float(np.mean(confs)) if confs else None,
            latency_ms=latency,
            image_sha256=image_sha256,
        )


def _markdown_to_lines(md: str) -> list[str]:
    """Typhoon returns markdown/HTML; keep the readable text, one line per row/cell."""
    md = re.sub(r"<figure>.*?</figure>", " ", md, flags=re.S)
    md = re.sub(r"</(td|th)>", " ", md)
    md = re.sub(r"<(br|/tr|/p|/li|/h\d)\s*/?>", "\n", md)
    md = re.sub(r"<[^>]+>", " ", md)
    out = []
    for line in md.splitlines():
        line = re.sub(r"^[#>*\-\s|]+", "", line).replace("**", "").replace("|", " ").strip()
        if line:
            out.append(re.sub(r"\s+", " ", line))
    return out


TYPHOON_LOCAL_URL = os.environ.get("TYPHOON_LOCAL_URL", "http://127.0.0.1:11434/v1")
TYPHOON_LOCAL_MODEL = os.environ.get("TYPHOON_LOCAL_MODEL", "scb10x/typhoon-ocr1.5-3b")
# Ollama's default 4096-token context truncates the vision tokens of a 1800 px image and the model returns
# nothing; 1024 px fits and read the test label perfectly (measured 2026-10-28, ~83 s/image on a Quadro M1200)
TYPHOON_LOCAL_IMAGE_DIM = int(os.environ.get("TYPHOON_LOCAL_IMAGE_DIM", "1024"))


class TyphoonEngine:
    """Typhoon OCR 1.5 either through the Typhoon API (needs TYPHOON_OCR_API_KEY) or self-hosted through
    Ollama's OpenAI-compatible endpoint (no key; the image never leaves this machine)."""

    def __init__(self, local: bool = False) -> None:
        self.local = local
        self.name = "typhoon-local" if local else "typhoon-ocr"

    @property
    def model(self) -> str:
        if self.local:
            return f"Typhoon OCR 1.5 ({TYPHOON_LOCAL_MODEL}, local Ollama, task {TYPHOON_TASK})"
        return f"Typhoon OCR 1.5 ({TYPHOON_MODEL}, API, task {TYPHOON_TASK})"

    def available(self) -> bool:
        if not self.local:
            return bool(os.environ.get("TYPHOON_OCR_API_KEY"))
        try:
            import httpx

            tags = httpx.get(TYPHOON_LOCAL_URL.rsplit("/v1", 1)[0] + "/api/tags", timeout=2).json()
            return any(m.get("name", "").startswith(TYPHOON_LOCAL_MODEL) for m in tags.get("models", []))
        except Exception:
            return False

    def run(self, img: np.ndarray, preprocess_mode: str, image_sha256: str = "") -> OcrResult:
        if not self.available():
            raise RuntimeError("Typhoon local model not available in Ollama" if self.local else "TYPHOON_OCR_API_KEY is not set on the server")
        from typhoon_ocr import ocr_document

        processed = preprocess(img, preprocess_mode)
        fd, path = tempfile.mkstemp(suffix=".png")
        os.close(fd)
        try:
            cv2.imwrite(path, processed)
            t0 = time.perf_counter()
            if self.local:
                md = ocr_document(
                    path,
                    base_url=TYPHOON_LOCAL_URL,
                    api_key="ollama",
                    model=TYPHOON_LOCAL_MODEL,
                    task_type=TYPHOON_TASK,
                    target_image_dim=TYPHOON_LOCAL_IMAGE_DIM,
                )
            else:
                md = ocr_document(path, model=TYPHOON_MODEL, task_type=TYPHOON_TASK)
            latency = (time.perf_counter() - t0) * 1000
        finally:
            os.remove(path)  # nothing is kept on disk
        lines = [OcrLine(text=t) for t in _markdown_to_lines(md or "")]
        return OcrResult(
            engine=self.name,
            model=self.model,
            preprocess=preprocess_mode,
            text="\n".join(l.text for l in lines),
            lines=lines,
            confidence=None,
            latency_ms=latency,
            image_sha256=image_sha256,
        )


ENGINES = {"paddleocr": PaddleEngine(), "typhoon-ocr": TyphoonEngine(), "typhoon-local": TyphoonEngine(local=True)}
