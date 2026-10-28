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


def aliases(ingredient: str) -> list[str]:
    """Ground truth may list names for one ingredient as 'ขมิ้นชัน|Curcuma longa'; any of them counts."""
    return [a for a in (compact(x) for x in ingredient.split("|")) if a]


def ingredient_accuracy(prediction: str, ingredients: list[str]) -> float:
    """Recall: share of the label's ingredients found. Extra, invented ingredients do not lower it."""
    if not ingredients:
        return 1.0
    pred = compact(prediction)
    return sum(any(a in pred for a in aliases(i)) for i in ingredients) / len(ingredients)


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


# --- Invented text (hallucination) ---------------------------------------------------------------------------
# A vision-language OCR model can write fluent text that is not on the package. Recall-style scores above do not
# see it, so these measure it separately.


def edit_ops(prediction: str, reference: str) -> tuple[int, int, int]:
    """(insertions, deletions, substitutions) turning the reference into the prediction, on compact text.
    Insertions are characters the OCR wrote that are not on the label; deletions are label text it left out."""
    a, b = compact(reference), compact(prediction)
    prev = [(j, (j, 0, 0)) for j in range(len(b) + 1)]  # (cost, (ins, del, sub))
    for i in range(1, len(a) + 1):
        cur = [(i, (0, i, 0))]
        for j in range(1, len(b) + 1):
            same = a[i - 1] == b[j - 1]
            c_sub, o_sub = prev[j - 1]
            c_del, o_del = prev[j]
            c_ins, o_ins = cur[j - 1]
            cur.append(min(
                (c_sub + (not same), (o_sub[0], o_sub[1], o_sub[2] + (not same))),
                (c_del + 1, (o_del[0], o_del[1] + 1, o_del[2])),
                (c_ins + 1, (o_ins[0] + 1, o_ins[1], o_ins[2])),
            ))
        prev = cur
    return prev[-1][1]


def insertion_rate(prediction: str, reference: str) -> float:
    """Characters written that are not on the label, per label character (0 = nothing extra)."""
    return edit_ops(prediction, reference)[0] / max(1, len(compact(reference)))


def deletion_rate(prediction: str, reference: str) -> float:
    """Label characters the OCR left out, per label character (0 = nothing missed)."""
    return edit_ops(prediction, reference)[1] / max(1, len(compact(reference)))


INGREDIENT_HEAD_RE = re.compile(r"(ส่วนประ[฀-๿]{0,6}|active\s+ingredients?|ingredients?|composition)\s*[:：]?", re.I)
# where an ingredient list usually ends on Thai and English labels
FIELD_STOP_RE = re.compile(r"(ขนาด|บรรจุ|น้ำหนัก|ปริมาณ|รับประทาน|ครั้งละ|วันละ|วิธีใช้|ข้อบ่งใช้|สรรพคุณ|คำเตือน|net\s*weight|dosage|directions?|indications?|warning)", re.I)
# words that describe the form of an ingredient rather than naming one
FORM_WORDS = {"สารสกัด", "ผง", "ผงละเอียด", "แห้ง", "powder", "extract", "linn", "linn.", "dried"}


THAI_MARKS_RE = re.compile(r"[ัิ-ฺ็-๎]")


def _close(token: str, alias: str) -> bool:
    """Same word, allowing misreads (โกรูซอ for โกฐสอ); short words must be nearly exact (ขิง is not ข่า)."""
    if token in alias or alias in token:
        return True
    x, y = THAI_MARKS_RE.sub("", token), THAI_MARKS_RE.sub("", alias)
    if y in x or x in y:  # ผงเหง่าขมิ้นชั้น still names ขมิ้นชัน
        return True
    longest = max(len(x), len(y))
    return levenshtein(x, y) <= (0.5 if longest >= 5 else 0.34) * longest


def ingredient_items(prediction: str) -> list[str]:
    """Items the OCR text lists after an ingredient heading ('ส่วนประกอบ:', 'Ingredients:'), strengths removed."""
    items: list[str] = []
    lines = [normalize(l) for l in (prediction or "").splitlines()]
    for i, line in enumerate(lines):
        m = INGREDIENT_HEAD_RE.search(line)
        if not m:
            continue
        rest = line[m.end():].strip()
        part = rest if rest else (lines[i + 1] if i + 1 < len(lines) else "")
        stop = FIELD_STOP_RE.search(part)
        if stop:
            part = part[: stop.start()]
        part = STRENGTH_RE.sub(" ", part)
        for piece in re.split(r"[,;/、]|\sและ\s|\band\b", part):
            piece = piece.strip(" .:-()[]")
            if piece:
                items.append(piece)
    return items


def invented_ingredients(prediction: str, ingredients: list[str]) -> tuple[list[str], int]:
    """(invented, matched): words in the OCR's ingredient list that match none of the label's ingredients,
    and how many matched. A misread such as โกรูซอ for โกฐสอ still counts as matched."""
    names = [a for i in ingredients for a in aliases(i)]
    invented: list[str] = []
    matched = 0
    for item in ingredient_items(prediction):
        # word by word, so one real ingredient cannot hide an invented one next to it ("อบเชย วิตามินซี")
        for tok in item.split():
            t = tok.strip(" .:-()")
            if len(t) < 2 or t in FORM_WORDS or t.isdigit():
                continue
            if any(_close(t, a) for a in names):
                matched += 1
            else:
                invented.append(t)
    return invented, matched


def invented_strengths(prediction: str, reference_text: str) -> list[str]:
    """Number+unit pairs the OCR wrote that appear nowhere on the label (e.g. 50mg when the box says 500 mg)."""
    return sorted(strengths_in(prediction) - strengths_in(reference_text))
