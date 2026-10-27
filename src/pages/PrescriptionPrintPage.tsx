import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SyntheticCase } from '../types/patient';
import { PrescribedItem } from '../types/drug';
import { MockDataService } from '../services/mockDataService';
import { convertToFhirMedicationRequest } from '../adapters/fhirStubAdapter';
import { FeedbackModal } from '../components/feedback/FeedbackModal';
import {
  Printer,
  Download,
  ArrowLeft,
  CheckCircle2,
  FileText,
  AlertTriangle,
  HeartHandshake,
  MessageSquare,
  ShieldCheck,
  Share2,
  CalendarClock,
  ArrowRight,
} from 'lucide-react';
import teamLogo from '@/assets/team-logo.png';

interface PrescriptionPrintPageProps {
  currentCase: SyntheticCase;
}

export const PrescriptionPrintPage: React.FC<PrescriptionPrintPageProps> = ({
  currentCase,
}) => {
  const navigate = useNavigate();
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  const items: PrescribedItem[] = MockDataService.getPrescriptions(currentCase.case_id);
  const p = currentCase.patient_info;
  const enc = currentCase.current_encounter;

  const totalCost = items.reduce(
    (sum, i) => sum + i.total_quantity * i.herb.unit_price_thb,
    0
  );

  const handlePrint = () => {
    window.print();
  };

  const handleExportHisDrugOpdJson = () => {
    const hisPayload = {
      HOSPCODE: '11400',
      PID: p.hn,
      SEQ: enc.vn,
      DATE_SERV: enc.date,
      PRESCRIPTION_ITEMS: items.map((i) => ({
        DCODE: i.herb.drug_code_24,
        TTMT_ID: i.herb.ttmt_id,
        DNAME: `${i.herb.thai_name} (${i.herb.strength_per_unit})`,
        AMOUNT: i.total_quantity,
        UNIT: i.herb.unit,
        UNIT_PRICE: i.herb.unit_price_thb,
        TOTAL_PRICE: i.total_quantity * i.herb.unit_price_thb,
        DRUG_TYPE: '2', // ยาแผนไทย
        USAGE_INSTRUCTION: i.instructions,
        REASON_ICD10TM: i.reason_icd10tm || 'U60.10',
        WARNINGS_ACKNOWLEDGED: i.acknowledged,
        ACK_REASON: i.acknowledgement_reason || 'ไม่มี',
      })),
      _metadata: {
        disclaimer: 'ข้อมูลสังเคราะห์เพื่อการสาธิต (Synthetic Demonstration Data)',
        export_time: new Date().toISOString(),
        source: 'TTM Smutthan Engine Platform',
      },
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(hisPayload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `DRUG_OPD_${p.hn}_${enc.vn}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExportFhir = () => {
    const fhirBundle = {
      resourceType: 'Bundle',
      type: 'collection',
      entry: items.map((item) => ({
        resource: convertToFhirMedicationRequest(p, item),
      })),
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(fhirBundle, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `FHIR_MedicationRequest_${p.hn}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-4 sm:px-6">
      {/* Top Action Bar (hidden when printing) */}
      <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-soft flex flex-wrap items-center justify-between gap-3 text-xs no-print">
        <button
          onClick={() => navigate('/prescribe')}
          className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 transition font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>กลับไปแก้ไขการสั่งยา</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsFeedbackOpen(true)}
            className="flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-semibold px-3 py-1.5 rounded-xl transition shadow-sm"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>ประเมินความพึงพอใจ (Feedback)</span>
          </button>

          <button
            onClick={handleExportHisDrugOpdJson}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-3 py-1.5 rounded-xl transition"
            title="ส่งออกไฟล์ DRUG_OPD 43 แฟ้ม"
          >
            <Download className="w-3.5 h-3.5" />
            <span>ส่งออก 43 แฟ้ม JSON</span>
          </button>

          <button
            onClick={handleExportFhir}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-3 py-1.5 rounded-xl transition"
            title="ส่งออกไฟล์ FHIR R4 MedicationRequest"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>FHIR JSON</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold px-3.5 py-1.5 rounded-xl transition shadow-sm"
          >
            <Printer className="w-4 h-4" />
            <span>พิมพ์ใบสั่งยา / ฉลากยา</span>
          </button>

          <button
            onClick={() => navigate('/care-plan')}
            className="flex items-center gap-1.5 bg-gradient-to-r from-brand-700 to-teal-700 hover:from-brand-800 hover:to-teal-800 text-white font-bold px-4 py-1.5 rounded-xl transition shadow-md group"
          >
            <CalendarClock className="w-4 h-4 text-amber-300" />
            <span>แผนการรักษา & ตารางติดตามผล</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
          </button>
        </div>
      </div>

      {/* Official Prescription Printable Sheet */}
      <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-soft space-y-6 print-card text-xs text-slate-800">
        {/* Prescription Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4 gap-4">
          <div className="w-14 h-14 rounded-xl bg-slate-950 p-1 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-xs">
            <img src={teamLogo} alt="VejVivat Crest" className="w-full h-full object-contain" />
          </div>
          <div className="text-center flex-1 space-y-1">
            <div className="text-base font-bold text-slate-900 tracking-tight">
              หน่วยบริการการแพทย์แผนไทยและแพทย์ทางเลือก • ทีม VejVivat (เวชวิวัฒน์)
            </div>
            <div className="text-slate-600 font-medium">
              ใบสั่งยาและบันทึกการรักษาเวชกรรมไทย (TTM Prescription & Clinical Note)
            </div>
            <div className="text-[10px] text-amber-800 bg-amber-50 inline-block px-3 py-0.5 rounded-full border border-amber-200 uppercase font-semibold">
              TTM Hackathon 2026 • VejVivat Thai Medicine AI Platform
            </div>
          </div>
          <div className="hidden sm:block w-14 shrink-0 text-right text-[10px] text-slate-400 font-mono">
            <div>FORM: TTM-2569</div>
            <div>VER: 1.4-MVP</div>
          </div>
        </div>

        {/* Patient Details & Vitals Box */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
          <div>
            <span className="text-slate-500 block text-[11px]">รหัสประจำตัว (HN):</span>
            <span className="font-bold text-slate-900 font-mono text-sm">{p.hn}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px]">ชื่อ-นามสกุล:</span>
            <span className="font-bold text-slate-900">{p.name}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px]">เพศ / อายุ:</span>
            <span className="font-medium text-slate-900">{p.gender} / {p.age} ปี</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px]">วันที่ตรวจ:</span>
            <span className="font-medium text-slate-900">{enc.date} ({enc.time})</span>
          </div>
          <div className="col-span-2">
            <span className="text-slate-500 block text-[11px]">อาการสำคัญ (Chief Complaint):</span>
            <span className="text-slate-900">{enc.chief_complaint}</span>
          </div>
          <div className="col-span-2">
            <span className="text-slate-500 block text-[11px]">สัญญาณชีพ:</span>
            <span className="text-slate-900">
              BTEMP {enc.vitals.btemp}°C | BP {enc.vitals.sbp}/{enc.vitals.dbp} mmHg | PR {enc.vitals.pr} bpm
            </span>
          </div>
        </div>

        {/* Dual Diagnosis (ICD-10-TM ↔ Conventional ICD-10) */}
        {(() => {
          const diagCode = items[0]?.reason_icd10tm || currentCase.history_episodes?.[0]?.icd10tm_code || 'U60.10';
          const diagInfo = MockDataService.getDiagnosisCrosswalk(diagCode);
          return (
            <div className="bg-teal-50/60 border border-teal-200/80 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center justify-between border-b border-teal-100 pb-1.5">
                <span className="font-bold text-teal-950 text-xs">
                  การวินิจฉัยโรคระบบคู่ขนาน (Dual Diagnosis Standard):
                </span>
                <span className="text-[10px] bg-teal-100 text-teal-800 px-2 py-0.5 rounded font-medium border border-teal-200">
                  อิงคู่มือเทียบโรค DTAM มี.ค. 2568
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 bg-white/80 rounded-xl border border-teal-200">
                  <span className="text-teal-800 text-[10px] font-semibold block uppercase">
                    รหัสโรคการแพทย์แผนไทย (ICD-10-TM)
                  </span>
                  <span className="font-bold text-teal-950 font-mono text-sm block">
                    {diagInfo.icd10tm_code}
                  </span>
                  <span className="text-slate-800 font-medium text-[11px]">
                    {diagInfo.thai_diagnosis_name}
                  </span>
                </div>
                <div className="p-2.5 bg-white/80 rounded-xl border border-blue-200">
                  <span className="text-blue-800 text-[10px] font-semibold block uppercase">
                    รหัสโรคแผนปัจจุบันสากล (Conventional ICD-10)
                  </span>
                  <span className="font-bold text-blue-950 font-mono text-sm block">
                    {diagInfo.icd10_conventional_code}
                  </span>
                  <span className="text-slate-800 font-medium text-[11px]">
                    {diagInfo.icd10_conventional_name}
                  </span>
                </div>
              </div>
              <div className="text-[10px] text-slate-600 bg-white/70 p-2 rounded-xl border border-teal-100/80">
                <b className="text-teal-950">แนวคิดสมุฏฐานเวชกรรมไทย:</b> {diagInfo.traditional_concept}
              </div>
            </div>
          );
        })()}

        {/* Prescribed Items Table */}
        <div className="space-y-2">
          <div className="font-bold text-slate-900 text-sm">รายการยาสมุนไพรที่สั่งจ่าย (Rx):</div>
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">ลำดับ</th>
                  <th className="py-2.5 px-3 font-semibold">ชื่อยาแผนไทย / รหัสยา 24 หลัก</th>
                  <th className="py-2.5 px-3 font-semibold">วิธีใช้ (Instructions)</th>
                  <th className="py-2.5 px-3 font-semibold text-center">จำนวน</th>
                  <th className="py-2.5 px-3 font-semibold text-right">ราคา (บาท)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-slate-400">
                      ไม่มีรายการยาที่สั่งจ่าย
                    </td>
                  </tr>
                ) : (
                  items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 text-slate-500 font-mono">{idx + 1}</td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">{item.herb.thai_name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {item.herb.drug_code_24} ({item.herb.strength_per_unit})
                        </div>
                        {item.warnings.length > 0 && (
                          <div className="text-[10px] text-amber-700 mt-0.5">
                            ⚠ คำเตือนที่แพทย์รับทราบ: {item.warnings[0].title}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">{item.instructions}</td>
                      <td className="py-2.5 px-3 text-center font-mono font-medium">
                        {item.total_quantity} {item.herb.unit}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-medium">
                        ฿{(item.total_quantity * item.herb.unit_price_thb).toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                <tr>
                  <td colSpan={4} className="py-2.5 px-3 text-right">
                    รวมทั้งสิ้น:
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-sm text-slate-900">
                    ฿{totalCost.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Medicine Labels (ฉลากยาสำหรับติดซอง) */}
        <div className="space-y-3 pt-2">
          <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-brand-700" />
            <span>ฉลากยาสำหรับติดซองยา (Medication Dispensing Labels):</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {items.map((item, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/60 space-y-1.5"
              >
                <div className="flex items-center justify-between border-b border-slate-200 pb-1 text-[11px]">
                  <span className="font-bold text-slate-900">รพ.ตัวอย่าง (เวชกรรมไทย)</span>
                  <span className="font-mono text-slate-500">HN: {p.hn}</span>
                </div>
                <div className="font-bold text-xs text-brand-900">{item.herb.thai_name}</div>
                <div className="text-[11px] text-slate-700 leading-snug">
                  <b>วิธีใช้:</b> {item.instructions}
                </div>
                <div className="text-[10px] text-rose-700 bg-rose-50 p-1 rounded font-medium">
                  <b>คำเตือน:</b> {item.herb.precautions.drug_interactions || 'เก็บในที่แห้ง พ้นแสงแดด'}
                </div>
                <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-200">
                  <span>ผู้ป่วย: {p.name}</span>
                  <span>จ่าย: {item.total_quantity} {item.herb.unit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Two-Key Safety Audit Trail (if warnings present) */}
        {items.some((i) => i.warnings.length > 0) && (
          <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 space-y-2 text-xs">
            <div className="flex items-center justify-between border-b border-amber-200/60 pb-1.5">
              <span className="font-bold text-amber-950 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-700" />
                <span>บันทึกการตรวจสอบความปลอดภัยทางคลินิก (Safety Audit Trail - Two-Key Protocol)</span>
              </span>
              <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold">
                MOPH Audit Logged
              </span>
            </div>
            <div className="space-y-1.5 text-[11px]">
              {items
                .filter((i) => i.warnings.length > 0)
                .map((it, idx) => (
                  <div key={idx} className="bg-white/80 p-2.5 rounded-xl border border-amber-200/80 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{it.herb.thai_name}: {it.warnings[0]?.title}</span>
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                        [ส่งต่อเภสัชกร Double Check ในระบบ HIS: Two-Key Protocol]
                      </span>
                    </div>
                    {it.acknowledgement_reason && (
                      <div className="text-slate-600">
                        <b>เหตุผลทางคลินิกของแพทย์:</b> "{it.acknowledgement_reason}"
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Doctor & Pharmacist Dual Signatures & Disclaimer */}
        <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div className="max-w-xs text-[10px] text-slate-500 leading-relaxed">
            <b>Disclaimer:</b> เอกสารนี้สร้างขึ้นจากระบบ Decision Support ข้อมูลทั้งหมดเป็นข้อมูลสังเคราะห์เพื่อการสาธิตในโครงการ Hackathon 2026 มิใช่การสั่งยาจริงสำหรับผู้ป่วยจริง
          </div>

          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 text-center sm:text-right">
            {/* Pharmacist Counter-signature */}
            <div className="space-y-1">
              <div className="h-10 w-40 border-b border-slate-300 mx-auto sm:ml-auto"></div>
              <div className="font-semibold text-slate-900 text-xs">ภก. ธนภัทร สุขสมบูรณ์</div>
              <div className="text-[10px] text-slate-500">เภสัชกรผู้ตรวจสอบความปลอดภัย (ภ. 23891)</div>
              <div className="text-[9px] text-emerald-700 font-medium">✓ Two-Key Counter-Checked</div>
            </div>

            {/* Doctor Signature */}
            <div className="space-y-1">
              <div className="h-10 w-40 border-b border-slate-300 mx-auto sm:ml-auto"></div>
              <div className="font-semibold text-slate-900 text-xs">พท.ป. ศิริพร พงษ์ไพจิตร</div>
              <div className="text-[10px] text-slate-500">แพทย์แผนไทยประยุกต์ (ว.พท.ป. 4512)</div>
              <div className="text-[9px] text-brand-700 font-medium">ผู้ตรวจรักษาและสั่งใช้ยา</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation Next Step Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-soft flex flex-col sm:flex-row items-center justify-between gap-3 no-print">
        <button
          onClick={() => navigate('/prescribe')}
          className="text-xs text-slate-600 hover:text-slate-900 font-semibold flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>ย้อนกลับ: สั่งยาแผนไทย & ตรวจ HDI</span>
        </button>

        <button
          onClick={() => navigate('/care-plan')}
          className="bg-gradient-to-r from-brand-700 to-teal-700 hover:from-brand-800 hover:to-teal-800 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-md flex items-center gap-2 group transition"
        >
          <CalendarClock className="w-4 h-4 text-amber-300" />
          <span>ขั้นตอนถัดไป: แผนการรักษา & ตารางติดตามผลรายบุคคล (Care Plan & Follow-up)</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
        </button>
      </div>

      {/* Clinician Feedback Modal */}
      <FeedbackModal
        isOpen={isFeedbackOpen}
        caseId={currentCase.case_id}
        onClose={() => setIsFeedbackOpen(false)}
      />
    </div>
  );
};
