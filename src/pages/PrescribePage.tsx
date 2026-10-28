import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SyntheticCase, CurrentMedication } from '../types/patient';
import { ThaiHerbFormularyItem, PrescribedItem, DrugWarning, ConventionalDrugItem } from '../types/drug';
import { MatchedInteractionResult } from '../types/hdi';
import { MockDataService } from '../services/mockDataService';
import { checkHerbDrugInteractions } from '../services/interactionMatcher';
import { validateDosageAndSafety } from '../services/dosageValidator';
import { calculateSmutthan } from '../services/smutthanEngine';
import { HerbRecommendationService, HerbRecommendationResult } from '../services/herbRecommendationService';
import { RedFlagService, RedFlagAssessment } from '../services/redFlagService';
import { EmergencyReferralModal } from '../components/common/EmergencyReferralModal';
import { PatientActiveMeds } from '../components/prescribing/PatientActiveMeds';
import { FormularySearch } from '../components/prescribing/FormularySearch';
import { PrescriptionForm } from '../components/prescribing/PrescriptionForm';
import { InteractionAlerts } from '../components/prescribing/InteractionAlerts';
import { PrescriptionCart } from '../components/prescribing/PrescriptionCart';
import { NlemFormularyCatalog } from '../components/prescribing/NlemFormularyCatalog';
import { CareBridgePrescriptionSyncPanel } from '../components/carebridge/CareBridgePrescriptionSyncPanel';
import { KneeOAEvidencePanel } from '../components/carebridge/KneeOAEvidencePanel';
import {
  ArrowLeft,
  ArrowRight,
  Pill,
  ShieldAlert,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Compass,
  CheckCircle2,
  Check,
  Siren,
  Heart,
  Activity,
  User,
  Stethoscope,
  Clock,
  ChevronRight,
  Database,
  Layers,
  Search,
} from 'lucide-react';

interface PrescribePageProps {
  currentCase: SyntheticCase;
}

