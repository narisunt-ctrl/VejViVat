import unittest

from metrics import cer, ingredient_accuracy, name_exact, normalize, percentile, strength_correct, strengths_in


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

    def test_percentile(self):
        self.assertEqual(percentile([10, 20, 30, 40], 0.5), 25)


if __name__ == "__main__":
    unittest.main()
