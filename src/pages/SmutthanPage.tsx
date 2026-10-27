import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SyntheticCase, Vitals } from '../types/patient';
import { calculateSmutthan } from '../services/smutthanEngine';
import { generateClinicalExplanation } from '../services/aiExplainerService';
import { ElementRadarChart } from '../components/smutthan/ElementRadarChart';
import { ExplainableFactors } from '../components/smutthan/ExplainableFactors';
import { VitalsInputForm } from '../components/smutthan/VitalsInputForm';
import { VoiceSymptomRecorder } from '../components/common/VoiceSymptomRecorder';
import { MockDataService } from '../services/mockDataService';
import { DualDiagnosisService } from '../services/dualDiagnosisService';
import { RedFlagService, RedFlagAssessment } from '../services/redFlagService';
import { EmergencyReferralModal } from '../components/common/EmergencyReferralModal';
import {
  Compass,
  ArrowRight,
  ShieldCheck,
  Edit3,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  ArrowRightLeft,
  Stethoscope,
  BookOpen,
  ChevronDown,
  Check,
  RotateCcw,
  Siren,
  AlertTriangle,
} from 'lucide-react';

interface SmutthanPageProps {
  currentCase: SyntheticCase;
  onUpdateCaseVitals: (vitals: Vitals, symptoms: string[]) => void;
}

