# YaiPrompt OCR server

Small FastAPI service that reads medicine labels for the ยายพร้อม app.

| Mode | Engine | Data leaves this server? |
|---|---|---|
| `fast` | PaddleOCR PP-OCRv5, Thai recognizer `th_PP-OCRv5_mobile_rec` | No |
| `accurate` | Typhoon OCR 1.5 (task `v1.5`): the Typhoon API (`typhoon-ocr`) when `TYPHOON_OCR_API_KEY` is set, otherwise self-hosted Typhoon OCR 1.5 **2B** through Ollama (`typhoon-local`, Apache-2.0, commercial use allowed) | API: yes, to Typhoon (SCB 10X). Local: no |
| `auto` (default) | PaddleOCR, then the Typhoon API if PaddleOCR's mean confidence < `AUTO_ACCURATE_BELOW`. Not local Typhoon (1–2 min/image) unless `AUTO_ESCALATE_LOCAL=1` | Only when it escalates to the API |

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
| `OCR_ACCURATE_ENGINE` | `auto` | Engine behind `accurate`: `auto` (API if a key is set, else local), `api`, `local`, `off`. `/health` reports the one in use |
| `AUTO_ESCALATE_LOCAL` | `0` | `1` lets `auto` escalate to local Typhoon too (slow) |
| `TYPHOON_LOCAL_URL` | `http://127.0.0.1:11434/v1` | Ollama endpoint for `typhoon-local` (no key; image stays on this machine). Install Ollama and `ollama pull hf.co/mradermacher/typhoon-ocr1.5-2b-GGUF:Q8_0` (~2.3 GB) |
| `TYPHOON_LOCAL_MODEL` | `hf.co/mradermacher/typhoon-ocr1.5-2b-GGUF:Q8_0` | Ollama model name. Do not switch to `scb10x/typhoon-ocr1.5-3b` for a commercial service: its base model Qwen2.5-VL-3B is under a non-commercial research licence (see docs/yai/THIRD_PARTY_NOTICES.md) |
| `TYPHOON_LOCAL_MAX_TOKENS` | `1024` | Output cap. The upstream client allows 16384 and the 2B model once looped for 5 minutes on one label |
| `TYPHOON_LOCAL_IMAGE_DIM` | `1024` | Long side sent to the local model. Ollama's default 4096-token context overflows at 1800 px and the model returns nothing |
| `PADDLE_ENABLE_MKLDNN` | `0` | oneDNN acceleration; off because PaddlePaddle 3.3 fails with it on some CPUs |

## Deploy

`Dockerfile` builds a CPU image. GitHub Pages cannot run Python, so host this separately (any container host),
set the variables above in that host's secret settings, and point `VITE_OCR_API_URL` at it.
Before real patient use: put it behind HTTPS and authentication, review the data-processing terms of Typhoon,
and complete a PDPA review. The in-memory rate limit is not a substitute for real abuse protection.
