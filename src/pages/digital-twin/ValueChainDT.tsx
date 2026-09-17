import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from 'recharts';
import { ArrowRight, AlertCircle, CheckCircle, Clock, Package } from 'lucide-react';
import Header from '../../components/layout/Header';
import HelpPopover from '../../components/shared/HelpPopover';
import FilterBar from '../../components/shared/FilterBar';
import KpiCard from '../../components/shared/KpiCard';
import { getVisibleKpis } from '../../data/pageLayouts';
import { usePageLayout } from '../../hooks/usePageLayout';
import { useLanguage } from '../../contexts/LanguageContext';
import { valueChainNodes } from '../../data/mockData';
import { tNodeName, tNodeType, tMetricLabel, tUnit } from '../../i18n/dataLabels';
import type { DigitalTwinNode } from '../../types';

// Sayısal değerler korunur; yalnız görünen etiketler i18n anahtarına eşlenir.
const flowData = [
  { name: 'Suppliers', value: 100 },
  { name: 'Inbound', value: 95 },
  { name: 'Production', value: 92 },
  { name: 'Outbound', value: 90 },
  { name: 'Customers', value: 88 },
];
const flowLabelKeys: Record<string, string> = {
  Suppliers: 'dt.suppliers',
  Inbound: 'dt.inbound',
  Production: 'dt.production',
  Outbound: 'dt.outbound',
  Customers: 'dt.customers',
};

function NodeCard({ node }: { node: DigitalTwinNode }) {
  const { t } = useLanguage();
  const statusColors = {
    active: { bg: 'bg-green-50', border: 'border-green-200', icon: CheckCircle, iconColor: 'text-green-500' },
    warning: { bg: 'bg-amber-50', border: 'border-amber-200', icon: AlertCircle, iconColor: 'text-amber-500' },
    critical: { bg: 'bg-red-50', border: 'border-red-200', icon: AlertCircle, iconColor: 'text-red-500' },
  };

  const config = statusColors[node.status];
  const StatusIcon = config.icon;

  return (
    <div className={`${config.bg} border ${config.border} rounded-xl p-4`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-medium text-surface-900">{tNodeName(t, node)}</h4>
          <span className="text-xs text-surface-500 capitalize">{tNodeType(t, node.type)}</span>
        </div>
        <StatusIcon className={`w-5 h-5 ${config.iconColor}`} />
      </div>
      <div className="space-y-2">
        {node.metrics.map((metric) => (
          <div key={metric.id} className="flex items-center justify-between text-sm">
            <span className="text-surface-600">{tMetricLabel(t, metric.label)}</span>
            <span className="font-medium text-surface-900">
              {metric.value}{tUnit(t, metric.unit)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ValueChainDT() {
  const { t } = useLanguage();
  const layout = usePageLayout('value-chain');
  const visibleKpis = getVisibleKpis(layout.items);
  const showLeadTimeTrend = layout.isVisible('lead-time-trend');
  const showSupplyChainFlow = layout.isVisible('supply-chain-flow');

  return (
    <div className="min-h-screen">
      <Header
        title={t('vcdt.title')}
        subtitle={t('vcdt.subtitle')}
      />
        <FilterBar />

      <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
        {visibleKpis.length > 0 && (
          <div className={`grid gap-4 ${
            visibleKpis.length >= 4 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' :
            visibleKpis.length === 3 ? 'grid-cols-1 sm:grid-cols-3' :
            visibleKpis.length === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'
          }`}>
            {visibleKpis.map((kpi) => (
              <KpiCard key={kpi.id} kpi={kpi} />
            ))}
          </div>
        )}

        {showSupplyChainFlow && (
        <div className="bg-white rounded-xl shadow-card p-5">
          <h3 className="font-semibold text-surface-900 mb-4">{t('vcdt.supplyChainFlow')}</h3>
          <div className="flex items-center justify-center gap-2 md:gap-4 lg:gap-8 py-8 overflow-x-auto">
            {flowData.map((stage, index) => (
              <div key={stage.name} className="flex items-center flex-shrink-0">
                <div className="flex flex-col items-center min-w-[80px] md:min-w-[100px]">
                  <div className="w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 rounded-full bg-primary-50 border-4 border-primary-200 flex items-center justify-center mb-2">
                    <span className="text-lg md:text-xl lg:text-2xl font-semibold text-primary-700">{stage.value}%</span>
                  </div>
                  <span className="text-xs md:text-sm font-medium text-surface-700 text-center">{t(flowLabelKeys[stage.name])}</span>
                </div>
                {index < flowData.length - 1 && (
                  <ArrowRight className="w-6 h-6 md:w-8 md:h-8 text-surface-300 mx-2 md:mx-3 lg:mx-6 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>
        )}

        <div className={`grid ${showLeadTimeTrend ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1'} gap-4 lg:gap-6`}>
          {showLeadTimeTrend && (
          <div className="lg:col-span-2 bg-white rounded-xl shadow-card p-5">
            <h3 className="font-semibold text-surface-900 mb-4">{t('vcdt.leadTimeTrend')}</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={[
                    { week: 'W1', actual: 14.5, target: 12 },
                    { week: 'W2', actual: 14.2, target: 12 },
                    { week: 'W3', actual: 13.8, target: 12 },
                    { week: 'W4', actual: 13.2, target: 12 },
                    { week: 'W5', actual: 12.9, target: 12 },
                    { week: 'W6', actual: 12.6, target: 12 },
                    { week: 'W7', actual: 12.4, target: 12 },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis dataKey="week" tick={{ fontSize: 12 }} stroke="#737373" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#737373" domain={[10, 16]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="actual" stroke="#0066b3" strokeWidth={2} dot={{ r: 4 }} name={t('dt.actual')}>
                    <LabelList dataKey="actual" position="top" fontSize={10} fill="#0066b3" offset={8} />
                  </Line>
                  <Line type="monotone" dataKey="target" stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" dot={false} name={t('dt.target')} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          )}

          {layout.isVisible('order-status') && (
          <div className="bg-white rounded-xl shadow-card p-5">
            <h3 className="font-semibold text-surface-900 mb-4">{t('vcdt.orderStatus')}</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm font-medium text-green-700">{t('dt.onTrack')}</span>
                </div>
                <span className="text-lg font-semibold text-green-700">847</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-500" />
                  <span className="text-sm font-medium text-amber-700">{t('dt.atRisk')}</span>
                </div>
                <span className="text-lg font-semibold text-amber-700">52</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <span className="text-sm font-medium text-red-700">{t('dt.delayed')}</span>
                </div>
                <span className="text-lg font-semibold text-red-700">12</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-surface-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-surface-500" />
                  <span className="text-sm font-medium text-surface-700">{t('vcdt.totalOrders')}</span>
                </div>
                <span className="text-lg font-semibold text-surface-700">911</span>
              </div>
            </div>
          </div>
          )}
        </div>

        {layout.isVisible('network-nodes') && (
        <div className="bg-white rounded-xl shadow-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="font-semibold text-surface-900">{t('vcdt.networkNodes')}</h3>
            <HelpPopover
              text={t('vcdt.help')}
              linkTo="/help"
              linkLabel={t('vcdt.helpLink')}
              position="bottom-right"
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {valueChainNodes.map((node) => (
              <NodeCard key={node.id} node={node} />
            ))}
          </div>
        </div>
        )}
      </div>

    </div>
  );
}