export const SmutthanPage: React.FC<SmutthanPageProps> = ({
  currentCase,
  onUpdateCaseVitals,
}) => {
  const navigate = useNavigate();

  // Local state for live recalculation
  const [vitals, setVitals] = useState<Vitals>({ ...currentCase.current_encounter.vitals });
  const [symptoms, setSymptoms] = useState<string[]>([...currentCase.current_encounter.symptoms]);

  // Override modal state
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [overrideElement, setOverrideElement] = useState<'earth' | 'water' | 'wind' | 'fire'>('wind');
  const [overrideNote, setOverrideNote] = useState('');
  const [hasOverridden, setHasOverridden] = useState(false);

  // AI synthesized clinical note
  const [aiNote, setAiNote] = useState<string>('');

  // Dual diagnosis live recommendation based on symptoms, chief complaint, vitals
  const dualResult = DualDiagnosisService.recommendDualDiagnosis(
    symptoms,
    currentCase.current_encounter.chief_complaint,
    vitals,
    currentCase.history_episodes?.[0]?.icd10tm_code
  );

  const [selectedDiagnosisCode, setSelectedDiagnosisCode] = useState<string>(
    currentCase.history_episodes?.[0]?.icd10tm_code || dualResult.primary.item.icd10tm_code
  );
  const [isDiagnosisManuallySelected, setIsDiagnosisManuallySelected] = useState<boolean>(false);
  const [showDifferentialDropdown, setShowDifferentialDropdown] = useState<boolean>(false);

  // Custom Editable Diagnosis State
  const [isEditingDiagnosis, setIsEditingDiagnosis] = useState<boolean>(false);
  const [customIcd10Code, setCustomIcd10Code] = useState<string>('');
  const [customIcd10Name, setCustomIcd10Name] = useState<string>('');
  const [customIcd10tmCode, setCustomIcd10tmCode] = useState<string>('');
  const [customIcd10tmName, setCustomIcd10tmName] = useState<string>('');
  const [customRationale, setCustomRationale] = useState<string>('');
  const [isCustomOverridden, setIsCustomOverridden] = useState<boolean>(false);

  // Emergency Referral Modal State & Safety Evaluation
  const [isReferralModalOpen, setIsReferralModalOpen] = useState(false);
  const safetyAssessment: RedFlagAssessment = RedFlagService.evaluatePatientSafety(
    currentCase,
    vitals,
    symptoms
  );

  useEffect(() => {
    setSelectedDiagnosisCode(
      currentCase.history_episodes?.[0]?.icd10tm_code || dualResult.primary.item.icd10tm_code
    );
    setIsDiagnosisManuallySelected(false);
    setIsCustomOverridden(false);
    setIsEditingDiagnosis(false);
  }, [currentCase.case_id]);

  const handleSelectDiagnosis = (code: string) => {
    const info = DualDiagnosisService.getDiagnosisByCode(code);
    setSelectedDiagnosisCode(info.icd10tm_code);
    setIsDiagnosisManuallySelected(true);
    setIsCustomOverridden(false);
    MockDataService.updateCaseDiagnosis(
      currentCase.case_id,
      info.icd10tm_code,
      info.icd10_conventional_code,
      info.thai_diagnosis_name
    );
  };

  const handleOpenEditDiagnosis = (currentDiag: any) => {
    setCustomIcd10Code(customIcd10Code || currentDiag.icd10_conventional_code);
    setCustomIcd10Name(customIcd10Name || currentDiag.icd10_conventional_name);
    setCustomIcd10tmCode(customIcd10tmCode || currentDiag.icd10tm_code);
    setCustomIcd10tmName(customIcd10tmName || currentDiag.thai_diagnosis_name);
    setCustomRationale(customRationale || 'แพทย์ปรับเปลี่ยนรหัสวินิจฉัยตามข้อตรวจพบทางคลินิกเฉพาะราย');
    setIsEditingDiagnosis(true);
  };

  const handleSaveCustomDiagnosis = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customIcd10Code.trim() || !customIcd10tmCode.trim()) return;

    MockDataService.updateCaseDiagnosis(
      currentCase.case_id,
      customIcd10tmCode.trim(),
      customIcd10Code.trim(),
      customIcd10tmName.trim()
    );
    setSelectedDiagnosisCode(customIcd10tmCode.trim());
    setIsCustomOverridden(true);
    setIsDiagnosisManuallySelected(true);
    setIsEditingDiagnosis(false);
  };

  const handleResetToAiDiagnosis = () => {
    const aiPrimary = dualResult.primary.item;
    setSelectedDiagnosisCode(aiPrimary.icd10tm_code);
    setIsCustomOverridden(false);
    setIsDiagnosisManuallySelected(false);
    setIsEditingDiagnosis(false);
    MockDataService.updateCaseDiagnosis(
      currentCase.case_id,
      aiPrimary.icd10tm_code,
      aiPrimary.icd10_conventional_code,
      aiPrimary.thai_diagnosis_name
    );
  };

  // Calculate Smutthan live
  const analysis = calculateSmutthan(
    currentCase.patient_info,
    vitals,
    symptoms,
    currentCase.current_encounter.ambient_context
  );

  useEffect(() => {
    generateClinicalExplanation(
      analysis,
      currentCase.current_encounter.ambient_context,
      currentCase.patient_info.age
    ).then((res: { text: string; source: 'genai' | 'template' }) => {
      setAiNote(res.text);
    });
  }, [vitals, symptoms, currentCase]);

  const handleVitalsUpdate = (newVitals: Vitals, newSymptoms: string[]) => {
    setVitals(newVitals);
    setSymptoms(newSymptoms);
    onUpdateCaseVitals(newVitals, newSymptoms);
  };

  const handleResetVitals = () => {
    const originalVitals = currentCase.current_encounter.vitals;
    const originalSymptoms = currentCase.current_encounter.symptoms;
    setVitals(originalVitals);
    setSymptoms(originalSymptoms);
    onUpdateCaseVitals(originalVitals, originalSymptoms);
  };

  const handleSaveOverride = (e: React.FormEvent) => {
    e.preventDefault();
    MockDataService.saveOverride({
      clinician_id: 'TTM-DOC-001',
      clinician_name: 'พท.ป. ผู้ตรวจรักษา',
      original_dominant: analysis.dominant_element_th,
      overridden_dominant: overrideElement,
      agreed: false,
      notes: overrideNote || 'แพทย์มีความเห็นต่างจากผลการประเมินอัตโนมัติเนื่องจากอาการเฉพาะที่',
      timestamp: new Date().toISOString(),
    });
    setHasOverridden(true);
    setIsOverrideModalOpen(false);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-4 sm:px-6">
      {/* Stepper Navigation */}
      <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-soft flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 font-bold text-brand-800 bg-brand-50 px-3 py-1 rounded-xl border border-brand-200">
            <span className="w-5 h-5 rounded-full bg-brand-700 text-white flex items-center justify-center text-[10px]">
              1
            </span>
            <span>ประเมินสมุฏฐานวินิจฉัย (Smutthan Engine)</span>
          </div>
          <span className="text-slate-300 hidden xl:inline">→</span>
          <span className="text-slate-400 hidden xl:inline">2. สั่งยาแผนไทย & ตรวจ HDI</span>
          <span className="text-slate-300 hidden xl:inline">→</span>
          <span className="text-slate-400 hidden xl:inline">3. ยืนยันใบสั่งยา & ฉลากยา</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsReferralModalOpen(true)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm cursor-pointer ${
              safetyAssessment.hasCriticalRedFlags
                ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
            }`}
            title="ส่งต่อผู้ป่วยไปยังแพทย์แผนปัจจุบัน / แผนกฉุกเฉินทันที"
          >
            <Siren className="w-4 h-4 text-rose-600 animate-bounce" />
            <span className="hidden sm:inline">ส่งต่อแพทย์แผนปัจจุบัน</span>
            <span className="sm:hidden">ส่งต่อ</span>
          </button>

          <button
            onClick={() => navigate('/prescribe')}
            className="bg-brand-700 hover:bg-brand-800 text-white font-semibold px-4 py-1.5 rounded-xl transition flex items-center gap-1.5 shadow-sm"
          >
            <span>ไปขั้นตอนสั่งยา</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Red Flag & Contraindications Safety Warning Banner */}
      {(safetyAssessment.hasCriticalRedFlags || safetyAssessment.hasWarnings) && (
        <div className={`rounded-2xl p-4 border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-sm ${
          safetyAssessment.hasCriticalRedFlags
            ? 'bg-rose-50 border-rose-300 text-rose-950'
            : 'bg-amber-50 border-amber-300 text-amber-950'
        }`}>
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-xl mt-0.5 ${safetyAssessment.hasCriticalRedFlags ? 'bg-rose-200 text-rose-800' : 'bg-amber-200 text-amber-800'}`}>
              <Siren className="w-5 h-5 animate-pulse" />
            </div>
            <div className="space-y-1">
              <span className="font-bold text-sm block">
                {safetyAssessment.hasCriticalRedFlags
                  ? 'ตรวจพบอาการรุนแรง / โรคฉุกเฉิน / ข้อห้ามการนวดไทยเด็ดขาด!'
                  : 'ตรวจพบข้อควรระวังทางการแพทย์ (Medical Precaution)'}
              </span>
              <p className="leading-relaxed">
                {safetyAssessment.procedureStatus.massageRestrictionMessage}
              </p>
              <div className="flex flex-wrap gap-2 pt-0.5">
                {safetyAssessment.alerts.map((a) => (
                  <span
                    key={a.id}
                    className="inline-flex items-center gap-1 font-bold px-2 py-0.5 bg-white/80 rounded-md border text-[11px]"
                  >
                    • {a.title}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsReferralModalOpen(true)}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition shadow-sm flex items-center justify-center gap-1.5 shrink-0 cursor-pointer self-start sm:self-center"
          >
            <Siren className="w-4 h-4 text-white" />
            <span>ออกใบส่งต่อแพทย์ด่วน</span>
          </button>
        </div>
      )}

      {/* Main Content Layout (2 Columns) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Radar Chart & Explainability */}
        <div className="xl:col-span-7 space-y-4">
          {/* Radar Chart */}
          <ElementRadarChart
            scores={analysis.scores}
            dominantElement={analysis.dominant_element}
            status={analysis.status}
          />

          {/* Clinical Dominant Result & Recommendation Card */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-soft space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  ผลการวิเคราะห์สมุฏฐานโดยสรุป
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  ธาตุที่มีแนวโน้มแปรปรวนสูงสุด: <span className="text-brand-800">{analysis.dominant_element_th}</span>
                </h3>
              </div>

              {/* Clinician Override Trigger */}
              <button
                onClick={() => setIsOverrideModalOpen(true)}
                className={`text-xs px-2.5 py-1 rounded-xl border flex items-center gap-1 transition ${
                  hasOverridden
                    ? 'bg-amber-50 text-amber-900 border-amber-300'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                <span>{hasOverridden ? 'แพทย์ Override แล้ว' : 'ปรับเปลี่ยนผล (Override)'}</span>
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200/60">
              {analysis.clinical_summary}
            </p>

            {/* Recommendations: Taste and Lifestyle */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
              <div className="p-3 bg-amber-50/60 border border-amber-200/70 rounded-xl">
                <span className="font-bold text-amber-900 block mb-1">
                  รสยาที่แนะนำเพื่อปรับสมดุล (9 Tastes):
                </span>
                <div className="flex flex-wrap gap-1">
                  {analysis.recommended_taste.map((t: string, idx: number) => (
                    <span
                      key={idx}
                      className="bg-white/80 text-amber-800 border border-amber-300/80 px-2 py-0.5 rounded text-[11px] font-medium"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-teal-50/60 border border-teal-200/70 rounded-xl">
                <span className="font-bold text-teal-900 block mb-1">
                  คำแนะนำการปฏิบัติตัว (Lifestyle Advice):
                </span>
                <ul className="list-disc list-inside text-slate-700 space-y-0.5 text-[11px]">
                  {analysis.lifestyle_advice.slice(0, 2).map((adv: string, idx: number) => (
                    <li key={idx} className="truncate">
                      {adv}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Explainable AI Rules Breakdown */}
          <ExplainableFactors
            reasons={analysis.reasons_list}
            aiExplanation={aiNote}
            isAiGenerated={false}
          />
        </div>

        {/* Right Column (5 cols): Vitals & Patient Context */}
        <div className="xl:col-span-5 space-y-4">
          {/* Spotlight Hero: AI Speech-to-Text Model */}
          <VoiceSymptomRecorder
            variant="hero"
            title="AI Speech-to-Text: รับฟังเสียงคนไข้บอกอาการ"
            subtitle="ระบบถอดเสียงภาษาไทยและสกัดคำบอกอาการ เพื่อคำนวณสมุฏฐาน 4 ธาตุสดทันที"
            onSymptomsExtracted={(extracted) => {
              if (extracted.length === 0) return;
              const combined = Array.from(new Set([...symptoms, ...extracted]));
              handleVitalsUpdate(vitals, combined);
            }}
          />

          {/* Live Editable Vitals & Symptoms Form */}
          <VitalsInputForm
            initialVitals={vitals}
            initialSymptoms={symptoms}
            chiefComplaint={currentCase.current_encounter.chief_complaint}
            onUpdate={handleVitalsUpdate}
            onReset={handleResetVitals}
          />

          {/* Dual Diagnosis (ICD-10-TM ↔ Conventional ICD-10) Card */}
          {(() => {
            const masterDiag = DualDiagnosisService.getDiagnosisByCode(selectedDiagnosisCode);
            const activeDiagInfo = isCustomOverridden && customIcd10tmCode
              ? {
                  icd10tm_code: customIcd10tmCode,
                  thai_diagnosis_name: customIcd10tmName,
                  icd10_conventional_code: customIcd10Code,
                  icd10_conventional_name: customIcd10Name,
                  category_th: 'แพทย์กำหนดเอง (Clinician Override)',
                  traditional_concept: customRationale || 'ข้อวินิจฉัยปรับปรุงโดยแพทย์ผู้รักษาตามดุลยพินิจทางคลินิก',
                  conventional_clinical_clues: 'ระบุรหัสโดยตรงผ่านระบบ Dual Diagnosis Override',
                  typical_ttm_treatment: 'ตามดุลยพินิจของแพทย์แผนไทยผู้ตรวจรักษา',
                  conventional_treatment: 'รักษาตามแนวทางเวชปฏิบัติแผนปัจจุบัน'
                }
              : masterDiag;

            const activeSuggestion = dualResult.allCandidates.find(
              (c) => c.item.icd10tm_code === masterDiag.icd10tm_code
            ) || {
              item: masterDiag,
              matchScore: 85,
              matchedKeywords: symptoms.slice(0, 3),
              confidenceLevel: 'HIGH' as const,
              clinicalRationale: {
                conventional: `ข้อบ่งชี้ทางคลินิกสอดคล้องกับกลุ่มโรค ${masterDiag.icd10_conventional_name}`,
                traditional: `สอดคล้องกับสมุฏฐาน ${masterDiag.traditional_concept}`,
              },
            };

            return (
              <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-soft space-y-3.5">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-teal-50 text-teal-700">
                      <ArrowRightLeft className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                        ระบบวินิจฉัยคู่ขนาน (Dual Diagnosis Standard)
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          Symptom-Driven ICD-10 & TM
                        </span>
                      </h4>
                      <p className="text-[10px] text-slate-500">
                        AI แนะนำ ICD-10 แผนปัจจุบันจากกลุ่มอาการ พร้อมเทียบเคียง ICD-10-TM แผนไทยคู่ขนาน (แพทย์สามารถแก้ไขรหัสได้)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                    {isCustomOverridden ? (
                      <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2.5 py-0.5 rounded-full border border-amber-300 flex items-center gap-1 shadow-2xs">
                        <Edit3 className="w-3 h-3 text-amber-700" /> แพทย์แก้ไขรหัสเอง (Override)
                      </span>
                    ) : isDiagnosisManuallySelected ? (
                      <span className="text-[10px] bg-blue-100 text-blue-900 font-bold px-2 py-0.5 rounded-full border border-blue-200 flex items-center gap-1">
                        <Check className="w-3 h-3 text-blue-700" /> แพทย์เลือกยืนยัน
                      </span>
                    ) : (
                      <span className="text-[10px] bg-teal-50 text-teal-800 font-bold px-2.5 py-0.5 rounded-full border border-teal-200 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-teal-600 animate-pulse" />
                        AI แนะนำ (ความสอดคล้อง {activeSuggestion.matchScore}%)
                      </span>
                    )}

                    {!isEditingDiagnosis && (
                      <button
                        type="button"
                        onClick={() => handleOpenEditDiagnosis(activeDiagInfo)}
                        className="text-[11px] bg-slate-100 hover:bg-teal-50 hover:text-teal-800 hover:border-teal-300 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 flex items-center gap-1 transition cursor-pointer font-medium"
                        title="คลิกเพื่อแก้ไขรหัส ICD-10 และ ICD-10-TM ด้วยตนเอง"
                      >
                        <Edit3 className="w-3 h-3 text-teal-600" />
                        <span>แก้ไขรหัส</span>
                      </button>
                    )}

                    {(isCustomOverridden || isDiagnosisManuallySelected) && !isEditingDiagnosis && (
                      <button
                        type="button"
                        onClick={handleResetToAiDiagnosis}
                        className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded-lg border border-slate-200 flex items-center gap-1 transition cursor-pointer"
                        title="คืนค่ากลับเป็นรหัสที่ AI แนะนำตามกลุ่มอาการ"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>คืนค่า AI</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline Edit Form */}
                {isEditingDiagnosis ? (
                  <form
                    onSubmit={handleSaveCustomDiagnosis}
                    className="p-4 bg-amber-50/60 border-2 border-amber-300/80 rounded-xl space-y-3.5 animate-in fade-in duration-150"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-amber-200/80">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-950">
                        <Edit3 className="w-4 h-4 text-amber-700" />
                        <span>แก้ไขรหัสวินิจฉัยคู่ขนาน (Clinician Diagnosis Override)</span>
                      </div>
                      <span className="text-[10px] text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full font-medium">
                        แพทย์สามารถปรับเปลี่ยนรหัสได้อิสระ
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {/* Left: Conventional ICD-10 Edit */}
                      <div className="bg-white p-3 rounded-lg border border-blue-200 shadow-2xs space-y-2">
                        <label className="text-[10px] font-bold text-blue-900 uppercase tracking-wide block">
                          1. รหัสโรคแผนปัจจุบันสากล (Conventional ICD-10)
                        </label>
                        <div className="space-y-1.5">
                          <div>
                            <span className="text-[10px] text-slate-500 font-medium">รหัส ICD-10:</span>
                            <input
                              type="text"
                              value={customIcd10Code}
                              onChange={(e) => setCustomIcd10Code(e.target.value.toUpperCase())}
                              placeholder="เช่น M54.5, J00, K29.7"
                              className="w-full mt-0.5 px-2.5 py-1.5 font-mono font-bold text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              required
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 font-medium">ชื่อโรคแผนปัจจุบัน:</span>
                            <input
                              type="text"
                              value={customIcd10Name}
                              onChange={(e) => setCustomIcd10Name(e.target.value)}
                              placeholder="เช่น Low back pain, Acute nasopharyngitis"
                              className="w-full mt-0.5 px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              required
                            />
                          </div>
                        </div>
                      </div>

                      {/* Right: Thai Traditional ICD-10-TM Edit */}
                      <div className="bg-white p-3 rounded-lg border border-teal-200 shadow-2xs space-y-2">
                        <label className="text-[10px] font-bold text-teal-900 uppercase tracking-wide block">
                          2. รหัสการแพทย์แผนไทย (ICD-10-TM กลุ่ม U)
                        </label>
                        <div className="space-y-1.5">
                          <div>
                            <span className="text-[10px] text-slate-500 font-medium">รหัส ICD-10-TM:</span>
                            <input
                              type="text"
                              value={customIcd10tmCode}
                              onChange={(e) => setCustomIcd10tmCode(e.target.value.toUpperCase())}
                              placeholder="เช่น U74.1, U58.0, U56.1"
                              className="w-full mt-0.5 px-2.5 py-1.5 font-mono font-bold text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                              required
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 font-medium">ชื่อการวินิจฉัยแผนไทย:</span>
                            <input
                              type="text"
                              value={customIcd10tmName}
                              onChange={(e) => setCustomIcd10tmName(e.target.value)}
                              placeholder="เช่น ลมปลายปัตฆาตสัญญาณ 4 หลัง, หวัดเพื่อวาตะ"
                              className="w-full mt-0.5 px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                              required
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Rationale Textarea */}
                    <div className="bg-white p-2.5 rounded-lg border border-amber-200 text-xs">
                      <label className="text-[10px] font-semibold text-slate-700 block mb-1">
                        เหตุผลทางคลินิกในการปรับเปลี่ยนรหัส (Clinical Rationale):
                      </label>
                      <textarea
                        value={customRationale}
                        onChange={(e) => setCustomRationale(e.target.value)}
                        rows={2}
                        placeholder="ระบุเหตุผลในการปรับรหัส เช่น อาการตรวจร่างกายเจาะจงจุดกดเจ็บ หรือผลตรวจยืนยันเฉพาะ..."
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none resize-none"
                      />
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsEditingDiagnosis(false)}
                        className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition font-medium cursor-pointer"
                      >
                        ยกเลิก
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 text-xs rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-semibold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>บันทึกการแก้ไขรหัส</span>
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    {/* Symptom Clues Matched */}
                    {activeSuggestion.matchedKeywords.length > 0 && (
                      <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-2.5 space-y-1.5">
                        <div className="text-[10px] text-slate-600 font-medium flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                            <span>อาการและข้อค้นพบที่ตรงกับเกณฑ์วินิจฉัย (Matched Findings):</span>
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono">
                            {activeSuggestion.matchedKeywords.length} ข้อบ่งชี้
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {activeSuggestion.matchedKeywords.map((kw, i) => (
                            <span
                              key={i}
                              className="text-[10px] bg-white border border-teal-200 text-teal-900 font-medium px-2 py-0.5 rounded-md shadow-2xs"
                            >
                              ✓ {kw}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Side-by-Side Dual Comparison Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {/* Left: Conventional ICD-10 */}
                      <div className="bg-gradient-to-br from-blue-50/80 to-indigo-50/40 border border-blue-200/90 rounded-xl p-3.5 space-y-2 flex flex-col justify-between">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-blue-800 font-bold uppercase tracking-wider flex items-center gap-1">
                              <Stethoscope className="w-3.5 h-3.5 text-blue-700" />
                              รหัสโรคแผนปัจจุบันสากล (Conventional ICD-10)
                            </span>
                            <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                              isCustomOverridden ? 'bg-amber-100 text-amber-800' : 'bg-blue-100/80 text-blue-800'
                            }`}>
                              {isCustomOverridden ? 'แพทย์แก้ไข' : 'แนะนำจากอาการ'}
                            </span>
                          </div>
                          <div className="font-extrabold text-blue-950 text-base font-mono tracking-tight flex items-baseline gap-2">
                            {activeDiagInfo.icd10_conventional_code}
                            <span className="text-xs font-semibold text-slate-700 font-sans truncate">
                              {activeDiagInfo.icd10_conventional_name}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 leading-relaxed">
                            <b className="text-blue-900">พยาธิสภาพ: </b>
                            {activeDiagInfo.conventional_clinical_clues || activeDiagInfo.icd10_conventional_name}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-blue-100 text-[10px] text-blue-900 bg-white/70 rounded-lg p-2 border border-blue-100/60">
                          <span className="font-semibold block text-blue-950">แนวทางการดูแลแผนปัจจุบัน:</span>
                          <span className="text-slate-600">{activeDiagInfo.conventional_treatment || 'ดูแลประคับประคองและติดตามอาการ'}</span>
                        </div>
                      </div>

                      {/* Right: Thai Traditional ICD-10-TM */}
                      <div className="bg-gradient-to-br from-teal-50/80 to-emerald-50/40 border border-teal-200/90 rounded-xl p-3.5 space-y-2 flex flex-col justify-between">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-teal-800 font-bold uppercase tracking-wider flex items-center gap-1">
                              <BookOpen className="w-3.5 h-3.5 text-teal-700" />
                              รหัสการแพทย์แผนไทย (ICD-10-TM กลุ่ม U)
                            </span>
                            <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                              isCustomOverridden ? 'bg-amber-100 text-amber-800' : 'bg-teal-100/80 text-teal-800'
                            }`}>
                              {isCustomOverridden ? 'แพทย์แก้ไข' : 'เทียบเคียงคู่ขนาน'}
                            </span>
                          </div>
                          <div className="font-extrabold text-teal-950 text-base font-mono tracking-tight flex items-baseline gap-2">
                            {activeDiagInfo.icd10tm_code}
                            <span className="text-xs font-semibold text-slate-700 font-sans truncate">
                              {activeDiagInfo.thai_diagnosis_name}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 leading-relaxed">
                            <b className="text-teal-900">แนวคิดสมุฏฐาน: </b>
                            {activeDiagInfo.traditional_concept}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-teal-100 text-[10px] text-teal-900 bg-white/70 rounded-lg p-2 border border-teal-100/60">
                          <span className="font-semibold block text-teal-950">การรักษาแผนไทย/ยาสมุนไพร:</span>
                          <span className="text-slate-600">{activeDiagInfo.typical_ttm_treatment}</span>
                        </div>
                      </div>
                    </div>

                    {/* Clinician Rationale Note Banner if Overridden */}
                    {isCustomOverridden && customRationale && (
                      <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-2.5 text-xs text-amber-900">
                        <span className="font-bold flex items-center gap-1 mb-0.5">
                          <Edit3 className="w-3 h-3 text-amber-700" /> เหตุผลการวินิจฉัยโดยแพทย์:
                        </span>
                        <p className="text-[11px] text-amber-800">{customRationale}</p>
                      </div>
                    )}
                  </>
                )}

                {/* Differential Diagnosis Selector (Human-in-the-Loop) */}
                <div className="pt-1 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-700 flex items-center gap-1">
                      <span>รหัสทางเลือกที่ใกล้เคียง (Differential Candidates):</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowDifferentialDropdown(!showDifferentialDropdown)}
                      className="text-teal-700 hover:text-teal-900 font-medium flex items-center gap-1 text-[10px] underline cursor-pointer"
                    >
                      <span>{showDifferentialDropdown ? 'ซ่อนรายการทั้งหมด' : 'ดูรหัสโรคทั้งหมด'}</span>
                      <ChevronDown className={`w-3 h-3 transition-transform ${showDifferentialDropdown ? 'rotate-180' : ''}`} />
                    </button>
                  </div>

                  {/* Quick Select Buttons for Alternative Candidates */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {dualResult.alternatives.map((alt) => {
                      const isSelected = alt.item.icd10tm_code === activeDiagInfo.icd10tm_code;
                      return (
                        <button
                          key={alt.item.icd10tm_code}
                          type="button"
                          onClick={() => handleSelectDiagnosis(alt.item.icd10tm_code)}
                          className={`text-left p-2 rounded-xl border text-[11px] transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-teal-50 border-teal-500 shadow-2xs ring-1 ring-teal-400'
                              : 'bg-white border-slate-200 hover:border-teal-300 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-slate-800 text-[10px]">
                              {alt.item.icd10_conventional_code} ↔ {alt.item.icd10tm_code}
                            </span>
                            <span className="text-[9px] text-teal-700 font-semibold">
                              {alt.matchScore}%
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-600 truncate mt-0.5">
                            {alt.item.thai_diagnosis_name}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Dropdown for All Master Diagnoses */}
                  {showDifferentialDropdown && (
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 animate-in fade-in duration-200">
                      <div className="text-[10px] font-semibold text-slate-600">
                        เลือกรหัสการวินิจฉัยคู่ขนานจากฐานข้อมูลมาตรฐาน (ICD-10 ↔ ICD-10-TM):
                      </div>
                      <select
                        value={activeDiagInfo.icd10tm_code}
                        onChange={(e) => handleSelectDiagnosis(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-sans focus:ring-1 focus:ring-teal-500 focus:outline-none"
                      >
                        {DualDiagnosisService.getMasterList().map((d) => (
                          <option key={d.icd10tm_code} value={d.icd10tm_code}>
                            [ICD-10: {d.icd10_conventional_code}] {d.icd10_conventional_name} ↔ [{d.icd10tm_code}] {d.thai_diagnosis_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Patient 5 Smutthan Factors Profile */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-soft space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-brand-700" />
                <span>องค์ประกอบสมุฏฐานทั้ง 5 ประการของผู้ป่วย</span>
              </h4>
              <span className="text-[10px] text-slate-400 font-medium">มาตรฐานเวชกรรมไทย</span>
            </div>

            <div className="space-y-2.5 text-xs divide-y divide-slate-100">
              <div className="pt-1 flex items-start justify-between gap-2">
                <div>
                  <span className="text-slate-500 block">1. ธาตุสมุฏฐาน (กำเนิด):</span>
                  <span className="text-[10px] text-brand-700 font-medium">
                    คะแนนฐาน +10 อิงวงกลมธาตุเจ้าเรือน พญ.เพ็ญนภา ทรัพย์เจริญ
                  </span>
                </div>
                <span className="font-bold text-slate-900 shrink-0">{currentCase.patient_info.birth_element}</span>
              </div>
              <div className="pt-2 flex items-center justify-between">
                <span className="text-slate-500">2. ฤตุสมุฏฐาน (ฤดูกาล):</span>
                <span className="font-semibold text-brand-800">{currentCase.current_encounter.season}</span>
              </div>
              <div className="pt-2 flex items-start justify-between gap-2">
                <div>
                  <span className="text-slate-500 block">3. กาลสมุฏฐาน (เวลา):</span>
                  <span className="text-[10px] text-slate-400">รอบละ 3 ชม. อิงตำราเวชกรรมไทย กรมฯ</span>
                </div>
                <span className="font-semibold text-slate-900 shrink-0">
                  {currentCase.current_encounter.ambient_context.kala_period}
                </span>
              </div>
              <div className="pt-2 flex items-start justify-between gap-2">
                <div>
                  <span className="text-slate-500 block">4. อายุสมุฏฐาน (ช่วงวัย):</span>
                  <span className="text-[10px] text-slate-400">
                    {currentCase.patient_info.age <= 16
                      ? 'แรกเกิด - 16 ปี'
                      : currentCase.patient_info.age <= 32
                      ? '16 - 32 ปี (โลหิตเด่น)'
                      : '32 ปีขึ้นไป'}
                  </span>
                </div>
                <span className="font-semibold text-slate-900 shrink-0">
                  {currentCase.patient_info.age <= 16
                    ? 'ปฐมวัย (อาโปธาตุ เสมหะเด่น)'
                    : currentCase.patient_info.age <= 32
                    ? 'มัชฌิมวัย (อาโปธาตุ โลหิตเด่น / เตโชธาตุ)'
                    : 'ปัจฉิมวัย (วาโยธาตุ วาตะเด่น)'}
                </span>
              </div>
              <div className="pt-2 flex items-center justify-between">
                <span className="text-slate-500">5. ประเทศสมุฏฐาน (ถิ่นที่อยู่):</span>
                <span className="font-semibold text-slate-900">{currentCase.patient_info.region} ({currentCase.patient_info.province})</span>
              </div>
            </div>
          </div>

          {/* Forward Action Card */}
          <div className="bg-gradient-to-br from-brand-700 to-teal-800 text-white rounded-2xl p-5 shadow-md space-y-3">
            <div className="font-bold text-sm">พร้อมเข้าสู่ขั้นตอนการสั่งยา & ค้นหาบัญชียาหลัก</div>
            <p className="text-xs text-brand-100 leading-relaxed">
              ผลการประเมินสมุฏฐานและรหัสวินิจฉัยคู่ขนานจะถูกส่งต่อไปยังโมดูลสั่งยา เพื่อเลือกยาสมุนไพร ตรวจสอบอันตรกิริยา (HDI Check) และค้นหาบัญชียาหลักแห่งชาติแผนปัจจุบัน 1,080 รายการ
            </p>
            <button
              onClick={() => navigate('/prescribe')}
              className="w-full bg-white text-brand-900 hover:bg-brand-50 font-bold py-2.5 px-4 rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <span>ดำเนินการสั่งยา & ค้นหาบัญชียาหลัก (Prescribing & Formulary)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Clinician Override Modal */}
      {isOverrideModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-modal">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <Edit3 className="w-5 h-5 text-brand-700" />
              <span>ปรับเปลี่ยนผลการวินิจฉัยธาตุประธาน (Clinician Override)</span>
            </div>
            <p className="text-xs text-slate-500">
              บันทึกการตัดสินใจของผู้ประกอบวิชาชีพ เพื่อความโปร่งใสและศึกษาความสอดคล้องระหว่างแพทย์กับระบบ AI (Human-in-the-loop)
            </p>

            <form onSubmit={handleSaveOverride} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  เลือกธาตุประธานที่แพทย์ประเมิน:
                </label>
                <select
                  value={overrideElement}
                  onChange={(e) => setOverrideElement(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:ring-1 focus:ring-brand-500 focus:outline-none"
                >
                  <option value="wind">วาโยธาตุ (ธาตุลม) - ลมกำเริบ</option>
                  <option value="fire">เตโชธาตุ (ธาตุไฟ) - ไฟกำเริบ</option>
                  <option value="water">อาโปธาตุ (ธาตุน้ำ) - น้ำกำเริบ</option>
                  <option value="earth">ปถวีธาตุ (ธาตุดิน) - ดินกำเริบ/หย่อน</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  ระบุเหตุผลทางคลินิกของการปรับเปลี่ยน:
                </label>
                <textarea
                  rows={3}
                  value={overrideNote}
                  onChange={(e) => setOverrideNote(e.target.value)}
                  placeholder="เช่น ผู้ป่วยมีอาการปวดกล้ามเนื้อเฉพาะที่เด่นชัดกว่าสัญญาณชีพ..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:ring-1 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsOverrideModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl text-slate-600 hover:bg-slate-100"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl font-semibold bg-brand-700 hover:bg-brand-800 text-white shadow-sm"
                >
                  บันทึกการ Override
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Emergency Referral Modal */}
      <EmergencyReferralModal
        isOpen={isReferralModalOpen}
        onClose={() => setIsReferralModalOpen(false)}
        patientCase={currentCase}
        assessment={safetyAssessment}
      />
    </div>
  );
};
