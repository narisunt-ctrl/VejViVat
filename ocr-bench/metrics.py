"""Metrics for the Thai medication-label OCR benchmark.

All comparisons run on normalised text: Unicode NFC, Thai digits -> Arabic, split sara am (U+0E4D U+0E32)
-> U+0E33, lower-case, and whitespace removed for character-level scores (Thai is written without spaces,
so OCR spacing differences should not count as errors).
"""

from __future__ import annotations

import re
import unicodedata

THAI_DIGITS = str.maketrans("๐๑๒๓๔๕๖๗๘๙", "0123456789")

UNIT_ALIASES = {
    "mg": "mg", "มก": "mg", "มก.": "mg", "มิลลิกรัม": "mg",
    "mcg": "mcg", "µg": "mcg", "ไมโครกรัม": "mcg",
    "g": "g", "กรัม": "g",
    "ml": "ml", "มล": "ml", "มล.": "ml", "มิลลิลิตร": "ml",
    "iu": "iu",
}
STRENGTH_RE = re.compile(r"(\d+(?:[.,]\d+)?)\s*(mg|มก\.?|มิลลิกรัม|mcg|µg|ไมโครกรัม|g(?![a-z])|กรัม|ml|มล\.?|มิลลิลิตร|iu)", re.I)


def normalize(s: str) -> str:
    s = unicodedata.normalize("NFC", s or "").translate(THAI_DIGITS)
    s = s.replace("ํา", "ำ").lower()
    return re.sub(r"\s+", " ", s).strip()


def compact(s: str) -> str:
    return re.sub(r"\s+", "", normalize(s))


def levenshtein(a: str, b: str) -> int:
    if a == b:
        return 0
    if not a:
        return len(b)
    if not b:
        return len(a)
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]


def cer(prediction: str, reference: str) -> float:
    """Character error rate on whitespace-free normalised text. Can exceed 1.0 for very noisy output."""
    ref = compact(reference)
    if not ref:
        return 0.0 if not compact(prediction) else 1.0
    return levenshtein(compact(prediction), ref) / len(ref)


def strengths_in(text: str) -> set[str]:
    """Canonical 'number unit' strings found in text, e.g. '500 มก.' -> '500mg'."""
    out = set()
    for num, unit in STRENGTH_RE.findall(normalize(text)):
        key = unit.lower().rstrip(".") if unit.lower().rstrip(".") in UNIT_ALIASES else unit.lower()
        canon = UNIT_ALIASES.get(key, UNIT_ALIASES.get(unit.lower(), unit.lower()))
        out.add(f"{num.replace(',', '.')}{canon}")
    return out


def name_exact(prediction: str, name: str) -> bool:
    """The full medication name appears verbatim (after normalisation) in the OCR text."""
    return compact(name) in compact(prediction)


def ingredient_accuracy(prediction: str, ingredients: list[str]) -> float:
    if not ingredients:
        return 1.0
    pred = compact(prediction)
    return sum(compact(i) in pred for i in ingredients) / len(ingredients)


def strength_correct(prediction: str, strength: str) -> bool:
    """Number and unit both right, with Thai/English units treated as equal (500 มก. == 500 mg)."""
    want = strengths_in(strength)
    return bool(want) and want.issubset(strengths_in(prediction))


def percentile(values: list[float], p: float) -> float:
    if not values:
        return 0.0
    s = sorted(values)
    k = (len(s) - 1) * p
    lo, hi = int(k), min(int(k) + 1, len(s) - 1)
    return s[lo] + (s[hi] - s[lo]) * (k - lo)
