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
  for (const p of [mfg.MFG_SIM_MOCK_PROVENANCE, modss.MODSS_MOCK_PROVENANCE, sust.SUSTAINABILITY_MOCK_PROVENANCE, dkg.DKG_MOCK_PROVENANCE]) {
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

console.log(`\n${passed} test(s) passed${process.exitCode ? ', with failures' : ''}.`);
