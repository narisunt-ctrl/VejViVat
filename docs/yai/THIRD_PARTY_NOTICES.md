# Third-party notices (YaiPrompt)

| Package | Version | License | Use |
|---|---|---|---|
| [tesseract.js](https://github.com/naptha/tesseract.js) | 5.1.1 | Apache-2.0 | On-device OCR in the browser. At runtime it loads its worker and WASM core from cdn.jsdelivr.net and the `tha` / `eng` trained data (Tesseract project, Apache-2.0) from the default tesseract.js language data CDN. |

| [@techstark/opencv-js](https://github.com/TechStark/opencv-js) | 4.12.0-release.1 | Apache-2.0 | OpenCV.js, copied to `public/vendor/` at build time; only loaded when `VITE_ENABLE_OPENCV=true` |
| [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR) / PaddlePaddle | 3.7.0 / 3.3.1 | Apache-2.0 | OCR server and benchmark (`ocr-server/`), models `PP-OCRv5_mobile_det`, `th_PP-OCRv5_mobile_rec` |
| [typhoon-ocr](https://github.com/scb-10x/typhoon-ocr) | ≥0.4 | Apache-2.0 | Python client for Typhoon OCR 1.5 (server-side only), used for both the API and a self-hosted model |
| [Typhoon OCR 1.5 2B](https://huggingface.co/typhoon-ai/typhoon-ocr1.5-2b) (SCB 10X), GGUF build [mradermacher/typhoon-ocr1.5-2b-GGUF](https://huggingface.co/mradermacher/typhoon-ocr1.5-2b-GGUF) | 1.5 | Apache-2.0; base model [Qwen3-VL-2B-Instruct](https://huggingface.co/Qwen/Qwen3-VL-2B-Instruct) Apache-2.0 | Self-hosted OCR model through Ollama. Commercial use allowed under Apache-2.0 (keep the notices). Use also accepts the [OpenTyphoon terms](https://opentyphoon.ai/tac): output is not medical advice and must be checked by a person before health decisions |
| [Typhoon OCR 1.5 3B](https://ollama.com/scb10x/typhoon-ocr1.5-3b) (SCB 10X) | 1.5 | Apache-2.0 card, **but built on Qwen2.5-VL-3B, which is under the [Qwen Research License](https://huggingface.co/Qwen/Qwen2.5-VL-3B-Instruct/blob/main/LICENSE) (non-commercial; commercial use needs a licence from Alibaba Cloud)** | Benchmark comparison only. Do not ship it in a commercial service |
| Typhoon OCR API (`typhoon-ocr`) | — | [OpenTyphoon terms](https://opentyphoon.ai/tac) | Optional, needs a key. The terms let SCB 10X use uploaded images to train models and forbid personal data, so do not send patient photos without a PDPA review |
| FastAPI, Uvicorn, OpenCV (cv2) | see `ocr-server/requirements.txt` | MIT / BSD / Apache-2.0 | OCR server |

No code was copied from MeredyddKJones/scanner (no license found); see `research-repos.md`.

## Data sources

| Source | Use | Terms / status |
|---|---|---|
| Herb-Drug Interaction database, medplant.mahidol.ac.th (Faculty of Pharmacy, Mahidol University) | 699 herb–drug records in `data/hdi/medplant-interactions.json`, shown with a link to each source article in ยายพร้อม and CareBridge | Attributed and linked on every record. Written permission to publish is being requested from the data owner; if it is not granted, the app can show links only. |
| Thai national herbal formulary entries (`data/formulary/thai-formulary.json`) | Listed indications, contraindications and precautions on herb pages | Source reference shown per entry; marked as waiting for pharmacist / Thai traditional medicine review. |
| NCBI PubMed E-utilities | Live evidence search from the browser | Public API, `tool=vejvivat-demo`; results link to PubMed records. |

## Fonts

| Font | License | Use |
|---|---|---|
| Noto Sans Thai, Noto Serif Thai (Google Fonts) | SIL Open Font License 1.1 | Patient app (YaiPrompt) |
| IBM Plex Sans Thai, Sarabun (Google Fonts) | SIL Open Font License 1.1 | Clinician app (CareBridge) |
