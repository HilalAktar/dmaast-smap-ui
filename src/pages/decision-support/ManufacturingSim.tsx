import { useEffect, useMemo, useRef, useState } from 'react';
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
  ReferenceLine,
} from 'recharts';
import { Play, RotateCcw, Settings, Loader2, Lock, CheckCircle2 } from 'lucide-react';
import Header from '../../components/layout/Header';
import ImpactSummary, { type ImpactItem } from '../../components/shared/ImpactSummary';
import ComparisonView, { type ComparisonMetric } from '../../components/shared/ComparisonView';
import { MockDataBadge, MockDataNotice } from '../../components/shared/MockDataBadge';
import { useCompany } from '../../contexts/CompanyContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useRole } from '../../contexts/RoleContext';
import { usePageLayout } from '../../hooks/usePageLayout';
import { tx } from '../../i18n/tx';
import {
  MFG_SIM_BASELINES,
  MFG_SIM_MOCK_PROVENANCE,
  getMfgSimParameters,
  getMfgSimScenarios,
  runMockManufacturingSim,
  type MfgSimKpis,
  type MfgSimParams,
  type MfgSimResult,
  type MfgSimSeverity,
} from '../../data/mock/manufacturingSimMock';

/**
 * Manufacturing Simulation — MOCK simülasyon modülü.
 *
 * Kullanıcı kararı (Asrınalp Şahin, 2026-09-17): "Planned" yer tutucu yerine
 * senaryo seçimi → parametre girişi → çalıştırma → sonuç görünümü akışı.
 * Veri ve motor: src/data/mock/manufacturingSimMock.ts (sentetik, deterministik).
 * Kart görünürlüğü pageLayouts 'manufacturing-sim' kaydı + admin paneli ile
 * rol bazlı; çalıştırma yetkisi RoleContext `canRunSimulations`.
 */

type RunStatus = 'idle' | 'running' | 'completed';

interface RunLogEntry {
  id: number;
  scenarioName: string;
  seed: number;
  durationMs: number;
  at: Date;
}

interface KpiSpec {
  key: keyof MfgSimKpis;
  label: string;
  unit: string;
  higherIsBetter: boolean;
  decimals: number;
  category: ImpactItem['category'];
}

const KPI_SPECS: KpiSpec[] = [
  { key: 'throughputUnitsPerDay', label: 'Throughput', unit: 'units/day', higherIsBetter: true, decimals: 0, category: 'production' },
  { key: 'oeePct', label: 'OEE', unit: '%', higherIsBetter: true, decimals: 1, category: 'other' },
  { key: 'yieldPct', label: 'Yield', unit: '%', higherIsBetter: true, decimals: 1, category: 'quality' },
  { key: 'leadTimeDays', label: 'Lead Time', unit: 'days', higherIsBetter: false, decimals: 1, category: 'time' },
  { key: 'wipUnits', label: 'WIP', unit: 'units', higherIsBetter: false, decimals: 0, category: 'other' },
  { key: 'backlogUnits', label: 'Backlog (end)', unit: 'units', higherIsBetter: false, decimals: 0, category: 'production' },
];

