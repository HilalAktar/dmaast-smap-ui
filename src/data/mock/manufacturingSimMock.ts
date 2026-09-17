/**
 * MOCK DATA — Manufacturing Simulation (`/digital-twin/manufacturing-sim`).
 *
 * Kullanıcı kararı (Asrınalp Şahin, 2026-09-17): "Planned" yer tutucu sayfa,
 * çalışan bir MOCK simülasyon modülüyle dolduruldu. Buradaki her değer sentetik
 * ve deterministiktir (seed'li PRNG); dijital ikiz çıktısı, ERP/MES verisi veya
 * kalibre edilmiş parametre DEĞİLDİR. Canlı kaynağa geçişte bu modülün yerini
 * SMAP backend simülasyon API'si alır (sahibi: dmaast-smap-backend-agent).
 *
 * Parametre adları, Value Chain Simulation'ın kullandığı SimulationResultV1
 * `ShockConfig` anahtarlarıyla AYNIDIR (Sales_Qty_pct, Production_Duration_Days_pct,
 * ...; JPB'ye özgü Rework_pct / Quality_Hold_pct) — böylece canlı twin'e bağlanırken
 * knob sözleşmesi değişmez.
 */
import type { Company } from '../../contexts/CompanyContext';

export const MFG_SIM_MOCK_PROVENANCE = {
  kind: 'mock' as const,
  module: 'manufacturing-sim',
  note: 'Synthetic, deterministic mock engine for UI design — not a digital-twin run, no ERP/MES data, not calibrated.',
  createdAt: '2026-09-17',
};

export type MfgSimParamKey =
  | 'Sales_Qty_pct'
  | 'Production_Duration_Days_pct'
  | 'Completion_Rate_pct'
  | 'Defect_Rate_pct'
  | 'Rework_pct'
  | 'Quality_Hold_pct';

export interface MfgSimParameter {
  key: MfgSimParamKey;
  label: string;
  description: string;
  /** Yüzde sapma; baseline = 0 */
  min: number;
  max: number;
  step: number;
  scope: Company | 'both';
}

export const MFG_SIM_PARAMETERS: MfgSimParameter[] = [
  { key: 'Sales_Qty_pct', label: 'Sales Quantity', description: 'Demand deviation from baseline (customer layer).', min: -50, max: 50, step: 5, scope: 'both' },
  { key: 'Production_Duration_Days_pct', label: 'Production Duration', description: 'Processing / cycle-time deviation (production layer).', min: -50, max: 50, step: 5, scope: 'both' },
  { key: 'Completion_Rate_pct', label: 'Completion Rate', description: 'Share of started batches completed on time.', min: -30, max: 20, step: 5, scope: 'both' },
  { key: 'Defect_Rate_pct', label: 'Defect Rate', description: 'Relative change of the defect rate (quality layer).', min: -50, max: 100, step: 10, scope: 'both' },
  { key: 'Rework_pct', label: 'Rework', description: 'Share of parts routed through the RETCH rework phase (JPB event layer).', min: 0, max: 100, step: 10, scope: 'jpb' },
  { key: 'Quality_Hold_pct', label: 'Quality Hold', description: 'Quarantine / blocking duration deviation (JPB event layer).', min: 0, max: 100, step: 10, scope: 'jpb' },
];

export type MfgSimParams = Partial<Record<MfgSimParamKey, number>>;

export type MfgSimScenarioCategory = 'baseline' | 'stress' | 'improvement';

export interface MfgSimScenario {
  id: string;
  name: string;
  description: string;
  category: MfgSimScenarioCategory;
  scope: Company | 'both';
  params: MfgSimParams;
}

/** Presetler .openclaw/SCENARIOS.md kategorilerine (baseline / stress) ve KAM/JPB senaryo notlarına göre adlandırıldı. */
export const MFG_SIM_SCENARIOS: MfgSimScenario[] = [
  { id: 'baseline', name: 'Baseline', description: 'No shocks — current plan as-is.', category: 'baseline', scope: 'both', params: {} },
  { id: 'demand-surge', name: 'Demand Surge +30%', description: 'Sustained demand above capacity.', category: 'stress', scope: 'both', params: { Sales_Qty_pct: 30 } },
  { id: 'demand-drop', name: 'Demand Drop −40%', description: 'Sharp demand collapse (COVID-19-type reference).', category: 'stress', scope: 'both', params: { Sales_Qty_pct: -40 } },
  { id: 'machine-slowdown', name: 'Machine Slowdown +25%', description: 'Degraded equipment — processing time up 25%.', category: 'stress', scope: 'both', params: { Production_Duration_Days_pct: 25 } },
  { id: 'quality-drift', name: 'Quality Drift', description: 'Defect rate up 40%, completion rate down 10%.', category: 'stress', scope: 'both', params: { Defect_Rate_pct: 40, Completion_Rate_pct: -10 } },
  { id: 'kam-lean-cell', name: 'Lean Assembly Cell', description: 'Cycle time −15% and completion +5% after cell re-balancing.', category: 'improvement', scope: 'kam', params: { Production_Duration_Days_pct: -15, Completion_Rate_pct: 5 } },
  { id: 'jpb-rework-wave', name: 'Rework Wave', description: 'Rework +50% and quality holds +30% on the machining line.', category: 'stress', scope: 'jpb', params: { Rework_pct: 50, Quality_Hold_pct: 30 } },
  { id: 'jpb-machining-upgrade', name: 'USI10 Machining Upgrade', description: 'New machining centre: duration −20%, defects −25%.', category: 'improvement', scope: 'jpb', params: { Production_Duration_Days_pct: -20, Defect_Rate_pct: -25 } },
];

