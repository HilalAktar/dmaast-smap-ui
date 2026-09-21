/**
 * MOCK DATA — Multi-Objective Decision Support (`/decision-support/mo-dss`).
 *
 * Kullanıcı kararı (Asrınalp Şahin, 2026-09-17): "Planned" yer tutucu sayfa,
 * adına uygun MOCK içerikle dolduruldu. Amaç fonksiyonları, aday çözümler,
 * karar değişkenleri ve öneriler sentetiktir; MO-DDSS optimizasyon çıktısı
 * DEĞİLDİR. Canlı kaynak: MO-DDSS entegrasyon yüzeyi (dmaast-smap-backend-agent).
 *
 * Amaç adları KAM/JPB KPI bilgi dosyalarındaki adlandırmayı izler
 * (.openclaw/knowledge/usecases/{kam,jpb}/kpi.md): KAM demo hedefleri
 * warehouse minimization / E2E lead-time reduction / service level; JPB OTD,
 * envanter değeri, darboğaz yükü, hurda faktörü. Hedef/eşik değerleri mock'tur.
 */
import type { Company } from '../../contexts/CompanyContext';

export const MODSS_MOCK_PROVENANCE = {
  kind: 'mock' as const,
  module: 'mo-dss',
  note: 'Synthetic Pareto candidates and weighted ranking for UI design — not an MO-DDSS optimisation result.',
  createdAt: '2026-09-17',
};

export type ObjectiveDirection = 'min' | 'max';

export interface ModssObjective {
  id: string;
  label: string;
  unit: string;
  direction: ObjectiveDirection;
  description: string;
  /** Değerlendirme penceresi — mock */
  window: string;
  /** Varsa hedef/eşik (mock) */
  target?: number;
}

export interface ModssDecision {
  label: string;
  value: string;
}

export interface ModssSolution {
  id: string;
  name: string;
  strategy: string;
  objectives: Record<string, number>;
  decisions: ModssDecision[];
  /** Mock Pareto işareti — sıralamada gösterilir */
  paretoOptimal: boolean;
}

export interface ModssRecommendation {
  id: string;
  title: string;
  rationale: string;
  solutionId: string;
  confidence: 'low' | 'medium' | 'high';
}

export interface ModssModel {
  company: Company;
  /** Mevcut plan (karşılaştırma tabanı) */
  baselineId: string;
  objectives: ModssObjective[];
  solutions: ModssSolution[];
  recommendations: ModssRecommendation[];
  defaultWeights: Record<string, number>;
}

