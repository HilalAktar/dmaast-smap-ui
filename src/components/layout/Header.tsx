import { useState, useRef, useEffect } from 'react';
import { Bell, Search, ChevronDown, RefreshCw, Globe2, ShieldCheck, ClipboardList, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getCompanyAlerts } from '../../data/alerts';
import {
  useCompany,
  useActiveCompany,
  COMPANIES,
  ALL_COMPANIES,
} from '../../contexts/CompanyContext';
import { useAuth, isGlobalAdmin } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { tx } from '../../i18n/tx';
import SystemStatus from '../shared/SystemStatus';
import Tooltip from '../shared/Tooltip';
import UxSurvey from '../shared/UxSurvey';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

const languages = [
  { value: 'en', label: 'English' },
  { value: 'de', label: 'Deutsch' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'tr', label: 'Türkçe' },
  { value: 'zh', label: '中文' },
] as const;

type LanguageValue = typeof languages[number]['value'];

export default function Header({ title, subtitle }: HeaderProps) {
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
  const languageDropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  const { company } = useCompany();
  const { activeCompany, setActiveCompany, canSwitchCompany } = useActiveCompany();
  const { currentUser } = useAuth();
  const unacknowledgedAlerts = getCompanyAlerts(company).filter(a => !a.acknowledged).length;

  // Panele gecis dugmesi de firma secici de YALNIZCA `scope: 'global'` hesaba
  // gorunur — normal admin uygulama tarafina zaten hic dusmez.
  const isSuper = isGlobalAdmin(currentUser);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (languageDropdownRef.current && !languageDropdownRef.current.contains(event.target as Node)) {
        setIsLanguageDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [showSurvey, setShowSurvey] = useState(false);

  const currentLanguageLabel = languages.find(l => l.value === language)?.label || 'English';

  return (
    <>
    <header className="bg-white border-b border-surface-200 px-4 lg:px-6 py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-lg lg:text-xl font-semibold text-surface-900 break-words">{title}</h1>
          {subtitle && <p className="text-sm text-surface-500 mt-0.5 break-words hidden sm:block">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-2 lg:gap-4">
          {/* Aktif use case secici — iki firma ustu yonetici icin (WO-003 I2) */}
          {canSwitchCompany && (
            <div
              className="flex items-center rounded-lg border border-surface-200 p-0.5"
              role="group"
              aria-label="Active use case"
            >
              {ALL_COMPANIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setActiveCompany(c)}
                  aria-pressed={activeCompany === c}
                  className={`rounded-md px-2.5 py-1.5 text-sm font-semibold transition-colors ${
                    activeCompany === c
                      ? COMPANIES[c].accent
                      : 'text-surface-500 hover:bg-surface-50'
                  }`}
                >
                  {COMPANIES[c].label}
                </button>
              ))}
            </div>
          )}

          {/* Uygulamadan panele gecis — panelde de geri donus dugmesi var */}
          {isSuper && (
            <Tooltip content="Admin panel" position="bottom">
              <button
                onClick={() => navigate('/admin')}
                className="flex items-center gap-1.5 rounded-lg border border-surface-200 px-3 py-2 text-sm text-surface-700 transition-colors hover:bg-surface-50"
                aria-label="Admin panel"
              >
                <ShieldCheck className="h-4 w-4 text-surface-500" />
                <span className="hidden sm:inline">Admin</span>
              </button>
            </Tooltip>
          )}

          <div className="relative hidden md:block">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
            <input
              type="text"
              placeholder={t('header.search')}
              className="pl-9 pr-4 py-2 text-sm border border-surface-200 rounded-lg w-48 lg:w-64 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              aria-label={t('header.search')}
            />
          </div>

          <SystemStatus health="online" />


          <div className="relative" ref={languageDropdownRef}>
            <Tooltip content={t('header.language')} position="bottom">
              <button
                onClick={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
                className="flex items-center gap-2 px-3 py-2 text-sm border border-surface-200 rounded-lg hover:bg-surface-50 transition-colors"
                aria-label={t('header.language')}
              >
                <Globe2 className="w-4 h-4 text-surface-500" />
                <span className="hidden sm:inline">{currentLanguageLabel}</span>
                <ChevronDown className="w-4 h-4 text-surface-400" />
              </button>
            </Tooltip>

            {isLanguageDropdownOpen && (
              <div className="absolute right-0 mt-2 w-36 bg-white border border-surface-200 rounded-lg shadow-lg py-1 z-50">
                {languages.map((lang) => (
                  <button
                    key={lang.value}
                    onClick={() => {
                      setLanguage(lang.value as LanguageValue);
                      setIsLanguageDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-primary-50 transition-colors ${
                      language === lang.value
                        ? 'text-primary-600 font-medium bg-primary-50'
                        : 'text-surface-700'
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Anket — Isil karari 2026-09-23: dashboard kartindan basliga tasindi,
              dil secicinin yaninda, her sayfadan erisilebilir. */}
          <Tooltip content={tx(t, 'survey.open', 'User experience survey')} position="bottom">
            <button
              onClick={() => setShowSurvey(true)}
              className="p-2 text-surface-500 hover:text-surface-700 hover:bg-surface-100 rounded-lg transition-colors"
              aria-label={tx(t, 'survey.open', 'User experience survey')}
              aria-haspopup="dialog"
            >
              <ClipboardList className="w-5 h-5" />
            </button>
          </Tooltip>

          <Tooltip content={t('header.refresh')} position="bottom">
            <button
              className="p-2 text-surface-500 hover:text-surface-700 hover:bg-surface-100 rounded-lg transition-colors"
              aria-label={t('header.refresh')}
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </Tooltip>

          <Tooltip content={t('header.notifications')} position="bottom">
            <button
              onClick={() => navigate('/alerts')}
              className="p-2 text-surface-500 hover:text-surface-700 hover:bg-surface-100 rounded-lg transition-colors relative"
              aria-label={t('header.notifications')}
            >
              <Bell className="w-5 h-5" />
              {unacknowledgedAlerts > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-alert-critical text-white text-xs rounded-full flex items-center justify-center">
                  {unacknowledgedAlerts}
                </span>
              )}
            </button>
          </Tooltip>
        </div>
      </div>
    </header>

    {showSurvey && (
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center bg-surface-900/50 backdrop-blur-sm p-4"
        onClick={(e) => { if (e.target === e.currentTarget) setShowSurvey(false); }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label={tx(t, 'survey.title', 'User Experience Survey')}
          className="relative max-w-2xl w-full max-h-[90vh] flex flex-col bg-white rounded-xl shadow-2xl overflow-hidden"
        >
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-surface-200 flex-shrink-0">
            <h3 className="text-lg font-semibold text-surface-900">
              {tx(t, 'survey.title', 'User Experience Survey')}
            </h3>
            <Tooltip content={tx(t, 'common.close', 'Close')}>
              <button
                onClick={() => setShowSurvey(false)}
                className="p-1.5 text-surface-400 hover:text-surface-600 hover:bg-surface-100 rounded-lg transition-colors"
                aria-label={tx(t, 'common.close', 'Close')}
              >
                <X className="w-5 h-5" />
              </button>
            </Tooltip>
          </div>
          <div className="overflow-y-auto flex-1 p-6 pt-4">
            <UxSurvey />
          </div>
        </div>
      </div>
    )}
    </>
  );
}
