/*
 * Mock modül doğrulaması — src/data/mock/*.ts (2026-09-17).
 *
 * Proje bir test koşucusu (vitest/jest) içermediğinden, docs/phase2-verify ile
 * aynı yöntem kullanılır: gerçek TS kaynakları esbuild (vite bağımlılığı) ile
 * CJS'e derlenir ve Node'da assert edilir. Üretim kodu değişmez.
 *
 * Çalıştırma: node tests/mock-modules.verify.cjs
 */
const esbuild = require('esbuild');
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const APP = path.resolve(__dirname, '..');
const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mockverify-'));

function bundle(entryRel) {
  const outfile = path.join(outDir, path.basename(entryRel).replace(/\.ts$/, '.cjs'));
  esbuild.buildSync({
    entryPoints: [path.join(APP, entryRel)],
    bundle: true,
    format: 'cjs',
    platform: 'node',
    outfile,
    logLevel: 'silent',
  });
  return require(outfile);
}

const mfg = bundle('src/data/mock/manufacturingSimMock.ts');
const modss = bundle('src/data/mock/modssMock.ts');
const sust = bundle('src/data/mock/sustainabilityMock.ts');
const dkg = bundle('src/data/mock/knowledgeGraphMock.ts');
const vcs = bundle('src/data/mock/valueChainSimMock.ts');

const COMPANIES = ['kam', 'jpb'];
let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (e) {
    console.log(`FAIL ${name}: ${e.message}`);
    process.exitCode = 1;
  }
}

// ---------------------------------------------------------------- provenance
test('every mock module declares kind=mock provenance', () => {
  for (const p of [mfg.MFG_SIM_MOCK_PROVENANCE, modss.MODSS_MOCK_PROVENANCE, sust.SUSTAINABILITY_MOCK_PROVENANCE, dkg.DKG_MOCK_PROVENANCE, vcs.VCSIM_MOCK_PROVENANCE]) {
    assert.strictEqual(p.kind, 'mock');
    assert.ok(p.note.length > 20);
  }
});

// ---------------------------------------------------------- manufacturing sim
test('mfg: scenario params stay within declared parameter ranges and scopes', () => {
  for (const company of COMPANIES) {
    const params = mfg.getMfgSimParameters(company);
    const byKey = new Map(params.map((p) => [p.key, p]));
    for (const s of mfg.getMfgSimScenarios(company)) {
      for (const [k, v] of Object.entries(s.params)) {
        const def = byKey.get(k);
        assert.ok(def, `${company}/${s.id}: unknown or out-of-scope param ${k}`);
        assert.ok(v >= def.min && v <= def.max, `${company}/${s.id}: ${k}=${v} outside [${def.min},${def.max}]`);
      }
    }
  }
  assert.ok(!mfg.getMfgSimParameters('kam').some((p) => p.key === 'Rework_pct'), 'Rework_pct must be JPB-only');
  assert.ok(mfg.getMfgSimParameters('jpb').some((p) => p.key === 'Rework_pct'));
});

test('mfg: engine is deterministic for the same seed and differs for another seed', () => {
  const a = mfg.runMockManufacturingSim('kam', 'demand-surge', { Sales_Qty_pct: 30 }, 42);
  const b = mfg.runMockManufacturingSim('kam', 'demand-surge', { Sales_Qty_pct: 30 }, 42);
  const c = mfg.runMockManufacturingSim('kam', 'demand-surge', { Sales_Qty_pct: 30 }, 7);
  assert.deepStrictEqual(a.dailyOutput, b.dailyOutput);
  assert.deepStrictEqual(a.scenario, b.scenario);
  assert.notDeepStrictEqual(a.dailyOutput, c.dailyOutput);
});

