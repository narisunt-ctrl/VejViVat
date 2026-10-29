import type { Taste } from '../../domain/yai/herbElement';

// Common Thai home dishes and foods with their main tastes in the Thai traditional medicine sense, used to
// describe what the user ate and to suggest menus for the element. A working table for the prototype: tastes
// follow general usage and the flags are simple, so the table is WAITING FOR REVIEW by a Thai traditional medicine
// doctor and a nutritionist before real use. It is not patient-specific advice and makes no treatment claim.

export interface ThaiFood {
  id: string;
  name: string;
  /** words that identify the dish in what the user said (longest first when matching) */
  match: string[];
  tastes: Taste[];
  /** simple flags used only to hide or annotate menu ideas */
  salty?: boolean;
  sweet?: boolean;
  /** leafy greens with notable vitamin K: people on warfarin are advised to keep the amount steady */
  vitaminKGreens?: boolean;
  /** herb names in the dish that the interaction checks know about */
  herbs?: string[];
  /** fried or very oily */
  oily?: boolean;
}

export const FOOD_TABLE_STATUS = 'ตารางตัวอย่าง รอแพทย์แผนไทยและนักโภชนาการตรวจ';

export const THAI_FOODS: ThaiFood[] = [
  { id: 'kaeng-som', name: 'แกงส้ม', match: ['แกงส้ม'], tastes: ['เปรี้ยว', 'เผ็ดร้อน'], salty: true },
  { id: 'tom-som', name: 'ต้มส้มผัก', match: ['ต้มส้ม'], tastes: ['เปรี้ยว'] },
  { id: 'tom-yum', name: 'ต้มยำ', match: ['ต้มยำ'], tastes: ['เปรี้ยว', 'เผ็ดร้อน'], herbs: ['ข่า', 'ตะไคร้'] },
  { id: 'kaeng-liang', name: 'แกงเลียง', match: ['แกงเลียง'], tastes: ['เผ็ดร้อน', 'จืด'], herbs: ['พริกไทย'] },
  { id: 'kaeng-khilek', name: 'แกงขี้เหล็ก', match: ['แกงขี้เหล็ก', 'ขี้เหล็ก'], tastes: ['ขม', 'มัน'] },
  { id: 'mara-egg', name: 'มะระผัดไข่', match: ['มะระผัด', 'มะระ'], tastes: ['ขม'] },
  { id: 'kaeng-jued', name: 'แกงจืด', match: ['แกงจืด'], tastes: ['จืด', 'เย็น'] },
  { id: 'kaeng-jued-tamlueng', name: 'แกงจืดตำลึง', match: ['แกงจืดตำลึง', 'ตำลึง'], tastes: ['จืด', 'เย็น'], vitaminKGreens: true },
  { id: 'tom-fak', name: 'ต้มฟัก', match: ['ต้มฟัก', 'ฟักต้ม'], tastes: ['จืด', 'เย็น'] },
  { id: 'khao-tom', name: 'ข้าวต้ม', match: ['ข้าวต้ม'], tastes: ['จืด'] },
  { id: 'jok', name: 'โจ๊ก', match: ['โจ๊ก'], tastes: ['จืด'] },
  { id: 'pla-nueng', name: 'ปลานึ่ง', match: ['ปลานึ่ง', 'ปลาทูนึ่ง'], tastes: ['จืด', 'เค็ม'], salty: true },
  { id: 'pla-thu-thot', name: 'ปลาทูทอด', match: ['ปลาทูทอด'], tastes: ['เค็ม', 'มัน'], salty: true, oily: true },
  { id: 'nam-prik', name: 'น้ำพริกกับผักต้ม', match: ['น้ำพริก'], tastes: ['เผ็ดร้อน', 'เค็ม'], salty: true },
  { id: 'som-tam', name: 'ส้มตำ', match: ['ส้มตำ', 'ตำส้ม'], tastes: ['เปรี้ยว', 'เค็ม', 'เผ็ดร้อน'], salty: true, herbs: ['กระเทียม'] },
  { id: 'pad-kaprao', name: 'ผัดกะเพรา', match: ['กะเพรา'], tastes: ['เผ็ดร้อน'], salty: true, herbs: ['กะเพรา', 'กระเทียม'] },
  { id: 'pad-khing', name: 'ผัดขิง', match: ['ผัดขิง', 'ขิงไก่'], tastes: ['เผ็ดร้อน'], herbs: ['ขิง'] },
  { id: 'kaeng-phet', name: 'แกงเผ็ด/แกงกะทิ', match: ['แกงเผ็ด', 'แกงเขียวหวาน', 'แกงกะทิ', 'พะแนง'], tastes: ['เผ็ดร้อน', 'มัน'], oily: true },
  { id: 'pad-phak', name: 'ผัดผักบุ้ง/ผัดผักใบเขียว', match: ['ผัดผักบุ้ง', 'ผักบุ้ง', 'ผัดคะน้า', 'คะน้า'], tastes: ['จืด'], vitaminKGreens: true, salty: true },
  { id: 'buab-egg', name: 'บวบผัดไข่', match: ['บวบ'], tastes: ['จืด', 'เย็น'] },
  { id: 'fak-thong', name: 'ฟักทองนึ่ง', match: ['ฟักทองนึ่ง', 'ฟักทอง'], tastes: ['หวาน', 'มัน'], sweet: true },
  { id: 'buat', name: 'ขนมบวด/แกงบวด', match: ['แกงบวด', 'บวด'], tastes: ['หวาน', 'มัน'], sweet: true },
  { id: 'kluai-tom', name: 'กล้วยน้ำว้าดิบต้ม', match: ['กล้วยดิบ', 'กล้วยต้ม'], tastes: ['ฝาด'], herbs: ['กล้วย'] },
  { id: 'kluai', name: 'กล้วยน้ำว้าสุก', match: ['กล้วย'], tastes: ['หวาน', 'ฝาด'], sweet: true, herbs: ['กล้วย'] },
  { id: 'thua-tom', name: 'ถั่วต้ม', match: ['ถั่วต้ม', 'ถั่วลิสงต้ม'], tastes: ['มัน'] },
  { id: 'farang', name: 'ฝรั่ง', match: ['ฝรั่ง'], tastes: ['ฝาด', 'หวาน'], herbs: ['ฝรั่ง'] },
  { id: 'malakor', name: 'มะละกอสุก', match: ['มะละกอ'], tastes: ['หวาน'], sweet: true, herbs: ['มะละกอ'] },
  { id: 'nam-khing', name: 'น้ำขิง', match: ['น้ำขิง'], tastes: ['เผ็ดร้อน'], herbs: ['ขิง'] },
  { id: 'nam-krachiap', name: 'น้ำกระเจี๊ยบ', match: ['กระเจี๊ยบ'], tastes: ['เปรี้ยว'], sweet: true, herbs: ['กระเจี๊ยบแดง'] },
  { id: 'kai-thot', name: 'ไก่ทอด/ของทอด', match: ['ทอด'], tastes: ['มัน', 'เค็ม'], salty: true, oily: true },
];

/** Foods named in a piece of text; longer names win so "แกงจืดตำลึง" is not also counted as "แกงจืด" */
export function foodsIn(text: string, foods: ThaiFood[] = THAI_FOODS): ThaiFood[] {
  const t = text.replace(/\s+/g, '');
  const keys = foods.flatMap((f) => f.match.map((m) => ({ m, f }))).sort((a, b) => b.m.length - a.m.length);
  const found: ThaiFood[] = [];
  let rest = t;
  for (const { m, f } of keys) {
    if (rest.includes(m)) {
      if (!found.includes(f)) found.push(f);
      rest = rest.split(m).join('·');
    }
  }
  return found;
}
