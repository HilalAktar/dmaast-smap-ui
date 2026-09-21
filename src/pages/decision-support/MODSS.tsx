import { useMemo, useState } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Target, Check, X, Sparkles, ShieldCheck, Lock } from 'lucide-react';
import Header from '../../components/layout/Header';
import ComparisonView, { type ComparisonMetric } from '../../components/shared/ComparisonView';
import { MockDataBadge, MockDataNotice } from '../../components/shared/MockDataBadge';
import { useCompany } from '../../contexts/CompanyContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useRole } from '../../contexts/RoleContext';
import { usePageLayout } from '../../hooks/usePageLayout';
import { tx } from '../../i18n/tx';
import { MODSS_MOCK, MODSS_MOCK_PROVENANCE, rankSolutions } from '../../data/mock/modssMock';

/**
 * MO-DSS — Multi-Objective Decision Support (MOCK).
 *
 * Kullanıcı kararı (Asrınalp Şahin, 2026-09-17): "Planned" yer tutucu yerine
 * amaç ağırlıkları → Pareto görünümü → strateji sıralaması → çözüm karşılaştırma
 * → insan onayı (HITL karar kaydı) akışı. Veri: src/data/mock/modssMock.ts.
 * Kart görünürlüğü pageLayouts 'mo-dss' kaydı ile rol bazlı; onay/override
 * eylemleri RoleContext `canOverrideOptimization` iznine bağlı.
 */

type DecisionAction = 'approved' | 'rejected';

interface DecisionLogEntry {
  id: number;
  solutionId: string;
  solutionName: string;
  action: DecisionAction;
  comment: string;
  role: string;
  at: Date;
}

const CONFIDENCE_STYLE: Record<'low' | 'medium' | 'high', string> = {
  low: 'bg-surface-100 text-surface-600',
  medium: 'bg-amber-50 text-amber-700',
  high: 'bg-green-50 text-green-700',
};