test('mfg: baseline scenario reproduces baseline KPIs within tolerance and results are bounded', () => {
  for (const company of COMPANIES) {
    const base = mfg.MFG_SIM_BASELINES[company];
    const r = mfg.runMockManufacturingSim(company, 'baseline', {}, 42);
    assert.strictEqual(r.dailyOutput.length, base.horizonDays);
    assert.ok(Math.abs(r.scenario.oeePct - base.kpis.oeePct) < 0.01, `${company}: baseline OEE drift`);
    assert.ok(Math.abs(r.scenario.yieldPct - base.kpis.yieldPct) < 0.01, `${company}: baseline yield drift`);
    assert.ok(Math.abs(r.scenario.throughputUnitsPerDay - base.kpis.throughputUnitsPerDay) / base.kpis.throughputUnitsPerDay < 0.06, `${company}: baseline throughput drift`);
    for (const s of mfg.getMfgSimScenarios(company)) {
      const res = mfg.runMockManufacturingSim(company, s.id, s.params, 42);
      assert.ok(res.scenario.yieldPct >= 0 && res.scenario.yieldPct <= 100);
      assert.ok(res.scenario.oeePct >= 0 && res.scenario.oeePct <= 100);
      assert.ok(res.scenario.leadTimeDays > 0 && res.scenario.wipUnits >= 0 && res.scenario.backlogUnits >= 0);
      assert.strictEqual(res.stationUtilization.length, base.stations.length);
      assert.strictEqual(res.bottlenecks.length, base.stations.length);
      for (const b of res.bottlenecks) assert.strictEqual(b.severity, mfg.severityOf(b.loadPct));
    }
  }
});

test('mfg: stress scenarios move KPIs in the expected direction', () => {
  const base = mfg.runMockManufacturingSim('jpb', 'baseline', {}, 42).scenario;
  const surge = mfg.runMockManufacturingSim('jpb', 'demand-surge', { Sales_Qty_pct: 30 }, 42).scenario;
  const slow = mfg.runMockManufacturingSim('jpb', 'machine-slowdown', { Production_Duration_Days_pct: 25 }, 42).scenario;
  const quality = mfg.runMockManufacturingSim('jpb', 'quality-drift', { Defect_Rate_pct: 40 }, 42).scenario;
  assert.ok(surge.backlogUnits > base.backlogUnits, 'demand surge should build backlog');
  assert.ok(slow.leadTimeDays > base.leadTimeDays && slow.oeePct < base.oeePct, 'slowdown should raise lead time and lower OEE');
  assert.ok(quality.yieldPct < base.yieldPct, 'quality drift should lower yield');
});

// ------------------------------------------------------------------- MO-DSS
test('modss: every solution carries every objective; baseline exists; weights sum to 100', () => {
  for (const company of COMPANIES) {
    const m = modss.MODSS_MOCK[company];
    assert.ok(m.solutions.some((s) => s.id === m.baselineId));
    const sum = m.objectives.reduce((s, o) => s + m.defaultWeights[o.id], 0);
    assert.strictEqual(sum, 100, `${company}: default weights sum ${sum}`);
    for (const s of m.solutions) for (const o of m.objectives) assert.ok(typeof s.objectives[o.id] === 'number', `${company}/${s.id} missing ${o.id}`);
    for (const r of m.recommendations) assert.ok(m.solutions.some((s) => s.id === r.solutionId), `${company}: recommendation ${r.id} points to unknown solution`);
    for (const o of m.objectives) assert.ok(o.unit && o.window && (o.direction === 'min' || o.direction === 'max'));
  }
});

test('modss: ranking is direction-aware and responds to weights', () => {
  const m = modss.MODSS_MOCK.jpb;
  const otdOnly = modss.rankSolutions(m, { otd: 100, inventory_value: 0, bottleneck_load: 0, scrap_factor: 0 });
  assert.strictEqual(otdOnly[0].solution.id, 'jpb-s4', 'OTD-only weighting must rank the highest-OTD solution first');
  const invOnly = modss.rankSolutions(m, { otd: 0, inventory_value: 100, bottleneck_load: 0, scrap_factor: 0 });
  assert.strictEqual(invOnly[0].solution.id, 'jpb-s3', 'inventory-only weighting must rank the lowest-inventory solution first');
  const ranks = otdOnly.map((r) => r.rank);
  assert.deepStrictEqual(ranks, ranks.map((_, i) => i + 1));
  for (const r of otdOnly) assert.ok(r.score >= 0 && r.score <= 100);
  const zero = modss.rankSolutions(m, {});
  assert.strictEqual(zero.length, m.solutions.length, 'zero weights fall back to equal weighting');
});

