/*
 * QA static verification for the four formerly "planned" pages (2026-09-17, dmaast-qa-agent).
 * Independent of tests/mock-modules.verify.cjs: checks source wiring, mock marking,
 * secret/live-data hygiene and permission gating by reading the TS/TSX sources.
 * Run: node tests/qa-mock-pages.verify.cjs
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const APP = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(APP, rel), 'utf8');

const PAGES = {
  'src/pages/decision-support/ManufacturingSim.tsx': 'MFG_SIM_MOCK_PROVENANCE',
  'src/pages/decision-support/MODSS.tsx': 'MODSS_MOCK_PROVENANCE',
  'src/pages/digital-twin/SustainabilityDT.tsx': 'SUSTAINABILITY_MOCK_PROVENANCE',
  'src/pages/DecisionKnowledgeGraph.tsx': 'DKG_MOCK_PROVENANCE',
};
const MOCKS = [
  'src/data/mock/manufacturingSimMock.ts',
  'src/data/mock/modssMock.ts',
  'src/data/mock/sustainabilityMock.ts',
  'src/data/mock/knowledgeGraphMock.ts',
];

let passed = 0;
function test(name, fn) {
  try { fn(); passed += 1; console.log(`PASS ${name}`); }
  catch (e) { console.log(`FAIL ${name}: ${e.message}`); process.exitCode = 1; }
}

test('pages: no PlannedModule import or JSX usage in the four pages', () => {
  for (const rel of Object.keys(PAGES)) {
    const src = read(rel);
    assert.ok(!/from\s+['"].*PlannedModule['"]/.test(src), `${rel} imports PlannedModule`);
    assert.ok(!/<PlannedModule\b/.test(src), `${rel} renders PlannedModule`);
  }
});

test('pages: each page renders MockDataBadge and MockDataNotice with its provenance note', () => {
  for (const [rel, prov] of Object.entries(PAGES)) {
    const src = read(rel);
    assert.ok(/<MockDataBadge\b/.test(src), `${rel} missing <MockDataBadge>`);
    assert.ok(new RegExp(`<MockDataNotice[^>]*${prov}\.note`).test(src), `${rel} missing <MockDataNotice text={${prov}.note}>`);
  }
});

test('mocks: every mock module exports a kind=mock provenance constant', () => {
  for (const rel of MOCKS) {
    const src = read(rel);
    assert.ok(/export const \w+_MOCK_PROVENANCE\s*=/.test(src), `${rel} missing *_MOCK_PROVENANCE`);
    assert.ok(/kind:\s*'mock'/.test(src), `${rel} missing kind: 'mock'`);
  }
});

test('hygiene: no secrets, credentials, URLs or live-data access in mocks and pages', () => {
  const bad = /(secret|token|password|passwd|api[_-]?key|bearer|authorization|supabase|postgres:\/\/|mongodb:\/\/|https?:\/\/|import\.meta\.env|process\.env|fetch\(|axios|XMLHttpRequest|localStorage|eyJ[A-Za-z0-9_-]{10,}|sk-[A-Za-z0-9]{10,})/i;
  for (const rel of [...MOCKS, ...Object.keys(PAGES)]) {
    const lines = read(rel).split(/\r?\n/);
    lines.forEach((line, i) => {
      assert.ok(!bad.test(line), `${rel}:${i + 1} suspicious content: ${line.trim().slice(0, 80)}`);
    });
  }
});

test('permissions: run/decide actions are gated by hasPermission in the pages', () => {
  const mfg = read('src/pages/decision-support/ManufacturingSim.tsx');
  assert.ok(/hasPermission\('canRunSimulations'\)/.test(mfg), 'ManufacturingSim does not query canRunSimulations');
  assert.ok((mfg.match(/disabled=\{!canRun/g) || []).length >= 2, 'ManufacturingSim run controls not disabled by canRun');
  assert.ok(/if \(!canRun/.test(mfg), 'ManufacturingSim handleRun lacks canRun guard');
  const modss = read('src/pages/decision-support/MODSS.tsx');
  assert.ok(/hasPermission\('canOverrideOptimization'\)/.test(modss), 'MODSS does not query canOverrideOptimization');
  assert.ok((modss.match(/disabled=\{!canDecide\}/g) || []).length >= 2, 'MODSS approve/reject not disabled by canDecide');
  assert.ok(/if \(!canDecide\) return;/.test(modss), 'MODSS record() lacks canDecide guard');
  const role = read('src/contexts/RoleContext.tsx');
  assert.ok(/canRunSimulations: boolean/.test(role) && /canOverrideOptimization: boolean/.test(role), 'RoleContext lacks the permission keys');
});

test('config: adminConfig has no page with planned:true; routes exist for all four pages', () => {
  const admin = read('src/data/adminConfig.ts');
  assert.ok(!/planned:\s*true/.test(admin), 'adminConfig still flags a page as planned');
  const app = read('src/App.tsx');
  for (const r of ['manufacturing-sim', 'mo-dss', 'sustainability', 'knowledge-graph']) {
    assert.ok(new RegExp(`path="${r}"`).test(app), `App.tsx missing route ${r}`);
  }
  for (const c of ['ManufacturingSim', 'MODSS', 'SustainabilityDT', 'DecisionKnowledgeGraph']) {
    assert.ok(app.includes(`<${c} />`) || app.includes(`<${c}/>`), `App.tsx does not mount ${c}`);
  }
});

console.log(`\n${passed} test(s) passed${process.exitCode ? ', with failures' : ''}.`);