export const MODSS_MOCK: Record<Company, ModssModel> = {
  kam: {
    company: 'kam',
    baselineId: 'kam-s0',
    objectives: [
      { id: 'avg_inventory', label: 'Average Inventory', unit: 'units', direction: 'min', description: 'Warehouse minimisation goal — average on-hand stock of the F04 variant.', window: '120-day horizon' },
      { id: 'e2e_lead_time', label: 'E2E Lead Time', unit: 'days', direction: 'min', description: 'Order-to-ship lead time across the value chain.', window: '120-day horizon' },
      { id: 'service_level', label: 'Service Level', unit: '%', direction: 'max', description: 'Shipped quantity over total demand.', window: '120-day horizon', target: 95 },
      { id: 'operating_cost', label: 'Operating Cost Index', unit: 'idx', direction: 'min', description: 'Relative operating cost, current plan = 100.', window: 'per quarter' },
    ],
    defaultWeights: { avg_inventory: 30, e2e_lead_time: 30, service_level: 30, operating_cost: 10 },
    solutions: [
      { id: 'kam-s0', name: 'S0 · Current plan', strategy: 'As-is base-stock policy', paretoOptimal: false, objectives: { avg_inventory: 32, e2e_lead_time: 8.3, service_level: 85.8, operating_cost: 100 }, decisions: [{ label: 'Safety stock', value: '30 units' }, { label: 'Min lot size', value: '30 units' }, { label: 'Review interval', value: '1 day' }, { label: 'Assembly lines', value: '2' }] },
      { id: 'kam-s1', name: 'S1 · Safety stock +20%', strategy: 'Buffer against supplier variability', paretoOptimal: true, objectives: { avg_inventory: 40, e2e_lead_time: 7.1, service_level: 93.0, operating_cost: 104 }, decisions: [{ label: 'Safety stock', value: '36 units' }, { label: 'Min lot size', value: '30 units' }, { label: 'Review interval', value: '1 day' }, { label: 'Assembly lines', value: '2' }] },
      { id: 'kam-s2', name: 'S2 · Lot size −30%', strategy: 'Smaller, more frequent batches', paretoOptimal: true, objectives: { avg_inventory: 26, e2e_lead_time: 7.8, service_level: 88.0, operating_cost: 103 }, decisions: [{ label: 'Safety stock', value: '30 units' }, { label: 'Min lot size', value: '21 units' }, { label: 'Review interval', value: '1 day' }, { label: 'Assembly lines', value: '2' }] },
      { id: 'kam-s3', name: 'S3 · Dual sourcing', strategy: 'Second source for critical PCB components', paretoOptimal: true, objectives: { avg_inventory: 34, e2e_lead_time: 6.2, service_level: 95.0, operating_cost: 108 }, decisions: [{ label: 'Safety stock', value: '30 units' }, { label: 'Suppliers (critical parts)', value: '2' }, { label: 'Review interval', value: '1 day' }, { label: 'Assembly lines', value: '2' }] },
      { id: 'kam-s4', name: 'S4 · Capacity +1 line', strategy: 'Add a third assembly line', paretoOptimal: true, objectives: { avg_inventory: 30, e2e_lead_time: 5.9, service_level: 96.0, operating_cost: 112 }, decisions: [{ label: 'Safety stock', value: '30 units' }, { label: 'Min lot size', value: '30 units' }, { label: 'Review interval', value: '1 day' }, { label: 'Assembly lines', value: '3' }] },
      { id: 'kam-s5', name: 'S5 · Review interval 0.5 d', strategy: 'Twice-daily replenishment review', paretoOptimal: false, objectives: { avg_inventory: 29, e2e_lead_time: 7.4, service_level: 90.0, operating_cost: 102 }, decisions: [{ label: 'Safety stock', value: '30 units' }, { label: 'Min lot size', value: '30 units' }, { label: 'Review interval', value: '0.5 day' }, { label: 'Assembly lines', value: '2' }] },
      { id: 'kam-s6', name: 'S6 · Minimum inventory', strategy: 'Aggressive stock reduction', paretoOptimal: true, objectives: { avg_inventory: 18, e2e_lead_time: 9.6, service_level: 79.0, operating_cost: 97 }, decisions: [{ label: 'Safety stock', value: '15 units' }, { label: 'Min lot size', value: '20 units' }, { label: 'Review interval', value: '2 days' }, { label: 'Assembly lines', value: '2' }] },
      { id: 'kam-s7', name: 'S7 · Balanced', strategy: 'Moderate buffer + smaller lots', paretoOptimal: true, objectives: { avg_inventory: 31, e2e_lead_time: 6.8, service_level: 92.0, operating_cost: 105 }, decisions: [{ label: 'Safety stock', value: '33 units' }, { label: 'Min lot size', value: '24 units' }, { label: 'Review interval', value: '1 day' }, { label: 'Assembly lines', value: '2' }] },
    ],
    recommendations: [
      { id: 'kam-r1', title: 'Balanced policy (S7) is the safest first step', rationale: 'Improves lead time and service level without a capacity investment; inventory stays near the current level.', solutionId: 'kam-s7', confidence: 'medium' },
      { id: 'kam-r2', title: 'Dual sourcing (S3) if supplier-delay risk persists', rationale: 'Largest lead-time gain among non-capex options; cost index +8 should be validated with purchasing.', solutionId: 'kam-s3', confidence: 'medium' },
      { id: 'kam-r3', title: 'Avoid minimum-inventory (S6) under demand surge', rationale: 'Service level drops below 80% in the demand-surge stress scenario.', solutionId: 'kam-s6', confidence: 'high' },
    ],
  },
  jpb: {
    company: 'jpb',
    baselineId: 'jpb-s0',
    objectives: [
      { id: 'otd', label: 'On-Time Delivery (OTD)', unit: '%', direction: 'max', description: 'Deliveries on or before the confirmed date.', window: 'rolling 90 days', target: 97 },
      { id: 'inventory_value', label: 'Inventory Value', unit: 'kEUR', direction: 'min', description: 'Raw + WIP + finished goods at purchase-price valuation.', window: 'month end' },
      { id: 'bottleneck_load', label: 'Bottleneck Load (USI10)', unit: '%', direction: 'min', description: 'Capacity load of the machining work centre.', window: 'rolling 4 weeks' },
      { id: 'scrap_factor', label: 'Scrap Factor', unit: '%', direction: 'min', description: 'Damaged parts over produced parts.', window: 'rolling 90 days' },
    ],
    defaultWeights: { otd: 40, inventory_value: 20, bottleneck_load: 25, scrap_factor: 15 },
    solutions: [
      { id: 'jpb-s0', name: 'S0 · Current plan', strategy: 'As-is planning', paretoOptimal: false, objectives: { otd: 96.2, inventory_value: 1850, bottleneck_load: 94, scrap_factor: 0.90 }, decisions: [{ label: 'USI10 shifts', value: '2' }, { label: 'Subcontract share', value: '0%' }, { label: 'FG safety stock', value: 'current' }, { label: 'Quality gate', value: 'end of line' }] },
      { id: 'jpb-s1', name: 'S1 · Subcontract overflow', strategy: 'Route 15% of USI10 load to a subcontractor', paretoOptimal: true, objectives: { otd: 97.8, inventory_value: 1900, bottleneck_load: 82, scrap_factor: 0.90 }, decisions: [{ label: 'USI10 shifts', value: '2' }, { label: 'Subcontract share', value: '15%' }, { label: 'FG safety stock', value: 'current' }, { label: 'Quality gate', value: 'end of line' }] },
      { id: 'jpb-s2', name: 'S2 · Second shift USI10', strategy: 'Add a night shift on machining', paretoOptimal: true, objectives: { otd: 98.4, inventory_value: 1820, bottleneck_load: 78, scrap_factor: 1.00 }, decisions: [{ label: 'USI10 shifts', value: '3' }, { label: 'Subcontract share', value: '0%' }, { label: 'FG safety stock', value: 'current' }, { label: 'Quality gate', value: 'end of line' }] },
      { id: 'jpb-s3', name: 'S3 · Lot consolidation', strategy: 'Fewer, larger machining lots', paretoOptimal: true, objectives: { otd: 95.1, inventory_value: 1600, bottleneck_load: 90, scrap_factor: 0.80 }, decisions: [{ label: 'USI10 shifts', value: '2' }, { label: 'Lot size', value: '+40%' }, { label: 'FG safety stock', value: '−10%' }, { label: 'Quality gate', value: 'end of line' }] },
      { id: 'jpb-s4', name: 'S4 · FG safety stock +15%', strategy: 'Protect OTD with finished-goods buffer', paretoOptimal: true, objectives: { otd: 98.9, inventory_value: 2100, bottleneck_load: 94, scrap_factor: 0.90 }, decisions: [{ label: 'USI10 shifts', value: '2' }, { label: 'Subcontract share', value: '0%' }, { label: 'FG safety stock', value: '+15%' }, { label: 'Quality gate', value: 'end of line' }] },
      { id: 'jpb-s5', name: 'S5 · Quality gate at CONTR', strategy: 'Move inspection before squaring', paretoOptimal: true, objectives: { otd: 97.0, inventory_value: 1870, bottleneck_load: 95, scrap_factor: 0.60 }, decisions: [{ label: 'USI10 shifts', value: '2' }, { label: 'Subcontract share', value: '0%' }, { label: 'FG safety stock', value: 'current' }, { label: 'Quality gate', value: 'after CONTR' }] },
      { id: 'jpb-s6', name: 'S6 · Preventive maintenance +', strategy: 'Weekly PM slot on USI10', paretoOptimal: false, objectives: { otd: 97.5, inventory_value: 1840, bottleneck_load: 88, scrap_factor: 0.85 }, decisions: [{ label: 'USI10 shifts', value: '2' }, { label: 'PM slots', value: 'weekly' }, { label: 'FG safety stock', value: 'current' }, { label: 'Quality gate', value: 'end of line' }] },
      { id: 'jpb-s7', name: 'S7 · Balanced', strategy: 'Subcontract 8% + quality gate at CONTR', paretoOptimal: true, objectives: { otd: 98.0, inventory_value: 1780, bottleneck_load: 84, scrap_factor: 0.80 }, decisions: [{ label: 'USI10 shifts', value: '2' }, { label: 'Subcontract share', value: '8%' }, { label: 'FG safety stock', value: 'current' }, { label: 'Quality gate', value: 'after CONTR' }] },
    ],
    recommendations: [
      { id: 'jpb-r1', title: 'Balanced (S7) keeps OTD ≥ 97% with less inventory', rationale: 'Meets the OTD target while reducing inventory value and bottleneck load together.', solutionId: 'jpb-s7', confidence: 'medium' },
      { id: 'jpb-r2', title: 'Second shift (S2) for a sustained demand increase', rationale: 'Largest bottleneck-load relief; scrap slightly higher on the night shift.', solutionId: 'jpb-s2', confidence: 'medium' },
      { id: 'jpb-r3', title: 'Lot consolidation (S3) trades OTD for inventory', rationale: 'Falls below the 97% OTD target — only acceptable in a demand-drop scenario.', solutionId: 'jpb-s3', confidence: 'high' },
    ],
  },
};