export interface MfgSimStation {
  id: string;
  name: string;
  utilizationPct: number;
  cycleTimeSec: number;
}

export interface MfgSimKpis {
  throughputUnitsPerDay: number;
  oeePct: number;
  yieldPct: number;
  leadTimeDays: number;
  wipUnits: number;
  backlogUnits: number;
}

export interface MfgSimBaseline {
  productId: string;
  productLabel: string;
  horizonDays: number;
  dailyDemandUnits: number;
  stations: MfgSimStation[];
  kpis: MfgSimKpis;
}

/** Firma bazlı baseline — ürün kimlikleri sim sözleşmesi README'siyle uyumlu; rakamlar mock. */
export const MFG_SIM_BASELINES: Record<Company, MfgSimBaseline> = {
  kam: {
    productId: '021XBXXXXXXF04',
    productLabel: 'Water-meter PCB assembly (F04 variant)',
    horizonDays: 30,
    dailyDemandUnits: 1200,
    stations: [
      { id: 'smt', name: 'SMT Placement', utilizationPct: 78, cycleTimeSec: 42 },
      { id: 'reflow-aoi', name: 'Reflow & AOI', utilizationPct: 71, cycleTimeSec: 38 },
      { id: 'final-assembly', name: 'Final Assembly', utilizationPct: 86, cycleTimeSec: 55 },
      { id: 'calibration-test', name: 'Calibration & Test', utilizationPct: 92, cycleTimeSec: 60 },
      { id: 'packaging', name: 'Packaging', utilizationPct: 64, cycleTimeSec: 30 },
    ],
    kpis: { throughputUnitsPerDay: 1180, oeePct: 74.5, yieldPct: 97.8, leadTimeDays: 6.4, wipUnits: 3400, backlogUnits: 120 },
  },
  jpb: {
    productId: 'ST5253-06',
    productLabel: 'LULYLOK lock nut (pilot reference)',
    horizonDays: 30,
    dailyDemandUnits: 5200,
    stations: [
      { id: 'usi10', name: 'USI10 Machining', utilizationPct: 91, cycleTimeSec: 48 },
      { id: 'contr', name: 'CONTR Control', utilizationPct: 68, cycleTimeSec: 20 },
      { id: 'carre', name: 'CARRE Squaring', utilizationPct: 75, cycleTimeSec: 26 },
      { id: 'ebavm', name: 'EBAVM Deburring', utilizationPct: 72, cycleTimeSec: 24 },
      { id: 'exped', name: 'Packing & Shipping', utilizationPct: 58, cycleTimeSec: 15 },
    ],
    kpis: { throughputUnitsPerDay: 5050, oeePct: 69.8, yieldPct: 98.9, leadTimeDays: 11.2, wipUnits: 28000, backlogUnits: 900 },
  },
};

export interface MfgSimSeriesPoint {
  day: number;
  demand: number;
  baseline: number;
  scenario: number;
}

export interface MfgSimUtilRow {
  station: string;
  baseline: number;
  scenario: number;
}

export type MfgSimSeverity = 'ok' | 'watch' | 'critical';

export interface MfgSimBottleneck {
  station: string;
  loadPct: number;
  queueUnits: number;
  severity: MfgSimSeverity;
}

export interface MfgSimResult {
  company: Company;
  scenarioId: string;
  params: MfgSimParams;
  seed: number;
  horizonDays: number;
  generatedAt: string;
  baseline: MfgSimKpis;
  scenario: MfgSimKpis;
  dailyOutput: MfgSimSeriesPoint[];
  stationUtilization: MfgSimUtilRow[];
  bottlenecks: MfgSimBottleneck[];
}

export function getMfgSimParameters(company: Company): MfgSimParameter[] {
  return MFG_SIM_PARAMETERS.filter((p) => p.scope === 'both' || p.scope === company);
}

export function getMfgSimScenarios(company: Company): MfgSimScenario[] {
  return MFG_SIM_SCENARIOS.filter((s) => s.scope === 'both' || s.scope === company);
}

