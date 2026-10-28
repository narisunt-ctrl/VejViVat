# Reference repositories (checked 2026-10-28)

| Repository | What was checked | License state | Decision |
|---|---|---|---|
| [MeredyddKJones/scanner](https://github.com/MeredyddKJones/scanner) | GitHub API metadata and `LICENSE` lookup (no license field, `LICENSE` returns 404). Behaviour described in the master plan: OpenCV.js quad detection, stable-frame auto-capture, torch, IndexedDB, PWA share target. | **No license found**, so reuse rights are not established. | **No code copied.** `src/components/medsight/LiveCamera.tsx` was written independently from general ideas only: live preview, region guide, manual capture by default, optional auto-capture after consecutive good frames, torch when supported, gallery fallback. Its thresholds are our own initial guesses, not the scanner's 220 ms / 5-frame values. |
| [JCodesMore/ai-website-cloner-template](https://github.com/JCodesMore/ai-website-cloner-template) | GitHub API metadata (`spdx_id: MIT`, `LICENSE` present). | MIT | Not used as a starter (Next.js 16 / React 19 doesn't match this Vite + React 18 app). Only the Map → Observe → Build → Compare idea is used for visual QA: screenshots at 390×844 and 1440×900. No third-party UI was cloned. |

**Update (edge detection):** the outline detector and perspective warp in `src/services/yai/edgeDetector.ts` were written from scratch with a different method (Otsu threshold + blob corners + own homography), not the scanner's OpenCV Canny/contour code. The scanner repository was re-checked on 2026-10-28 and still has no license.

The only added dependency is tesseract.js (see `THIRD_PARTY_NOTICES.md`).