export interface RankedSolution {
  solution: ModssSolution;
  /** 0–100; yüksek = ağırlıklara göre daha iyi */
  score: number;
  rank: number;
}

/**
 * Ağırlıklı, yön-duyarlı min-max normalizasyonu (mock sıralama).
 * Ağırlıklar toplamına normalize edilir; toplam 0 ise eşit ağırlık kullanılır.
 */
export function rankSolutions(model: ModssModel, weights: Record<string, number>): RankedSolution[] {
  const ids = model.objectives.map((o) => o.id);
  const rawTotal = ids.reduce((s, id) => s + Math.max(0, weights[id] ?? 0), 0);
  const w = (id: string) => (rawTotal > 0 ? Math.max(0, weights[id] ?? 0) / rawTotal : 1 / ids.length);

  const ranges = model.objectives.map((o) => {
    const values = model.solutions.map((s) => s.objectives[o.id] ?? 0);
    return { id: o.id, direction: o.direction, min: Math.min(...values), max: Math.max(...values) };
  });

  const scored = model.solutions.map((solution) => {
    const score = ranges.reduce((acc, r) => {
      const v = solution.objectives[r.id] ?? 0;
      const span = r.max - r.min;
      const norm = span === 0 ? 1 : (v - r.min) / span;
      const utility = r.direction === 'max' ? norm : 1 - norm;
      return acc + utility * w(r.id);
    }, 0);
    return { solution, score: Math.round(score * 1000) / 10 };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .map((s, i) => ({ ...s, rank: i + 1 }));
}
