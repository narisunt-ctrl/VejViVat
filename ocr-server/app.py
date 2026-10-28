"""YaiPrompt OCR API.

POST /ocr   multipart "file" (image) + "mode" = fast | accurate | auto
GET  /health

- fast:     PaddleOCR PP-OCRv5 Thai, runs on this server only.
- accurate: Typhoon OCR 1.5, via the Typhoon API when TYPHOON_OCR_API_KEY is set (key stays in this server's
            environment), otherwise self-hosted through Ollama (no key, image stays on this machine).
- auto:     PaddleOCR first; if its mean confidence is below AUTO_ACCURATE_BELOW and the Typhoon API is configured,
            the image is re-read with Typhoon and the response says why. Local Typhoon takes ~1-2 min per image on
            a small GPU, so auto does not escalate to it unless AUTO_ESCALATE_LOCAL=1.

Images are processed in memory and never written to disk or logs. The response carries provenance
(engine, model, preprocessing, image SHA-256) so every extracted field can be traced to the exact image.
OCR output is text only: this service never produces medication instructions or schedules.
"""

from __future__ import annotations

import os
import time
from collections import defaultdict, deque

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from ocr_engines import ENGINES, decode_image, sha256_bytes

ALLOWED_ORIGINS = [o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "http://localhost:5173,https://narisunt-ctrl.github.io").split(",") if o.strip()]
MAX_UPLOAD_BYTES = int(float(os.environ.get("MAX_UPLOAD_MB", "8")) * 1024 * 1024)
RATE_LIMIT_PER_MIN = int(os.environ.get("RATE_LIMIT_PER_MIN", "20"))
AUTO_ACCURATE_BELOW = float(os.environ.get("AUTO_ACCURATE_BELOW", "0.80"))
# Benchmark (ocr-bench, 2026-10-28): CLAHE doubled PaddleOCR CER on photo-like labels, so raw is the default
PREPROCESS = os.environ.get("OCR_PREPROCESS", "raw")
# Engine behind "accurate": auto = Typhoon API if a key is set, else local Typhoon (Ollama); api; local; off
ACCURATE_ENGINE = os.environ.get("OCR_ACCURATE_ENGINE", "auto")
AUTO_ESCALATE_LOCAL = os.environ.get("AUTO_ESCALATE_LOCAL", "0") == "1"

app = FastAPI(title="YaiPrompt OCR", docs_url=None, redoc_url=None)
app.add_middleware(CORSMiddleware, allow_origins=ALLOWED_ORIGINS, allow_methods=["GET", "POST"], allow_headers=["*"])

_hits: dict[str, deque] = defaultdict(deque)


def _rate_limit(ip: str) -> None:
    now = time.time()
    q = _hits[ip]
    while q and now - q[0] > 60:
        q.popleft()
    if len(q) >= RATE_LIMIT_PER_MIN:
        raise HTTPException(429, "too many requests, try again in a minute")
    q.append(now)


def _accurate_engine():
    """The Typhoon engine "accurate" uses right now, or None when none is available."""
    api, local = ENGINES["typhoon-ocr"], ENGINES["typhoon-local"]
    if ACCURATE_ENGINE in ("auto", "api") and api.available():
        return api
    if ACCURATE_ENGINE in ("auto", "local") and local.available():
        return local
    return None


@app.get("/health")
def health() -> dict:
    accurate = _accurate_engine()
    return {
        "paddleocr": ENGINES["paddleocr"].available(),
        "typhoon_configured": ENGINES["typhoon-ocr"].available(),
        "accurate_engine": accurate.name if accurate else None,
        "preprocess": PREPROCESS,
    }


@app.post("/ocr")
async def ocr(request: Request, file: UploadFile = File(...), mode: str = Form("auto")) -> dict:
    _rate_limit(request.client.host if request.client else "unknown")
    if mode not in ("fast", "accurate", "auto"):
        raise HTTPException(400, "mode must be fast, accurate or auto")
    if not (file.content_type or "").startswith("image/"):
        raise HTTPException(415, "image files only")
    data = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "image too large")
    try:
        img = decode_image(data)
    except ValueError:
        raise HTTPException(400, "could not read image")
    digest = sha256_bytes(data)
    paddle, typhoon = ENGINES["paddleocr"], _accurate_engine()

    if mode == "accurate":
        if typhoon is None:
            raise HTTPException(503, "accurate OCR is not configured on this server")
        return {"result": typhoon.run(img, PREPROCESS, digest).to_dict(), "fallback_reason": None}

    first = paddle.run(img, PREPROCESS, digest)
    escalate = typhoon is not None and (typhoon.name == "typhoon-ocr" or AUTO_ESCALATE_LOCAL)
    if mode == "auto" and escalate and (first.confidence is None or first.confidence < AUTO_ACCURATE_BELOW):
        try:
            second = typhoon.run(img, PREPROCESS, digest)
            reason = f"PaddleOCR confidence {first.confidence or 0:.2f} < {AUTO_ACCURATE_BELOW}"
            return {"result": second.to_dict(), "fallback_reason": reason, "first_pass": first.to_dict()}
        except Exception as exc:  # Typhoon down or quota: keep the local result
            return {"result": first.to_dict(), "fallback_reason": f"Typhoon unavailable: {type(exc).__name__}"}
    return {"result": first.to_dict(), "fallback_reason": None}