// ------------------------------------------------------------- sustainability
test('sust: scorecard KPIs carry unit, window, direction, definition and expected source', () => {
  for (const company of COMPANIES) {
    const m = sust.SUSTAINABILITY_MOCK[company];
    assert.ok(m.scorecard.length >= 5);
    for (const k of m.scorecard) {
      assert.ok(k.unit && k.window && k.definition && k.expectedSource, `${company}/${k.id} missing metadata`);
      assert.ok(k.direction === 'min' || k.direction === 'max');
      assert.ok(Number.isFinite(k.value) && Number.isFinite(k.trendPct));
    }
    assert.strictEqual(m.trend.length, 12);
    assert.ok(m.processBreakdown.every((r) => r.energyKwh > 0 && r.carbonKg >= 0));
    assert.ok(m.actions.every((a) => ['planned', 'in-progress', 'done'].includes(a.status)));
  }
});

// ------------------------------------------------------------ knowledge graph
test('dkg: edges reference existing nodes, ids are unique, layout coords in range', () => {
  for (const company of COMPANIES) {
    const m = dkg.DKG_MOCK[company];
    const ids = new Set(m.nodes.map((n) => n.id));
    assert.strictEqual(ids.size, m.nodes.length, `${company}: duplicate node ids`);
    for (const e of m.edges) {
      assert.ok(ids.has(e.from) && ids.has(e.to), `${company}: dangling edge ${e.from}->${e.to}`);
    }
    for (const n of m.nodes) {
      assert.ok(n.x >= 0 && n.x <= 100 && n.y >= 0 && n.y <= 100, `${company}/${n.id}: coords out of range`);
      assert.ok(dkg.DKG_NODE_TYPES.some((tp) => tp.type === n.type), `${company}/${n.id}: unknown type ${n.type}`);
    }
    const isolated = m.nodes.filter((n) => dkg.getNeighbours(m, n.id).length === 0);
    assert.strictEqual(isolated.length, 0, `${company}: isolated nodes ${isolated.map((n) => n.id).join(',')}`);
  }
});

// ------------------------------------------------- value chain sim (twin 1:1)
const VCS_PLANNING = {
  safety_stock: 30, min_lot_size: 30, planning_method: 'base_stock', period_order_qty_days: 30,
  review_interval_days: 1, production_capacity: 2, outbound_capacity: 1, max_outstanding_production_batches: 50,
};
const vcsRun = (horizon, shocks = {}, seed = 42, nodeShocks = {}) =>
  vcs.runMockSimulation({ horizon_days: horizon, seed, planning: VCS_PLANNING, shocks, node_shocks: nodeShocks });

test('vcsim: metadata mirrors the twin /api/demo/metadata contract for the masked demo product', () => {
  const meta = vcs.getMockDemoMeta();
  assert.strictEqual(meta.product.part_no, '021XBXXXXXXF04');
  assert.strictEqual(meta.product.total_components, 87);
  assert.deepStrictEqual(meta.product.sub_assemblies, ['5401021', '55501572', '55501649', '5962204']);
  assert.strictEqual(meta.bom_tree.length, meta.product.total_bom_relations);
  assert.ok(meta.bom_tree.length >= 99, 'all BOM relations present');
  for (const row of meta.bom_tree) {
    assert.ok(['FinishedGood', 'SubAssembly', 'Component', 'Expense'].includes(row.entity_type), `bad entity_type ${row.entity_type}`);
    assert.ok(row.qty_per_assembly > 0 && row.available_qty >= 0);
  }
  assert.strictEqual(Object.keys(meta.supplier_index).length, 87);
  assert.ok(meta.suppliers_count >= 87);
  assert.strictEqual(meta.routing_operations.length, 12);
  for (const s of Object.values(meta.stock_by_part)) assert.ok(s.available_qty >= 0 && s.uom && s.value_currency);
  for (const k of ['supplier_lead_time_days', 'arrival_delay_days', 'production_duration_days', 'ship_delay_days']) {
    assert.ok(Number.isFinite(meta.distribution_stats[k].mean), `distribution_stats.${k} missing`);
  }
});