export const PrescribePage: React.FC<PrescribePageProps> = ({ currentCase }) => {
  const navigate = useNavigate();
  const formulary = MockDataService.getFormulary();

  // 1. Calculate Smutthan live to get dominant element & recommended tastes
  const smutthan = calculateSmutthan(
    currentCase.patient_info,
    currentCase.current_encounter.vitals,
    currentCase.current_encounter.symptoms,
    currentCase.current_encounter.ambient_context
  );

  // Active medications state (synced with case, allows editing/adding on Prescribe page)
  const [activeMeds, setActiveMeds] = useState<CurrentMedication[]>([...currentCase.current_medications]);
  const [isReferralModalOpen, setIsReferralModalOpen] = useState(false);
  const [activeCatalogTab, setActiveCatalogTab] = useState<'prescribe' | 'nlem'>('prescribe');

  useEffect(() => {
    setActiveMeds([...currentCase.current_medications]);
  }, [currentCase.case_id]);

  const handleUpdateActiveMeds = (newMeds: CurrentMedication[]) => {
    setActiveMeds(newMeds);
    MockDataService.updateCaseMedications(currentCase.case_id, newMeds);
  };

  const handleAddConventionalDrug = (drug: ConventionalDrugItem) => {
    if (activeMeds.some((m) => m.generic_name.toLowerCase() === drug.generic_name.toLowerCase())) return;

    const brand = Array.isArray(drug.brand_names) && drug.brand_names.length > 0
      ? drug.brand_names[0]
      : drug.generic_name;
    const form = drug.dosage_forms?.[0]?.form || drug.dosage_form || 'Tablet';
    const dose = drug.standard_regimen?.dose_mg || drug.standard_regimen?.dose_per_admin_mg || drug.strength_mg || 5.0;
    const freq = drug.standard_regimen?.frequency_per_day || 1;
    const timing = drug.standard_regimen?.timing || 'วันละ 1 ครั้ง หลังอาหาร';

    const newMed: CurrentMedication = {
      drug_id: drug.drug_id || `MED-CONV-${Date.now().toString().slice(-4)}`,
      generic_name: drug.generic_name,
      brand_name: brand,
      dosage_form: form,
      strength_mg: dose,
      dose_per_admin_mg: dose,
      frequency_per_day: freq,
      timing: timing,
      days: 30,
      calculated_daily_dose_mg: dose * freq,
      route: drug.route || 'Oral',
    };

    handleUpdateActiveMeds([...activeMeds, newMed]);
  };

  const handleRemoveConventionalDrug = (drugId: string) => {
    handleUpdateActiveMeds(activeMeds.filter((m) => m.drug_id !== drugId));
  };

  // 3. AI Herb Recommendations tailored to symptoms & element balance with live HDI
  const recommendations: HerbRecommendationResult[] = HerbRecommendationService.recommendHerbs(
    formulary,
    currentCase.current_encounter.symptoms,
    currentCase.current_encounter.chief_complaint,
    smutthan.dominant_element,
    smutthan.recommended_taste,
    activeMeds
  );

  // Find initial herb (prefer top AI recommendation, fallback to intended prescription)
  const defaultHerb =
    recommendations[0]?.herb ||
    formulary.find((h: ThaiHerbFormularyItem) => h.drug_code_24 === currentCase.intended_ttm_prescription.drug_code_24) ||
    formulary[0];

  const [selectedHerb, setSelectedHerb] = useState<ThaiHerbFormularyItem>(defaultHerb);
  const [cartItems, setCartItems] = useState<PrescribedItem[]>(() => {
    return MockDataService.getPrescriptions(currentCase.case_id);
  });

  // Real-time matched interactions for the currently focused herb
  const liveInteractions: MatchedInteractionResult[] = checkHerbDrugInteractions(
    activeMeds,
    selectedHerb.drug_code_24,
    selectedHerb.thai_name
  );

  // 4. Clinical Safety & Red Flag Evaluation
  const safetyAssessment: RedFlagAssessment = RedFlagService.evaluatePatientSafety(
    currentCase,
    currentCase.current_encounter.vitals,
    currentCase.current_encounter.symptoms,
    liveInteractions
  );

  const handleAddToCart = (newItem: Omit<PrescribedItem, 'id' | 'warnings' | 'acknowledged'>) => {
    // 1. Calculate dosage warnings
    const warnings: DrugWarning[] = validateDosageAndSafety({
      herb: newItem.herb,
      dose_per_admin: newItem.dose_per_admin,
      frequency_per_day: newItem.frequency_per_day,
      days: newItem.days,
      patient: currentCase.patient_info,
    });

    // 2. Calculate HDI warnings
    const matchedHdi = checkHerbDrugInteractions(
      activeMeds,
      newItem.herb.drug_code_24,
      newItem.herb.thai_name
    );

    matchedHdi.forEach((m: MatchedInteractionResult) => {
      warnings.push({
        type: 'INTERACTION',
        severity: m.interaction.severity_code,
        title: `อันตรกิริยากับ ${m.drug_name}`,
        message: m.interaction.clinical_effects,
        recommendation: m.interaction.recommendation,
      });
    });

    const itemWithId: PrescribedItem = {
      ...newItem,
      id: `RX-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      warnings,
      acknowledged: warnings.every((w) => w.severity !== 'HIGH'), // Auto acknowledge if not HIGH
    };

    const updatedCart = [...cartItems, itemWithId];
    setCartItems(updatedCart);
    MockDataService.savePrescription(currentCase.case_id, updatedCart);
  };

  const handleRemoveItem = (id: string) => {
    const updatedCart = cartItems.filter((i) => i.id !== id);
    setCartItems(updatedCart);
    MockDataService.savePrescription(currentCase.case_id, updatedCart);
  };

  const handleAcknowledgeItem = (id: string, reason: string) => {
    const updatedCart = cartItems.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          acknowledged: true,
          acknowledgement_reason: reason,
        };
      }
      return item;
    });
    setCartItems(updatedCart);
    MockDataService.savePrescription(currentCase.case_id, updatedCart);
  };

  const handleConfirmPrescription = () => {
    MockDataService.savePrescription(currentCase.case_id, cartItems);
    navigate('/prescription-print');
  };

  const patient = currentCase.patient_info;
  const vitals = currentCase.current_encounter.vitals;

  return (
    <div className="max-w-7xl mx-auto space-y-5 py-4 sm:px-6">
      {/* Top Navigation & Stepper */}
      <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-soft flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <button
            onClick={() => navigate('/smutthan')}
            className="flex items-center gap-1 text-slate-500 hover:text-brand-700 transition cursor-pointer font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>1. ประเมินสมุฏฐาน</span>
          </button>
          <span className="text-slate-300">→</span>
          <div className="flex items-center gap-2 font-bold text-brand-800 bg-brand-50 px-3 py-1 rounded-xl border border-brand-200">
            <span className="w-5 h-5 rounded-full bg-brand-700 text-white flex items-center justify-center text-[10px]">
              2
            </span>
            <span>สั่งยาแผนไทย & ตรวจอันตรกิริยา (Prescribing & HDI Check)</span>
          </div>
          <span className="text-slate-300 hidden md:inline">→</span>
          <span className="text-slate-400 hidden md:inline">3. ยืนยันใบสั่งยา & ฉลากยา</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Emergency Referral Button (Always accessible) */}
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

          {cartItems.length > 0 && (
            <button
              onClick={handleConfirmPrescription}
              className="bg-brand-700 hover:bg-brand-800 text-white font-semibold px-4 py-1.5 rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <span>พิมพ์ใบสั่งยา ({cartItems.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Patient Clinical Context Banner */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-soft">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          {/* Left: Patient Demographics */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-brand-50 text-brand-700 flex items-center justify-center border border-brand-200/80 font-bold shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-slate-900 text-sm">{patient.name}</span>
                <span className="font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                  HN: {patient.hn}
                </span>
                <span className="text-slate-600 font-medium text-[11px]">
                  {patient.gender} • อายุ {patient.age} ปี
                </span>
              </div>
              <div className="text-slate-500 text-[11px] mt-0.5 flex items-center gap-2 flex-wrap">
                <span>อาการสำคัญ: <b className="text-slate-800">{currentCase.current_encounter.chief_complaint}</b></span>
                <span>•</span>
                <span>ธาตุเจ้าเรือน: <b className="text-brand-700">{patient.birth_element}</b></span>
              </div>
            </div>
          </div>

          {/* Right: Vitals + Safety Status */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Vitals Snapshot */}
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 font-mono text-[11px]">
              <span className={`font-bold ${vitals.btemp >= 38.0 ? 'text-rose-600 font-extrabold' : 'text-slate-800'}`}>
                🌡️ {vitals.btemp}°C
              </span>
              <span className="text-slate-300">|</span>
              <span className={`font-bold ${vitals.sbp >= 140 ? 'text-rose-600 font-extrabold' : 'text-slate-800'}`}>
                ❤️ {vitals.sbp}/{vitals.dbp} mmHg
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-800">
                🫀 {vitals.pr} bpm
              </span>
            </div>

            {/* Safety Indicator Chip */}
            {safetyAssessment.hasCriticalRedFlags ? (
              <button
                type="button"
                onClick={() => setIsReferralModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-rose-100 text-rose-800 border border-rose-300 font-bold flex items-center gap-1.5 cursor-pointer hover:bg-rose-200 transition"
              >
                <Siren className="w-3.5 h-3.5 text-rose-600 animate-bounce" />
                <span>🚨 ข้อห้ามทำหัตถการ / สัญญาณวิกฤต</span>
              </button>
            ) : safetyAssessment.hasWarnings ? (
              <button
                type="button"
                onClick={() => setIsReferralModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-300 font-bold flex items-center gap-1.5 cursor-pointer hover:bg-amber-100 transition"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>⚠️ ข้อควรระวังพิเศษ</span>
              </button>
            ) : (
              <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>✓ ไม่พบข้อห้ามจากกฎคัดกรอง</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Critical Red Flag / Contraindication Alert Banner (When present) */}
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

      {/* Tab Switcher: 1. Prescribing & HDI vs 2. NLEM Conventional Formulary */}
      <div className="bg-white rounded-2xl p-1.5 border border-slate-200/80 shadow-soft flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-1">
          <button
            type="button"
            onClick={() => setActiveCatalogTab('prescribe')}
            className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer ${
              activeCatalogTab === 'prescribe'
                ? 'bg-brand-700 text-white shadow-sm'
                : 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Pill className="w-4 h-4 text-emerald-300" />
            <span>1. สั่งยาสมุนไพร & ตรวจอันตรกิริยา (TTM Prescribing & HDI)</span>
            {cartItems.length > 0 && (
              <span className="bg-white/20 text-white text-[10px] px-2 py-0.5 rounded-full font-mono">
                {cartItems.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveCatalogTab('nlem')}
            className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer ${
              activeCatalogTab === 'nlem'
                ? 'bg-blue-700 text-white shadow-sm'
                : 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Database className="w-4 h-4 text-blue-300" />
            <span>2. บัญชียาหลักแห่งชาติ แผนปัจจุบัน (NLEM Formulary - 1,080 รายการ)</span>
            <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full border border-blue-200 hidden md:inline">
              17 กลุ่มโรค
            </span>
          </button>
        </div>

        {/* Quick status info */}
        <div className="text-xs text-slate-500 pr-2 hidden lg:flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="font-medium">ฐานข้อมูลยาคู่ขนาน TTM & NLEM เชื่อมโยงพร้อมใช้งาน</span>
        </div>
      </div>

      {/* Main Content Area based on Active Tab */}
      {activeCatalogTab === 'nlem' ? (
        <NlemFormularyCatalog
          activeMeds={activeMeds}
          onAddMedication={handleAddConventionalDrug}
          onRemoveMedication={handleRemoveConventionalDrug}
          onSelectHerbPrescribeTab={() => setActiveCatalogTab('prescribe')}
        />
      ) : (
        /* 3-Column Clinical Prescribing Grid */
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
          {/* Column 1 (Left 3 cols): Active Medications & Chronic Diseases */}
          <div className="xl:col-span-3 space-y-4">
            <PatientActiveMeds
              patient={currentCase.patient_info}
              medications={activeMeds}
              chronicDiseases={currentCase.chronic_diseases}
              onUpdateMedications={handleUpdateActiveMeds}
              onOpenFullNlemCatalog={() => setActiveCatalogTab('nlem')}
            />
          </div>

        {/* Column 2 (Middle 5 cols): Formulary Catalog & Prescribing Form */}
        <div className="xl:col-span-5 space-y-4">
          {/* AI Recommended Herbs Spotlight Card */}
          <div className="bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 text-white rounded-2xl p-4 border border-emerald-400/30 shadow-soft space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-emerald-400/20">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs text-white flex items-center gap-1.5">
                    <span>ยาแผนไทยแนะนำตามอาการ & สมดุลธาตุ</span>
                  </h4>
                  <p className="text-[10px] text-emerald-200/80">
                    ธาตุประธาน: <b className="text-white">{smutthan.dominant_element_th}</b> • รสยาปรับสมดุล:{' '}
                    <b className="text-amber-300">{smutthan.recommended_taste.join(', ')}</b>
                  </p>
                </div>
              </div>
              <span className="text-[9px] bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                AI MATCHED
              </span>
            </div>

            {/* Top 2 Recommended Herb Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {recommendations.slice(0, 2).map((rec) => {
                const isFocused = selectedHerb.drug_code_24 === rec.herb.drug_code_24;
                return (
                  <div
                    key={rec.herb.drug_code_24}
                    className={`p-3 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                      isFocused
                        ? 'bg-teal-500/20 border-teal-400 ring-2 ring-teal-400/80 shadow-sm'
                        : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-teal-400/40'
                    }`}
                    onClick={() => setSelectedHerb(rec.herb)}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-white truncate">{rec.herb.thai_name}</span>
                        <span className="text-[10px] bg-teal-400/20 text-teal-200 border border-teal-400/40 px-1.5 py-0.2 rounded font-mono font-bold">
                          {rec.matchScore}%
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-300 line-clamp-2 leading-relaxed">
                        {rec.elementRationale}
                      </p>
                    </div>

                    <div className="pt-2.5 mt-1.5 border-t border-white/10 flex items-center justify-between text-[10px]">
                      {rec.hdiRisk === 'HIGH' ? (
                        <span className="text-rose-300 font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-rose-400" /> เสี่ยง HDI สูง
                        </span>
                      ) : rec.hdiRisk === 'MODERATE' ? (
                        <span className="text-amber-300 font-bold flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3 text-amber-400" /> เฝ้าระวัง HDI
                        </span>
                      ) : (
                        <span className="text-slate-300 font-bold flex items-center gap-1" title="ฐานข้อมูล HDI ตัวอย่างครอบคลุมจำกัด ไม่ใช่การยืนยันความปลอดภัย">
                          <ShieldCheck className="w-3 h-3 text-slate-400" /> ไม่พบในฐานข้อมูลตัวอย่าง
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedHerb(rec.herb);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                          isFocused
                            ? 'bg-teal-400 text-slate-950 shadow-xs'
                            : 'bg-white/15 hover:bg-white/25 text-white'
                        }`}
                      >
                        {isFocused ? '✓ เลือกอยู่' : 'เลือกยานี้'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Formulary Catalog Search */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-soft">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <Pill className="w-4 h-4 text-brand-700" />
                <span>บัญชียาสมุนไพรและยาแผนไทย (Formulary)</span>
              </div>
              <span className="text-[11px] font-mono text-slate-500">
                มาตรฐาน พ.ศ. 2568
              </span>
            </div>
            <FormularySearch
              formulary={formulary}
              selectedHerb={selectedHerb}
              onSelectHerb={setSelectedHerb}
              recommendations={recommendations}
            />
          </div>

          {/* Selected Herb Prescribing Form */}
          <PrescriptionForm
            herb={selectedHerb}
            patient={currentCase.patient_info}
            onAddToCart={handleAddToCart}
          />
        </div>

        {/* Column 3 (Right 4 cols): Real-Time HDI Alerts & Prescription Cart */}
        <div className="xl:col-span-4 space-y-4">
          {/* Live Alerts for Currently Selected Herb */}
          <InteractionAlerts interactions={liveInteractions} />

          {/* Prescription Cart Basket */}
          <PrescriptionCart
            items={cartItems}
            onRemoveItem={handleRemoveItem}
            onAcknowledgeItem={handleAcknowledgeItem}
            onConfirmPrescription={handleConfirmPrescription}
          />
        </div>
      </div>
      )}

      {/* CareBridge → ยายพร้อม: explicit approval, dispense and schedule steps (synthetic demo) */}
      <div className="grid gap-4 xl:grid-cols-2">
        <CareBridgePrescriptionSyncPanel currentCase={currentCase} cartItems={cartItems} />
        <KneeOAEvidencePanel currentCase={currentCase} />
      </div>

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
