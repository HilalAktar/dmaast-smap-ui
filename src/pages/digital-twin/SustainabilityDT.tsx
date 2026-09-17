import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Leaf, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import Header from '../../components/layout/Header';
import { MockDataBadge, MockDataNotice } from '../../components/shared/MockDataBadge';
import { useCompany } from '../../contexts/CompanyContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { usePageLayout } from '../../hooks/usePageLayout';
import { tx } from '../../i18n/tx';
import {
  SUSTAINABILITY_MOCK,
  SUSTAINABILITY_MOCK_PROVENANCE,
  type SustActionStatus,
  type SustKpi,
} from '../../data/mock/sustainabilityMock';

/**
 * Sustainability Digital Twin — MOCK skor kartı.
 *
 * Kullanıcı kararı (Asrınalp Şahin, 2026-09-17): "Planned" yer tutucu yerine
 * skor kartı + trend + süreç kırılımı + döngüsellik aksiyonları. Işıl kararının
 * (2026-08-30) gerekçesi korunur ve sayfada görünür: bu göstergeler ERP'de yok,
 * MES/SCADA/IoT ister — her KPI beklenen kaynağını gösterir.
 * Veri: src/data/mock/sustainabilityMock.ts; kartlar pageLayouts 'sustainability'.
 */

const STATUS_STYLE: Record<SustActionStatus, string> = {
  planned: 'bg-surface-100 text-surface-600 border-surface-200',
  'in-progress': 'bg-amber-50 text-amber-700 border-amber-200',
  done: 'bg-green-50 text-green-700 border-green-200',
};

function fmtValue(v: number): string {
  const decimals = v < 1 ? 3 : v < 10 ? 2 : v < 100 ? 1 : 0;
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: decimals }).format(v);
}