const SEVERITY_STYLE: Record<MfgSimSeverity, { badge: string; label: string }> = {
  ok: { badge: 'bg-green-50 text-green-700 border-green-200', label: 'OK' },
  watch: { badge: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Watch' },
  critical: { badge: 'bg-red-50 text-red-700 border-red-200', label: 'Critical' },
};

const MOCK_LATENCY_MS = 600;

function fmt(value: number, decimals: number): string {
  return new Intl.NumberFormat(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
}

function deltaPct(base: number, scn: number): number {
  if (base === 0) return 0;
  return ((scn - base) / base) * 100;
}

function KpiPair({ spec, baseline, scenario }: { spec: KpiSpec; baseline: number; scenario: number }) {
  const d = deltaPct(baseline, scenario);
  const improved = spec.higherIsBetter ? d > 0.5 : d < -0.5;
  const worsened = spec.higherIsBetter ? d < -0.5 : d > 0.5;
  const tone = improved ? 'text-green-700' : worsened ? 'text-red-700' : 'text-surface-500';
  return (
    <div className="bg-white rounded-xl shadow-card border-l-4 border-primary-400 p-4 flex flex-col">
      <span className="text-sm font-medium text-surface-600">{spec.label}</span>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-2xl font-semibold text-surface-900 tabular-nums">{fmt(scenario, spec.decimals)}</span>
        <span className="text-sm text-surface-500">{spec.unit}</span>
      </div>
      <div className="mt-1 flex items-center justify-between text-xs">
        <span className="text-surface-400">
          Baseline {fmt(baseline, spec.decimals)} {spec.unit}
        </span>
        <span className={`font-medium tabular-nums ${tone}`}>
          {d > 0 ? '+' : ''}
          {d.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

export default function ManufacturingSim() {
  const { t } = useLanguage();
  const { company, config } = useCompany();
  const { hasPermission, config: roleConfig } = useRole();
  const layout = usePageLayout('manufacturing-sim');

  const canRun = hasPermission('canRunSimulations');
  const baseline = MFG_SIM_BASELINES[company];
  const scenarios = useMemo(() => getMfgSimScenarios(company), [company]);
  const parameters = useMemo(() => getMfgSimParameters(company), [company]);

  const [scenarioId, setScenarioId] = useState<string>('baseline');
  const [params, setParams] = useState<MfgSimParams>({});
  const [seed, setSeed] = useState<number>(42);
  const [status, setStatus] = useState<RunStatus>('completed');
  const [result, setResult] = useState<MfgSimResult>(() => runMockManufacturingSim(company, 'baseline', {}, 42));
  const [runLog, setRunLog] = useState<RunLogEntry[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const selectScenario = (id: string) => {
    const s = scenarios.find((x) => x.id === id);
    setScenarioId(id);
    setParams(s ? { ...s.params } : {});
    setStatus('idle');
  };

  const setParam = (key: keyof MfgSimParams, value: number) => {
    setParams((prev) => ({ ...prev, [key]: value }));
    setStatus('idle');
  };

  const handleReset = () => selectScenario('baseline');

  const handleRun = () => {
    if (!canRun || status === 'running') return;
    setStatus('running');
    const started = performance.now();
    timer.current = setTimeout(() => {
      const next = runMockManufacturingSim(company, scenarioId, params, seed);
      setResult(next);
      setStatus('completed');
      const scenarioName = scenarios.find((s) => s.id === scenarioId)?.name ?? scenarioId;
      setRunLog((log) => [
        { id: log.length + 1, scenarioName, seed, durationMs: Math.round(performance.now() - started), at: new Date() },
        ...log,
      ].slice(0, 5));
    }, MOCK_LATENCY_MS);
  };

  const impacts: ImpactItem[] = KPI_SPECS.map((spec) => ({
    id: String(spec.key),
    label: spec.label,
    change: Math.round(deltaPct(result.baseline[spec.key], result.scenario[spec.key]) * 10) / 10,
    unit: '%',
    category: spec.category,
    higherIsBetter: spec.higherIsBetter,
  }));

  const comparisonMetrics: ComparisonMetric[] = KPI_SPECS.map((spec) => ({
    id: String(spec.key),
    name: spec.label,
    currentValue: result.baseline[spec.key],
    scenarioValue: result.scenario[spec.key],
    unit: spec.unit,
    format: spec.unit === '%' ? 'percentage' : 'number',
    higherIsBetter: spec.higherIsBetter,
  }));

  const resultScenarioName = scenarios.find((s) => s.id === result.scenarioId)?.name ?? result.scenarioId;
  const isStale = status === 'idle';

  return (
    <div className="min-h-screen">
      <Header
        title={tx(t, 'mfgsim.title', 'Manufacturing Simulation')}
        subtitle={tx(t, 'mfgsim.subtitle', 'Mock what-if simulation of the production line')}
      />

      <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
        <MockDataNotice text={MFG_SIM_MOCK_PROVENANCE.note} />

        {/* Provenance strip */}
        <div className="bg-white rounded-xl shadow-card p-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span className={`text-xs px-2 py-0.5 rounded-full border ${config.accent}`}>{config.label}</span>
          <span className="text-surface-600">
            {tx(t, 'vcsim.product', 'Product')}:{' '}
            <span className="font-medium text-surface-900">{baseline.productId}</span>
            <span className="text-surface-400"> · {baseline.productLabel}</span>
          </span>
          <span className="text-surface-600">
            {tx(t, 'vcsim.horizon', 'Horizon')}:{' '}
            <span className="font-medium text-surface-900">{baseline.horizonDays} {tx(t, 'dunit.days', 'days')}</span>
          </span>
          <span className="text-surface-600">
            {tx(t, 'mfgsim.role', 'Role')}: <span className="font-medium text-surface-900">{roleConfig.label}</span>
          </span>
          <MockDataBadge className="ml-auto" />
        </div>

        {/* 1 — Scenario selection */}
        <section className="bg-white rounded-xl shadow-card p-5" aria-labelledby="mfgsim-scenarios">
          <h3 id="mfgsim-scenarios" className="font-semibold text-surface-900 flex items-center gap-2 mb-1">
            <Settings className="w-4 h-4 text-primary-500" aria-hidden="true" />
            {tx(t, 'mfgsim.scenarioSelect', 'Scenario Selection')}
          </h3>
          <p className="text-xs text-surface-500 mb-4">
            {tx(t, 'mfgsim.scenarioHint', 'Pick a preset, then fine-tune the parameters below. Presets follow the DMAAST scenario catalog (baseline / stress / improvement).')}
          </p>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" role="radiogroup" aria-label="Scenario presets">
            {scenarios.map((s) => {
              const active = s.id === scenarioId;
              return (
                <button
                  key={s.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => selectScenario(s.id)}
                  className={`text-left rounded-lg border p-3 transition-colors ${
                    active ? 'border-primary-500 bg-primary-50' : 'border-surface-200 hover:bg-surface-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-surface-900 text-sm">{s.name}</span>
                    <span
                      className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${
                        s.category === 'stress'
                          ? 'bg-red-50 text-red-700'
                          : s.category === 'improvement'
                            ? 'bg-green-50 text-green-700'
                            : 'bg-surface-100 text-surface-600'
                      }`}
                    >
                      {s.category}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-surface-500">{s.description}</p>
                </button>
              );
            })}
          </div>
        </section>

        {/* 2 — Parameters + run */}
        <section className="bg-white rounded-xl shadow-card p-5" aria-labelledby="mfgsim-params">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
            <h3 id="mfgsim-params" className="font-semibold text-surface-900">
              {tx(t, 'mfgsim.parameters', 'Simulation Parameters')}
            </h3>
            <label className="flex items-center gap-2 text-xs text-surface-600">
              Seed
              <input
                type="number"
                value={seed}
                min={0}
                max={9999}
                disabled={!canRun}
                onChange={(e) => {
                  setSeed(Number(e.target.value) || 0);
                  setStatus('idle');
                }}
                className="w-20 rounded border border-surface-200 px-2 py-1 text-sm tabular-nums disabled:opacity-60"
                aria-label="Random seed"
              />
            </label>
          </div>
          <p className="text-xs text-surface-500 mb-3">
            {tx(t, 'vcsim.controls.shocksHint', 'What-if shock knobs (% deviation from baseline), mapped to the run configuration.')}
          </p>

          {!canRun && (
            <p className="flex items-center gap-2 text-xs text-surface-600 bg-surface-50 border border-surface-200 rounded-lg px-3 py-2 mb-4">
              <Lock className="w-3.5 h-3.5" aria-hidden="true" />
              {tx(t, 'mfgsim.noRunPermission', 'Your role can view results but cannot run simulations.')}
            </p>
          )}

          <div className="grid gap-x-6 gap-y-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {parameters.map((p) => {
              const v = params[p.key] ?? 0;
              return (
                <label key={p.key} className="flex flex-col gap-1">
                  <span className="flex items-center justify-between text-sm text-surface-700">
                    <span className="truncate pr-2" title={p.description}>{p.label}</span>
                    <span className={`tabular-nums text-xs font-medium ${v === 0 ? 'text-surface-400' : 'text-primary-600'}`}>
                      {v > 0 ? '+' : ''}{v}%
                    </span>
                  </span>
                  <input
                    type="range"
                    min={p.min}
                    max={p.max}
                    step={p.step}
                    value={v}
                    disabled={!canRun}
                    onChange={(e) => setParam(p.key, Number(e.target.value))}
                    className="w-full accent-primary-500 disabled:opacity-60"
                    aria-label={p.label}
                  />
                  <span className="text-[11px] text-surface-400">{p.description}</span>
                </label>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-5">
            <button
              type="button"
              onClick={handleRun}
              disabled={!canRun || status === 'running'}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-60 transition-colors"
            >
              {status === 'running' ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <Play className="w-4 h-4" aria-hidden="true" />
              )}
              {status === 'running'
                ? tx(t, 'mfgsim.running', 'Running…')
                : tx(t, 'vcsim.controls.run', 'Run Simulation')}
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={!canRun || status === 'running'}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm text-surface-600 hover:bg-surface-100 rounded-lg border border-surface-200 disabled:opacity-50 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              {tx(t, 'vcsim.controls.reset', 'Reset')}
            </button>
            <span className="text-xs text-surface-500" aria-live="polite">
              {status === 'running' && tx(t, 'mfgsim.statusRunning', 'Status: running (mock)')}
              {status === 'completed' && (
                <span className="inline-flex items-center gap-1 text-green-700">
                  <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                  {tx(t, 'mfgsim.statusCompleted', 'Status: completed')} · {resultScenarioName} · seed {result.seed}
                </span>
              )}
              {status === 'idle' && tx(t, 'mfgsim.statusStale', 'Parameters changed — run to refresh the results below.')}
            </span>
          </div>
        </section>

        {/* 3 — Results */}
        <div className={isStale ? 'opacity-60 transition-opacity' : 'transition-opacity'} aria-busy={status === 'running'}>
          <div className="space-y-4 lg:space-y-6">
            {layout.isVisible('baseline-metrics') && (
              <section aria-label="Baseline vs scenario KPIs">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-surface-900">{tx(t, 'mfgsim.results', 'Results')} · {resultScenarioName}</h3>
                  <span className="text-xs text-surface-400">{new Date(result.generatedAt).toLocaleString()}</span>
                </div>
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                  {KPI_SPECS.map((spec) => (
                    <KpiPair key={String(spec.key)} spec={spec} baseline={result.baseline[spec.key]} scenario={result.scenario[spec.key]} />
                  ))}
                </div>
              </section>
            )}

            {layout.isVisible('impact-summary') && (
              <ImpactSummary impacts={impacts} title={tx(t, 'mfgsim.impact', 'Key Impacts vs Baseline')} scenarioName={resultScenarioName} />
            )}

            {layout.isVisible('comparison-view') && (
              <ComparisonView
                metrics={comparisonMetrics}
                chartData={result.stationUtilization.map((r) => ({ label: r.station, current: r.baseline, scenario: r.scenario }))}
                chartType="bar"
                title={tx(t, 'mfgsim.comparison', 'Baseline vs Scenario Comparison')}
              />
            )}

            {layout.isVisible('production-output') && (
              <div className="bg-white rounded-xl shadow-card p-5">
                <h3 className="font-semibold text-surface-900 mb-1">{tx(t, 'mfgsim.outputChart', 'Daily Production Output')}</h3>
                <p className="text-xs text-surface-500 mb-4">{tx(t, 'mfgsim.timeAxis', 'Time (days)')} · units/day</p>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={result.dailyOutput} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                      <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="#737373" />
                      <YAxis tick={{ fontSize: 12 }} stroke="#737373" width={56} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="demand" name="Demand" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="5 5" dot={false} isAnimationActive={false} />
                      <Line type="monotone" dataKey="baseline" name="Baseline output" stroke="#a3a3a3" strokeWidth={2} dot={false} isAnimationActive={false} />
                      <Line type="monotone" dataKey="scenario" name="Scenario output" stroke="#0066b3" strokeWidth={2} dot={false} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {layout.isVisible('machine-utilization') && (
              <div className="bg-white rounded-xl shadow-card p-5">
                <h3 className="font-semibold text-surface-900 mb-1">{tx(t, 'mfgsim.utilChart', 'Station Utilization')}</h3>
                <p className="text-xs text-surface-500 mb-4">% of available capacity · watch ≥ 85% · critical ≥ 100%</p>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={result.stationUtilization} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                      <XAxis dataKey="station" tick={{ fontSize: 11 }} stroke="#737373" interval={0} />
                      <YAxis tick={{ fontSize: 12 }} stroke="#737373" domain={[0, 140]} />
                      <Tooltip />
                      <Legend />
                      <ReferenceLine y={85} stroke="#f59e0b" strokeDasharray="4 4" />
                      <ReferenceLine y={100} stroke="#ef4444" strokeDasharray="4 4" />
                      <Bar dataKey="baseline" name="Baseline" fill="#a3a3a3" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                      <Bar dataKey="scenario" name="Scenario" fill="#0066b3" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {layout.isVisible('bottleneck-analysis') && (
              <div className="bg-white rounded-xl shadow-card p-5">
                <h3 className="font-semibold text-surface-900 mb-3">{tx(t, 'mfgsim.bottlenecks', 'Bottleneck Analysis')}</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wider text-surface-500 border-b border-surface-200">
                        <th className="py-2 pr-4">Station</th>
                        <th className="py-2 pr-4 text-right">Load %</th>
                        <th className="py-2 pr-4 text-right">Queue (units)</th>
                        <th className="py-2 pr-4">Severity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.bottlenecks.map((b) => (
                        <tr key={b.station} className="border-b border-surface-100 last:border-b-0">
                          <td className="py-2 pr-4 font-medium text-surface-900">{b.station}</td>
                          <td className="py-2 pr-4 text-right tabular-nums">{b.loadPct.toFixed(0)}</td>
                          <td className="py-2 pr-4 text-right tabular-nums">{b.queueUnits.toLocaleString()}</td>
                          <td className="py-2 pr-4">
                            <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${SEVERITY_STYLE[b.severity].badge}`}>
                              {SEVERITY_STYLE[b.severity].label}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Run log — reproducibility (scenario, seed, duration) */}
            <div className="bg-white rounded-xl shadow-card p-5">
              <h3 className="font-semibold text-surface-900 mb-2">{tx(t, 'mfgsim.runLog', 'Run Log')}</h3>
              {runLog.length === 0 ? (
                <p className="text-sm text-surface-500">{tx(t, 'mfgsim.runLogEmpty', 'No runs yet in this session — the initial baseline result is shown above.')}</p>
              ) : (
                <ul className="divide-y divide-surface-100 text-sm">
                  {runLog.map((r) => (
                    <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2">
                      <span className="font-mono text-xs text-surface-400">#{r.id}</span>
                      <span className="font-medium text-surface-900">{r.scenarioName}</span>
                      <span className="text-surface-500">seed {r.seed}</span>
                      <span className="text-surface-500">{r.durationMs} ms</span>
                      <span className="ml-auto text-xs text-surface-400">{r.at.toLocaleTimeString()}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
