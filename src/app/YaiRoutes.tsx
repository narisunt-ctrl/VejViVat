import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { YaiShell } from './YaiShell';
import { YaiHomePage } from '../pages/yai/YaiHomePage';
import { OnboardingPage } from '../pages/yai/OnboardingPage';
import { ScanPage } from '../pages/yai/ScanPage';
import { ScanReviewPage } from '../pages/yai/ScanReviewPage';
import { MedicinesPage } from '../pages/yai/MedicinesPage';
import { MedicinePassportPage } from '../pages/yai/MedicinePassportPage';
import { RemindersPage } from '../pages/yai/RemindersPage';
import { ClinicsPage } from '../pages/yai/ClinicsPage';
import { ClinicDetailPage } from '../pages/yai/ClinicDetailPage';
import { AppointmentsPage } from '../pages/yai/AppointmentsPage';
import { PreVisitPage } from '../pages/yai/PreVisitPage';
import { FamilyPage } from '../pages/yai/FamilyPage';
import { HelpPage } from '../pages/yai/HelpPage';
import { SettingsPage } from '../pages/yai/SettingsPage';
import { JournalProcessPage } from '../pages/yai/JournalProcessPage';
import { JournalReviewPage } from '../pages/yai/JournalReviewPage';
import { JournalHistoryPage } from '../pages/yai/JournalHistoryPage';
import { EvidencePassportPage } from '../pages/yai/EvidencePassportPage';
import { FoodPage } from '../pages/yai/FoodPage';
import { HealthRecordPage } from '../pages/yai/HealthRecordPage';
import { LeaderboardPage } from '../pages/yai/LeaderboardPage';
import { HerbReviewsPage } from '../pages/yai/HerbReviewsPage';
import { AskDoctorPage } from '../pages/yai/AskDoctorPage';
import { ProfilePage } from '../pages/yai/ProfilePage';
import { ExercisePage } from '../pages/yai/ExercisePage';

const NotFound: React.FC = () => (
  <div className="space-y-4 py-10 text-center">
    <p className="text-2xl font-bold">ไม่พบหน้านี้</p>
    <Link to="/yai" className="text-lg font-semibold text-yai-deep underline">
      กลับหน้าแรก
    </Link>
  </div>
);

const YaiRoutes: React.FC = () => (
  <Routes>
    <Route element={<YaiShell />}>
      <Route index element={<YaiHomePage />} />
      <Route path="onboarding" element={<OnboardingPage />} />
      <Route path="scan" element={<ScanPage />} />
      <Route path="scan/review" element={<ScanReviewPage />} />
      <Route path="medicines" element={<MedicinesPage />} />
      <Route path="medicines/:id" element={<MedicinePassportPage />} />
      <Route path="reminders" element={<RemindersPage />} />
      <Route path="clinics" element={<ClinicsPage />} />
      <Route path="clinics/:id" element={<ClinicDetailPage />} />
      <Route path="appointments" element={<AppointmentsPage />} />
      <Route path="previsit" element={<PreVisitPage />} />
      <Route path="family" element={<FamilyPage />} />
      <Route path="help" element={<HelpPage />} />
      <Route path="settings" element={<SettingsPage />} />
      <Route path="journal/process" element={<JournalProcessPage />} />
      <Route path="journal/review" element={<JournalReviewPage />} />
      <Route path="journal/history" element={<JournalHistoryPage />} />
      <Route path="passport" element={<EvidencePassportPage />} />
      <Route path="food" element={<FoodPage />} />
      <Route path="health" element={<HealthRecordPage />} />
      <Route path="leaderboard" element={<LeaderboardPage />} />
      <Route path="herb-reviews" element={<HerbReviewsPage />} />
      <Route path="ask" element={<AskDoctorPage />} />
      <Route path="profile" element={<ProfilePage />} />
      <Route path="exercise" element={<ExercisePage />} />
      <Route path="*" element={<NotFound />} />
    </Route>
  </Routes>
);

export default YaiRoutes;
