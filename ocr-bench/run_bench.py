"""Thai medication-label OCR benchmark: PaddleOCR PP-OCRv5 (th_PP-OCRv5_mobile_rec) vs Typhoon OCR 1.5.

Every engine reads the same labelled images, with and without preprocessing. Results keep provenance for each
prediction (image path, SHA-256, engine, model, preprocessing, latency, raw text) so any score can be traced
back to the exact source image. Source images are only read, never modified.

Usage (from the repo root, using the OCR server's virtualenv):
  ocr-server/.venv/Scripts/python ocr-bench/run_bench.py --engines paddleocr,typhoon-ocr --preprocess raw,clahe
  ocr-server/.venv/Scripts/python ocr-bench/run_bench.py --rescore ocr-bench/results/<run>   # new metrics, no OCR

Typhoon runs only when TYPHOON_OCR_API_KEY is set in the environment. Cost per page for Typhoon is not
published in this repo; set TYPHOON_USD_PER_PAGE to get a cost estimate.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "ocr-server"))
sys.path.insert(0, str(HERE))

from metrics import (  # noqa: E402
    cer,
    compact,
    edit_ops,
    ingredient_accuracy,
    invented_ingredients,
    invented_strengths,
    name_exact,
    percentile,
    strength_correct,
)
from ocr_engines import ENGINES, decode_image, sha256_bytes  # noqa: E402
from tesseract_engine import TesseractJsEngine  # noqa: E402

ENGINES["tesseract-js"] = TesseractJsEngine()  # the app's on-device OCR; benchmark only
FREE_ENGINES = ("paddleocr", "typhoon-local", "typhoon-local-3b", "tesseract-js")


def load_dataset() -> list[dict]:
    """Synthetic labels (labels.json + rendered images) plus any real photos listed in data/real/manifest.jsonl."""
    items = []
    syn = HERE / "data" / "synthetic"
    for spec in json.loads((syn / "labels.json").read_text(encoding="utf-8")):
        for variant in ("clean", "photo"):
            path = syn / "images" / f"{spec['id']}_{variant}.jpg"
            if path.exists():
                items.append({**spec, "id": f"{spec['id']}_{variant}", "variant": variant, "source": "synthetic", "image": path, "text": "\n".join(spec["lines"])})
    real = HERE / "data" / "real" / "manifest.jsonl"
    if real.exists():
        for line in real.read_text(encoding="utf-8").splitlines():
            if line.strip():
                rec = json.loads(line)
                items.append({**rec, "variant": rec.get("variant", "real"), "source": "real", "image": real.parent / rec["image"]})
    return items


def score(text: str, item: dict) -> dict:
    """All per-image scores for one OCR text against one label's ground truth."""
    ins, dele, _ = edit_ops(text, item["text"])
    ref_len = max(1, len(compact(item["text"])))
    invented_ing, matched_ing = invented_ingredients(text, item["ingredients"])
    invented_str = invented_strengths(text, item["text"])
    return {
        "cer": cer(text, item["text"]),
        "name_exact": name_exact(text, item["name"]),
        "ingredient_acc": ingredient_accuracy(text, item["ingredients"]),
        "strength_ok": strength_correct(text, item["strength"]) if item.get("strength") else None,
        "insertion_rate": ins / ref_len,
        "deletion_rate": dele / ref_len,
        "ingredient_matched": matched_ing,
        "invented_ingredients": invented_ing,
        "invented_strengths": invented_str,
        "invented_field": bool(invented_ing or invented_str),
    }


