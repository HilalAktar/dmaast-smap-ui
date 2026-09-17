import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './contexts/LanguageContext';
import { ToastProvider } from './contexts/ToastContext';
import { RoleProvider } from './contexts/RoleContext';
import { AccessibilityProvider } from './contexts/AccessibilityContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CompanyProvider } from './contexts/CompanyContext';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/routing/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ValueChainDT from './pages/digital-twin/ValueChainDT';
import ManufacturingDT from './pages/digital-twin/ManufacturingDT';
import LogisticsDT from './pages/digital-twin/LogisticsDT';
import ProductDT from './pages/digital-twin/ProductDT';
import SustainabilityDT from './pages/digital-twin/SustainabilityDT';
import ValueChainSim from './pages/decision-support/ValueChainSim';
import ManufacturingSim from './pages/decision-support/ManufacturingSim';
import MODSS from './pages/decision-support/MODSS';
import DecisionKnowledgeGraph from './pages/DecisionKnowledgeGraph';
import AdminPanel from './pages/admin/AdminPanel';
import AlertCenter from './pages/AlertCenter';
import HelpCenter from './pages/HelpCenter';
import TerminologyDictionary from './pages/TerminologyDictionary';
import OnboardingTour from './components/shared/OnboardingTour';
import AdminTour from './components/shared/AdminTour';
import QuickAccess from './components/shared/QuickAccess';

/**
 * Oturum acilmadiysa giris ekrani; acildiysa kullanicinin (firma, rol)
 * baglamiyla uygulama. Isıl karari 2026-08-30.
 */
function AuthenticatedApp() {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return <Login />;
  }

  return (
    // key: kullanici degisince rol/duzen contextleri bastan kurulur
    <CompanyProvider key={currentUser.username} company={currentUser.company}>
      <RoleProvider initialRole={currentUser.role}>
        <BrowserRouter>
          {/* Admin panel disina cikamaz — turu da kendi paneline ait olan. Isıl karari 2026-08-31 */}
          {currentUser.isAdmin ? <AdminTour /> : <OnboardingTour />}
          <Routes>
            {/*
              Admin paneli — firma kapsamli, kendi disinda gezinme yok.
              isAdmin kapisi: admin olmayan bir kullanici /admin adresine
              duserse panele giremez, koke atilir. Isıl karari 2026-08-31 —
              cikis sonrasi adres /admin'de kaldigi icin bir sonraki
              (admin olmayan) kullanici panele dusuyordu.
            */}
            <Route
              path="/admin"
              element={currentUser.isAdmin ? <AdminPanel /> : <Navigate to="/" replace />}
            />

            <Route path="/" element={<Layout />}>
              <Route
                index
                element={currentUser.isAdmin ? <Navigate to="/admin" replace /> : <Dashboard />}
              />

              {/* Layer 2: Cognitive Digital Twins */}
              <Route path="digital-twin">
                <Route index element={<Navigate to="/digital-twin/value-chain" replace />} />
                <Route path="value-chain" element={<ValueChainDT />} />
                <Route path="value-chain-sim" element={<ProtectedRoute permission="canAccessCDTSimulations"><ValueChainSim /></ProtectedRoute>} />
                <Route path="manufacturing" element={<ManufacturingDT />} />
                <Route path="manufacturing-sim" element={<ProtectedRoute permission="canAccessCDTSimulations"><ManufacturingSim /></ProtectedRoute>} />
                <Route path="logistics" element={<LogisticsDT />} />
                <Route path="product" element={<ProductDT />} />
              </Route>

              {/* Layer 3: MO-DSS — Operator erisemez. Scheduling Assessment kaldirildi (Isıl, 2026-08-30) */}
              <Route path="decision-support">
                <Route index element={<Navigate to="/decision-support/mo-dss" replace />} />
                <Route path="mo-dss" element={<ProtectedRoute permission="canAccessMODSS"><MODSS /></ProtectedRoute>} />
              </Route>

              {/* Sustainability — Operator erisemez */}
              <Route path="sustainability" element={<ProtectedRoute permission="canAccessSustainability"><SustainabilityDT /></ProtectedRoute>} />

              {/* Decision Knowledge Graph — mock içerik (kullanıcı kararı 2026-09-17) */}
              <Route path="knowledge-graph" element={<DecisionKnowledgeGraph />} />

              <Route path="alerts" element={<AlertCenter />} />
              <Route path="terminology" element={<TerminologyDictionary />} />
              <Route path="help" element={<HelpCenter />} />

              {/* Backward-compatibility redirects */}
              <Route path="decision-support/value-chain-sim" element={<Navigate to="/digital-twin/value-chain-sim" replace />} />
              <Route path="decision-support/manufacturing-sim" element={<Navigate to="/digital-twin/manufacturing-sim" replace />} />
              <Route path="decision-support/scheduling" element={<Navigate to="/decision-support/mo-dss" replace />} />
              <Route path="digital-twin/sustainability" element={<Navigate to="/sustainability" replace />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <QuickAccess />
        </BrowserRouter>
      </RoleProvider>
    </CompanyProvider>
  );
}

export default function App() {
  return (
    <AccessibilityProvider>
      <LanguageProvider>
        <ToastProvider>
          <AuthProvider>
            <AuthenticatedApp />
          </AuthProvider>
        </ToastProvider>
      </LanguageProvider>
    </AccessibilityProvider>
  );
}
