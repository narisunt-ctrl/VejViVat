import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import App from '../App';

// Patient app and partner portal load on demand so the clinician app bundle is unchanged for clinicians.
const YaiRoutes = lazy(() => import('./YaiRoutes'));
const PartnerPage = lazy(() => import('../pages/partner/PartnerDashboardPage'));

const Loading: React.FC = () => (
  <div className="flex min-h-screen items-center justify-center text-lg text-slate-600" role="status">
    กำลังโหลด…
  </div>
);

export const AppRouter: React.FC = () => (
  <Suspense fallback={<Loading />}>
    <Routes>
      <Route path="/yai/*" element={<YaiRoutes />} />
      <Route path="/partner/*" element={<PartnerPage />} />
      {/* Original clinician app keeps all of its routes and chrome */}
      <Route path="/*" element={<App />} />
    </Routes>
  </Suspense>
);
