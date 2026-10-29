// Sponsored herbal products shown in the free ยายพร้อม app. All entries below are FICTIONAL placeholders.
// Policy (enforced by eligibleAds and the banner):
// - only products with a Thai FDA registration number, an approved advertising licence number and GMP certification;
// - the advert text is the approved wording, no cure claims;
// - never targeted using health data (rotation by date only) and never shown on medicine, reminder or doctor pages;
// - always labelled "โฆษณา", can be hidden, and carries "ปรึกษาแพทย์หรือเภสัชกรก่อนใช้";
// - advertisers cannot buy clinic ranking or influence doctors' evidence views.

export interface SponsoredProduct {
  id: string;
  product: string;
  maker: string;
  /** Thai FDA registration number */
  fdaReg: string;
  /** approved advertising licence number */
  adLicense: string;
  gmp: boolean;
  claim: string;
  isSynthetic: true;
}

export const SPONSORED_PRODUCTS: SponsoredProduct[] = [
  {
    id: 'ad-ginger-demo',
    product: 'ขิงผงชงดื่ม (สินค้าสมมุติ)',
    maker: 'โรงงานสมุนไพรตัวอย่าง (สมมุติ)',
    fdaReg: 'ตัวอย่าง-0000/00',
    adLicense: 'ฆท.ตัวอย่าง/2569',
    gmp: true,
    claim: 'เครื่องดื่มสมุนไพรขิง ผลิตในโรงงานมาตรฐาน GMP',
    isSynthetic: true,
  },
  {
    id: 'ad-balm-demo',
    product: 'ยาหม่องสมุนไพรไพล (สินค้าสมมุติ)',
    maker: 'วิสาหกิจชุมชนตัวอย่าง (สมมุติ)',
    fdaReg: 'ตัวอย่าง-1111/00',
    adLicense: 'ฆท.ตัวอย่าง/2569',
    gmp: true,
    claim: 'ยาหม่องสูตรไพล บรรเทาอาการปวดเมื่อยกล้ามเนื้อ',
    isSynthetic: true,
  },
  {
    id: 'ad-no-licence-demo',
    product: 'สินค้าที่ไม่มีใบอนุญาตโฆษณา (ตัวอย่างที่ระบบไม่แสดง)',
    maker: 'ไม่ทราบ',
    fdaReg: '',
    adLicense: '',
    gmp: false,
    claim: 'รักษาได้ทุกโรค',
    isSynthetic: true,
  },
];

const CURE_CLAIM = /รักษาได้ทุกโรค|หายขาด|แทนยา|ไม่ต้องกินยา/;

/** Products allowed to appear: registered, ad-licensed, GMP, no cure claims, not hidden by the user */
export function eligibleAds(products: SponsoredProduct[], hidden: string[] = []): SponsoredProduct[] {
  return products.filter((p) => p.fdaReg.trim() && p.adLicense.trim() && p.gmp && !CURE_CLAIM.test(p.claim) && !hidden.includes(p.id));
}

/** Rotation by date only, so the choice never depends on the user's health data */
export function adForDate(products: SponsoredProduct[], date: string): SponsoredProduct | null {
  if (products.length === 0) return null;
  return products[Number(date.replace(/-/g, '')) % products.length];
}