export default function MODSS() {
  const { t } = useLanguage();
  const { company, config } = useCompany();
  const { hasPermission, config: roleConfig } = useRole();
  const layout = usePageLayout('mo-dss');
  const canDecide = hasPermission('canOverrideOptimization');

  const model = MODSS_MOCK[company];
  const baseline = model.solutions.find((s) => s.id === model.baselineId) ?? model.solutions[0];

  const [weights, setWeights] = useState<Record<string, number>>(() => ({ ...model.defaultWeights }));
  const [xObj, setXObj] = useState(model.objectives[0].id);
  const [yObj, setYObj] = useState(model.objectives[1]?.id ?? model.objectives[0].id);
  const [selectedId, setSelectedId] = useState<string>(model.recommendations[0]?.solutionId ?? baseline.id);
  const [comment, setComment] = useState('');
  const [decisionLog, setDecisionLog] = useState<DecisionLogEntry[]>([]);

  const ranked = useMemo(() => rankSolutions(model, weights), [model, weights]);
  const selected = model.solutions.find((s) => s.id === selectedId) ?? baseline;
  const selectedRank = ranked.find((r) => r.solution.id === selectedId);
  const weightTotal = model.objectives.reduce((s, o) => s + (weights[o.id] ?? 0), 0);

  const objectiveById = (id: string) => model.objectives.find((o) => o.id === id);
  const xMeta = objectiveById(xObj);
  const yMeta = objectiveById(yObj);

  const paretoPoints = model.solutions.map((s) => ({
    id: s.id,
    name: s.name,
    x: s.objectives[xObj] ?? 0,
    y: s.objectives[yObj] ?? 0,
    pareto: s.paretoOptimal,
  }));

  const comparisonMetrics: ComparisonMetric[] = model.objectives.map((o) => ({
    id: o.id,
    name: `${o.label} (${o.window})`,
    currentValue: baseline.objectives[o.id] ?? 0,
    scenarioValue: selected.objectives[o.id] ?? 0,
    unit: o.unit,
    format: o.unit === '%' ? 'percentage' : 'number',
    higherIsBetter: o.direction === 'max',
  }));

  const record = (action: DecisionAction) => {
    if (!canDecide) return;
    setDecisionLog((log) => [
      {
        id: log.length + 1,
        solutionId: selected.id,
        solutionName: selected.name,
        action,
        comment: comment.trim(),
        role: roleConfig.label,
        at: new Date(),
      },
      ...log,
    ]);
    setComment('');
  };

  const resetWeights = () => setWeights({ ...model.defaultWeights });

  return (
    <div className="min-h-screen">
      <Header
        title={tx(t, 'modss.title', 'Multi-Objective Decision Support')}
        subtitle={tx(t, 'modss.subtitle', 'Mock Pareto candidates, weighted ranking and human approval')}
      />

      <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
        <MockDataNotice text={MODSS_MOCK_PROVENANCE.note} />

        <div className="bg-white rounded-xl shadow-card p-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span className={`text-xs px-2 py-0.5 rounded-full border ${config.accent}`}>{config.label}</span>
          <span className="text-surface-600">
            {tx(t, 'modss.baselinePlan', 'Baseline plan')}: <span className="font-medium text-surface-900">{baseline.name}</span>
          </span>
          <span className="text-surface-600">
            {tx(t, 'modss.candidates', 'Candidates')}: <span className="font-medium text-surface-900">{model.solutions.length}</span>
            <span className="text-surface-400"> · {model.solutions.filter((s) => s.paretoOptimal).length} Pareto-optimal</span>
          </span>
          <span className="text-surface-600">
            {tx(t, 'mfgsim.role', 'Role')}: <span className="font-medium text-surface-900">{roleConfig.label}</span>
          </span>
          <MockDataBadge className="ml-auto" />
        </div>

        {layout.isVisible('objective-weights') && (
          <section className="bg-white rounded-xl shadow-card p-5" aria-labelledby="modss-weights">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
              <h3 id="modss-weights" className="font-semibold text-surface-900 flex items-center gap-2">
                <Target className="w-4 h-4 text-primary-500" aria-hidden="true" />
                {tx(t, 'modss.weights', 'Objective Weights')}
              </h3>
              <div className="flex items-center gap-3 text-xs text-surface-500">
                <span>
                  {tx(t, 'modss.weightTotal', 'Total')}: <span className="tabular-nums font-medium text-surface-900">{weightTotal}</span>
                </span>
                <button type="button" onClick={resetWeights} className="rounded border border-surface-200 px-2 py-1 hover:bg-surface-100">
                  {tx(t, 'vcsim.controls.reset', 'Reset')}
                </button>
              </div>
            </div>
            <p className="text-xs text-surface-500 mb-4">
              {tx(t, 'modss.weightsHint', 'Weights are normalised to their sum; the ranking below updates immediately (mock scoring).')}
            </p>
            <div className="grid gap-x-6 gap-y-3 grid-cols-1 sm:grid-cols-2">
              {model.objectives.map((o) => (
                <label key={o.id} className="flex flex-col gap-1">
                  <span className="flex items-center justify-between text-sm text-surface-700">
                    <span title={o.description}>
                      {o.label}
                      <span className="ml-1 text-xs text-surface-400">
                        ({o.direction === 'max' ? 'maximise' : 'minimise'} · {o.unit})
                      </span>
                    </span>
                    <span className="tabular-nums text-xs font-medium text-primary-600">{weights[o.id] ?? 0}</span>
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={weights[o.id] ?? 0}
                    onChange={(e) => setWeights((w) => ({ ...w, [o.id]: Number(e.target.value) }))}
                    className="w-full accent-primary-500"
                    aria-label={`${o.label} weight`}
                  />
                </label>
              ))}
            </div>
          </section>
        )}

        <div className="grid gap-4 lg:gap-6 grid-cols-1 xl:grid-cols-2">
          {layout.isVisible('pareto-front') && (
            <section className="bg-white rounded-xl shadow-card p-5" aria-labelledby="modss-pareto">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                <h3 id="modss-pareto" className="font-semibold text-surface-900">{tx(t, 'modss.pareto', 'Pareto Front')}</h3>
                <div className="flex items-center gap-2 text-xs">
                  <select value={xObj} onChange={(e) => setXObj(e.target.value)} className="rounded border border-surface-200 px-2 py-1" aria-label="X axis objective">
                    {model.objectives.map((o) => (
                      <option key={o.id} value={o.id}>X: {o.label}</option>
                    ))}
                  </select>
                  <select value={yObj} onChange={(e) => setYObj(e.target.value)} className="rounded border border-surface-200 px-2 py-1" aria-label="Y axis objective">
                    {model.objectives.map((o) => (
                      <option key={o.id} value={o.id}>Y: {o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-xs text-surface-500 mb-3">
                {xMeta?.label} ({xMeta?.unit}) vs {yMeta?.label} ({yMeta?.unit}) · filled = Pareto-optimal, ring = selected, grey = baseline
              </p>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 12, right: 16, bottom: 12, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                    <XAxis type="number" dataKey="x" name={xMeta?.label} unit={xMeta?.unit === '%' ? '%' : ''} tick={{ fontSize: 12 }} stroke="#737373" domain={['auto', 'auto']} />
                    <YAxis type="number" dataKey="y" name={yMeta?.label} unit={yMeta?.unit === '%' ? '%' : ''} tick={{ fontSize: 12 }} stroke="#737373" domain={['auto', 'auto']} width={56} />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                    <Scatter data={paretoPoints} isAnimationActive={false}>
                      {paretoPoints.map((p) => (
                        <Cell
                          key={p.id}
                          fill={p.id === baseline.id ? '#a3a3a3' : p.pareto ? '#0066b3' : '#ffffff'}
                          stroke={p.id === selectedId ? '#f59e0b' : '#0066b3'}
                          strokeWidth={p.id === selectedId ? 4 : 1.5}
                        />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-surface-500" aria-label="Pareto points">
                {paretoPoints.map((p) => (
                  <li key={p.id}>
                    <button type="button" onClick={() => setSelectedId(p.id)} className={`hover:underline ${p.id === selectedId ? 'text-amber-700 font-medium' : ''}`}>
                      {p.name}: {p.x} / {p.y}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {layout.isVisible('strategy-ranking') && (
            <section className="bg-white rounded-xl shadow-card p-5" aria-labelledby="modss-ranking">
              <h3 id="modss-ranking" className="font-semibold text-surface-900 mb-1">{tx(t, 'modss.ranking', 'Strategy Ranking')}</h3>
              <p className="text-xs text-surface-500 mb-3">{tx(t, 'modss.rankingHint', 'Weighted score 0–100 (higher is better). Select a row to inspect and decide.')}</p>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wider text-surface-500 border-b border-surface-200">
                      <th className="py-2 pr-3">#</th>
                      <th className="py-2 pr-3">Strategy</th>
                      {model.objectives.map((o) => (
                        <th key={o.id} className="py-2 pr-3 text-right whitespace-nowrap">{o.label}<span className="block text-[10px] normal-case tracking-normal text-surface-400">{o.unit}</span></th>
                      ))}
                      <th className="py-2 pr-3 text-right">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranked.map((r) => {
                      const active = r.solution.id === selectedId;
                      return (
                        <tr
                          key={r.solution.id}
                          onClick={() => setSelectedId(r.solution.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setSelectedId(r.solution.id);
                            }
                          }}
                          tabIndex={0}
                          aria-selected={active}
                          className={`cursor-pointer border-b border-surface-100 last:border-b-0 focus:outline-none focus:bg-primary-50 ${active ? 'bg-primary-50' : 'hover:bg-surface-50'}`}
                        >
                          <td className="py-2 pr-3 tabular-nums text-surface-500">{r.rank}</td>
                          <td className="py-2 pr-3">
                            <span className="font-medium text-surface-900">{r.solution.name}</span>
                            <span className="block text-xs text-surface-500">{r.solution.strategy}</span>
                            {r.solution.paretoOptimal && <span className="mt-0.5 inline-block rounded bg-primary-50 px-1.5 text-[10px] font-medium text-primary-700">Pareto</span>}
                            {r.solution.id === baseline.id && <span className="mt-0.5 inline-block rounded bg-surface-100 px-1.5 text-[10px] font-medium text-surface-600">Baseline</span>}
                          </td>
                          {model.objectives.map((o) => (
                            <td key={o.id} className="py-2 pr-3 text-right tabular-nums">{r.solution.objectives[o.id]}</td>
                          ))}
                          <td className="py-2 pr-3 text-right tabular-nums font-semibold text-surface-900">{r.score.toFixed(1)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>

        {layout.isVisible('solution-comparison') && (
          <ComparisonView
            metrics={comparisonMetrics}
            showChart={false}
            title={`${tx(t, 'modss.comparison', 'Baseline vs Selected Solution')} · ${selected.name}`}
          />
        )}

        {/* Selected solution + HITL decision (audit trail in session state) */}
        <section className="bg-white rounded-xl shadow-card p-5" aria-labelledby="modss-decision">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 id="modss-decision" className="font-semibold text-surface-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary-500" aria-hidden="true" />
                {tx(t, 'modss.decision', 'Decision Review')} · {selected.name}
              </h3>
              <p className="text-xs text-surface-500 mt-0.5">
                {selected.strategy}
                {selectedRank && <> · rank {selectedRank.rank} · score {selectedRank.score.toFixed(1)}</>}
              </p>
            </div>
            {!canDecide && (
              <span className="inline-flex items-center gap-1 text-xs text-surface-600 bg-surface-50 border border-surface-200 rounded-lg px-3 py-1.5">
                <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                {tx(t, 'modss.noDecidePermission', 'Your role can review but cannot approve or reject.')}
              </span>
            )}
          </div>

          <dl className="mt-4 grid gap-3 grid-cols-2 lg:grid-cols-4">
            {selected.decisions.map((d) => (
              <div key={d.label} className="rounded-lg border border-surface-200 p-3">
                <dt className="text-xs text-surface-500">{d.label}</dt>
                <dd className="mt-0.5 text-sm font-medium text-surface-900">{d.value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex-1 flex flex-col gap-1 text-xs text-surface-600">
              {tx(t, 'modss.comment', 'Comment (recorded with the decision)')}
              <input
                type="text"
                value={comment}
                disabled={!canDecide}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Optional rationale…"
                className="rounded-lg border border-surface-200 px-3 py-2 text-sm disabled:opacity-60"
              />
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!canDecide}
                onClick={() => record('approved')}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-60"
              >
                <Check className="w-4 h-4" aria-hidden="true" />
                {tx(t, 'modss.approve', 'Approve for planning')}
              </button>
              <button
                type="button"
                disabled={!canDecide}
                onClick={() => record('rejected')}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm text-surface-700 rounded-lg border border-surface-200 hover:bg-surface-100 disabled:opacity-50"
              >
                <X className="w-4 h-4" aria-hidden="true" />
                {tx(t, 'modss.reject', 'Reject')}
              </button>
            </div>
          </div>

          <div className="mt-4">
            <h4 className="text-xs font-medium uppercase tracking-wider text-surface-500 mb-1">{tx(t, 'modss.log', 'Decision log (this session)')}</h4>
            {decisionLog.length === 0 ? (
              <p className="text-sm text-surface-500">{tx(t, 'modss.logEmpty', 'No decisions recorded yet.')}</p>
            ) : (
              <ul className="divide-y divide-surface-100 text-sm">
                {decisionLog.map((e) => (
                  <li key={e.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${e.action === 'approved' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{e.action}</span>
                    <span className="font-medium text-surface-900">{e.solutionName}</span>
                    <span className="text-surface-500">by {e.role}</span>
                    {e.comment && <span className="text-surface-600">“{e.comment}”</span>}
                    <span className="ml-auto text-xs text-surface-400">{e.at.toLocaleTimeString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {layout.isVisible('ai-recommendations') && (
          <section className="bg-white rounded-xl shadow-card p-5" aria-labelledby="modss-reco">
            <h3 id="modss-reco" className="font-semibold text-surface-900 flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-primary-500" aria-hidden="true" />
              {tx(t, 'modss.recommendations', 'Recommendations')}
              <span className="text-xs font-normal text-surface-400">(mock)</span>
            </h3>
            <div className="grid gap-3 grid-cols-1 lg:grid-cols-3">
              {model.recommendations.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedId(r.solutionId)}
                  className={`text-left rounded-lg border p-3 transition-colors ${r.solutionId === selectedId ? 'border-primary-500 bg-primary-50' : 'border-surface-200 hover:bg-surface-50'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-surface-900">{r.title}</span>
                    <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${CONFIDENCE_STYLE[r.confidence]}`}>{r.confidence}</span>
                  </div>
                  <p className="mt-1 text-xs text-surface-500">{r.rationale}</p>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
