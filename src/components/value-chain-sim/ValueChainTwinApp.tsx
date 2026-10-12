import { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
import {
  Factory,
  Package,
  Wrench,
  Link,
  Cog,
  ClipboardList,
  Loader,
  Play,
  AlertTriangle,
  Network,
  FastForward,
  ScrollText,
  Sun,
  Moon,
  Zap,
  Truck,
  Timer,
  AlertCircle,
  User,
  ChevronRight,
  RotateCcw,
  Undo2,
  Info,
  Target,
} from 'lucide-react';

import './styles/vcdt.css';
import { LAYERS, initShocks, type LayerKey } from './constants/layers';
import KpiCard from './KpiCard';
import LayerSection from './LayerSection';
import ChartSpinner from './ChartSpinner';
import type { ThemeName } from './theme';
import type { PlanningState, ViewTab } from './types';
import {
  getMockDemoMeta,
  runMockSimulation,
  VALUE_CHAIN_PRODUCT_DESC,
  VALUE_CHAIN_PRODUCT_ID,
  type BomTreeRow,
  type NodeShocks,
  type NodeShockScope,
  type ShockKey,
  type ShockValues,
  type SimRequest,
  type SimResults,
} from '../../data/mock/valueChainSimMock';

const ProductHierarchyTab = lazy(() => import('./charts/ProductHierarchyTab'));
const SimulationLogTab = lazy(() => import('./charts/SimulationLogTab'));
const F04TimelineChart = lazy(() => import('./charts/F04TimelineChart'));
const KpiTab = lazy(() => import('./charts/KpiTab'));

const PRODUCT_ID = VALUE_CHAIN_PRODUCT_ID;
const PRODUCT_DESC = VALUE_CHAIN_PRODUCT_DESC;

/** Mimics the twin's server round-trip so the "Simulation Running…" state is visible. */
const MOCK_RUN_DELAY_MS = 350;

function newSessionId(): string {
  return 'sess_' + Math.random().toString(36).slice(2, 10) + '_' + Date.now().toString(36);
}

interface HistorySnapshot {
  day: number;
  results: SimResults | null;
  sessionId: string;
}

const fmtInt = (v: number | null | undefined) =>
  v != null ? v.toLocaleString('en-US', { maximumFractionDigits: 0 }) : '—';

/**
 * Value Chain Digital Twin — 1:1 port of the twin frontend (`frontend/src/App.jsx`)
 * running on the deterministic mock engine instead of the Flask API.
 * Everything is scoped under `.vcdt` so the twin's design system does not leak
 * into the SMAP shell.
 */
export default function ValueChainTwinApp() {
  const demoMeta = useMemo(() => getMockDemoMeta(), []);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SimResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bomExpanded, setBomExpanded] = useState(false);
  const [sessionId, setSessionId] = useState(() => newSessionId());

  // Light / dark theme (component-local; default light).
  const [theme, setTheme] = useState<ThemeName>('light');
  const toggleTheme = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), []);

  // Collapse the left control panel toward the left for more dashboard space.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Demand controls (data-driven model is fixed in the engine).
  const [seed, setSeed] = useState(42);
  const [stepSize, setStepSize] = useState(7);

  // Timeline position: total days simulated so far (0 = nothing run yet).
  // `history` is a snapshot stack (one entry per Run) that powers Undo.
  const [currentDay, setCurrentDay] = useState(0);
  const [history, setHistory] = useState<HistorySnapshot[]>([]);

  // Planning
  const [planning, setPlanning] = useState<PlanningState>({
    safety_stock_mult: 1.0,
    min_lot_mult: 1.0,
    planning_method: 'base_stock',
    period_order_qty_days: 30,
    review_interval_days: 1,
    production_capacity: 2,
    outbound_capacity: 1,
    max_outstanding_production_batches: 50,
  });

  // Shocks
  const [shocks, setShocks] = useState<ShockValues>(() => initShocks());
  const [collapsedLayers, setCollapsedLayers] = useState<Record<LayerKey, boolean>>({
    L1: true,
    L2: true,
    L3: true,
    L4: true,
    L5: true,
    L6: true,
  });

  // Per-node (per-part) shocks, additively composed with the global `shocks`.
  const [nodeShocks, setNodeShocks] = useState<NodeShocks>({});

  // View: 'main' | 'product-hierarchy' | 'simulation-log' | 'kpis'
  const [activeTab, setActiveTab] = useState<ViewTab>('main');
  // Heavy views are mounted once visited and then kept alive (hidden) so the
  // hierarchy zoom/selection and log scroll survive tab switches.
  const [visitedTabs, setVisitedTabs] = useState<Partial<Record<ViewTab, boolean>>>({});
  const goTab = useCallback((t: ViewTab) => {
    setActiveTab(t);
    if (t !== 'main') setVisitedTabs((v) => (v[t] ? v : { ...v, [t]: true }));
  }, []);

  const onPlanningChange = useCallback(
    <K extends keyof PlanningState>(key: K, val: PlanningState[K]) => setPlanning((prev) => ({ ...prev, [key]: val })),
    [],
  );
  const onShockChange = (key: ShockKey, val: number) => setShocks((prev) => ({ ...prev, [key]: val }));
  const toggleLayer = (lk: LayerKey) => setCollapsedLayers((prev) => ({ ...prev, [lk]: !prev[lk] }));

  // ─── Node-level shock helpers ───
  const onNodeShockChange = useCallback((partNo: string, scope: NodeShockScope, key: ShockKey, val: number) => {
    setNodeShocks((prev) => {
      const next = { ...prev };
      const existing = next[partNo] || { scope: 'node' as NodeShockScope, values: {} };
      const newValues = { ...existing.values, [key]: val };
      // Drop zero entries to keep the request clean.
      if (val === 0) delete newValues[key];
      if (Object.keys(newValues).length === 0) {
        delete next[partNo];
      } else {
        next[partNo] = { scope: scope || existing.scope || 'node', values: newValues };
      }
      return next;
    });
  }, []);

  const onNodeShockScopeChange = useCallback((partNo: string, scope: NodeShockScope) => {
    setNodeShocks((prev) => {
      const existing = prev[partNo];
      if (!existing) return prev;
      return { ...prev, [partNo]: { ...existing, scope } };
    });
  }, []);

  const clearNodeShock = useCallback((partNo: string) => {
    setNodeShocks((prev) => {
      if (!prev[partNo]) return prev;
      const next = { ...prev };
      delete next[partNo];
      return next;
    });
  }, []);

  const clearAllNodeShocks = useCallback(() => setNodeShocks({}), []);

  // FinishedGood / SubAssembly node shocks must be `subtree`-scoped so the
  // composer cascades them to every assembly level.
  const fgOrSubParts = useMemo(() => {
    const set = new Set<string>(
      demoMeta.bom_tree
        .filter((b) => b.entity_type === 'FinishedGood' || b.entity_type === 'SubAssembly')
        .map((b) => String(b.component_part)),
    );
    set.add(String(demoMeta.product.part_no));
    return set;
  }, [demoMeta]);

  const buildSimRequest = useCallback(
    (horizonDays: number): SimRequest => {
      const defaults = demoMeta.planning_defaults;
      const sanitizedNodeShocks: NodeShocks = Object.fromEntries(
        Object.entries(nodeShocks).map(([partNo, cfg]) => {
          const desiredScope: NodeShockScope = fgOrSubParts.has(String(partNo)) ? 'subtree' : cfg.scope || 'node';
          return [partNo, { ...cfg, scope: desiredScope }];
        }),
      );
      return {
        horizon_days: horizonDays,
        seed,
        planning: {
          safety_stock: (defaults.safety_stock || 50) * planning.safety_stock_mult,
          min_lot_size: (defaults.min_lot_size || 10) * planning.min_lot_mult,
          planning_method: planning.planning_method,
          period_order_qty_days: planning.period_order_qty_days,
          review_interval_days: planning.review_interval_days,
          production_capacity: planning.production_capacity,
          outbound_capacity: planning.outbound_capacity,
          max_outstanding_production_batches: planning.max_outstanding_production_batches,
        },
        shocks,
        node_shocks: sanitizedNodeShocks,
      };
    },
    [demoMeta, fgOrSubParts, seed, planning, shocks, nodeShocks],
  );

  // One-shot migration of stored node-shock scopes (FG/SubAssembly → subtree).
  useEffect(() => {
    setNodeShocks((prev) => {
      let mutated = false;
      const next: NodeShocks = {};
      for (const [partNo, cfg] of Object.entries(prev)) {
        if (cfg && fgOrSubParts.has(String(partNo)) && cfg.scope !== 'subtree') {
          next[partNo] = { ...cfg, scope: 'subtree' };
          mutated = true;
        } else {
          next[partNo] = cfg;
        }
      }
      return mutated ? next : prev;
    });
  }, [fgOrSubParts]);

  const runTimer = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (runTimer.current != null) window.clearTimeout(runTimer.current);
    },
    [],
  );

  // ─── Timeline stepping ───
  // "Run Simulation" is the single forward control: it advances the timeline by
  // the selected step. Each press re-runs deterministically (same seed + current
  // shocks) from day 0 to the new cumulative horizon, so Undo/Reset stay trivial.
  const runForward = () => {
    const step = Math.max(1, Number(stepSize) || 1);
    const target = currentDay + step;
    setLoading(true);
    setError(null);
    const sid = newSessionId();
    const snapshot: HistorySnapshot = { day: currentDay, results, sessionId };
    const request = buildSimRequest(target);
    runTimer.current = window.setTimeout(() => {
      try {
        const data = runMockSimulation(request, demoMeta);
        setHistory((prev) => [...prev, snapshot]);
        setSessionId(sid);
        setCurrentDay(target);
        setResults({ ...data, session_id: sid });
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    }, MOCK_RUN_DELAY_MS);
  };

  // Undo the last Run: pop the snapshot stack and restore that state.
  const undoStep = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setResults(prev.results);
    setCurrentDay(prev.day);
    setSessionId(prev.sessionId || newSessionId());
    setHistory((h) => h.slice(0, -1));
    setError(null);
  };

  // Reset the timeline back to day 0 (clears the run and the Undo history).
  const resetDays = () => {
    setResults(null);
    setCurrentDay(0);
    setHistory([]);
    setSessionId(newSessionId());
    setError(null);
  };

  const kpis = results?.kpis;
  const bomTree = demoMeta.bom_tree;
  const product = demoMeta.product;
  const routingOps = demoMeta.routing_operations;
  const hierarchySummary = results?.hierarchy_summary;
  const subAssemblyIds = kpis?.sub_assembly_ids || hierarchySummary?.sub_assembly_ids || [];

  const bomByLevel = useMemo(() => {
    const grouped: Record<string, BomTreeRow[]> = {};
    bomTree.forEach((b) => {
      const key = String(b.level);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(b);
    });
    return grouped;
  }, [bomTree]);

  const tabClass = (tab: ViewTab) => `tab-content${activeTab === tab ? '' : ' tab-content--hidden'}`;

  return (
    <div className="vcdt" data-theme={theme}>
      <div className="app">
        <header className="app-header">
          <div className="app-header__brand">
            <img src="/dmaast-logo-single.png" className="app-header__logo" alt="dmaast" />
            <div className="app-header__titles">
              <h1>Value Chain Digital Twin</h1>
              <p className="product-desc">Scenario-based disruption analysis · {PRODUCT_ID}</p>
            </div>
          </div>
          <div className="app-header__right">
            <div className="header-badges">
              <span className="badge">
                <Package size={13} style={{ verticalAlign: -2, marginRight: 4 }} />
                {product.total_components || 0} Components
              </span>
              <span className="badge">
                <Wrench size={13} style={{ verticalAlign: -2, marginRight: 4 }} />
                {product.sub_assemblies?.length || 0} Sub-Assemblies
              </span>
              <span className="badge">
                <Link size={13} style={{ verticalAlign: -2, marginRight: 4 }} />
                {product.total_bom_relations || 0} BOM Relations
              </span>
              <span className="badge">
                <Factory size={13} style={{ verticalAlign: -2, marginRight: 4 }} />
                {demoMeta.suppliers_count || 0} Suppliers
              </span>
              <span className="badge">
                <Cog size={13} style={{ verticalAlign: -2, marginRight: 4 }} />
                {routingOps.length} Operations
              </span>
            </div>
            <button
              className="theme-toggle"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label="Toggle colour theme"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </header>

        <div className="main-layout">
          {/* ─── SIDEBAR ─── */}
          <aside className={`sidebar${sidebarCollapsed ? ' sidebar--collapsed' : ''}`}>
            <fieldset disabled={loading} style={{ border: 'none', padding: 0, margin: 0 }}>
              {/* Product Info */}
              <section className="sidebar-section product-info-card">
                <h3>
                  <ClipboardList size={16} style={{ verticalAlign: -2, marginRight: 4 }} />
                  Product Info
                </h3>
                <div className="product-fixed">
                  <div className="product-id">{PRODUCT_ID}</div>
                  <div className="product-name">{PRODUCT_DESC}</div>
                </div>

                <div className="bom-preview">
                  <div className="bom-toggle" onClick={() => setBomExpanded(!bomExpanded)}>
                    <span>
                      {bomExpanded ? '▾' : '▸'} BOM Tree ({bomTree.length} relations)
                    </span>
                  </div>
                  {bomExpanded && (
                    <div className="bom-tree">
                      {Object.keys(bomByLevel)
                        .sort()
                        .map((level) => (
                          <div key={level} className="bom-level-group">
                            <div className="bom-level-header">Level {level}</div>
                            {bomByLevel[level].map((b, i) => (
                              <div key={i} className="bom-item" style={{ paddingLeft: `${parseInt(level, 10) * 12}px` }}>
                                <span className={`bom-type-badge ${b.entity_type === 'SubAssembly' ? 'type-sa' : 'type-cp'}`}>
                                  {b.entity_type === 'SubAssembly' ? 'SA' : 'CP'}
                                </span>
                                <span className="bom-part-no">{b.component_part}</span>
                                <span className="bom-qty">×{b.qty_per_assembly}</span>
                                {b.has_inventory && (
                                  <span className="bom-inv" title={`Stock: ${b.available_qty}`}>
                                    <Package size={12} style={{ verticalAlign: -1, marginRight: 2 }} />
                                    {Math.round(b.available_qty)}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </section>

              {/* Layer Shocks & Policies */}
              <section className="sidebar-section">
                <h3>Layer Shocks &amp; Policies</h3>
                {LAYERS.map((layer) => (
                  <LayerSection
                    key={layer.key}
                    layer={layer}
                    shocks={shocks}
                    onShockChange={onShockChange}
                    planning={planning}
                    onPlanningChange={onPlanningChange}
                    collapsed={collapsedLayers[layer.key]}
                    onToggle={() => toggleLayer(layer.key)}
                  />
                ))}

                {/* Per-node shock summary */}
                {Object.keys(nodeShocks).length > 0 && (
                  <div className="node-shocks-summary">
                    <div className="node-shocks-summary__header">
                      <span>Node-level shocks active</span>
                      <button
                        type="button"
                        className="node-shocks-summary__clear"
                        onClick={clearAllNodeShocks}
                        title="Clear all node-level shocks"
                      >
                        Clear All
                      </button>
                    </div>
                    <ul className="node-shocks-summary__list">
                      {Object.entries(nodeShocks).map(([partNo, cfg]) => (
                        <li key={partNo}>
                          <span className={`node-shocks-summary__scope node-shocks-summary__scope--${cfg.scope}`}>
                            {cfg.scope === 'subtree' ? 'SUB' : 'NODE'}
                          </span>
                          <span className="node-shocks-summary__part">{partNo}</span>
                          <span className="node-shocks-summary__count">{Object.keys(cfg.values || {}).length}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="node-shocks-summary__hint">Open the Hierarchy Tree and click a node to edit per-part shocks.</p>
                  </div>
                )}
              </section>
            </fieldset>

            <div className="sidebar-actions">
              <div className="sim-step-panel">
                <div className="sim-step-panel__title">
                  <FastForward size={13} style={{ verticalAlign: -2, marginRight: 4 }} />
                  Step Forward
                  <span className="sim-step-panel__day">Day {currentDay}</span>
                </div>
                <div className="sim-step-buttons">
                  {[1, 7, 30, 90].map((d) => (
                    <button
                      key={d}
                      type="button"
                      className={`sim-step-btn${stepSize === d ? ' sim-step-btn--active' : ''}`}
                      onClick={() => setStepSize(d)}
                      disabled={loading}
                    >
                      +{d}d
                    </button>
                  ))}
                </div>
                <label className="sim-step-custom">
                  <span>Custom step (days)</span>
                  <input
                    type="number"
                    min={1}
                    max={3650}
                    step={1}
                    value={stepSize}
                    onChange={(e) => setStepSize(Math.max(1, parseInt(e.target.value || '1', 10)))}
                    disabled={loading}
                  />
                </label>
              </div>

              <button className="run-btn" onClick={runForward} disabled={loading}>
                {loading ? (
                  <>
                    <Loader size={14} style={{ verticalAlign: -2, marginRight: 4 }} className="spin" />
                    Simulation Running…
                  </>
                ) : (
                  <>
                    <Play size={14} style={{ verticalAlign: -2, marginRight: 4 }} />
                    Run Simulation +{stepSize}d
                  </>
                )}
              </button>

              <div className="sim-actions-row">
                <button
                  className="sim-action-btn"
                  onClick={resetDays}
                  disabled={loading || (currentDay === 0 && !results)}
                  title="Reset the timeline back to day 0"
                >
                  <RotateCcw size={13} style={{ verticalAlign: -2, marginRight: 4 }} />
                  Reset
                </button>
                <button className="sim-action-btn" onClick={undoStep} disabled={loading || history.length === 0} title="Undo the last step">
                  <Undo2 size={13} style={{ verticalAlign: -2, marginRight: 4 }} />
                  Undo
                </button>
              </div>

              <div className="sim-controls-mini">
                <div className="sim-controls-mini__title">
                  Simulation Controls
                  <span
                    className="info-dot"
                    title="The seed fixes the simulation's random draws — the same seed reproduces an identical run, so scenarios can be compared fairly."
                  >
                    <Info size={12} />
                  </span>
                </div>
                <label className="sim-controls-mini__seed">
                  Seed
                  <input type="number" min={0} value={seed} onChange={(e) => setSeed(+e.target.value || 42)} />
                </label>
              </div>
            </div>
          </aside>

          <button
            className="sidebar-toggle"
            onClick={() => setSidebarCollapsed((c) => !c)}
            title={sidebarCollapsed ? 'Show control panel' : 'Hide control panel'}
            aria-label="Toggle control panel"
          >
            <ChevronRight size={14} style={{ transform: sidebarCollapsed ? 'none' : 'rotate(180deg)', transition: 'transform .15s' }} />
          </button>

          {/* ─── MAIN CONTENT ─── */}
          <main className="content">
            <div className="view-tabs">
              <button className={`view-tab${activeTab === 'main' ? ' view-tab--active' : ''}`} onClick={() => goTab('main')}>
                <Factory size={14} style={{ verticalAlign: -2, marginRight: 5 }} />
                Dashboard
              </button>
              <button
                className={`view-tab${activeTab === 'product-hierarchy' ? ' view-tab--active' : ''}`}
                onClick={() => goTab('product-hierarchy')}
              >
                <Network size={14} style={{ verticalAlign: -2, marginRight: 5 }} />
                Hierarchy Tree
              </button>
              <button
                className={`view-tab${activeTab === 'simulation-log' ? ' view-tab--active' : ''}`}
                onClick={() => goTab('simulation-log')}
              >
                <ScrollText size={14} style={{ verticalAlign: -2, marginRight: 5 }} />
                Simulation Log
              </button>
              <button className={`view-tab${activeTab === 'kpis' ? ' view-tab--active' : ''}`} onClick={() => goTab('kpis')}>
                <Target size={14} style={{ verticalAlign: -2, marginRight: 5 }} />
                KPIs
              </button>
            </div>

            {error && activeTab === 'main' && (
              <div className="error-bar">
                <AlertTriangle size={14} style={{ verticalAlign: -2, marginRight: 4 }} />
                {error}
              </div>
            )}

            {/* Hierarchy — mounted once visited, kept alive so zoom/selection persist */}
            {(activeTab === 'product-hierarchy' || visitedTabs['product-hierarchy']) && (
              <div className={tabClass('product-hierarchy')}>
                <Suspense fallback={<ChartSpinner />}>
                  <ProductHierarchyTab
                    simResults={results}
                    demoMeta={demoMeta}
                    theme={theme}
                    nodeShocks={nodeShocks}
                    onNodeShockChange={onNodeShockChange}
                    onNodeShockScopeChange={onNodeShockScopeChange}
                    onClearNodeShock={clearNodeShock}
                  />
                </Suspense>
              </div>
            )}

            {/* Simulation Log — mounted once visited */}
            {(activeTab === 'simulation-log' || visitedTabs['simulation-log']) && (
              <div className={tabClass('simulation-log')}>
                <Suspense fallback={<ChartSpinner />}>
                  <SimulationLogTab results={results} demoMeta={demoMeta} />
                </Suspense>
              </div>
            )}

            {/* KPIs — mounted once visited */}
            {(activeTab === 'kpis' || visitedTabs['kpis']) && (
              <div className={tabClass('kpis')}>
                <Suspense fallback={<ChartSpinner />}>
                  <KpiTab results={results} demoMeta={demoMeta} />
                </Suspense>
              </div>
            )}

            {/* Dashboard — rendered only when active so Recharts always mounts visible. */}
            {activeTab === 'main' && (
              <div className="view-panel">
                {results && kpis && (
                  <>
                    <div className="kpi-grid">
                      <KpiCard
                        label="Service Level"
                        icon={Zap}
                        tone="positive"
                        value={`${kpis.service_level != null ? (kpis.service_level * 100).toFixed(1) : '—'}%`}
                      />
                      <KpiCard label="Total Demand" icon={User} tone="default" value={fmtInt(kpis.total_demand_qty)} />
                      <KpiCard label="Shipped" icon={Truck} tone="default" value={fmtInt(kpis.shipped_qty)} />
                      <KpiCard label="Remaining Backlog" icon={AlertTriangle} tone="negative" value={fmtInt(kpis.ending_backlog_qty)} />
                      <KpiCard
                        label="Cumulative Production"
                        icon={Factory}
                        tone="default"
                        value={fmtInt(kpis.cumulative_produced)}
                        sub={`${kpis.production_batches_completed ?? 0} batches`}
                      />
                      <KpiCard
                        label="Stockout Time"
                        icon={AlertCircle}
                        tone="warning"
                        value={`${kpis.stockout_time_days != null ? kpis.stockout_time_days.toFixed(1) : '—'} d`}
                        sub={
                          kpis.horizon_days != null && kpis.stockout_time_days != null && kpis.horizon_days > 0
                            ? `${((kpis.stockout_time_days / kpis.horizon_days) * 100).toFixed(1)}% of horizon`
                            : `/ ${kpis.horizon_days ?? '—'} d`
                        }
                      />
                      <KpiCard
                        label="Avg. Lead Time"
                        icon={Timer}
                        tone="default"
                        value={`${kpis.avg_total_lead_days != null ? kpis.avg_total_lead_days.toFixed(2) : '—'} d`}
                      />
                      <KpiCard
                        label="Assembly Levels"
                        icon={Network}
                        tone="default"
                        value={`${kpis.n_assembly_levels ?? '—'} levels`}
                        sub={`${subAssemblyIds.length} sub-assemblies`}
                      />
                    </div>

                    {/* F04-only timeline: order ▸ production ▸ delivery */}
                    <Suspense fallback={<ChartSpinner />}>
                      <F04TimelineChart results={results} productId={kpis.product_id || PRODUCT_ID} theme={theme} />
                    </Suspense>
                  </>
                )}
                {!results && !loading && (
                  <div className="empty-state">
                    <div className="empty-icon">
                      <Factory size={48} />
                    </div>
                    <h2>Value Chain Digital Twin</h2>
                    <p className="product-highlight">{PRODUCT_ID}</p>
                    <p>{PRODUCT_DESC}</p>
                    <p style={{ marginTop: 8, fontSize: 11.5, color: 'var(--text3)' }}>
                      Adjust parameters on the left and run the simulation, or open the Hierarchy Tree to explore the product
                      structure.
                    </p>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
