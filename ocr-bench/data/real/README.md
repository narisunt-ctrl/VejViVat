# Real medicine-label photos (add your own)

Put photos here and describe each one in `manifest.jsonl`, one JSON object per line:

```json
{"id": "r001", "image": "r001.jpg", "kind": "tablet-box", "name": "พาราเซตามอล", "ingredients": ["paracetamol"], "strength": "500 mg", "text": "พาราเซตามอล\nParacetamol 500 mg\n..."}
```

- `name`, `ingredients`, `strength`: exactly as printed on the package (ground truth for the field scores).
- `text`: the full label text as printed, line by line (ground truth for CER).
- `kind`: box, tablet-box, blister, bottle, jar, sachet, herbal-capsule, decoction-bag …

Rules:
- Photograph only the package. No faces, names, HN, addresses, prescriptions or pharmacy stickers with patient data.
- Originals are read only; the benchmark never edits or re-saves them.
- This folder is git-ignored except this README, so photos are not pushed to GitHub by accident.