test('vcsim: engine is deterministic per seed and horizon-prefix consistent (Step Forward replay)', () => {
  const a = vcsRun(30);
  const b = vcsRun(30);
  const c = vcsRun(30, {}, 7);
  assert.deepStrictEqual(a.kpis, b.kpis);
  assert.deepStrictEqual(a.demand_events, b.demand_events);
  assert.notDeepStrictEqual(a.demand_events, c.demand_events);
  const short = vcsRun(7);
  assert.ok(short.demand_events.length > 0);
  assert.deepStrictEqual(a.demand_events.slice(0, short.demand_events.length), short.demand_events, 'first 7 days must replay identically');
  assert.deepStrictEqual(a.timeseries.slice(0, short.timeseries.length), short.timeseries);
});

test('vcsim: results are bounded and shaped like the twin /api/demo/simulate contract', () => {
  const r = vcsRun(60);
  const k = r.kpis;
  assert.strictEqual(k.horizon_days, 60);
  assert.strictEqual(k.product_id, '021XBXXXXXXF04');
  assert.ok(k.service_level >= 0 && k.service_level <= 1);
  for (const [key, v] of Object.entries(k)) if (typeof v === 'number') assert.ok(Number.isFinite(v), `kpi ${key} not finite`);
  assert.strictEqual(r.timeseries.length, 240);
  assert.strictEqual(r.timeseries[0].time_days, 0);
  assert.ok(r.demand_events.length > 0 && r.production_events.length > 0 && r.shipment_events.length > 0);
  assert.ok(r.level_events.some((e) => e.phase === 'procurement') && r.level_events.some((e) => e.phase === 'assembly'));
  assert.deepStrictEqual(r.hierarchy_summary.assembly_plan_order.slice(-1), ['021XBXXXXXXF04']);
  assert.strictEqual(k.n_assembly_levels, r.hierarchy_summary.assembly_plan_order.length);
  assert.ok(Object.keys(r.hierarchy_summary.by_part).length >= 92, 'every part gets a live aggregate');
  const produced = r.production_events.reduce((s, e) => s + e.finished_output_qty, 0);
  assert.ok(Math.abs(k.cumulative_produced - produced) < 0.05, 'cumulative production must equal batch output');
  assert.ok(Math.abs(k.shipped_qty - r.shipment_events.reduce((s, e) => s + e.alloc_qty, 0)) < 0.05);
  for (const e of r.shipment_events) {
    assert.ok(e.delivery_time <= 60 && e.order_time <= e.dispatch_time && e.dispatch_time <= e.delivery_time);
  }
  for (const e of r.production_events) assert.ok(e.t_release <= e.t_output && e.t_output <= 60 && e.completion_rate > 0 && e.completion_rate <= 1);
  for (const p of Object.values(r.hierarchy_summary.by_part)) assert.ok(p.ending_inventory >= -1e-6, `${p.part_no} negative inventory`);
});

test('vcsim: shocks move KPIs in the expected direction and compose additively', () => {
  const base = vcsRun(90).kpis;
  const demand = vcsRun(90, { Sales_Qty_pct: 50 }).kpis;
  assert.ok(demand.total_demand_qty > base.total_demand_qty, 'sales shock must raise demand');
  const slow = vcsRun(90, { Production_Duration_Days_pct: 200 });
  assert.ok(
    slow.kpis.service_level < base.service_level || slow.kpis.ending_backlog_qty > base.ending_backlog_qty,
    'slower production must hurt service or build backlog',
  );
  const ship = vcsRun(90, { Ship_Delay_Days_pct: 300 }).kpis;
  assert.ok(ship.avg_total_lead_days > base.avg_total_lead_days, 'ship delay must lengthen order-to-delivery lead time');
  const node = vcsRun(90, {}, 42, { '021XBXXXXXXF04': { scope: 'subtree', values: { Production_Duration_Days_pct: 200 } } });
  assert.deepStrictEqual(node.kpis, slow.kpis, 'a subtree shock on the root must equal the same global production shock');
  const excess = vcsRun(90, { Order_Quantity_pct: 100 });
  const excessQty = excess.level_events
    .filter((e) => e.phase === 'procurement')
    .reduce((s, e) => s + e.parts_detail.reduce((ss, p) => ss + (p.qty_excess_to_stock || 0), 0), 0);
  assert.ok(excessQty > 0, 'order quantity shock must leave excess in the warehouse');
});

console.log(`\n${passed} test(s) passed${process.exitCode ? ', with failures' : ''}.`);