def summarize(rows: list[dict], usd_per_page: float | None) -> dict:
    by_key: dict[str, list[dict]] = {}
    for r in rows:
        if r.get("error"):
            continue
        by_key.setdefault(f"{r['engine']}|{r['preprocess']}|{r['variant']}", []).append(r)
        by_key.setdefault(f"{r['engine']}|{r['preprocess']}|all", []).append(r)
    out = {}
    for key, rs in sorted(by_key.items()):
        engine, prep, variant = key.split("|")
        lat = [r["latency_ms"] for r in rs]
        cost = None
        if engine == "typhoon-ocr":
            cost = None if usd_per_page is None else usd_per_page * len(rs)
        elif engine in FREE_ENGINES:
            cost = 0.0  # no per-call API fee; runs on your own machine (see latency)
        out[key] = {
            "engine": engine,
            "preprocess": prep,
            "variant": variant,
            "n": len(rs),
            "cer_mean": sum(r["cer"] for r in rs) / len(rs),
            "name_exact": sum(r["name_exact"] for r in rs) / len(rs),
            "ingredient_acc": sum(r["ingredient_acc"] for r in rs) / len(rs),
            # labels without a printed strength (spices, some herbal boxes) are left out of this score
            "strength_acc": (lambda xs: sum(xs) / len(xs) if xs else None)([r["strength_ok"] for r in rs if r["strength_ok"] is not None]),
            # invented text: characters not on the label, made-up ingredients or strengths
            "insertion_rate": sum(r["insertion_rate"] for r in rs) / len(rs),
            "deletion_rate": sum(r["deletion_rate"] for r in rs) / len(rs),
            "ingredient_precision": (lambda m, i: m / (m + i) if m + i else None)(
                sum(r["ingredient_matched"] for r in rs), sum(len(r["invented_ingredients"]) for r in rs)
            ),
            "invented_field_rate": sum(r["invented_field"] for r in rs) / len(rs),
            "latency_p50_ms": percentile(lat, 0.5),
            "latency_p95_ms": percentile(lat, 0.95),
            "api_cost_usd": cost,
            "api_cost_per_1000_usd": None if cost is None else cost / len(rs) * 1000,
        }
    return out


def write_report(path: Path, meta: dict, summary: dict, skipped: dict) -> None:
    pct = lambda v: f"{v * 100:.1f}%"
    money = lambda v: "ไม่ทราบ (ตั้ง TYPHOON_USD_PER_PAGE)" if v is None else f"${v:.4f}"
    lines = [
        "# Thai medication-label OCR benchmark",
        "",
        f"- Run: {meta['started']} · images: {meta['n_images']} ({meta['sources']})",
        f"- Engines: {', '.join(meta['engines'])} · preprocessing: {', '.join(meta['preprocess'])}",
        "- CER: character error rate on normalised text without spaces (lower is better). Name: full name found verbatim.",
        "  Ingredients: share of listed ingredients found. Strength: number and unit both correct (มก. = mg).",
        "- Invented text: Inserted = characters written that are not on the label, Omitted = label characters left out",
        "  (both per label character). Ingr. precision = ingredient words the OCR listed that are on the label.",
        "  Invented field = images where the OCR listed an ingredient or a strength that is not on the label.",
        "",
    ]
    if skipped:
        lines += ["**Not run:** " + "; ".join(f"{k}: {v}" for k, v in skipped.items()), ""]
    lines += [
        "| Engine | Prep | Images | n | CER ↓ | Name exact | Ingredients | Strength+unit | Inserted ↓ | Omitted ↓ | Ingr. precision | Invented field ↓ | p50 ms | p95 ms | API cost / 1000 |",
        "|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|",
    ]
    na = lambda v: "n/a" if v is None else pct(v)
    for s in summary.values():
        lines.append(
            f"| {s['engine']} | {s['preprocess']} | {s['variant']} | {s['n']} | {s['cer_mean']:.3f} | {pct(s['name_exact'])} | "
            f"{pct(s['ingredient_acc'])} | {na(s['strength_acc'])} | {s['insertion_rate']:.3f} | {s['deletion_rate']:.3f} | "
            f"{na(s['ingredient_precision'])} | {pct(s['invented_field_rate'])} | {s['latency_p50_ms']:.0f} | {s['latency_p95_ms']:.0f} | {money(s['api_cost_per_1000_usd'])} |"
        )
    lines += [
        "",
        "Synthetic images are rendered labels (clean print and a photo-like variant with coloured packaging, uneven light,",
        "blur, noise, rotation and cylinder distortion for bottles/jars). They are a smoke test, not evidence of real-world",
        "accuracy. Add real photos with ground truth to data/real/ (see data/real/README.md) before drawing conclusions.",
        "Latency is measured on the machine that ran this benchmark: PaddleOCR on CPU, typhoon-local through Ollama on that",
        "machine (GPU if it fits), typhoon-ocr (API) including network time, tesseract-js under Node on CPU (a phone is slower).",
        "Invented-ingredient detection is a heuristic on the OCR's 'ส่วนประกอบ / Ingredients' line; see predictions.jsonl",
        "for the exact words it flagged on each image.",
    ]
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--engines", default="paddleocr,typhoon-ocr")
    ap.add_argument("--preprocess", default="raw,clahe")
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--source", default="all", choices=["all", "synthetic", "real"])
    ap.add_argument("--rescore", metavar="RUN_DIR", help="recompute every score from a run's predictions.jsonl, no OCR")
    args = ap.parse_args()
    if args.rescore:
        rescore(Path(args.rescore))
        return

    engines = [e for e in args.engines.split(",") if e]
    preps = [p for p in args.preprocess.split(",") if p]
    data = [d for d in load_dataset() if args.source in ("all", d["source"])][: args.limit or None]
    usd = os.environ.get("TYPHOON_USD_PER_PAGE")
    usd_per_page = float(usd) if usd else None

    skipped = {}
    active = []
    for e in engines:
        eng = ENGINES[e]
        if not eng.available():
            skipped[e] = "TYPHOON_OCR_API_KEY not set" if e == "typhoon-ocr" else f"Ollama model {getattr(eng, 'local_model', '')} not found" if e.startswith("typhoon-local") else "engine not installed"
        else:
            active.append(e)

    started = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    out_dir = HERE / "results" / started
    out_dir.mkdir(parents=True, exist_ok=True)
    rows = []
    with (out_dir / "predictions.jsonl").open("w", encoding="utf-8") as fh:
        for item in data:
            raw = Path(item["image"]).read_bytes()
            digest = sha256_bytes(raw)
            img = decode_image(raw)
            for e in active:
                for prep in preps:
                    row = {
                        "image_id": item["id"],
                        "image_path": str(Path(item["image"]).relative_to(HERE)),
                        "image_sha256": digest,
                        "source": item["source"],
                        "variant": item["variant"],
                        "kind": item.get("kind"),
                        "engine": e,
                        "preprocess": prep,
                    }
                    try:
                        t0 = time.perf_counter()
                        res = ENGINES[e].run(img, prep, digest)
                        row.update(
                            model=res.model,
                            latency_ms=res.latency_ms or (time.perf_counter() - t0) * 1000,
                            confidence=res.confidence,
                            prediction=res.text,
                            lines=[l.__dict__ for l in res.lines],
                            **score(res.text, item),
                        )
                    except Exception as exc:
                        row["error"] = f"{type(exc).__name__}: {exc}"
                    rows.append(row)
                    fh.write(json.dumps(row, ensure_ascii=False) + "\n")
                    status = row.get("error") or f"CER {row['cer']:.3f} name {row['name_exact']} {row['latency_ms']:.0f} ms"
                    print(f"{item['id']:<14} {e:<12} {prep:<6} {status}", flush=True)

    summary = summarize(rows, usd_per_page)
    meta = {
        "started": started,
        "n_images": len(data),
        "sources": ", ".join(sorted({d['source'] for d in data})),
        "engines": engines,
        "preprocess": preps,
        "skipped": skipped,
        "typhoon_usd_per_page": usd_per_page,
    }
    (out_dir / "summary.json").write_text(json.dumps({"meta": meta, "summary": summary}, ensure_ascii=False, indent=2), encoding="utf-8")
    write_report(out_dir / "report.md", meta, summary, skipped)
    print(f"\nreport: {out_dir / 'report.md'}")


