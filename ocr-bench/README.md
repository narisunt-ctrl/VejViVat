# Thai medication-label OCR benchmark

Compares **PaddleOCR PP-OCRv5** (`PP-OCRv5_mobile_det` + `th_PP-OCRv5_mobile_rec`) and **Typhoon OCR 1.5**
(`typhoon-ocr`) on the same labelled images, each with and without preprocessing (`raw`, `clahe`).

## Metrics

| Metric | Definition |
|---|---|
| CER | Levenshtein distance / reference length, on normalised text with whitespace removed (Thai has no word spaces) |
| Name exact | The full medication name appears verbatim in the OCR text (after normalisation) |
| Ingredients | Share of the listed ingredients that appear verbatim |
| Strength + unit | Number and unit both correct; Thai and English units are equivalent (500 มก. = 500 mg, 10 มล. = 10 ml) |
| Latency | p50 / p95 per image. PaddleOCR: CPU of the benchmark machine. Typhoon: includes network |
| Cost | PaddleOCR: no API fee (your own compute). Typhoon: `TYPHOON_USD_PER_PAGE` × pages (rate not published here) |

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
python -m unittest discover ocr-bench    # metric unit tests
```

Results: `results/<run>/report.md` and `summary.json`.
