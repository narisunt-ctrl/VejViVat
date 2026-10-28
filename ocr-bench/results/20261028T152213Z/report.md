# Thai medication-label OCR benchmark

- Run: 20261028T152213Z · images: 24 (synthetic)
- Engines: paddleocr, typhoon-local · preprocessing: raw
- CER: character error rate on normalised text without spaces (lower is better). Name: full name found verbatim.
  Ingredients: share of listed ingredients found. Strength: number and unit both correct (มก. = mg).
- Invented text: Inserted = characters written that are not on the label, Omitted = label characters left out
  (both per label character). Ingr. precision = ingredient words the OCR listed that are on the label.
  Invented field = images where the OCR listed an ingredient or a strength that is not on the label.

| Engine | Prep | Images | n | CER ↓ | Name exact | Ingredients | Strength+unit | Inserted ↓ | Omitted ↓ | Ingr. precision | Invented field ↓ | p50 ms | p95 ms | API cost / 1000 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| paddleocr | raw | all | 24 | 0.036 | 87.5% | 92.4% | 100.0% | 0.002 | 0.017 | 100.0% | 0.0% | 5298 | 7973 | $0.0000 |
| paddleocr | raw | clean | 12 | 0.004 | 91.7% | 100.0% | 100.0% | 0.002 | 0.001 | 100.0% | 0.0% | 5489 | 11614 | $0.0000 |
| paddleocr | raw | photo | 12 | 0.068 | 83.3% | 84.7% | 100.0% | 0.002 | 0.034 | 100.0% | 0.0% | 5120 | 6829 | $0.0000 |
| typhoon-local | raw | all | 24 | 0.021 | 91.7% | 97.9% | 100.0% | 0.003 | 0.009 | 100.0% | 0.0% | 58276 | 61408 | $0.0000 |
| typhoon-local | raw | clean | 12 | 0.000 | 100.0% | 100.0% | 100.0% | 0.000 | 0.000 | 100.0% | 0.0% | 57766 | 70733 | $0.0000 |
| typhoon-local | raw | photo | 12 | 0.043 | 83.3% | 95.8% | 100.0% | 0.005 | 0.018 | 100.0% | 0.0% | 58566 | 60672 | $0.0000 |

Synthetic images are rendered labels (clean print and a photo-like variant with coloured packaging, uneven light,
blur, noise, rotation and cylinder distortion for bottles/jars). They are a smoke test, not evidence of real-world
accuracy. Add real photos with ground truth to data/real/ (see data/real/README.md) before drawing conclusions.
Latency is measured on the machine that ran this benchmark: PaddleOCR on CPU, typhoon-local through Ollama on that
machine (GPU if it fits), typhoon-ocr (API) including network time, tesseract-js under Node on CPU (a phone is slower).
Invented-ingredient detection is a heuristic on the OCR's 'ส่วนประกอบ / Ingredients' line; see predictions.jsonl
for the exact words it flagged on each image.