def rescore(run_dir: Path) -> None:
    """Score an earlier run again with the current metrics and ground truth (e.g. after adding a metric).
    Writes summary.json and report.md next to the predictions; the OCR text itself is not touched."""
    items = {d["id"]: d for d in load_dataset()}
    rows = []
    for line in (run_dir / "predictions.jsonl").read_text(encoding="utf-8").splitlines():
        row = json.loads(line)
        if not row.get("error") and row["image_id"] in items:
            row.update(score(row["prediction"], items[row["image_id"]]))
        rows.append(row)
    (run_dir / "predictions.jsonl").write_text("".join(json.dumps(r, ensure_ascii=False) + "\n" for r in rows), encoding="utf-8")
    old = json.loads((run_dir / "summary.json").read_text(encoding="utf-8"))["meta"] if (run_dir / "summary.json").exists() else {}
    meta = {
        "started": old.get("started", run_dir.name),
        "n_images": len({r["image_id"] for r in rows}),
        "sources": ", ".join(sorted({r["source"] for r in rows})),
        "engines": sorted({r["engine"] for r in rows}),
        "preprocess": sorted({r["preprocess"] for r in rows}),
        "skipped": old.get("skipped", {}),
        "typhoon_usd_per_page": old.get("typhoon_usd_per_page"),
        "rescored": datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ"),
    }
    summary = summarize(rows, meta["typhoon_usd_per_page"])
    (run_dir / "summary.json").write_text(json.dumps({"meta": meta, "summary": summary}, ensure_ascii=False, indent=2), encoding="utf-8")
    write_report(run_dir / "report.md", meta, summary, meta["skipped"])
    print(f"report: {run_dir / 'report.md'}")


if __name__ == "__main__":
    main()
