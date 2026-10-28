# Thai medication-label OCR benchmark

- Run: 20261028T171310Z · images: 28 (real, synthetic)
- Engines: typhoon-local · preprocessing: raw
- CER: character error rate on normalised text without spaces (lower is better). Name: full name found verbatim.
  Ingredients: share of listed ingredients found. Strength: number and unit both correct (มก. = mg).

| Engine | Prep | Images | n | CER ↓ | Name exact | Ingredients | Strength+unit | p50 ms | p95 ms | API cost / 1000 |
|---|---|---|---|---|---|---|---|---|---|---|
| typhoon-local | raw | all | 28 | 0.315 | 89.3% | 100.0% | 100.0% | 29337 | 48704 | $0.0000 |
| typhoon-local | raw | clean | 12 | 0.000 | 100.0% | 100.0% | 100.0% | 29114 | 31160 | $0.0000 |
| typhoon-local | raw | photo | 12 | 0.039 | 83.3% | 100.0% | 100.0% | 29366 | 30829 | $0.0000 |
| typhoon-local | raw | real | 4 | 2.087 | 75.0% | 100.0% | 100.0% | 45819 | 272611 | $0.0000 |

Synthetic images are rendered labels (clean print and a photo-like variant with coloured packaging, uneven light,
blur, noise, rotation and cylinder distortion for bottles/jars). They are a smoke test, not evidence of real-world
accuracy. Add real photos with ground truth to data/real/ (see data/real/README.md) before drawing conclusions.
Latency is measured on the machine that ran this benchmark: PaddleOCR on CPU, typhoon-local through Ollama on that
machine (GPU if it fits), typhoon-ocr (API) including network time.
