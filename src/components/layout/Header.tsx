import { useState, useRef, useEffect } from 'react';
import { Bell, Search, ChevronDown, RefreshCw, Globe2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getCompanyAlerts } from '../../data/alerts';
import { useCompany } from '../../contexts/CompanyContext';
import { useLanguage } from '../../contexts/LanguageContext';
import SystemStatus from '../shared/SystemStatus';
import Tooltip from '../shared/Tooltip';

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
  { value: 'da', label: 'Dansk' },
] as const;

type LanguageValue = typeof languages[number]['value'];

export default function Header({ title, subtitle }: HeaderProps) {
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
  const languageDropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  const { company } = useCompany();
  const unacknowledgedAlerts = getCompanyAlerts(company).filter(a => !a.acknowledged).length;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (languageDropdownRef.current && !languageDropdownRef.current.contains(event.target as Node)) {
        setIsLanguageDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentLanguageLabel = languages.find(l => l.value === language)?.label || 'English';

  return (
    <header className="bg-white border-b border-surface-200 px-4 lg:px-6 py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-lg lg:text-xl font-semibold text-surface-900 break-words">{title}</h1>
          {subtitle && <p className="text-sm text-surface-500 mt-0.5 break-words hidden sm:block">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-2 lg:gap-4">
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
  );
}
