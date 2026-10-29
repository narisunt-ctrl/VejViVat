import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { DisclaimerBanner } from './components/common/DisclaimerBanner';
import { Navbar } from './components/common/Navbar';
import { Sidebar } from './components/common/Sidebar';
import { PatientIntakeModal } from './components/patient/PatientIntakeModal';
import { VoiceAssistantModal } from './components/common/VoiceAssistantModal';
import { FloatingVoiceButton } from './components/common/FloatingVoiceButton';
import { MockDataService } from './services/mockDataService';
import { SyntheticCase, Vitals } from './types/patient';

// Pages
import { LandingPage } from './pages/LandingPage';
import { PatientSelectPage } from './pages/PatientSelectPage';
import { SmutthanPage } from './pages/SmutthanPage';
import { PrescribePage } from './pages/PrescribePage';
import { PrescriptionPrintPage } from './pages/PrescriptionPrintPage';
import { CarePlanPage } from './pages/CarePlanPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { InterRaterPage } from './pages/InterRaterPage';
import { AdminHdiPage } from './pages/AdminHdiPage';
import { SystemStatusPage } from './pages/SystemStatusPage';
import { PreVisitQueuePage, PreVisitDetailPage } from './pages/clinician/PreVisitQueuePage';
import { FollowUpPage } from './pages/clinician/FollowUpPage';
import { ResearchLibraryPage } from './pages/clinician/ResearchLibraryPage';
import { GuidelinesPage, GuidelineNewPage, GuidelineViewPage } from './pages/clinician/GuidelinesPage';
import { HandoverPage } from './pages/clinician/HandoverPage';
import { HolisticHubPage } from './pages/clinician/HolisticHubPage';
import { ValuePropositionPage } from './pages/clinician/ValuePropositionPage';

export const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [cases, setCases] = useState<SyntheticCase[]>(() => MockDataService.getCases());
  const [selectedCaseId, setSelectedCaseId] = useState<string>('C01');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [mobileNavOpen, setMobileNavOpen] = useState<boolean>(false);
  const [isIntakeOpen, setIsIntakeOpen] = useState<boolean>(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState<boolean>(false);

  // Close the mobile drawer whenever the route changes
  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  const currentCase = cases.find((c) => c.case_id === selectedCaseId) || cases[0];

  const handleSelectCase = (caseId: string) => {
    setSelectedCaseId(caseId);
  };

  const handleUpdateVitals = (vitals: Vitals, symptoms: string[]) => {
    MockDataService.updateCaseVitalsAndSymptoms(currentCase.case_id, vitals, symptoms);
    setCases([...MockDataService.getCases()]);
  };

  const handleSaveNewCase = (newCase: SyntheticCase) => {
    MockDataService.addCustomCase(newCase);
    const updated = MockDataService.getCases();
    setCases([...updated]);
    setSelectedCaseId(newCase.case_id);
    setIsIntakeOpen(false);
    navigate('/smutthan');
  };

  const handleDeleteCase = (caseId: string) => {
    MockDataService.deleteCase(caseId);
    const updated = MockDataService.getCases();
    setCases([...updated]);
    if (selectedCaseId === caseId) {
      setSelectedCaseId(updated[0]?.case_id || 'C01');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      {/* 1. Persistent Top Disclaimer Banner */}
      <DisclaimerBanner />

      <div className="flex-1 flex overflow-hidden">
        {/* 2. Collapsible Sidebar with VejVivat Branding & Quick Intake */}
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          mobileOpen={mobileNavOpen}
          onCloseMobile={() => setMobileNavOpen(false)}
          onOpenIntake={() => {
            setMobileNavOpen(false);
            setIsIntakeOpen(true);
          }}
          casesCount={cases.length}
        />

        {/* 3. Main Workspace Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* Top Navbar with Active Case Summary, Live Weather & New Patient CTA */}
          <Navbar
            currentCase={currentCase}
            onSelectCaseClick={() => navigate('/patients')}
            onOpenIntake={() => setIsIntakeOpen(true)}
            onOpenVoiceAssistant={() => setIsVoiceModalOpen(true)}
            onOpenMenu={() => setMobileNavOpen(true)}
          />

          {/* Page Routing */}
          <main className="flex-1 px-4 py-3 sm:p-6 pb-28 sm:pb-28">
            <Routes>
              <Route
                path="/"
                element={<LandingPage onOpenIntake={() => setIsIntakeOpen(true)} />}
              />
              <Route
                path="/patients"
                element={
                  <PatientSelectPage
                    cases={cases}
                    selectedCaseId={selectedCaseId}
                    onSelectCase={handleSelectCase}
                    onOpenIntake={() => setIsIntakeOpen(true)}
                    onDeleteCase={handleDeleteCase}
                  />
                }
              />
              <Route
                path="/smutthan"
                element={
                  <SmutthanPage
                    currentCase={currentCase}
                    onUpdateCaseVitals={handleUpdateVitals}
                  />
                }
              />
              <Route
                path="/prescribe"
                element={<PrescribePage currentCase={currentCase} />}
              />
              <Route
                path="/prescription-print"
                element={<PrescriptionPrintPage currentCase={currentCase} />}
              />
              <Route
                path="/care-plan"
                element={<CarePlanPage currentCase={currentCase} />}
              />
              <Route
                path="/analytics"
                element={<AnalyticsPage cases={cases} />}
              />
              <Route path="/inter-rater" element={<InterRaterPage />} />
              <Route path="/admin-hdi" element={<AdminHdiPage />} />
              <Route path="/status" element={<SystemStatusPage />} />
              <Route path="/clinician/previsit" element={<PreVisitQueuePage />} />
              <Route path="/clinician/previsit/:clinicId" element={<PreVisitDetailPage />} />
              <Route path="/clinician/followup" element={<FollowUpPage />} />
              <Route path="/research" element={<ResearchLibraryPage />} />
              <Route path="/guidelines" element={<GuidelinesPage />} />
              <Route path="/guidelines/new" element={<GuidelineNewPage />} />
              <Route path="/guidelines/:id" element={<GuidelineViewPage />} />
              <Route path="/clinician/handover" element={<HandoverPage />} />
              <Route path="/holistic" element={<HolisticHubPage />} />
              <Route path="/value" element={<ValuePropositionPage />} />
              <Route
                path="*"
                element={
                  <div className="py-16 text-center text-slate-600">
                    <p className="text-lg font-bold">ไม่พบหน้านี้</p>
                  </div>
                }
              />
            </Routes>
          </main>
        </div>
      </div>

      {/* 4. Global Interactive Patient Registration / Intake Modal */}
      <PatientIntakeModal
        isOpen={isIntakeOpen}
        onClose={() => setIsIntakeOpen(false)}
        onSaveCase={handleSaveNewCase}
      />

      {/* 5. Global Speech-to-Text Voice Intake Modal */}
      <VoiceAssistantModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        currentCase={currentCase}
        onApplySymptomsToCase={(newSymptoms) => {
          handleUpdateVitals(currentCase.current_encounter.vitals, newSymptoms);
          navigate('/smutthan');
        }}
      />

      {/* 6. Prominent Floating Voice AI Trigger */}
      <FloatingVoiceButton onClick={() => setIsVoiceModalOpen(true)} />
    </div>
  );
};

export default App;
