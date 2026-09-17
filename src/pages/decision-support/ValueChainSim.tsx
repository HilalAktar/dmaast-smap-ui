import { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import Header from '../../components/layout/Header';
import { ErrorState, EmptyState, FullPageLoader } from '../../components/shared/LoadingState';
import SimControls from '../../components/decision-support/SimControls';
import SimHierarchyTree from '../../components/decision-support/SimHierarchyTree';
import { useCompany } from '../../contexts/CompanyContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useSimulationResult } from '../../data/sim/useSimulationResult';
import type { ShockConfig, SimKpis, SimTimeseriesRow } from '../../data/sim/simContract';

/**
 * Value Chain Simulation (phase B — pre-generated).
 *
 * Loads the role-based artifact for the active company (KAM → kam.json,
 * JPB → jpb.json) through a SimSource and renders the contract's KPI summary as
 * cards plus two time-series charts. NO twin data, Python, contract, schema or
 * artifact is touched here — this page is a pure CONSUMER of SimulationResultV1.
 *
 * Semantic discipline (twin-frontend contract): each KPI/series is labelled with
 * its real unit and kind — service level is a RATIO, inventory/backlog are STOCK
 * levels, cumulative produced/shipped/demand are CUMULATIVE FLOW; they are never
 * conflated or shown without a unit.
 */

// -- i18n helper: route through t(), fall back to an English literal when a key
// is missing (same pattern as i18n/dataLabels.ts `resolve`). Keeps a single
// resolution path (t()) without leaking raw keys in untranslated languages.
type Translate = (key: string) => string;
function tx(t: Translate, key: string, fallback: string): string {
  const out = t(key);
  return out === key ? fallback : out;
}

type KpiKind = 'ratio' | 'stock' | 'flow' | 'time' | 'count';

interface KpiSpec {
  key: keyof SimKpis;
  labelKey: string;
  labelFallback: string;
  kind: KpiKind;
}

// Core KPI keys guaranteed by the contract for BOTH companies. Extra twin keys
// are ignored; a missing/non-finite value simply hides its card (no crash).
const KPI_SPECS: KpiSpec[] = [
  { key: 'service_level', labelKey: 'vcsim.kpi.serviceLevel', labelFallback: 'Service Level', kind: 'ratio' },
  { key: 'total_demand_qty', labelKey: 'vcsim.kpi.totalDemand', labelFallback: 'Total Demand', kind: 'flow' },
  { key: 'shipped_qty', labelKey: 'vcsim.kpi.shipped', labelFallback: 'Shipped Quantity', kind: 'flow' },
  { key: 'avg_inventory', labelKey: 'vcsim.kpi.avgInventory', labelFallback: 'Average Inventory', kind: 'stock' },
  { key: 'ending_inventory', labelKey: 'vcsim.kpi.endingInventory', labelFallback: 'Ending Inventory', kind: 'stock' },
  { key: 'ending_backlog_qty', labelKey: 'vcsim.kpi.endingBacklog', labelFallback: 'Ending Backlog', kind: 'stock' },
  { key: 'avg_total_lead_days', labelKey: 'vcsim.kpi.avgLead', labelFallback: 'Avg Total Lead Time', kind: 'time' },
  { key: 'p90_total_lead_days', labelKey: 'vcsim.kpi.p90Lead', labelFallback: 'P90 Total Lead Time', kind: 'time' },
  { key: 'stockout_time_days', labelKey: 'vcsim.kpi.stockoutTime', labelFallback: 'Stockout Time', kind: 'time' },
  { key: 'production_batches_completed', labelKey: 'vcsim.kpi.prodBatches', labelFallback: 'Production Batches', kind: 'count' },
  { key: 'cumulative_produced', labelKey: 'vcsim.kpi.cumProduced', labelFallback: 'Cumulative Produced', kind: 'flow' },
  { key: 'cumulative_shipped', labelKey: 'vcsim.kpi.cumShipped', labelFallback: 'Cumulative Shipped', kind: 'flow' },
];

// Left-border accent per KPI kind — keeps the grid readable as one system.
const KIND_ACCENT: Record<KpiKind, string> = {
  ratio: 'border-primary-400',
  stock: 'border-emerald-400',
  flow: 'border-violet-400',
  time: 'border-amber-400',
  count: 'border-surface-400',
};

const intFmt = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
const f1Fmt = new Intl.NumberFormat(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function formatKpi(kind: KpiKind, value: number, unitsLabel: string, daysLabel: string): { value: string; unit: string } {
  switch (kind) {
    case 'ratio':
      return { value: `${f1Fmt.format(value * 100)}`, unit: '%' };
    case 'time':
      return { value: f1Fmt.format(value), unit: daysLabel };
    case 'count':
      return { value: intFmt.format(value), unit: '' };
    case 'stock':
    case 'flow':
    default:
      return { value: intFmt.format(value), unit: unitsLabel };
  }
}

function SimKpiCard({
  label,
  kind,
  value,
  unit,
}: {
  label: string;
  kind: KpiKind;
  value: string;
  unit: string;
}) {
  return (
    <div className={`bg-white rounded-xl shadow-card border-l-4 ${KIND_ACCENT[kind]} p-4 flex flex-col h-full`}>
      <span className="text-sm font-medium text-surface-600 leading-tight break-words">{label}</span>
      <div className="mt-auto flex items-baseline gap-1 pt-3">
        <span className="text-2xl font-semibold text-surface-900">{value}</span>
        {unit && <span className="text-sm text-surface-500">{unit}</span>}
      </div>
    </div>
  );
}

// Recharts color tokens (aligned with the existing DT pages).
const COLOR = {
  inventory: '#0066b3',
  safety: '#10b981',
  backlog: '#ef4444',
  demand: '#8b5cf6',
  produced: '#f59e0b',
  shipped: '#0891b2',
};

interface ChartRow {
  time_days: number;
  inventory: number | null;
  safety_stock: number | null;
  backlog_qty: number | null;
  cumulative_demand: number | null;
  cumulative_produced: number | null;
  cumulative_shipped: number | null;
}

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

export default function ValueChainSim() {
  const { t } = useLanguage();
  const { company, config } = useCompany();
  const [reloadKey, setReloadKey] = useState(0);
  // Phase-B "what-if" control state. `shockOverrides` tracks live slider values;
  // `appliedShocks` is only set on "Run" and is what gets forwarded to the
  // SimSource (which phase B ignores — the pre-generated result stays fixed).
  const [shockOverrides, setShockOverrides] = useState<Record<string, number>>({});
  const [appliedShocks, setAppliedShocks] = useState<Partial<ShockConfig> | undefined>(undefined);
  const state = useSimulationResult(company, { reloadKey, shocks: appliedShocks });

  const handleShockChange = (key: string, value: number) =>
    setShockOverrides((prev) => ({ ...prev, [key]: value }));
  const handleResetShocks = () => setShockOverrides({});
  const handleRun = () => {
    // Apply the current knobs through the SimSource seam and reload. In phase B
    // the pre-generated artifact reloads unchanged; phase A will recompute live.
    setAppliedShocks({ ...shockOverrides } as Partial<ShockConfig>);
    setReloadKey((k) => k + 1);
  };

  const unitsLabel = tx(t, 'dunit.units', 'units');
  const daysLabel = tx(t, 'dunit.days', 'days');
  const timeAxisLabel = tx(t, 'vcsim.timeAxis', 'Time (days)');

  const chartData: ChartRow[] = useMemo(() => {
    if (state.status !== 'ready') return [];
    return state.data.result.timeseries.map((r: SimTimeseriesRow) => ({
      time_days: typeof r.time_days === 'number' ? r.time_days : 0,
      inventory: num(r.inventory),
      safety_stock: num(r.safety_stock),
      backlog_qty: num(r.backlog_qty),
      cumulative_demand: num(r.cumulative_demand),
      cumulative_produced: num(r.cumulative_produced),
      cumulative_shipped: num(r.cumulative_shipped),
    }));
  }, [state]);

  const hasFlow = chartData.some(
    (r) => r.cumulative_demand !== null || r.cumulative_produced !== null || r.cumulative_shipped !== null,
  );

  const title = tx(t, 'vcsim.title', 'Value Chain Simulation');
  const subtitle = tx(t, 'vcsim.subtitle', 'Pre-generated value-chain simulation result');

  const tickInterval = chartData.length > 0 ? Math.max(0, Math.floor(chartData.length / 8) - 1) : 0;

  return (
    <div className="min-h-screen">
      <Header title={title} subtitle={subtitle} />

      <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
        {state.status === 'loading' && <FullPageLoader />}

        {state.status === 'error' && (
          <ErrorState
            message={tx(t, 'vcsim.loadError', 'Simulation result could not be loaded.')}
            errorCode={state.error}
            onRetry={() => setReloadKey((k) => k + 1)}
          />
        )}

        {state.status === 'ready' && (() => {
          const { data } = state;
          const kpis = data.result.kpis;
          const cards = KPI_SPECS.map((spec) => {
            const raw = num(kpis[spec.key]);
            if (raw === null) return null;
            const { value, unit } = formatKpi(spec.kind, raw, unitsLabel, daysLabel);
            return (
              <SimKpiCard
                key={String(spec.key)}
                label={tx(t, spec.labelKey, spec.labelFallback)}
                kind={spec.kind}
                value={value}
                unit={unit}
              />
            );
          }).filter(Boolean);

          if (cards.length === 0 && chartData.length === 0) {
            return <EmptyState message={tx(t, 'vcsim.empty', 'No simulation data available.')} />;
          }

          return (
            <>
              {/* Provenance / context strip */}
              <div className="bg-white rounded-xl shadow-card p-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                <span className={`text-xs px-2 py-0.5 rounded-full border ${config.accent}`}>{config.label}</span>
                <span className="text-surface-600">
                  {tx(t, 'vcsim.product', 'Product')}:{' '}
                  <span className="font-medium text-surface-900">{kpis.product_id}</span>
                </span>
                <span className="text-surface-600">
                  {tx(t, 'vcsim.horizon', 'Horizon')}:{' '}
                  <span className="font-medium text-surface-900">
                    {intFmt.format(kpis.horizon_days)} {daysLabel}
                  </span>
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-surface-100 text-surface-600">
                  {tx(t, 'vcsim.provenance', 'Pre-generated artifact')}
                </span>
                {data.generated_at && (
                  <span className="text-xs text-surface-400 ml-auto">
                    {new Date(data.generated_at).toLocaleString()}
                  </span>
                )}
              </div>

              {/* Simulation controls (phase-B shell) — sliders map to config.shocks;
                  "Run" reloads the role-based artifact through the SimSource seam. */}
              <SimControls
                baselineShocks={data.config?.shocks ?? {}}
                overrides={shockOverrides}
                onChange={handleShockChange}
                onRun={handleRun}
                onReset={handleResetShocks}
              />

              {/* KPI cards */}
              {cards.length > 0 && (
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {cards}
                </div>
              )}

              {/* Chart 1 — inventory level vs safety stock vs backlog (STOCK, units) */}
              <div className="bg-white rounded-xl shadow-card p-5">
                <h3 className="font-semibold text-surface-900 mb-1">
                  {tx(t, 'vcsim.inventoryChart', 'Inventory Level vs Safety Stock')}
                </h3>
                <p className="text-xs text-surface-500 mb-4">{timeAxisLabel} · {unitsLabel}</p>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                      <XAxis
                        dataKey="time_days"
                        type="number"
                        domain={[0, 'dataMax']}
                        allowDecimals={false}
                        interval={tickInterval}
                        tick={{ fontSize: 12 }}
                        stroke="#737373"
                        tickFormatter={(v: number) => String(Math.round(v))}
                      />
                      <YAxis tick={{ fontSize: 12 }} stroke="#737373" width={56} />
                      <Tooltip labelFormatter={(v) => `${timeAxisLabel}: ${v}`} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="inventory"
                        name={tx(t, 'vcsim.series.inventory', 'Inventory')}
                        stroke={COLOR.inventory}
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={false}
                        connectNulls
                      />
                      <Line
                        type="monotone"
                        dataKey="safety_stock"
                        name={tx(t, 'vcsim.series.safety', 'Safety Stock')}
                        stroke={COLOR.safety}
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={false}
                        isAnimationActive={false}
                        connectNulls
                      />
                      <Line
                        type="monotone"
                        dataKey="backlog_qty"
                        name={tx(t, 'vcsim.series.backlog', 'Backlog')}
                        stroke={COLOR.backlog}
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={false}
                        connectNulls
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 2 — cumulative demand / production / shipment (CUMULATIVE FLOW, units) */}
              {hasFlow && (
                <div className="bg-white rounded-xl shadow-card p-5">
                  <h3 className="font-semibold text-surface-900 mb-1">
                    {tx(t, 'vcsim.flowChart', 'Cumulative Demand, Production & Shipment')}
                  </h3>
                  <p className="text-xs text-surface-500 mb-4">{timeAxisLabel} · {unitsLabel}</p>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                        <XAxis
                          dataKey="time_days"
                          type="number"
                          domain={[0, 'dataMax']}
                          allowDecimals={false}
                          interval={tickInterval}
                          tick={{ fontSize: 12 }}
                          stroke="#737373"
                          tickFormatter={(v: number) => String(Math.round(v))}
                        />
                        <YAxis tick={{ fontSize: 12 }} stroke="#737373" width={56} />
                        <Tooltip labelFormatter={(v) => `${timeAxisLabel}: ${v}`} />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="cumulative_demand"
                          name={tx(t, 'vcsim.series.cumDemand', 'Cumulative Demand')}
                          stroke={COLOR.demand}
                          strokeWidth={2}
                          dot={false}
                          isAnimationActive={false}
                          connectNulls
                        />
                        <Line
                          type="monotone"
                          dataKey="cumulative_produced"
                          name={tx(t, 'vcsim.series.cumProduced', 'Cumulative Produced')}
                          stroke={COLOR.produced}
                          strokeWidth={2}
                          dot={false}
                          isAnimationActive={false}
                          connectNulls
                        />
                        <Line
                          type="monotone"
                          dataKey="cumulative_shipped"
                          name={tx(t, 'vcsim.series.cumShipped', 'Cumulative Shipped')}
                          stroke={COLOR.shipped}
                          strokeWidth={2}
                          dot={false}
                          isAnimationActive={false}
                          connectNulls
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Product hierarchy — role-based BOM tree from contract `hierarchy`. */}
              <SimHierarchyTree hierarchy={data.result.hierarchy} productId={kpis.product_id} />
            </>
          );
        })()}
      </div>
    </div>
  );
}
