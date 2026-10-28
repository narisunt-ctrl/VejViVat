# Thai medication-label OCR benchmark

Compares **PaddleOCR PP-OCRv5** (`PP-OCRv5_mobile_det` + `th_PP-OCRv5_mobile_rec`) and **Typhoon OCR 1.5**
(`typhoon-ocr` via the API, or `typhoon-local` = `scb10x/typhoon-ocr1.5-3b` via Ollama, no key) on the same labelled images, each with and without preprocessing (`raw`, `clahe`).

## Metrics

| Metric | Definition |
|---|---|
| CER | Levenshtein distance / reference length, on normalised text with whitespace removed (Thai has no word spaces) |
| Name exact | The full medication name appears verbatim in the OCR text (after normalisation) |
| Ingredients | Share of the listed ingredients that appear verbatim |
| Strength + unit | Number and unit both correct; Thai and English units are equivalent (500 มก. = 500 mg, 10 มล. = 10 ml) |
| Latency | p50 / p95 per image. PaddleOCR: CPU of the benchmark machine. typhoon-local: Ollama on this machine. typhoon-ocr: includes network |
| Cost | PaddleOCR and typhoon-local: no API fee (your own compute). Typhoon: `TYPHOON_USD_PER_PAGE` × pages (rate not published here) |

Normalisation: Unicode NFC, Thai digits → Arabic, split sara am → ำ, lower-case.

## Data

- `data/synthetic/`: 12 fictional labels (`labels.json` = ground truth) rendered in a browser so Thai shaping is correct,
  each as `clean` and `photo` (coloured pack, small text, uneven light, blur, noise, rotation, cylinder squeeze for
  bottles/jars). A smoke test only, not real-world evidence. Re-render with `python tools/save_server.py` and
  `http://127.0.0.1:8765/tools/render_synthetic.html`.
- `data/real/`: add your own package photos and ground truth (see its README). Git-ignored.

Source images are read-only. `results/<run>/predictions.jsonl` (git-ignored) keeps per-image provenance:
image path, SHA-256, engine, model, preprocessing, latency, confidence, raw text and per-line boxes.

## Run

```bash
# from the repo root, with the OCR server's virtualenv (see ocr-server/README.md)
set PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK=True
set TYPHOON_OCR_API_KEY=...          # optional; Typhoon is skipped without it
set TYPHOON_USD_PER_PAGE=...         # optional; enables Typhoon cost estimates
ocr-server/.venv/Scripts/python ocr-bench/run_bench.py --engines paddleocr,typhoon-ocr --preprocess raw,clahe
# no key: run Typhoon locally (ollama pull scb10x/typhoon-ocr1.5-3b, ~3 GB download)
ocr-server/.venv/Scripts/python ocr-bench/run_bench.py --engines paddleocr,typhoon-local --preprocess raw
python -m unittest discover ocr-bench    # metric unit tests
```

Results: `results/<run>/report.md` and `summary.json`.

## Latest results (2026-10-28, 24 synthetic images, raw)

| Engine | CER ↓ | Name exact | Ingredients | Strength+unit | p50 / p95 |
|---|---|---|---|---|---|
| PaddleOCR PP-OCRv5 Thai | 0.036 | 87.5% | 92.4% | 100% | 5.3 s / 8.0 s (CPU) |
| Typhoon OCR 1.5 local (Ollama, 1024 px) | 0.021 | 91.7% | 97.9% | 100% | 58 s / 61 s (Quadro M1200 4 GB, 76% GPU) |

Full report: `results/20261028T152213Z/report.md`. Clean labels: Typhoon 12/12 perfect (CER 0), PaddleOCR CER 0.004.
On photo-like images both reach 83.3% name accuracy and both miss the name on the curved bottles (s04, s08).
Typhoon's misses are fluent, plausible Thai: it dropped the leading ยา / ยาธ (`น้ำแก้ไอมะขามป้อม`, `ชาตุอบเชย`) and
wrote `ประเภทเครื่องละ` for a line it could not read. Such text looks right at a glance, which is why OCR output is
always a draft that the patient or pharmacist must check. Synthetic data only: confirm with real photos.

### Real package images (2026-10-28, 4 labels, raw)

`--source real` on 4 turmeric products (box, capsule boxes, sachet; mostly shop/product photos, not phone shots).
Ground truth was drafted from the images and checked by the owner (2026-10-28). Strength is scored only where a strength is printed.

| Engine | CER ↓ | Name exact | Ingredients | Strength+unit | p50 |
|---|---|---|---|---|---|
| PaddleOCR PP-OCRv5 Thai | 0.356 | 0/4 | 25% | 1/2 | 10 s |
| Typhoon OCR 1.5 local | 0.312 | 4/4 | 75% | 2/2 | 111 s |

PaddleOCR drops or swaps Thai vowels and tone marks in large display fonts (`ขมินซิน`, `ขมิ้นผJ`, `oโรก`). Typhoon gets
the names but invents fluent text where print is small (`ไข่โภค` for the brand, `รูปถังหมดไม่ใช่เพื่อประกอบ`, which
reverses the meaning) and skipped ขมิ้นชัน on one box. Report: `results/20261028T155608Z/report.md`.

### Typhoon OCR 1.5 2B (Apache-2.0) vs 3B (non-commercial base), 2026-10-29

The 3B build on Ollama is based on Qwen2.5-VL-3B (Qwen Research License, non-commercial), so the server now uses
the 2B model (Apache-2.0, base Qwen3-VL-2B Apache-2.0, GGUF Q8_0 via Ollama). Engine names: `typhoon-local` = 2B,
`typhoon-local-3b` = 3B, kept for comparison only.

| Model | Synthetic CER | Synthetic name | Synthetic ingredients | Real name | Real ingredients found | p50 |
|---|---|---|---|---|---|---|
| Typhoon 1.5 3B | 0.021 | 91.7% | 97.9% | 4/4 | 75% | 58 s synthetic, 111 s real |
| Typhoon 1.5 2B (Q8_0) | 0.020 | 91.7% | 100% | 3/4 | 100% | 29 s synthetic, 38 s real |
| PaddleOCR PP-OCRv5 | 0.036 | 87.5% | 92.4% | 0/4 | 25% | 5 s synthetic, 10 s real |

Reports: `results/20261028T171310Z` (2B, all images, before the output cap) and `results/20261028T174318Z` (2B, real,
with the cap). The 2B model is about twice as fast because it fits mostly on the 4 GB GPU.

**Invented ingredients.** On the Aroka box the 2B model added a list that is not on the label (L-Glutathione, Taurine,
vitamins …; another run gave "Carrot, Rice, Lactic Acid"). The ingredient score counts listed ingredients that were
found and does not penalise extra ones, so it hides this. The 3B model invents text too. Any Typhoon output is a draft:
the patient or a pharmacist must check every field against the package before it is used.

**Loops.** Once, the 2B model repeated one character until the 16384-token limit (5 minutes). The server now caps local
output at `TYPHOON_LOCAL_MAX_TOKENS` (1024) and drops a line repeated more than twice in a row.
