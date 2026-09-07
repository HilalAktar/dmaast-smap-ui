import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './contexts/LanguageContext';
import { ToastProvider } from './contexts/ToastContext';
import { RoleProvider } from './contexts/RoleContext';
import { AccessibilityProvider } from './contexts/AccessibilityContext';
import { AuthProvider, useAuth, isGlobalAdmin } from './contexts/AuthContext';
import type { DemoUser } from './contexts/AuthContext';
import {
  CompanyProvider,
  ActiveCompanyProvider,
  useActiveCompany,
} from './contexts/CompanyContext';
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
    // Aktif firma katmani CompanyProvider'in USTUNDE durur: firma degistiginde
    // asagisi bastan kurulmali. key: kullanici degisince secim de sifirlanir.
    <ActiveCompanyProvider
      key={currentUser.username}
      username={currentUser.username}
      initialCompany={currentUser.company}
      canSwitch={isGlobalAdmin(currentUser)}
    >
      <CompanyScopedApp user={currentUser} />
    </ActiveCompanyProvider>
  );
}

function CompanyScopedApp({ user }: { user: DemoUser }) {
  const { activeCompany } = useActiveCompany();

  // 🔴 Kapi `scope === 'global'`, `isAdmin` DEGIL. isAdmin uzerinden acilan
  // her istisna kam.admin ve jpb.admin'i de kapsar ve Isıl'in 2026-08-31
  // kararini (admin kendi panelinin disina cikamaz) deler.
  const isSuper = isGlobalAdmin(user);

  return (
    // key'e aktif firma da girer: firma degisince rol/duzen contextleri ve
    // sayfalar yeni firmanin kartlariyla bastan cizilir.
    <CompanyProvider key={`${user.username}:${activeCompany}`} company={activeCompany}>
      <RoleProvider initialRole={user.role}>
        <BrowserRouter>
          {/*
            Tur, kullanicinin DUSTUGU yere gore secilir.
            Super admin de artik panelde basladigi icin panel turunu gorur
            (Isıl karari 2026-09-07). Director'in "OnboardingTour" secimi
            "dashboard'a duser" varsayimina dayaniyordu — o varsayim degisti.
            Kodda turu elle yeniden baslatan tetik yok (tek cagri yeri burasi).
          */}
          {user.isAdmin ? <AdminTour /> : <OnboardingTour />}
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
              element={user.isAdmin ? <AdminPanel /> : <Navigate to="/" replace />}
            />

            <Route path="/" element={<Layout />}>
              {/*
                Kok artik ICERIK GOSTERMEZ — yalnizca dagiticidir.
                Isıl karari 2026-09-07: "sayfa admin yeriyle baslasin, istersek
                SMAP'e gecebilelim" → her admin panelde baslar, super admin dahil.
                Fark cikista: normal admin panelin disina cikamaz, super admin cikar.

                Neden Dashboard kokten alindi: panelden "Back to app" koke
                gelseydi bu yonlendirme onu panele geri atardi — dugme sonsuz
                donguye girerdi. Ayni tuzak Sidebar'in Dashboard baglantisinda
                da vardi (koke gidiyordu).
              */}
              <Route
                index
                element={<Navigate to={user.isAdmin ? '/admin' : '/dashboard'} replace />}
              />

              {/*
                Uygulamanin gercek giris sayfasi.
                🔴 Normal admin buraya da giremez: AC9 (Isıl karari 2026-08-31)
                panelden cikisi kapatiyor, yeni bir adres o kapiyi delmemeli.
              */}
              <Route
                path="dashboard"
                element={
                  user.isAdmin && !isSuper ? <Navigate to="/admin" replace /> : <Dashboard />
                }
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

              {/* Decision Knowledge Graph — planned */}
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
