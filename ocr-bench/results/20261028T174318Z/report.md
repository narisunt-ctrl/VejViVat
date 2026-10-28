# Thai medication-label OCR benchmark

- Run: 20261028T174318Z · images: 4 (real)
- Engines: typhoon-local · preprocessing: raw
- CER: character error rate on normalised text without spaces (lower is better). Name: full name found verbatim.
  Ingredients: share of listed ingredients found. Strength: number and unit both correct (มก. = mg).

| Engine | Prep | Images | n | CER ↓ | Name exact | Ingredients | Strength+unit | p50 ms | p95 ms | API cost / 1000 |
|---|---|---|---|---|---|---|---|---|---|---|
| typhoon-local | raw | all | 4 | 0.436 | 75.0% | 100.0% | 100.0% | 38275 | 56850 | $0.0000 |
| typhoon-local | raw | real | 4 | 0.436 | 75.0% | 100.0% | 100.0% | 38275 | 56850 | $0.0000 |

Synthetic images are rendered labels (clean print and a photo-like variant with coloured packaging, uneven light,
blur, noise, rotation and cylinder distortion for bottles/jars). They are a smoke test, not evidence of real-world
accuracy. Add real photos with ground truth to data/real/ (see data/real/README.md) before drawing conclusions.
Latency is measured on the machine that ran this benchmark: PaddleOCR on CPU, typhoon-local through Ollama on that
machine (GPU if it fits), typhoon-ocr (API) including network time.
