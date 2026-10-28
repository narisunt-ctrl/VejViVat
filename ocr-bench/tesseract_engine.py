"""Benchmark engine for the app's on-device OCR: Tesseract.js 5 (tha+eng) with the app's own enhancement and
two-pass rule, run under Node by tesseract_worker.mjs. Benchmark only; the OCR server does not use it."""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "ocr-server"))
from ocr_engines import OcrLine, OcrResult  # noqa: E402

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
# sizes from src/services/yai/thaiOcr.ts
TARGET_LONG_SIDE, MAX_LONG_SIDE, BINARY_LONG_SIDE = 2000, 2400, 1600


def _resize(img: np.ndarray, mode: str) -> np.ndarray:
    h, w = img.shape[:2]
    long = max(h, w)
    scale = BINARY_LONG_SIDE / long if mode == "binary" else TARGET_LONG_SIDE / long if long < TARGET_LONG_SIDE else min(1, MAX_LONG_SIDE / long)
    interp = cv2.INTER_CUBIC if scale > 1 else cv2.INTER_AREA
    return cv2.resize(img, (round(w * scale), round(h * scale)), interpolation=interp)


class TesseractJsEngine:
    name = "tesseract-js"
    model = "tesseract.js 5.1.1 (tha+eng), app two-pass: enhanced psm3, then binarised psm11"

    def __init__(self) -> None:
        self._proc: subprocess.Popen | None = None

    def available(self) -> bool:
        return shutil.which("node") is not None and (ROOT / "node_modules" / "tesseract.js").exists()

    def _worker(self) -> subprocess.Popen:
        if self._proc is None or self._proc.poll() is not None:
            self._proc = subprocess.Popen(
                ["node", str(HERE / "tesseract_worker.mjs")],
                cwd=str(ROOT),
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.DEVNULL,
                text=True,
                encoding="utf-8",
            )
        return self._proc

    def run(self, img: np.ndarray, preprocess_mode: str, image_sha256: str = "", thorough: bool = False) -> OcrResult:
        if preprocess_mode != "raw":
            raise ValueError("tesseract-js applies the app's own enhancement; use --preprocess raw")
        tmp = tempfile.mkdtemp(prefix="tessbench-")
        try:
            req = {"thorough": thorough}
            for mode in ("enhanced", "binary"):
                rgba = cv2.cvtColor(_resize(img, mode), cv2.COLOR_BGR2RGBA)
                path = os.path.join(tmp, f"{mode}.rgba")
                rgba.tofile(path)
                req[mode] = {"path": path, "w": rgba.shape[1], "h": rgba.shape[0]}
            proc = self._worker()
            t0 = time.perf_counter()
            proc.stdin.write(json.dumps(req) + "\n")
            proc.stdin.flush()
            out = json.loads(proc.stdout.readline() or '{"error": "worker exited"}')
            latency = (time.perf_counter() - t0) * 1000
        finally:
            shutil.rmtree(tmp, ignore_errors=True)
        if "error" in out:
            raise RuntimeError(out["error"])
        lines = [OcrLine(text=l["text"], confidence=l["confidence"] / 100) for l in out["lines"]]
        return OcrResult(
            engine=self.name,
            model=f"{self.model} · used {out['pass']}",
            preprocess=preprocess_mode,
            text="\n".join(l.text for l in lines) if lines else out["text"].strip(),
            lines=lines,
            confidence=out["confidence"] / 100,
            latency_ms=latency,
            image_sha256=image_sha256,
        )
