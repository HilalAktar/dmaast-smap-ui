import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { Link } from 'react-router-dom';
import type { KpiData, KpiCluster } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { tKpiLabel, tCluster, tUnit } from '../../i18n/dataLabels';

interface KpiCardProps {
  kpi: KpiData;
  size?: 'sm' | 'md' | 'lg';
}

const clusterColors: Record<KpiCluster, { bg: string; border: string; text: string; line: string }> = {
  delivery: { bg: 'bg-delivery-light', border: 'border-delivery', text: 'text-delivery-dark', line: '#3b82f6' },
  cost: { bg: 'bg-cost-light', border: 'border-cost', text: 'text-cost-dark', line: '#f59e0b' },
  stock: { bg: 'bg-stock-light', border: 'border-stock', text: 'text-stock-dark', line: '#10b981' },
  resource: { bg: 'bg-resource-light', border: 'border-resource', text: 'text-resource-dark', line: '#8b5cf6' },
  energy: { bg: 'bg-energy-light', border: 'border-energy', text: 'text-energy-dark', line: '#ec4899' },
};

export default function KpiCard({ kpi, size = 'md' }: KpiCardProps) {
  const { t } = useLanguage();
  const [showInfo, setShowInfo] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const colors = clusterColors[kpi.cluster];
  // Görünen metin aktif dile çözülür; kpi.label mantıkta (lower-is-better,
  // hedef yüzdesi) DEĞİŞMEDEN kaynak dilde kullanılmaya devam eder.
  const displayLabel = tKpiLabel(t, kpi);
  const displayUnit = tUnit(t, kpi.unit);
  const displayCluster = tCluster(t, kpi.cluster);
  const sparklineData = kpi.sparklineData?.map((value, index) => ({ index, value })) || [];
  const hasMetadata = kpi.definition || kpi.dataSource || kpi.helpUrl;
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleClose = () => {
    closeTimer.current = setTimeout(() => setShowInfo(false), 120);
  };

  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  // Close on scroll so popover never drifts out of sync
  useEffect(() => {
    if (!showInfo) return;
    const close = () => setShowInfo(false);
    window.addEventListener('scroll', close, true);
    return () => window.removeEventListener('scroll', close, true);
  }, [showInfo]);

  useEffect(() => {
    if (!showInfo || !buttonRef.current) return;

    const rect = buttonRef.current.getBoundingClientRect();
    const popoverW = 272;
    const popoverH = 180; // generous estimate
    const margin = 8;

    // Horizontal: align right edge to button's right, clamp within viewport
    let left = rect.right - popoverW;
    left = Math.max(margin, Math.min(left, window.innerWidth - popoverW - margin));

    // Vertical: prefer below button; flip above if not enough room
    let top = rect.bottom + 6;
    if (top + popoverH > window.innerHeight - margin) {
      top = rect.top - popoverH - 6;
    }
    // Final clamp so it never goes above viewport
    top = Math.max(margin, top);

    setPopoverPos({ top, left });
  }, [showInfo]);

  const getTrendIcon = () => {
    if (!kpi.trend) return <Minus className="w-4 h-4 text-surface-400" />;
    if (kpi.trend > 0) return <TrendingUp className="w-4 h-4 text-green-500" />;
    return <TrendingDown className="w-4 h-4 text-red-500" />;
  };

  const getTrendColor = () => {
    if (!kpi.trend) return 'text-surface-500';
    const isPositiveTrend = kpi.label.toLowerCase().includes('defect') ||
                           kpi.label.toLowerCase().includes('lead time') ||
                           kpi.label.toLowerCase().includes('energy') ||
                           kpi.label.toLowerCase().includes('carbon');
    if (isPositiveTrend) {
      return kpi.trend < 0 ? 'text-green-600' : 'text-red-600';
    }
    return kpi.trend > 0 ? 'text-green-600' : 'text-red-600';
  };

  const getProgressPercentage = () => {
    if (!kpi.target) return null;
    const isLowerBetter = kpi.label.toLowerCase().includes('defect') ||
                          kpi.label.toLowerCase().includes('lead time') ||
                          kpi.label.toLowerCase().includes('energy') ||
                          kpi.label.toLowerCase().includes('carbon');
    if (isLowerBetter) {
      return Math.min(100, (kpi.target / kpi.value) * 100);
    }
    return Math.min(100, (kpi.value / kpi.target) * 100);
  };

  const progress = getProgressPercentage();

  const sizeClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-5',
  };

  const cardHeight = {
    sm: 'h-32',
    md: 'h-36',
    lg: 'h-40',
  };

  return (
    <div className={`kpi-card border-l-4 ${colors.border} ${sizeClasses[size]} ${cardHeight[size]} flex flex-col overflow-hidden relative`}>
      <div className="flex items-start justify-between mb-2 flex-shrink-0">
        <span className="text-sm font-medium text-surface-600 pr-2 min-w-0 break-words leading-tight">{displayLabel}</span>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {hasMetadata && (
            <>
              <button
                ref={buttonRef}
                type="button"
                onMouseEnter={() => { cancelClose(); setShowInfo(true); }}
                onMouseLeave={scheduleClose}
                className="text-surface-400 hover:text-surface-600 transition-colors"
                aria-label={`${t('dcard.info')} ${displayLabel}`}
              >
                <Info className="w-4 h-4" />
              </button>
              {showInfo && createPortal(
                <div
                  ref={popoverRef}
                  onMouseEnter={cancelClose}
                  onMouseLeave={scheduleClose}
                  className="fixed z-[9999] rounded-xl border border-surface-200 bg-white shadow-2xl overflow-hidden"
                  style={{ top: popoverPos.top, left: popoverPos.left, width: 272 }}
                >
                  <div className="px-3 pt-2.5 pb-2 bg-surface-50 border-b border-surface-100">
                    <span className="text-xs font-bold text-surface-800">{displayLabel}</span>
                  </div>
                  <div className="p-3 space-y-2.5">
                    {kpi.definition && (
                      <div>
                        <span className="text-xs font-semibold text-surface-600 uppercase tracking-wide">{t('dcard.definition')}</span>
                        <p className="text-xs text-surface-500 mt-0.5 leading-relaxed">{kpi.definition}</p>
                      </div>
                    )}
                    {kpi.dataSource && (
                      <div>
                        <span className="text-xs font-semibold text-surface-600 uppercase tracking-wide">{t('dcard.dataSource')}</span>
                        <p className="text-xs text-surface-500 mt-0.5">{kpi.dataSource}</p>
                      </div>
                    )}
                    {kpi.helpUrl && (
                      <div className="pt-1.5 border-t border-surface-100">
                        <Link
                          to={kpi.helpUrl}
                          className="text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors"
                        >
                          {t('dcard.viewHelp')}
                        </Link>
                      </div>
                    )}
                  </div>
                </div>,
                document.body
              )}
            </>
          )}
          <span className={`text-xs px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
            {displayCluster}
          </span>
        </div>
      </div>

      <div className="flex items-end justify-between flex-1 min-h-0">
        <div className="flex-shrink-0">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-semibold text-surface-900">
              {typeof kpi.value === 'number' ? kpi.value.toLocaleString() : kpi.value}
            </span>
            <span className="text-sm text-surface-500">{displayUnit}</span>
          </div>

          {kpi.trend !== undefined && (
            <div className={`flex items-center gap-1 mt-1 ${getTrendColor()}`}>
              {getTrendIcon()}
              <span className="text-sm font-medium">
                {kpi.trend > 0 ? '+' : ''}{kpi.trend}%
              </span>
            </div>
          )}
        </div>

        {sparklineData.length > 0 && (
          <div className="w-16 h-8 flex-shrink-0 overflow-hidden">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparklineData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={colors.line}
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {progress !== null && (
        <div className="mt-2 flex-shrink-0">
          <div className="flex items-center justify-between text-xs text-surface-500 mb-1">
            <span className="truncate">{t('dcard.target')}: {kpi.target}{displayUnit}</span>
            <span className="flex-shrink-0 ml-2">{progress.toFixed(0)}%</span>
          </div>
          <div className="h-1.5 bg-surface-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                progress >= 100 ? 'bg-green-500' : progress >= 80 ? 'bg-amber-500' : 'bg-red-500'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