function ScoreTile({ kpi }: { kpi: SustKpi }) {
  const improving = kpi.direction === 'min' ? kpi.trendPct < -0.3 : kpi.trendPct > 0.3;
  const worsening = kpi.direction === 'min' ? kpi.trendPct > 0.3 : kpi.trendPct < -0.3;
  const Icon = improving ? TrendingDown : worsening ? TrendingUp : Minus;
  const tone = improving ? 'text-green-700' : worsening ? 'text-red-700' : 'text-surface-500';
  const onTarget = kpi.target === undefined ? null : kpi.direction === 'min' ? kpi.value <= kpi.target : kpi.value >= kpi.target;
  return (
    <div className="bg-white rounded-xl shadow-card border-l-4 border-energy p-4 flex flex-col">
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium text-surface-600" title={kpi.definition}>{kpi.label}</span>
        {onTarget !== null && (
          <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${onTarget ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {onTarget ? 'on target' : 'off target'}
          </span>
        )}
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-2xl font-semibold text-surface-900 tabular-nums">{fmtValue(kpi.value)}</span>
        <span className="text-sm text-surface-500">{kpi.unit}</span>
      </div>
      <div className="mt-1 flex items-center justify-between text-xs">
        <span className="text-surface-400">
          {kpi.target !== undefined ? `Target ${fmtValue(kpi.target)} ${kpi.unit}` : 'No target'} · {kpi.window}
        </span>
        <span className={`inline-flex items-center gap-1 font-medium tabular-nums ${tone}`}>
          <Icon className="w-3.5 h-3.5" aria-hidden="true" />
          {kpi.trendPct > 0 ? '+' : ''}{kpi.trendPct.toFixed(1)}%
        </span>
      </div>
      <p className="mt-2 font-mono text-[11px] text-surface-400 leading-snug">Expected source: {kpi.expectedSource}</p>
    </div>
  );
}

export default function SustainabilityDT() {
  const { t } = useLanguage();
  const { company, config } = useCompany();
  const layout = usePageLayout('sustainability');
  const model = SUSTAINABILITY_MOCK[company];

  const totalEnergy = model.processBreakdown.reduce((s, r) => s + r.energyKwh, 0);
  const totalCo2Reduction = model.actions.reduce((s, a) => s + a.expectedCo2ReductionT, 0);
  const breakdown = model.processBreakdown.map((r) => ({ ...r, sharePct: Math.round((r.energyKwh / totalEnergy) * 1000) / 10 }));

  return (
    <div className="min-h-screen">
      <Header
        title={tx(t, 'sust.title', 'Sustainability Digital Twin')}
        subtitle={tx(t, 'sust.subtitle', 'Mock environmental scorecard — energy, carbon, water, waste, circularity')}
      />

      <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
        <MockDataNotice text={SUSTAINABILITY_MOCK_PROVENANCE.note} />

        <div className="bg-white rounded-xl shadow-card p-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span className={`text-xs px-2 py-0.5 rounded-full border ${config.accent}`}>{config.label}</span>
          <span className="text-surface-600 inline-flex items-center gap-1">
            <Leaf className="w-4 h-4 text-green-600" aria-hidden="true" />
            {model.siteLabel}
          </span>
          <span className="text-surface-600">
            {tx(t, 'sust.scope', 'Scope')}: <span className="font-medium text-surface-900">Scope 1 + 2 · site level</span>
          </span>
          <MockDataBadge className="ml-auto" />
        </div>

        {layout.isVisible('sustainability-scorecard') && (
          <section aria-label="Sustainability scorecard">
            <h3 className="font-semibold text-surface-900 mb-2">{tx(t, 'sust.scorecard', 'Sustainability Scorecard')}</h3>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {model.scorecard.map((k) => (
                <ScoreTile key={k.id} kpi={k} />
              ))}
            </div>
          </section>
        )}

        {layout.isVisible('energy-carbon-trend') && (
          <div className="bg-white rounded-xl shadow-card p-5">
            <h3 className="font-semibold text-surface-900 mb-1">{tx(t, 'sust.trend', 'Energy & Carbon Intensity Trend')}</h3>
            <p className="text-xs text-surface-500 mb-4">Last 12 months · kWh/unit (left) · kg CO2e/unit (right)</p>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={model.trend} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#737373" />
                  <YAxis yAxisId="energy" tick={{ fontSize: 12 }} stroke="#737373" width={56} />
                  <YAxis yAxisId="carbon" orientation="right" tick={{ fontSize: 12 }} stroke="#737373" width={56} />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="energy" type="monotone" dataKey="energyKwhPerUnit" name="Energy (kWh/unit)" stroke="#ec4899" strokeWidth={2} dot={false} isAnimationActive={false} />
                  <Line yAxisId="energy" type="monotone" dataKey="energyTarget" name="Energy target" stroke="#d4d4d4" strokeWidth={2} strokeDasharray="5 5" dot={false} isAnimationActive={false} />
                  <Line yAxisId="carbon" type="monotone" dataKey="carbonKgPerUnit" name="Carbon (kg CO2e/unit)" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="grid gap-4 lg:gap-6 grid-cols-1 xl:grid-cols-2">
          {layout.isVisible('process-breakdown') && (
            <div className="bg-white rounded-xl shadow-card p-5">
              <h3 className="font-semibold text-surface-900 mb-1">{tx(t, 'sust.breakdown', 'Energy by Process')}</h3>
              <p className="text-xs text-surface-500 mb-4">Last 30 days · kWh · total {totalEnergy.toLocaleString()} kWh</p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={breakdown} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                    <XAxis type="number" tick={{ fontSize: 12 }} stroke="#737373" />
                    <YAxis type="category" dataKey="process" width={170} tick={{ fontSize: 11 }} stroke="#737373" />
                    <Tooltip />
                    <Bar dataKey="energyKwh" name="Energy (kWh)" fill="#ec4899" radius={[0, 4, 4, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <table className="mt-3 w-full text-xs">
                <thead>
                  <tr className="text-left text-surface-500 border-b border-surface-200">
                    <th className="py-1 pr-2">Process</th>
                    <th className="py-1 pr-2 text-right">kWh</th>
                    <th className="py-1 pr-2 text-right">Share %</th>
                    <th className="py-1 text-right">kg CO2e</th>
                  </tr>
                </thead>
                <tbody>
                  {breakdown.map((r) => (
                    <tr key={r.process} className="border-b border-surface-100 last:border-b-0">
                      <td className="py-1 pr-2 text-surface-800">{r.process}</td>
                      <td className="py-1 pr-2 text-right tabular-nums">{r.energyKwh.toLocaleString()}</td>
                      <td className="py-1 pr-2 text-right tabular-nums">{r.sharePct.toFixed(1)}</td>
                      <td className="py-1 text-right tabular-nums">{r.carbonKg.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {layout.isVisible('circularity-actions') && (
            <div className="bg-white rounded-xl shadow-card p-5">
              <div className="flex items-baseline justify-between mb-1">
                <h3 className="font-semibold text-surface-900">{tx(t, 'sust.actions', 'Circularity & Reduction Actions')}</h3>
                <span className="text-xs text-surface-400">Expected total −{totalCo2Reduction} t CO2e/yr</span>
              </div>
              <p className="text-xs text-surface-500 mb-3">{tx(t, 'sust.actionsHint', 'Improvement backlog with owner, due month and expected annual CO2e reduction.')}</p>
              <ul className="divide-y divide-surface-100">
                {model.actions.map((a) => (
                  <li key={a.id} className="py-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                    <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[a.status]}`}>{a.status}</span>
                    <span className="font-medium text-surface-900">{a.title}</span>
                    <span className="text-xs text-surface-500">{a.owner} · due {a.due}</span>
                    <span className="ml-auto text-xs tabular-nums text-green-700">−{a.expectedCo2ReductionT} t CO2e/yr</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
