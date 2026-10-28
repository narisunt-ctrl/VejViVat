import React, { useState } from 'react';
import { BookOpen, ExternalLink, Plus, Search, Trash2 } from 'lucide-react';
import { isCitationLink, RESEARCH_TOPICS, ResearchTopicId, reviewedPapers, ReviewedPaper, searchLinks, TEAM_REFERENCES } from '../../data/carebridge/research';

// Research library for clinicians: live search links for new papers, the teammate's claims awaiting verification,
// and papers a clinician has read and recorded. The system never summarises efficacy or recommends a treatment.

const EMPTY = { title: '', year: '', link: '', design: '', sampleSize: '', finding: '', limitations: '', reviewer: '' };

export const ResearchLibraryPage: React.FC = () => {
  const [topic, setTopic] = useState<ResearchTopicId>('KNEE_OA');
  const [papers, setPapers] = useState<ReviewedPaper[]>(() => reviewedPapers.list());
  const [form, setForm] = useState(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const t = RESEARCH_TOPICS.find((x) => x.id === topic)!;
  const refs = TEAM_REFERENCES.filter((r) => r.topic === topic);
  const mine = papers.filter((p) => p.topic === topic);
  const valid = form.title.trim() && form.reviewer.trim() && isCitationLink(form.link) && form.finding.trim();

  return (
    <div className="mx-auto max-w-5xl space-y-4 py-4 sm:px-6">
      <header>
        <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900">
          <BookOpen className="h-6 w-6 text-brand-700" /> คลังงานวิจัยประกอบการตัดสินใจ
        </h1>
        <p className="text-sm text-slate-600">ค้นงานวิจัยใหม่จากฐานข้อมูลจริง ดูข้อความที่ยังรอตรวจ และบันทึกงานที่แพทย์อ่านแล้ว · ระบบไม่สรุปผลการรักษาหรือแนะนำยาเอง</p>
      </header>

      <div className="flex flex-wrap gap-2" role="tablist">
        {RESEARCH_TOPICS.map((x) => (
          <button
            key={x.id}
            type="button"
            role="tab"
            aria-selected={topic === x.id}
            onClick={() => setTopic(x.id)}
            className={`min-h-[40px] rounded-full border px-4 text-sm font-semibold ${topic === x.id ? 'border-brand-700 bg-brand-700 text-white' : 'border-slate-300 bg-white text-slate-700'}`}
          >
            {x.title}
          </button>
        ))}
      </div>
      <p className="text-sm text-slate-600">{t.why}</p>

      <section className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
          <Search className="h-5 w-5 text-brand-700" /> ค้นงานวิจัยใหม่ (เปิดฐานข้อมูลจริงในแท็บใหม่)
        </h2>
        <ul className="space-y-2">
          {t.queries.map((q) => (
            <li key={q} className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-mono text-slate-700">"{q}"</span>
              {searchLinks(q).map((l) => (
                <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-brand-700 hover:bg-slate-50">
                  {l.label} <ExternalLink className="h-3 w-3" />
                </a>
              ))}
            </li>
          ))}
        </ul>
        <p className="text-xs text-slate-500">ผลค้นหามาจากฐานข้อมูลภายนอกโดยตรง ระบบนี้ไม่ได้คัดกรองหรือรับรองคุณภาพ ต้องอ่านต้นฉบับเสมอ</p>
      </section>

      <section className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold text-slate-900">งานที่แพทย์อ่านและบันทึกแล้ว</h2>
          <button type="button" onClick={() => setShowForm((s) => !s)} className="flex min-h-[40px] items-center gap-1.5 rounded-xl bg-brand-700 px-3 text-sm font-bold text-white">
            <Plus className="h-4 w-4" /> บันทึกงานวิจัยที่อ่านแล้ว
          </button>
        </div>
        {showForm && (
          <div className="grid gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-2">
            {(
              [
                ['title', 'ชื่อเรื่อง *'],
                ['year', 'ปี'],
                ['link', 'ลิงก์หรือ DOI * (เช่น https://… หรือ 10.xxxx/…)'],
                ['design', 'รูปแบบการศึกษา (เช่น RCT)'],
                ['sampleSize', 'จำนวนผู้เข้าร่วม'],
                ['reviewer', 'ผู้อ่าน/ตรวจ *'],
              ] as [keyof typeof EMPTY, string][]
            ).map(([k, label]) => (
              <label key={k} className="text-sm">
                <span className="font-semibold text-slate-700">{label}</span>
                <input className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
              </label>
            ))}
            <label className="text-sm sm:col-span-2">
              <span className="font-semibold text-slate-700">ผลที่พบ (สรุปด้วยตนเองจากต้นฉบับ) *</span>
              <textarea className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5" value={form.finding} onChange={(e) => setForm({ ...form, finding: e.target.value })} />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="font-semibold text-slate-700">ข้อจำกัด</span>
              <textarea className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5" value={form.limitations} onChange={(e) => setForm({ ...form, limitations: e.target.value })} />
            </label>
            <div className="flex items-center gap-2 sm:col-span-2">
              <button
                type="button"
                disabled={!valid}
                onClick={() => {
                  reviewedPapers.add({ ...form, topic });
                  setPapers(reviewedPapers.list());
                  setForm(EMPTY);
                  setShowForm(false);
                }}
                className="min-h-[40px] rounded-xl bg-brand-700 px-4 text-sm font-bold text-white disabled:opacity-40"
              >
                บันทึก
              </button>
              {form.link && !isCitationLink(form.link) && <span className="text-xs text-rose-700">ลิงก์ต้องขึ้นต้นด้วย http(s):// หรือเป็น DOI</span>}
            </div>
          </div>
        )}
        {mine.length === 0 ? (
          <p className="text-sm text-slate-600">ยังไม่มีงานที่บันทึกในหัวข้อนี้</p>
        ) : (
          <ul className="space-y-2">
            {mine.map((p) => (
              <li key={p.id} className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <a href={/^10\./.test(p.link) ? `https://doi.org/${p.link}` : p.link} target="_blank" rel="noreferrer" className="font-bold text-brand-800 underline">
                    {p.title} {p.year && `(${p.year})`}
                  </a>
                  <button type="button" onClick={() => (reviewedPapers.remove(p.id), setPapers(reviewedPapers.list()))} aria-label="ลบ" className="text-slate-400 hover:text-rose-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-xs text-slate-600">
                  {p.design || 'ไม่ระบุรูปแบบ'} · n={p.sampleSize || '-'} · อ่านโดย {p.reviewer} · {new Date(p.reviewedAt).toLocaleDateString('th-TH')}
                </p>
                <p className="mt-1">{p.finding}</p>
                {p.limitations && <p className="text-xs text-slate-600">ข้อจำกัด: {p.limitations}</p>}
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-slate-500">บันทึกเก็บในเบราว์เซอร์นี้เท่านั้น (เดโม) ยังไม่มีการทบทวนโดยคณะกรรมการ</p>
      </section>

      <section className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="text-base font-bold text-slate-900">ข้อความจากเพื่อนร่วมทีมที่ยังรอตรวจแหล่งอ้างอิง</h2>
        {refs.length === 0 ? (
          <p className="text-sm text-slate-600">ไม่มีในหัวข้อนี้</p>
        ) : (
          <ul className="space-y-2">
            {refs.map((r) => (
              <li key={r.reference_id} className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-sm">
                <p>
                  <span className="mr-2 font-mono text-xs text-slate-500">{r.reference_id}</span>
                  {r.original_claim}
                </p>
                <p className="mt-1 text-xs text-slate-600">ข้อจำกัด: {r.clinical_limitations}</p>
                <p className="text-xs font-semibold text-amber-700">สถานะ: รอตรวจแหล่งอ้างอิง (ยังไม่มี DOI/PMID ที่ยืนยัน ห้ามใช้เป็นหลักฐาน)</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};
