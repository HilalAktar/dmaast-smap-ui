import { useState, useMemo } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  Clock,
  Filter,
  Search,
  Bell,
  BellOff,
  Check,
  Calendar,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react';
import Header from '../components/layout/Header';
import HelpPopover from '../components/shared/HelpPopover';
import Tooltip from '../components/shared/Tooltip';
import { getCompanyAlerts } from '../data/alerts';
import { useCompany } from '../contexts/CompanyContext';
import { useLanguage } from '../contexts/LanguageContext';
import { tAlertTitle, tAlertMessage, tTimeAgo } from '../i18n/dataLabels';
import { useToast } from '../contexts/ToastContext';
import type { AlertSeverity } from '../types';

/*
 * Uydurma alarmlar 2026-08-31'de kaldirildi (Isil karari). Tek kaynak:
 * data/alerts.ts — dordu de ham veriden olculmustur, her birinin
 * dataSource alaninda tablo/kolon ve olculen buyukluk yazilidir.
 */

const severityConfig: Record<AlertSeverity, { icon: React.ElementType; bg: string; border: string; text: string; labelKey: string }> = {
  critical: { icon: AlertTriangle, bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', labelKey: 'alerts.filter.critical' },
  warning: { icon: AlertCircle, bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', labelKey: 'alerts.filter.warning' },
  info: { icon: Info, bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', labelKey: 'alerts.filter.info' },
};

export default function AlertCenter() {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const { company, config: companyConfig } = useCompany();
  // Alarmlar da kartlar gibi kapsamli: kullanici yalnizca kendi use case'ini gorur
  const companyAlerts = useMemo(() => getCompanyAlerts(company), [company]);
  const [alerts, setAlerts] = useState(companyAlerts);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<AlertSeverity | 'all'>('all');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [showAcknowledged, setShowAcknowledged] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const sources = [...new Set(companyAlerts.map(a => a.source))];

  const filteredAlerts = alerts.filter(alert => {
    const matchesSearch = alert.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         alert.message.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeverity = selectedSeverity === 'all' || alert.severity === selectedSeverity;
    const matchesSource = selectedSource === 'all' || alert.source === selectedSource;
    const matchesAcknowledged = showAcknowledged || !alert.acknowledged;
    const matchesDateFrom = !dateFrom || alert.timestamp >= new Date(dateFrom);
    const matchesDateTo = !dateTo || alert.timestamp <= new Date(dateTo + 'T23:59:59');
    return matchesSearch && matchesSeverity && matchesSource && matchesAcknowledged && matchesDateFrom && matchesDateTo;
  });

  const handleAcknowledge = (id: string) => {
    setAlerts(prev =>
      prev.map(alert =>
        alert.id === id ? { ...alert, acknowledged: true } : alert
      )
    );
    showToast('success', t('alerts.acknowledged'), 'Alert has been marked as acknowledged');
  };

  const handleAcknowledgeAll = () => {
    setAlerts(prev => prev.map(alert => ({ ...alert, acknowledged: true })));
    showToast('success', 'All alerts acknowledged', 'All alerts have been marked as acknowledged');
  };

  const criticalCount = alerts.filter(a => a.severity === 'critical' && !a.acknowledged).length;
  const warningCount = alerts.filter(a => a.severity === 'warning' && !a.acknowledged).length;
  const infoCount = alerts.filter(a => a.severity === 'info' && !a.acknowledged).length;
  const totalUnacknowledged = criticalCount + warningCount + infoCount;

  return (
    <div className="min-h-screen">
      <Header
        title={t('alerts.title')}
        subtitle={t('alerts.subtitle')}
      />

      <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
        <div className="flex items-center gap-2 -mb-2">
          <HelpPopover
            text="Monitor, filter, and manage system alerts. Use severity filters, source filters, and date ranges to find specific alerts. Acknowledge alerts to mark them as reviewed. Critical alerts require immediate attention."
            linkTo="/help"
            linkLabel="Alert management guide"
            position="bottom-right"
          />
        </div>

        {/* Ornek-alarm serdi — AdminPanel'deki demo serdiyle ayni dil. Isıl karari 2026-08-31 */}
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <span className="font-semibold">{t('alerts.sampleTitle')}</span>{' '}
            {t('alerts.sampleBody').replace('{company}', companyConfig.label)}
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 lg:p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 lg:gap-3">
                <AlertTriangle className="w-5 h-5 lg:w-6 lg:h-6 text-red-500" />
                <span className="font-medium text-red-700 text-sm lg:text-base">{t('alerts.filter.critical')}</span>
              </div>
              <span className="text-xl lg:text-2xl font-bold text-red-700">{criticalCount}</span>
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 lg:p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 lg:gap-3">
                <AlertCircle className="w-5 h-5 lg:w-6 lg:h-6 text-amber-500" />
                <span className="font-medium text-amber-700 text-sm lg:text-base">{t('alerts.filter.warning')}</span>
              </div>
              <span className="text-xl lg:text-2xl font-bold text-amber-700">{warningCount}</span>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 lg:p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 lg:gap-3">
                <Info className="w-5 h-5 lg:w-6 lg:h-6 text-blue-500" />
                <span className="font-medium text-blue-700 text-sm lg:text-base">{t('alerts.filter.info')}</span>
              </div>
              <span className="text-xl lg:text-2xl font-bold text-blue-700">{infoCount}</span>
            </div>
          </div>
          <div className="bg-surface-50 border border-surface-200 rounded-xl p-3 lg:p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 lg:gap-3">
                <Bell className="w-5 h-5 lg:w-6 lg:h-6 text-surface-500" />
                <span className="font-medium text-surface-700 text-sm lg:text-base">Unread</span>
              </div>
              <span className="text-xl lg:text-2xl font-bold text-surface-700">{totalUnacknowledged}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-card">
          <div className="p-3 lg:p-4 border-b border-surface-200">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                  <input
                    type="text"
                    placeholder={t('header.search')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-2 text-sm border border-surface-200 rounded-lg w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Filter className="w-4 h-4 text-surface-400 hidden sm:block" />
                  <select
                    value={selectedSeverity}
                    onChange={(e) => setSelectedSeverity(e.target.value as AlertSeverity | 'all')}
                    className="text-sm border border-surface-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    aria-label="Filter by severity"
                  >
                    <option value="all">{t('alerts.filter.all')}</option>
                    <option value="critical">{t('alerts.filter.critical')}</option>
                    <option value="warning">{t('alerts.filter.warning')}</option>
                    <option value="info">{t('alerts.filter.info')}</option>
                  </select>

                  <select
                    value={selectedSource}
                    onChange={(e) => setSelectedSource(e.target.value)}
                    className="text-sm border border-surface-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    aria-label="Filter by source"
                  >
                    <option value="all">All Sources</option>
                    {sources.map(source => (
                      <option key={source} value={source}>{source}</option>
                    ))}
                  </select>

                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-surface-400 hidden sm:block" />
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="text-sm border border-surface-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 text-surface-700"
                      aria-label="Filter from date"
                    />
                    <span className="text-xs text-surface-400">to</span>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="text-sm border border-surface-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 text-surface-700"
                      aria-label="Filter to date"
                    />
                  </div>

                  <Tooltip content={showAcknowledged ? 'Show all alerts' : 'Show unread only'}>
                    <button
                      onClick={() => setShowAcknowledged(!showAcknowledged)}
                      className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors ${
                        showAcknowledged
                          ? 'border-surface-200 text-surface-600'
                          : 'border-primary-200 bg-primary-50 text-primary-600'
                      }`}
                    >
                      {showAcknowledged ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                      <span className="hidden sm:inline">{showAcknowledged ? 'Show All' : 'Unread Only'}</span>
                    </button>
                  </Tooltip>

                  <Tooltip content="Reset all filters">
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedSeverity('all');
                        setSelectedSource('all');
                        setDateFrom('');
                        setDateTo('');
                        setShowAcknowledged(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 text-sm text-amber-600 hover:bg-amber-50 rounded-lg border border-amber-200 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Clear</span>
                    </button>
                  </Tooltip>
                </div>
              </div>

              <Tooltip content="Acknowledge all alerts">
                <button
                  onClick={handleAcknowledgeAll}
                  className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span className="hidden sm:inline">Acknowledge All</span>
                </button>
              </Tooltip>
            </div>
          </div>

          <div className="divide-y divide-surface-100">
            {filteredAlerts.length === 0 ? (
              <div className="p-8 lg:p-12 text-center">
                <div className="w-16 h-16 bg-surface-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Bell className="w-8 h-8 text-surface-400" />
                </div>
                <h3 className="text-lg font-medium text-surface-900">{t('common.noData')}</h3>
                <p className="text-sm text-surface-500 mt-1">
                  Try adjusting your filters or search query
                </p>
              </div>
            ) : (
              filteredAlerts.map((alert) => {
                const config = severityConfig[alert.severity];
                const Icon = config.icon;

                return (
                  <div
                    key={alert.id}
                    className={`p-3 lg:p-4 flex items-start gap-3 lg:gap-4 hover:bg-surface-50 transition-colors ${
                      alert.acknowledged ? 'opacity-60' : ''
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${config.bg} flex-shrink-0`}>
                      <Icon className={`w-4 h-4 lg:w-5 lg:h-5 ${config.text}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-medium text-surface-900 text-sm lg:text-base">{tAlertTitle(t, alert)}</h4>
                            <span className={`badge ${
                              alert.severity === 'critical' ? 'badge-critical' :
                              alert.severity === 'warning' ? 'badge-warning' : 'badge-info'
                            }`}>
                              {t(config.labelKey)}
                            </span>
                            {/* Serit ekrandan cikinca da isaret kaybolmasin */}
                            <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                              {t('alerts.sampleBadge')}
                            </span>
                          </div>
                          <p className="text-sm text-surface-600 mt-1">{tAlertMessage(t, alert)}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-surface-500">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {tTimeAgo(t, alert.timestamp)}
                            </span>
                            <span className="hidden sm:inline">{t('common.source')}: {alert.source}</span>
                          </div>
                          {/* Dayanak — KpiCard.dataSource ile ayni sozlesme */}
                          {alert.dataSource && (
                            <p className="mt-1.5 font-mono text-xs text-surface-400">
                              {alert.dataSource}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {!alert.acknowledged && (
                            <Tooltip content="Acknowledge alert">
                              <button
                                onClick={() => handleAcknowledge(alert.id)}
                                className="flex items-center gap-1 px-3 py-1.5 text-sm text-surface-600 hover:text-surface-900 hover:bg-surface-100 rounded-lg transition-colors"
                              >
                                <Check className="w-4 h-4" />
                                <span className="hidden sm:inline">{t('alerts.acknowledge')}</span>
                              </button>
                            </Tooltip>
                          )}
                          {alert.acknowledged && (
                            <span className="flex items-center gap-1 px-3 py-1.5 text-sm text-green-600">
                              <CheckCircle className="w-4 h-4" />
                              <span className="hidden sm:inline">{t('alerts.acknowledged')}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {filteredAlerts.length > 0 && (
            <div className="p-3 lg:p-4 border-t border-surface-200 flex items-center justify-between text-sm text-surface-500">
              <span>Showing {filteredAlerts.length} of {alerts.length} alerts</span>
              <button className="text-primary-600 hover:text-primary-700 font-medium">
                Load More
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
