import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Network,
  BrainCircuit,
  Bell,
  ChevronDown,
  ChevronRight,
  Factory,
  Truck,
  Package,
  Leaf,
  Link2,
  Play,
  Settings,
  Target,
  Menu,
  X,
  HelpCircle,
  BookOpen,
  Share2,
  LogOut,
  Accessibility,
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useRole } from '../../contexts/RoleContext';
import { useCompany } from '../../contexts/CompanyContext';
import { useAuth } from '../../contexts/AuthContext';
import { loadAdminConfig, isPageVisible } from '../../data/adminConfig';
import { AccessibilityPanelContent } from '../../contexts/AccessibilityContext';
import Tooltip from '../shared/Tooltip';

interface ChildItem {
  to: string;
  labelKey: string;
  icon: React.ReactNode;
}

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  children?: ChildItem[];
  onNavigate?: () => void;
}

function NavItem({ to, icon, label, children, onNavigate }: NavItemProps) {
  const location = useLocation();
  const { t } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(
    children?.some(child => location.pathname.startsWith(child.to)) || false
  );
  const hasChildren = children && children.length > 0;
  const isActive = location.pathname === to || (hasChildren && children.some(c => location.pathname.startsWith(c.to)));

  if (hasChildren) {
    return (
      <div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`w-full nav-item ${isActive ? 'nav-item-active' : ''}`}
        >
          {icon}
          <span className="flex-1 text-left min-w-0 break-words">{label}</span>
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
        {isExpanded && (
          <div className="ml-4 mt-1 space-y-1 border-l border-surface-200 pl-3">
            {children.map(child => (
              <NavLink
                key={child.to}
                to={child.to}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `nav-item text-sm ${isActive ? 'nav-item-active' : ''}`
                }
              >
                {child.icon}
                <span className="min-w-0 break-words">{t(child.labelKey)}</span>
              </NavLink>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`}
    >
      {icon}
      <span className="min-w-0 break-words">{label}</span>
    </NavLink>
  );
}

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const { t } = useLanguage();
  const { role, config, hasPermission } = useRole();
  const { company, config: companyConfig } = useCompany();
  const { currentUser, logout } = useAuth();
  // Admin panelinin sayfa gorunurlugu — yalnizca daraltir, izinleri genisletmez
  const adminConfig = loadAdminConfig(company);
  const pageOn = (key: string) => isPageVisible(adminConfig, role, key);
  const [showAccessibility, setShowAccessibility] = useState(false);

  const handleNavigate = () => {
    if (onClose) onClose();
  };

  const roleInitials: Record<string, string> = {
    manager: 'MG',
    engineer: 'EN',
    operator: 'OP',
    admin: 'AD',
    developer: 'DV',
    superuser: 'SU',
  };

  const cdtChildren: ChildItem[] = [
    ...(pageOn('value-chain') ? [
      { to: '/digital-twin/value-chain', labelKey: 'nav.valueChain', icon: <Link2 className="w-4 h-4" /> },
    ] : []),
    ...(hasPermission('canAccessCDTSimulations') && pageOn('value-chain-sim') ? [
      { to: '/digital-twin/value-chain-sim', labelKey: 'nav.valueChainSim', icon: <Play className="w-4 h-4" /> },
    ] : []),
    ...(pageOn('manufacturing') ? [
      { to: '/digital-twin/manufacturing', labelKey: 'nav.manufacturing', icon: <Factory className="w-4 h-4" /> },
    ] : []),
    ...(hasPermission('canAccessCDTSimulations') && pageOn('manufacturing-sim') ? [
      { to: '/digital-twin/manufacturing-sim', labelKey: 'nav.manufacturingSim', icon: <Settings className="w-4 h-4" /> },
    ] : []),
    ...(pageOn('logistics') ? [
      { to: '/digital-twin/logistics', labelKey: 'nav.logistics', icon: <Truck className="w-4 h-4" /> },
    ] : []),
    ...(pageOn('product') ? [
      { to: '/digital-twin/product', labelKey: 'nav.product', icon: <Package className="w-4 h-4" /> },
    ] : []),
  ];

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-surface-900/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 z-50 h-screen
          w-64 bg-white border-r border-surface-200 flex flex-col
          transform transition-transform duration-200 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="p-4 border-b border-surface-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="/dmaast_logo.png"
                alt="SMAP Logo"
                className="w-10 h-10"
              />
              <div className="min-w-0">
                <h1 className="font-semibold text-surface-900">SMAP</h1>
                <p className="text-xs text-surface-500">DMaaST Platform</p>
                {/* Hangi use case icin acildigi — Işıl karari 2026-08-30 */}
                <span
                  className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold ${companyConfig.accent}`}
                  title={`${companyConfig.fullName} — ${companyConfig.erp}`}
                >
                  {companyConfig.fullName}
                </span>
              </div>
            </div>
            <Tooltip content="Close menu">
              <button
                onClick={onClose}
                className="lg:hidden p-2 text-surface-500 hover:bg-surface-100 rounded-lg"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </Tooltip>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {/* Dashboard - visible to all */}
          <NavItem
            to="/"
            icon={<LayoutDashboard className="w-5 h-5" />}
            label={t('nav.dashboard')}
            onNavigate={handleNavigate}
          />

          {/* Layer 2: Cognitive Digital Twins - visible to all, simulations filtered by permission */}
          <NavItem
            to="/digital-twin"
            icon={<Network className="w-5 h-5" />}
            label={t('nav.digitalTwin')}
            onNavigate={handleNavigate}
            children={cdtChildren}
          />

          {/* Layer 3: Decision Support (MO-DSS) - Operator erişemez */}
          {hasPermission('canAccessMODSS') && pageOn('mo-dss') && (
            <NavItem
              to="/decision-support"
              icon={<BrainCircuit className="w-5 h-5" />}
              label={t('nav.decisionSupport')}
              onNavigate={handleNavigate}
              children={[
                { to: '/decision-support/mo-dss', labelKey: 'nav.moDss', icon: <Target className="w-4 h-4" /> },
              ]}
            />
          )}

          {/* Sustainability - Operator erişemez */}
          {hasPermission('canAccessSustainability') && pageOn('sustainability') && (
            <NavItem
              to="/sustainability"
              icon={<Leaf className="w-5 h-5" />}
              label={t('nav.sustainability')}
              onNavigate={handleNavigate}
            />
          )}

          {/* Decision Knowledge Graph - mock içerik (kullanıcı kararı 2026-09-17; önceki: planned, Işıl 2026-08-30) */}
          {pageOn('knowledge-graph') && (
            <NavItem
              to="/knowledge-graph"
              icon={<Share2 className="w-5 h-5" />}
              label={t('nav.knowledgeGraph')}
              onNavigate={handleNavigate}
            />
          )}


          {/* Separator */}
          <div className="my-2 border-t border-surface-200" />

          {/* Alerts - tüm roller */}
          <NavItem
            to="/alerts"
            icon={<Bell className="w-5 h-5" />}
            label={t('nav.alertCenter')}
            onNavigate={handleNavigate}
          />

          {/* Glossary (HCD-106/107: tüm roller erişebilir) */}
          <NavItem
            to="/terminology"
            icon={<BookOpen className="w-5 h-5" />}
            label={t('nav.glossary')}
            onNavigate={handleNavigate}
          />

          {/* Help & Training - visible to all */}
          <NavItem
            to="/help"
            icon={<HelpCircle className="w-5 h-5" />}
            label={t('nav.helpTraining')}
            onNavigate={handleNavigate}
          />
        </nav>

        <div className="p-3 border-t border-surface-200 space-y-2">
          <button
            onClick={() => setShowAccessibility(!showAccessibility)}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-surface-600 hover:bg-surface-100 rounded-lg transition-colors"
            aria-label="Accessibility settings"
          >
            <Accessibility className="w-5 h-5" />
            <span>Accessibility</span>
          </button>

          {/* Kimlik + cikis — rol artik burada DEGISTIRILEMEZ, admin panelinden atanir */}
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-medium text-primary-700">{roleInitials[role] || 'U'}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-surface-900 break-words">
                {currentUser?.displayName ?? config.label}
              </p>
              <p className="text-xs text-surface-500 break-words">{config.label}</p>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-surface-600 hover:bg-surface-100 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {showAccessibility && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-surface-900/50 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowAccessibility(false); }}
        >
          <div className="relative max-w-md w-full max-h-[90vh] flex flex-col bg-white rounded-xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-surface-200 flex-shrink-0">
              <h3 className="text-lg font-semibold text-surface-900">Accessibility Settings</h3>
              <Tooltip content="Close">
                <button
                  onClick={() => setShowAccessibility(false)}
                  className="p-1.5 text-surface-400 hover:text-surface-600 hover:bg-surface-100 rounded-lg transition-colors"
                  aria-label="Close accessibility settings"
                >
                  <X className="w-5 h-5" />
                </button>
              </Tooltip>
            </div>
            <div className="overflow-y-auto flex-1 p-6 pt-4">
              <AccessibilityPanelContent />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <Tooltip content="Open menu">
      <button
        onClick={onClick}
        className="lg:hidden p-2 text-surface-500 hover:bg-surface-100 rounded-lg"
        aria-label="Open menu"
      >
        <Menu className="w-6 h-6" />
      </button>
    </Tooltip>
  );
}
