import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  LabelList,
} from 'recharts';
import { Truck, Clock, MapPin, ArrowUpRight } from 'lucide-react';
import Header from '../../components/layout/Header';
import HelpPopover from '../../components/shared/HelpPopover';
import FilterBar from '../../components/shared/FilterBar';
import KpiCard from '../../components/shared/KpiCard';
import { getVisibleKpis } from '../../data/pageLayouts';
import { usePageLayout } from '../../hooks/usePageLayout';
import { useLanguage } from '../../contexts/LanguageContext';

// Sayısal değerler korunur; yalnız görünen durum etiketleri i18n anahtarına eşlenir.
const shipmentData = [
  { status: 'In Transit', count: 234, color: 'bg-blue-500' },
  { status: 'Delivered', count: 1847, color: 'bg-green-500' },
  { status: 'Pending', count: 89, color: 'bg-amber-500' },
  { status: 'Delayed', count: 23, color: 'bg-red-500' },
];
const shipLabelKeys: Record<string, string> = {
  'In Transit': 'logi.shipInTransit',
  Delivered: 'logi.shipDelivered',
  Pending: 'logi.shipPending',
  Delayed: 'logi.shipDelayed',
};

const transitTimeData = [
  { route: 'Route A', time: 1.8, target: 2.0 },
  { route: 'Route B', time: 2.5, target: 2.0 },
  { route: 'Route C', time: 1.9, target: 2.0 },
  { route: 'Route D', time: 2.8, target: 2.0 },
  { route: 'Route E', time: 2.1, target: 2.0 },
];

const volumeTrendData = [
  { date: 'Mon', inbound: 450, outbound: 420 },
  { date: 'Tue', inbound: 520, outbound: 480 },
  { date: 'Wed', inbound: 480, outbound: 510 },
  { date: 'Thu', inbound: 550, outbound: 530 },
  { date: 'Fri', inbound: 620, outbound: 580 },
  { date: 'Sat', inbound: 380, outbound: 350 },
  { date: 'Sun', inbound: 220, outbound: 200 },
];

const activeShipments = [
  { id: 'SHP-2851', destination: 'Munich DC', eta: '2h 15m', status: 'on-time', progress: 75 },
  { id: 'SHP-2852', destination: 'Berlin DC', eta: '4h 30m', status: 'on-time', progress: 45 },
  { id: 'SHP-2853', destination: 'Hamburg Port', eta: '1h 45m', status: 'delayed', progress: 82 },
  { id: 'SHP-2854', destination: 'Frankfurt Hub', eta: '3h 00m', status: 'on-time', progress: 60 },
  { id: 'SHP-2855', destination: 'Stuttgart DC', eta: '5h 20m', status: 'at-risk', progress: 30 },
];

export default function LogisticsDT() {
  const { t } = useLanguage();
  const layout = usePageLayout('logistics');
  const visibleKpis = getVisibleKpis(layout.items);
  const showVolumeTrend = layout.isVisible('volume-trend');
  const showRoutePerformance = layout.isVisible('route-performance');

  return (
    <div className="min-h-screen">
      <Header
        title={t('logi.title')}
        subtitle={t('logi.subtitle')}
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

        {layout.isVisible('shipment-stats') && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {shipmentData.map((item) => (
            <div key={item.status} className="bg-white rounded-xl shadow-card p-4">
              <div className="flex items-center justify-between mb-3">
                <span className={`w-3 h-3 rounded-full ${item.color}`} />
                <span className="text-xs text-surface-500">{t(shipLabelKeys[item.status])}</span>
              </div>
              <div className="text-3xl font-bold text-surface-900">{item.count}</div>
              <div className="text-sm text-surface-500 mt-1">{t('logi.shipments')}</div>
            </div>
          ))}
        </div>
        )}

        {(showVolumeTrend || showRoutePerformance) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          {showVolumeTrend && (
          <div className={`${showRoutePerformance ? 'lg:col-span-2' : 'lg:col-span-3'} bg-white rounded-xl shadow-card p-5`}>
            <h3 className="font-semibold text-surface-900 mb-4">{t('logi.volumeTrend')}</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={volumeTrendData} margin={{ top: 10, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#737373" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#737373" width={40} />
                  <Tooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="inbound"
                    stackId="1"
                    stroke="#0066b3"
                    fill="#0066b3"
                    fillOpacity={0.6}
                    name={t('dt.inbound')}
                  />
                  <Area
                    type="monotone"
                    dataKey="outbound"
                    stackId="2"
                    stroke="#2a9d8f"
                    fill="#2a9d8f"
                    fillOpacity={0.6}
                    name={t('dt.outbound')}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          )}

          {showRoutePerformance && (
          <div className="bg-white rounded-xl shadow-card p-5">
            <h3 className="font-semibold text-surface-900 mb-4">{t('logi.routePerformance')}</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={transitTimeData} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis type="number" tick={{ fontSize: 12 }} stroke="#737373" domain={[0, 4]} />
                  <YAxis dataKey="route" type="category" tick={{ fontSize: 11 }} stroke="#737373" width={55} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="time" fill="#0066b3" name={t('logi.timeDays')} radius={[0, 4, 4, 0]}>
                    <LabelList position="right" fontSize={10} fill="#333" />
                  </Bar>
                  <Bar dataKey="target" fill="#d4d4d4" name={t('logi.targetDays')} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          )}
        </div>
        )}

        {layout.isVisible('active-shipments') && (
        <div className="bg-white rounded-xl shadow-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-surface-900">{t('logi.activeShipments')}</h3>
              <HelpPopover
                text={t('logi.help')}
                linkTo="/help"
                linkLabel={t('logi.helpLink')}
                position="bottom-right"
              />
            </div>
            <button className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
              {t('dashboard.viewAll')} <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-surface-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-surface-600">{t('logi.thShipmentId')}</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-surface-600">{t('logi.thDestination')}</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-surface-600">{t('logi.thEta')}</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-surface-600">{t('logi.thStatus')}</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-surface-600">{t('logi.thProgress')}</th>
                </tr>
              </thead>
              <tbody>
                {activeShipments.map((shipment) => (
                  <tr key={shipment.id} className="border-b border-surface-100 hover:bg-surface-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-surface-400" />
                        <span className="font-medium text-surface-900">{shipment.id}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-surface-400" />
                        <span className="text-surface-700">{shipment.destination}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-surface-400" />
                        <span className="text-surface-700">{shipment.eta}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`badge ${
                        shipment.status === 'on-time' ? 'badge-success' :
                        shipment.status === 'delayed' ? 'badge-critical' :
                        'badge-warning'
                      }`}>
                        {shipment.status === 'on-time' ? t('dt.onTime') :
                         shipment.status === 'delayed' ? t('dt.delayed') : t('dt.atRisk')}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-surface-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              shipment.status === 'on-time' ? 'bg-green-500' :
                              shipment.status === 'delayed' ? 'bg-red-500' :
                              'bg-amber-500'
                            }`}
                            style={{ width: `${shipment.progress}%` }}
                          />
                        </div>
                        <span className="text-sm text-surface-600 w-10">{shipment.progress}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        )}
      </div>

    </div>
  );
}
