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
    out: list[str] = []
    for line in md.splitlines():
        line = re.sub(r"^[#>*\-\s|]+", "", line).replace("**", "").replace("|", " ").strip()
        if not line:
            continue
        line = re.sub(r"\s+", " ", line)
        # a small vision model can get stuck repeating one line; keep at most two copies in a row
        if len(out) >= 2 and out[-1] == line and out[-2] == line:
            continue
        out.append(line)
    return out


TYPHOON_LOCAL_URL = os.environ.get("TYPHOON_LOCAL_URL", "http://127.0.0.1:11434/v1")
# Default: Typhoon OCR 1.5 2B (Apache-2.0, base Qwen3-VL-2B Apache-2.0), commercial use allowed.
# The 3B build on Ollama is based on Qwen2.5-VL-3B (Qwen Research License, non-commercial): benchmark only.
TYPHOON_LOCAL_MODEL = os.environ.get("TYPHOON_LOCAL_MODEL", "hf.co/mradermacher/typhoon-ocr1.5-2b-GGUF:Q8_0")
TYPHOON_LOCAL_3B_MODEL = "scb10x/typhoon-ocr1.5-3b"
# Ollama's default 4096-token context truncates the vision tokens of a 1800 px image and the model returns
# nothing; 1024 px fits (measured 2026-10-28 on a Quadro M1200: 3B ~60 s/image, 2B ~30 s/image)
TYPHOON_LOCAL_IMAGE_DIM = int(os.environ.get("TYPHOON_LOCAL_IMAGE_DIM", "1024"))
# A label is a few hundred characters; the upstream client allows 16384 tokens, which let the 2B model loop on
# repeated characters for 5 minutes on one real label (2026-10-29). Cap the local output instead.
TYPHOON_LOCAL_MAX_TOKENS = int(os.environ.get("TYPHOON_LOCAL_MAX_TOKENS", "1024"))


class TyphoonEngine:
    """Typhoon OCR 1.5 either through the Typhoon API (needs TYPHOON_OCR_API_KEY) or self-hosted through
    Ollama's OpenAI-compatible endpoint (no key; the image never leaves this machine)."""

    def __init__(self, local: bool = False, local_model: str = TYPHOON_LOCAL_MODEL, name: str = "") -> None:
        self.local = local
        self.local_model = local_model
        self.name = name or ("typhoon-local" if local else "typhoon-ocr")

    @property
    def model(self) -> str:
        if self.local:
            return f"Typhoon OCR 1.5 ({self.local_model}, local Ollama, task {TYPHOON_TASK})"
        return f"Typhoon OCR 1.5 ({TYPHOON_MODEL}, API, task {TYPHOON_TASK})"

    def available(self) -> bool:
        if not self.local:
            return bool(os.environ.get("TYPHOON_OCR_API_KEY"))
        try:
            import httpx

            tags = httpx.get(TYPHOON_LOCAL_URL.rsplit("/v1", 1)[0] + "/api/tags", timeout=2).json()
            return any(m.get("name", "").startswith(self.local_model) for m in tags.get("models", []))
        except Exception:
            return False

    def _run_local(self, path: str) -> str:
        """Same prompt and sampling as typhoon_ocr.ocr_document, but with an output cap (see TYPHOON_LOCAL_MAX_TOKENS)."""
        from openai import OpenAI
        from typhoon_ocr.ocr_utils import prepare_ocr_messages

        messages = prepare_ocr_messages(pdf_or_image_path=path, task_type=TYPHOON_TASK, target_image_dim=TYPHOON_LOCAL_IMAGE_DIM, page_num=1)
        response = OpenAI(base_url=TYPHOON_LOCAL_URL, api_key="ollama").chat.completions.create(
            model=self.local_model,
            messages=messages,
            max_tokens=TYPHOON_LOCAL_MAX_TOKENS,
            temperature=0.1,
            top_p=0.6,
            extra_body={"repetition_penalty": 1.1},
        )
        return response.choices[0].message.content or ""

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
                md = self._run_local(path)
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


ENGINES = {
    "paddleocr": PaddleEngine(),
    "typhoon-ocr": TyphoonEngine(),
    "typhoon-local": TyphoonEngine(local=True),
    # non-commercial base model (see above); kept so the benchmark can compare it
    "typhoon-local-3b": TyphoonEngine(local=True, local_model=TYPHOON_LOCAL_3B_MODEL, name="typhoon-local-3b"),
}
