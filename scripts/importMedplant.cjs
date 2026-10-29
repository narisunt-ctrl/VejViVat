// Convert the medplant (Faculty of Pharmacy, Mahidol University) herb–drug interaction export into
// data/hdi/medplant-interactions.json. Usage:
//   node scripts/importMedplant.cjs "<path>/medplant_interactions_long.csv"
// Every row keeps its article link back to medplant.mahidol.ac.th. Severity labels are normalised
// (น้อย/ต่ำ/รุนแรงน้อย → LOW, ปานกลาง/รุนแรงปานกลาง → MODERATE, มาก/รุนแรงมาก → HIGH, "-" → UNSPECIFIED) and the
// original label is kept. The effect text is classified only to separate "reported to reduce side effects" and
// "no effect reported" from cautions; the classification is conservative (anything mixed stays a caution).

const fs = require('fs');
const path = require('path');

const input = process.argv[2];
if (!input) {
  console.error('usage: node scripts/importMedplant.cjs <medplant_interactions_long.csv>');
  process.exit(1);
}
const out = path.join(__dirname, '..', 'data', 'hdi', 'medplant-interactions.json');

/** RFC 4180 CSV parser (quoted fields, doubled quotes, newlines inside quotes) */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      if (row.some((x) => x !== '')) rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  if (field !== '' || row.length) {
    row.push(field);
    if (row.some((x) => x !== '')) rows.push(row);
  }
  return rows;
}

const SEVERITY = {
  น้อย: 'LOW',
  ต่ำ: 'LOW',
  รุนแรงน้อย: 'LOW',
  ปานกลาง: 'MODERATE',
  รุนแรงปานกลาง: 'MODERATE',
  มาก: 'HIGH',
  รุนแรงมาก: 'HIGH',
};

function classify(effect) {
  const e = effect.trim();
  if (/ขัดแย้ง|สรุปผลไม่ได้|ไม่สามารถสรุป/.test(e)) return 'CONFLICTING';
  if (/^ไม่/.test(e) && !e.includes(',')) return 'NO_EFFECT_REPORTED';
  if (/^(ลดผลข้างเคียง|ลดความเป็นพิษ|ต้านความเป็นพิษ|ลดอาการถอน)/.test(e) && !e.includes('เพิ่ม')) return 'REDUCES_SIDE_EFFECT';
  return 'CAUTION';
}

const PRECLINICAL = /in vivo|in vitro|หลอดทดลอง|สัตว์ทดลอง|หนู|กระต่าย|เซลล์|MCF-7|HSV/i;

const [header, ...data] = parseCsv(fs.readFileSync(input, 'utf8').replace(/^﻿/, ''));
const col = Object.fromEntries(header.map((h, i) => [h.trim(), i]));
for (const need of ['herb_id', 'herb_name', 'scientific_name', 'herb_synonyms', 'drug_id', 'drug_name', 'effect', 'severity', 'recommendation', 'article_id', 'article_url']) {
  if (!(need in col)) throw new Error(`missing column ${need}`);
}

const rows = data.map((r) => {
  const get = (k) => (r[col[k]] ?? '').trim();
  const url = get('article_url');
  const u = new URL(url);
  if (u.protocol !== 'https:' || u.hostname !== 'medplant.mahidol.ac.th') throw new Error(`unexpected link host: ${url}`);
  const severityRaw = get('severity');
  const effect = get('effect');
  const drug = get('drug_name');
  const rec = get('recommendation');
  return {
    id: `MP-${get('herb_id')}-${get('drug_id')}-${get('article_id')}`,
    herbId: get('herb_id'),
    herbName: get('herb_name'),
    drugId: get('drug_id'),
    drugName: drug,
    drugIsClass: drug.startsWith('กลุ่มยา'),
    effect,
    effectKind: classify(effect),
    preclinicalHint: PRECLINICAL.test(effect),
    severity: SEVERITY[severityRaw] ?? 'UNSPECIFIED',
    severityRaw,
    recommendation: rec === '-' ? '' : rec,
    articleId: get('article_id'),
    url,
  };
});

// herb details once per herb (they repeat on every CSV row)
const herbs = {};
for (const r of data) {
  const get = (k) => (r[col[k]] ?? '').trim();
  herbs[get('herb_id')] ??= {
    name: get('herb_name'),
    scientificName: get('scientific_name'),
    synonyms: get('herb_synonyms')
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean),
  };
}

const doc = {
  source: {
    name: 'ฐานข้อมูลอันตรกิริยาระหว่างสมุนไพรและยา (Herb-Drug Interaction) medplant.mahidol.ac.th คณะเภสัชศาสตร์ มหาวิทยาลัยมหิดล',
    url: 'https://medplant.mahidol.ac.th/Herb-Drug/',
    importedFrom: path.basename(input),
    importedAt: new Date().toISOString().slice(0, 10),
    reviewStatus: 'นำเข้าอัตโนมัติ รอเภสัชกร/แพทย์แผนไทยตรวจสอบก่อนใช้ตัดสินใจทางคลินิก',
    permission: 'ใช้ในต้นแบบโดยอ้างอิงและลิงก์กลับแหล่งต้นทาง อยู่ระหว่างขออนุญาตเผยแพร่จากเจ้าของข้อมูล',
  },
  herbs,
  rows,
};
fs.writeFileSync(out, JSON.stringify(doc) + '\n');
const count = (k) => rows.reduce((m, r) => ((m[r[k]] = (m[r[k]] ?? 0) + 1), m), {});
console.log(`wrote ${rows.length} rows → ${path.relative(process.cwd(), out)}`);
console.log('severity', count('severity'));
console.log('effectKind', count('effectKind'));
console.log('herbs', new Set(rows.map((r) => r.herbId)).size, 'drugs', new Set(rows.map((r) => r.drugName)).size);
