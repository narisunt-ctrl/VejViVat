import unittest

from metrics import (
    cer,
    deletion_rate,
    edit_ops,
    ingredient_accuracy,
    insertion_rate,
    invented_ingredients,
    invented_strengths,
    name_exact,
    normalize,
    percentile,
    strength_correct,
    strengths_in,
)


class MetricsTest(unittest.TestCase):
    def test_normalize(self):
        self.assertEqual(normalize("ยา ๕๐๐  มก. จํากัด"), "ยา 500 มก. จำกัด")

    def test_cer_ignores_spacing_and_counts_edits(self):
        self.assertEqual(cer("ฟ้าทะลายโจร แคปซูล", "ฟ้าทะลายโจรแคปซูล"), 0.0)
        self.assertAlmostEqual(cer("ฟ้ากะลายโจร", "ฟ้าทะลายโจร"), 1 / 11)
        self.assertEqual(cer("", "abc"), 1.0)

    def test_strength_units_thai_and_english(self):
        self.assertEqual(strengths_in("ผงขมิ้นชัน 500 มก. / Turmeric 500 mg"), {"500mg"})
        self.assertTrue(strength_correct("Paracetamol 500 mg", "500 มก."))
        self.assertFalse(strength_correct("Paracetamol 50 mg", "500 มก."))
        self.assertFalse(strength_correct("Paracetamol 500 g", "500 มก."))
        self.assertTrue(strength_correct("ยาน้ำ 10 มล.", "10 ml"))

    def test_name_and_ingredients(self):
        self.assertTrue(name_exact("xx ขมิ้นชัน แคปซูล yy", "ขมิ้นชันแคปซูล"))
        self.assertFalse(name_exact("ขมินซั้นแคปซูล", "ขมิ้นชันแคปซูล"))
        self.assertEqual(ingredient_accuracy("ผงขมิ้นชัน และพริกไทยดำ", ["ขมิ้นชัน", "พริกไทยดำ", "ขิง"]), 2 / 3)

    def test_ingredient_aliases(self):
        self.assertEqual(ingredient_accuracy("Curcuma longa Linn. powder 500 mg", ["ขมิ้นชัน|Curcuma longa"]), 1.0)

    def test_edit_ops_split_inserted_and_missing_text(self):
        self.assertEqual(edit_ops("abcxyz", "abc"), (3, 0, 0))
        self.assertEqual(edit_ops("ab", "abcd"), (0, 2, 0))
        self.assertEqual(edit_ops("abX", "abc"), (0, 0, 1))
        self.assertAlmostEqual(insertion_rate("ขมิ้นชัน วิตามินซี", "ขมิ้นชัน"), 9 / 8)
        self.assertEqual(deletion_rate("ขมิ้นชัน", "ขมิ้นชัน"), 0.0)

    def test_invented_ingredients(self):
        # the 2B model added vitamins to a turmeric-only box (real label r006)
        pred = "Aroka Curmin Ingredients: Curcumin, L-Glutathione, Vitamin C\n100% NATURAL"
        invented, matched = invented_ingredients(pred, ["ขมิ้นชัน|Curcuma longa"])
        self.assertEqual(invented, ["l-glutathione", "vitamin"])  # curcumin is close enough to Curcuma to pass
        self.assertEqual(matched, 1)
        self.assertEqual(invented_ingredients("ส่วนประกอบ: ข่า", ["ขิง"]), (["ข่า"], 0))
        # list on the next line, strength and pack size removed, misread still matched
        self.assertEqual(invented_ingredients("ส่วนประกอบ:\nสารสกัดมะขามป้อม 60 มล.", ["มะขามป้อม"]), ([], 1))
        self.assertEqual(invented_ingredients("ส่วนประกอบ: โกรูซอ โกฐเขมา", ["โกฐสอ", "โกฐเขมา"]), ([], 2))
        self.assertEqual(invented_ingredients("ส่วนประกอบ: อบเชย การบูร ขนาดบรรจุ 15 มล.", ["อบเชย", "การบูร"]), ([], 2))
        self.assertEqual(invented_ingredients("ส่วนประกอบ: อบเชย วิตามินซี", ["อบเชย"]), (["วิตามินซี"], 1))
        self.assertEqual(invented_ingredients("ขมิ้นชัน แคปซูล", ["ขมิ้นชัน"]), ([], 0))

    def test_invented_strengths(self):
        self.assertEqual(invented_strengths("ขมิ้นชัน 50 mg", "ขมิ้นชัน 500 มก."), ["50mg"])
        self.assertEqual(invented_strengths("ขมิ้นชัน 500 mg", "ขมิ้นชัน 500 มก."), [])

    def test_percentile(self):
        self.assertEqual(percentile([10, 20, 30, 40], 0.5), 25)


if __name__ == "__main__":
    unittest.main()
