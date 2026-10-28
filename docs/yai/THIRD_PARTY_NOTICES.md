# Third-party notices (YaiPrompt)

| Package | Version | License | Use |
|---|---|---|---|
| [tesseract.js](https://github.com/naptha/tesseract.js) | 5.1.1 | Apache-2.0 | On-device OCR in the browser. At runtime it loads its worker and WASM core from cdn.jsdelivr.net and the `tha` / `eng` trained data (Tesseract project, Apache-2.0) from the default tesseract.js language data CDN. |

| [@techstark/opencv-js](https://github.com/TechStark/opencv-js) | 4.12.0-release.1 | Apache-2.0 | OpenCV.js, copied to `public/vendor/` at build time; only loaded when `VITE_ENABLE_OPENCV=true` |
| [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR) / PaddlePaddle | 3.7.0 / 3.3.1 | Apache-2.0 | OCR server and benchmark (`ocr-server/`), models `PP-OCRv5_mobile_det`, `th_PP-OCRv5_mobile_rec` |
| [typhoon-ocr](https://github.com/scb-10x/typhoon-ocr) | ≥0.4 | see upstream | Client for the Typhoon OCR 1.5 API (server-side only); API use is subject to Typhoon's terms |
| FastAPI, Uvicorn, OpenCV (cv2) | see `ocr-server/requirements.txt` | MIT / BSD / Apache-2.0 | OCR server |

No code was copied from MeredyddKJones/scanner (no license found); see `research-repos.md`.