/** mulberry32 — küçük, deterministik PRNG (aynı seed → aynı sonuç). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const factor = (p: MfgSimParams, k: MfgSimParamKey): number => 1 + (p[k] ?? 0) / 100;
const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
const round = (v: number, d = 1): number => Math.round(v * 10 ** d) / 10 ** d;

export function severityOf(loadPct: number): MfgSimSeverity {
  if (loadPct >= 100) return 'critical';
  if (loadPct >= 85) return 'watch';
  return 'ok';
}

/**
 * Deterministik MOCK motor. Basit, açıklanabilir kurallar:
 *  - kapasite = baseline verimlilik × tamamlanma / süre × (verim oranı) / (rework yükü)
 *  - üretim = min(kapasite, talep + birikmiş backlog); backlog gün gün birikir
 *  - istasyon yükü = baseline yük × (talep/baseline talep) × süre / tamamlanma
 *  - lead time / WIP, en yüklü istasyonun %85 üzerindeki sıkışıklığıyla büyür
 */
export function runMockManufacturingSim(
  company: Company,
  scenarioId: string,
  params: MfgSimParams,
  seed = 42,
): MfgSimResult {
  const base = MFG_SIM_BASELINES[company];
  const rnd = mulberry32(seed);

  const duration = factor(params, 'Production_Duration_Days_pct');
  const completion = factor(params, 'Completion_Rate_pct');
  const demandF = factor(params, 'Sales_Qty_pct');
  const defectF = factor(params, 'Defect_Rate_pct');
  const reworkF = company === 'jpb' ? factor(params, 'Rework_pct') : 1;
  const holdF = company === 'jpb' ? factor(params, 'Quality_Hold_pct') : 1;

  const baseDefect = 100 - base.kpis.yieldPct;
  const yieldPct = clamp(100 - baseDefect * defectF, 0, 100);
  const capacity =
    (base.kpis.throughputUnitsPerDay * completion * (yieldPct / base.kpis.yieldPct)) /
    duration /
    (1 + (reworkF - 1) * 0.15);
  const demand = base.dailyDemandUnits * demandF;

  const load = (demandF * duration) / completion;
  const stationUtilization: MfgSimUtilRow[] = base.stations.map((s) => ({
    station: s.name,
    baseline: s.utilizationPct,
    scenario: round(clamp(s.utilizationPct * load * (1 + (reworkF - 1) * 0.1), 0, 140)),
  }));
  const maxLoad = Math.max(...stationUtilization.map((r) => r.scenario));
  const congestion = Math.max(0, maxLoad - 85) / 100;

  // Günlük seri — baseline ve senaryo aynı gürültü akışını paylaşır (adil karşılaştırma).
  const dailyOutput: MfgSimSeriesPoint[] = [];
  let backlogBase = base.kpis.backlogUnits;
  let backlogScn = base.kpis.backlogUnits;
  for (let day = 1; day <= base.horizonDays; day++) {
    const noise = 0.92 + rnd() * 0.16;
    const capNoise = 0.96 + rnd() * 0.08;
    const dBase = base.dailyDemandUnits * noise;
    const dScn = demand * noise;
    const outBase = Math.min(base.kpis.throughputUnitsPerDay * capNoise, dBase + backlogBase);
    const outScn = Math.min(capacity * capNoise, dScn + backlogScn);
    backlogBase = Math.max(0, backlogBase + dBase - outBase);
    backlogScn = Math.max(0, backlogScn + dScn - outScn);
    dailyOutput.push({ day, demand: Math.round(dScn), baseline: Math.round(outBase), scenario: Math.round(outScn) });
  }

  const throughput = dailyOutput.reduce((s, p) => s + p.scenario, 0) / dailyOutput.length;
  const scenario: MfgSimKpis = {
    throughputUnitsPerDay: Math.round(throughput),
    oeePct: round(clamp(base.kpis.oeePct * Math.min(1, 1 / duration) * (yieldPct / base.kpis.yieldPct) * Math.min(1, completion), 0, 100)),
    yieldPct: round(yieldPct),
    leadTimeDays: round(base.kpis.leadTimeDays * duration * (1 + congestion * 1.5) * (1 + (reworkF - 1) * 0.2) * (1 + (holdF - 1) * 0.25)),
    wipUnits: Math.round(base.kpis.wipUnits * duration * (1 + congestion) * (1 + (holdF - 1) * 0.3)),
    backlogUnits: Math.round(backlogScn),
  };

  const overloadSum = stationUtilization.reduce((s, r) => s + Math.max(0, r.scenario - 70), 0) || 1;
  const bottlenecks: MfgSimBottleneck[] = stationUtilization
    .map((r) => ({
      station: r.station,
      loadPct: r.scenario,
      queueUnits: Math.round((scenario.wipUnits * Math.max(0, r.scenario - 70)) / overloadSum),
      severity: severityOf(r.scenario),
    }))
    .sort((a, b) => b.loadPct - a.loadPct);

  return {
    company,
    scenarioId,
    params: { ...params },
    seed,
    horizonDays: base.horizonDays,
    generatedAt: new Date().toISOString(),
    baseline: { ...base.kpis },
    scenario,
    dailyOutput,
    stationUtilization,
    bottlenecks,
  };
}
