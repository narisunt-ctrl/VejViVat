# YaiPrompt OCR server

Small FastAPI service that reads medicine labels for the ยายพร้อม app.

| Mode | Engine | Data leaves this server? |
|---|---|---|
| `fast` | PaddleOCR PP-OCRv5, Thai recognizer `th_PP-OCRv5_mobile_rec` | No |
| `accurate` | Typhoon OCR 1.5 (`typhoon-ocr`, task `v1.5`) via the Typhoon API | Yes, to Typhoon (SCB 10X) |
| `auto` (default) | PaddleOCR, then Typhoon if PaddleOCR's mean confidence < `AUTO_ACCURATE_BELOW` | Only when it escalates |

- **Credentials stay server-side.** `TYPHOON_OCR_API_KEY` is read from this server's environment. The web app only knows
  `VITE_OCR_API_URL`; never put the key in a `VITE_*` variable or in the repository.
- Images are processed in memory and are not written to disk or logged (Typhoon needs a temp file, deleted right after).
- Responses carry provenance: engine, model, preprocessing, latency and the SHA-256 of the uploaded bytes.
- Output is text only. The service never creates medication instructions or schedules; the app requires the patient
  to check the text and confirm a medicine before any reminder can exist.

## Run locally

```bash
python -m venv .venv
.venv/Scripts/pip install -r requirements.txt      # Linux/macOS: .venv/bin/pip
set TYPHOON_OCR_API_KEY=...                         # optional; without it only fast mode works
.venv/Scripts/uvicorn app:app --port 8000
```

Then create `.env.local` in the web app root with `VITE_OCR_API_URL=http://127.0.0.1:8000` and restart `npm run dev`.

## Configuration

| Variable | Default | Meaning |
|---|---|---|
| `TYPHOON_OCR_API_KEY` | (unset) | Enables `accurate`/escalation. Keep it secret. |
| `ALLOWED_ORIGINS` | `http://localhost:5173,https://narisunt-ctrl.github.io` | CORS allow-list |
| `MAX_UPLOAD_MB` | `8` | Upload limit |
| `RATE_LIMIT_PER_MIN` | `20` | Per-IP requests per minute (in memory) |
| `AUTO_ACCURATE_BELOW` | `0.80` | PaddleOCR confidence below which `auto` escalates to Typhoon |
| `OCR_PREPROCESS` | `raw` | `raw`, or `clahe` (grayscale + CLAHE + median, same as the browser OpenCV.js worker). The benchmark showed CLAHE hurts PaddleOCR (CER 0.036 → 0.074), so it is off by default |
| `PADDLE_ENABLE_MKLDNN` | `0` | oneDNN acceleration; off because PaddlePaddle 3.3 fails with it on some CPUs |

## Deploy

`Dockerfile` builds a CPU image. GitHub Pages cannot run Python, so host this separately (any container host),
set the variables above in that host's secret settings, and point `VITE_OCR_API_URL` at it.
Before real patient use: put it behind HTTPS and authentication, review the data-processing terms of Typhoon,
and complete a PDPA review. The in-memory rate limit is not a substitute for real abuse protection.
