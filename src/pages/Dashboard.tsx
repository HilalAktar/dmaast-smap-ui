import { useState, useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
} from 'recharts';
import { Activity, TrendingUp, AlertTriangle, Clock } from 'lucide-react';
import Header from '../components/layout/Header';
import FilterBar from '../components/shared/FilterBar';
import KpiCard from '../components/shared/KpiCard';
import AlertCard from '../components/shared/AlertCard';
import { TaskListWidget } from '../components/shared/HITLValidation';
import { productionTrendData, hitlValidationTasks } from '../data/mockData';
import { getWidgetKpis } from '../data/pageLayouts';
import { getCompanyAlerts } from '../data/alerts';
import { useCompany } from '../contexts/CompanyContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useRole } from '../contexts/RoleContext';
import { useToast } from '../contexts/ToastContext';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { usePageLayout } from '../hooks/usePageLayout';


const WIDGET_SIZES: Record<string, 'small' | 'medium' | 'large'> = {
  'quick-stats': 'large',
  'kpi-primary': 'large',
  'production-trend': 'large',
  'alerts': 'medium',
  'hitl-tasks': 'medium',
  'kpi-secondary': 'large',
};

interface DashboardWidget {
  id: string;
  size: 'small' | 'medium' | 'large';
}

export default function Dashboard() {
  const { t } = useLanguage();
  const { config } = useRole();
  const { showToast } = useToast();
  const { settings: a11y } = useAccessibility();
  const location = useLocation();
  const navigate = useNavigate();
  const isLite = a11y.liteMode;
  const { company } = useCompany();
  const recentAlerts = getCompanyAlerts(company);
  const criticalAlerts = recentAlerts.filter(a => a.severity === 'critical' && !a.acknowledged);

  useEffect(() => {
    if ((location.state as { accessDenied?: boolean })?.accessDenied) {
      showToast('warning', 'Access Denied', 'You do not have permission to access this page.');
      navigate('/', { replace: true, state: {} });
    }
  }, [location.state, showToast, navigate]);

  const [hitlTasks, setHitlTasks] = useState(hitlValidationTasks);
  const handleHitlApprove = useCallback((id: string) => {
    setHitlTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'approved' as const } : t));
    showToast('success', 'Task Approved', 'Validation task has been approved successfully.');
  }, [showToast]);
  const handleHitlReject = useCallback((id: string) => {
    setHitlTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'rejected' as const } : t));
    showToast('info', 'Task Rejected', 'Validation task has been rejected.');
  }, [showToast]);

  useEffect(() => {
    const shownKey = 'smap-critical-alerts-shown';
    const shown = sessionStorage.getItem(shownKey);
    if (!shown && criticalAlerts.length > 0) {
      criticalAlerts.forEach(alert => {
        showToast('error', alert.title, alert.message);
      });
      sessionStorage.setItem(shownKey, 'true');
    }
  }, []);

  const layout = usePageLayout('dashboard');

  const visibleWidgets: DashboardWidget[] = layout.visibleWidgetItems.map((item) => ({
    id: item.id,
    size: WIDGET_SIZES[item.id] || 'medium',
  }));

  /**
   * KPI'lar artik kayit defterinden cozulur (Isil is emri 2026-09-02, Bulgu 1).
   * Onceki hal `dashboardKpis.slice(0,8)` / `.slice(8)` idi: kart karari
   * kayit defterinde yasiyordu ama Dashboard oraya BAKMIYORDU, bu yuzden
   * 2026-08-30/31'de cikarilan dort KPI ekranda kalmisti.
   */
  const primaryKpis = getWidgetKpis('dashboard', 'kpi-primary');
  const secondaryKpis = getWidgetKpis('dashboard', 'kpi-secondary');

  // quick-stats de ayni kaynaktan beslenir — sabit dize tasimaz.
  const quickStatKpis = getWidgetKpis('dashboard', 'quick-stats');
  const QUICK_STAT_STYLES: Record<string, { icon: typeof Activity; color: string; bg: string }> = {
    'production-throughput': { icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-50' },
    'defect-rate': { icon: Activity, color: 'text-primary-500', bg: 'bg-primary-50' },
    'lead-time': { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50' },
  };
  /**
   * ETIKET KURALI (Isil karari 2026-09-07): "arayuzle isimler ayni olsun."
   *
   * 1) Uyari kutusu Alert Center'in KENDI kelimesini kullanir —
   *    `alerts.filter.critical` ('Critical' / 'Kritik' / 'Kritisch' ...).
   *    Eski etiket `dashboard.alerts` = "Recent Alerts" idi ama kutu yalnizca
   *    critical+onaylanmamis uyarilari sayiyor (bkz. `criticalAlerts`).
   *    Isil ekranda gordu: Alert Center 2 uyari listelerken kutu 0 gosteriyordu.
   *    Sayi dogruydu, AD yanlisti. Yeni ceviri uydurulmadi — anahtar 6 dilde zaten var.
   *
   * 2) KPI kutulari artik KATALOG adini kullanir (`kpi.label`) — yani hemen
   *    altlarindaki KpiCard ne yaziyorsa kutuda da o yazar. Onceki halde kismi
   *    bir ceviri haritasi vardi: throughput kutusu "Daily Throughput" derken
   *    alttaki kart "Production Throughput" diyordu (ayni sayi, iki isim), ve
   *    lead-time haritada olmadigi icin zaten katalog adina dusuyordu.
   *    BEDELI KAYDA GECTI: `dashboard.kpi.throughput` / `.defectRate` cevirileri
   *    artik cagrilmiyor; KPI adlari 6 dile cevrilene kadar (ayri is kalemi)
   *    bu kutular Ingilizce kalir — kartlar zaten Ingilizce oldugu icin sayfa
   *    kendi icinde TUTARLI olur. Anahtarlar silinmedi, ceviri isi gelince kullanilir.
   */
  const quickStats = [
    { label: t('alerts.filter.critical'), value: String(criticalAlerts.length), icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50' },
    ...quickStatKpis.map((kpi) => {
      const style = QUICK_STAT_STYLES[kpi.id] ?? { icon: Activity, color: 'text-primary-500', bg: 'bg-primary-50' };
      return {
        label: kpi.label,
        value: `${kpi.value.toLocaleString()}${kpi.unit === '%' ? '%' : ` ${kpi.unit}`}`,
        icon: style.icon,
        color: style.color,
        bg: style.bg,
      };
    }),
  ];

  const renderWidget = (widgetId: string) => {
    switch (widgetId) {
      case 'quick-stats':
        return (
          <div>
            <div className="flex items-center justify-between mb-3 relative">
              <h3 className="font-semibold text-surface-900">Quick Stats</h3>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
              {quickStats.map((stat) => (
                <div key={stat.label} className={`${stat.bg} rounded-xl p-3 lg:p-4 flex items-center gap-3 lg:gap-4`}>
                  <div className="p-2 lg:p-3 rounded-lg bg-white shadow-sm">
                    <stat.icon className={`w-5 h-5 lg:w-6 lg:h-6 ${stat.color}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs lg:text-sm text-surface-600 truncate">{stat.label}</p>
                    <p className="text-lg lg:text-2xl font-semibold text-surface-900">{stat.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'kpi-primary':
        return (
          <div>
            <div className="flex items-center justify-between mb-3 relative">
              <h3 className="font-semibold text-surface-900">Primary KPIs</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
              {primaryKpis.slice(0, isLite ? 4 : primaryKpis.length).map((kpi) => (
                <KpiCard key={kpi.id} kpi={kpi} />
              ))}
            </div>
          </div>
        );

      case 'production-trend':
        return (
          <div className="lg:col-span-2 bg-white rounded-xl shadow-card p-4 lg:p-5 overflow-hidden">
            <div className="flex items-center justify-between mb-4 relative">
              <h3 className="font-semibold text-surface-900">Production Trend</h3>
            </div>
            <div className="h-64 lg:h-72 overflow-hidden">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={productionTrendData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#737373" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#737373" width={50} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e5e5',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="actual"
                    stroke="#0066b3"
                    strokeWidth={2.5}
                    dot={{ fill: '#0066b3', r: 4, strokeWidth: 0 }}
                    name="Actual"
                  >
                    <LabelList dataKey="actual" position="top" fontSize={10} fill="#0066b3" offset={8} />
                  </Line>
                  <Line
                    type="monotone"
                    dataKey="target"
                    stroke="#737373"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={(props: Record<string, unknown>) => {
                      const { cx, cy, index } = props as { cx: number; cy: number; index: number };
                      return (
                        <rect
                          key={`target-dot-${index}`}
                          x={(cx as number) - 3}
                          y={(cy as number) - 3}
                          width={6}
                          height={6}
                          fill="#737373"
                          transform={`rotate(45, ${cx}, ${cy})`}
                        />
                      );
                    }}
                    name="Target"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        );

      case 'alerts':
        return (
          <div className="bg-white rounded-xl shadow-card p-4 lg:p-5 overflow-hidden flex flex-col max-h-96">
            <div className="flex items-center justify-between mb-4 flex-shrink-0 relative">
              <h3 className="font-semibold text-surface-900">{t('dashboard.alerts')}</h3>
              <div className="flex items-center gap-2">
                <a href="/alerts" className="text-sm text-primary-600 hover:text-primary-700">
                  {t('dashboard.viewAll')}
                </a>
              </div>
            </div>
            <div className="space-y-3 overflow-y-auto flex-1 min-h-0">
              {recentAlerts.slice(0, isLite ? 2 : 3).map((alert) => (
                <AlertCard key={alert.id} alert={alert} compact />
              ))}
            </div>
          </div>
        );

      case 'hitl-tasks':
        return (
          <TaskListWidget
            tasks={hitlTasks}
            onApprove={handleHitlApprove}
            onReject={handleHitlReject}
          />
        );

      case 'kpi-secondary':
        return (
          <div>
            <div className="flex items-center justify-between mb-3 relative">
              <h3 className="font-semibold text-surface-900">Secondary KPIs</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
              {secondaryKpis.map((kpi) => (
                <KpiCard key={kpi.id} kpi={kpi} />
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const fullWidthIds = new Set(['quick-stats', 'kpi-primary', 'kpi-secondary']);
  const chartPairIds = new Set(['production-trend', 'alerts']);

  const renderDynamicWidgets = () => {
    const elements: React.ReactNode[] = [];
    let i = 0;

    while (i < visibleWidgets.length) {
      const widget = visibleWidgets[i];

      if (fullWidthIds.has(widget.id)) {
        elements.push(
          <div key={widget.id}>{renderWidget(widget.id)}</div>
        );
        i++;
        continue;
      }

      if (chartPairIds.has(widget.id)) {
        const nextIdx = i + 1;
        const nextWidget = nextIdx < visibleWidgets.length ? visibleWidgets[nextIdx] : null;

        if (nextWidget && chartPairIds.has(nextWidget.id)) {
          const isFirstLarge = widget.size === 'large';
          const isSecondLarge = nextWidget.size === 'large';

          if (isFirstLarge && !isSecondLarge) {
            elements.push(
              <div key={`grid-${widget.id}-${nextWidget.id}`} className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
                {renderWidget(widget.id)}
                {renderWidget(nextWidget.id)}
              </div>
            );
          } else if (!isFirstLarge && isSecondLarge) {
            elements.push(
              <div key={`grid-${widget.id}-${nextWidget.id}`} className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
                {renderWidget(nextWidget.id)}
                {renderWidget(widget.id)}
              </div>
            );
          } else {
            elements.push(
              <div key={`grid-${widget.id}-${nextWidget.id}`} className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                {renderWidget(widget.id)}
                {renderWidget(nextWidget.id)}
              </div>
            );
          }
          i += 2;
          continue;
        }

        elements.push(
          <div key={widget.id}>{renderWidget(widget.id)}</div>
        );
        i++;
        continue;
      }

      elements.push(
        <div key={widget.id}>{renderWidget(widget.id)}</div>
      );
      i++;
    }

    return elements;
  };

  return (
    <div className="min-h-screen">
      <Header title={t('dashboard.title')} subtitle={t('dashboard.subtitle')} />
        <FilterBar />

      <div className="mx-4 lg:mx-6 mt-4 px-4 py-3 bg-primary-50 border border-primary-200 rounded-lg flex items-center justify-between">
        <p className="text-sm text-primary-800">
          <span className="font-semibold">Viewing as: {config.label}</span>
          <span className="mx-1.5 text-primary-400">-</span>
          <span className="text-primary-600">{config.description}</span>
        </p>
      </div>

      <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
        {renderDynamicWidgets()}
      </div>

    </div>
  );
}
