/**
 * MOCK DATA + MOCK ENGINE — Value Chain Simulation (`/digital-twin/value-chain-sim`).
 *
 * Kullanıcı kararı (Asrınalp Şahin, 2026-10-12): Operations › Value Chain
 * Simulation sekmesi, `dmaast-value-chain-digital-twin` arayüzünün BİREBİR
 * kopyasıyla ve TAMAMEN mock veriyle (backend/API çağrısı olmadan) partnerlerle
 * paylaşılacak. Bu modül twin'in iki uç noktasının yerini alır:
 *
 *   GET  /api/demo/metadata  → getMockDemoMeta()
 *   POST /api/demo/simulate  → runMockSimulation(request)
 *
 * Çıktı ŞEKLİ twin backend'inin JSON sözleşmesiyle aynıdır (kpis, timeseries,
 * demand/production/shipment/level/replenishment events, hierarchy_summary),
 * böylece twin'den taşınan bileşenler değiştirilmeden çalışır. DEĞERLER ise
 * sentetiktir: BOM yapısı maskeli demo ürününden (valueChainHierarchyData.ts)
 * gelir, stok / tedarik süresi / talep / üretim süreleri seed'li PRNG ile
 * deterministik olarak üretilir. SimPy twin koşusu, ERP ölçümü veya kalibre
 * parametre DEĞİLDİR. Canlı kaynağa geçişte bu modülün yerini twin API'si alır.
 */
import {
  buildTreeData,
  getHierarchyDataset,
  DEFAULT_HIERARCHY_KEY,
  KNOWN_SUB_ASSEMBLIES,
  VALUE_CHAIN_PRODUCT_DESC,
  VALUE_CHAIN_PRODUCT_ID,
  type EntitySubtype,
  type TreeNode,
} from './valueChainHierarchy';

export const VCSIM_MOCK_PROVENANCE = {
  kind: 'mock' as const,
  module: 'value-chain-sim',
  note: 'Synthetic, deterministic mock engine behind a 1:1 copy of the Value Chain Digital Twin UI — not a SimPy twin run, no ERP data, not calibrated; only the BOM structure of the masked demo product is real.',
  createdAt: '2026-10-12',
};

export { VALUE_CHAIN_PRODUCT_ID, VALUE_CHAIN_PRODUCT_DESC };

// ─────────────────────────────────────────────────────────────────────────
// Request contract (names identical to the twin's ShockConfig / PlanningConfig)
// ─────────────────────────────────────────────────────────────────────────

export const SHOCK_KEYS = [
  'Supplier_Lead_Time_pct',
  'Fill_Rate_pct',
  'Defect_Rate_pct',
  'Order_Quantity_pct',
  'Arrival_Delay_Days_pct',
  'Production_Duration_Days_pct',
  'Completion_Rate_pct',
  'Ship_Delay_Days_pct',
  'Sales_Qty_pct',
  'Interarrival_Time_pct',
] as const;

export type ShockKey = (typeof SHOCK_KEYS)[number];
export type ShockValues = Record<ShockKey, number>;
export type NodeShockScope = 'node' | 'subtree';

export interface NodeShock {
  scope: NodeShockScope;
  values: Partial<Record<ShockKey, number>>;
}
export type NodeShocks = Record<string, NodeShock>;

export type PlanningMethod = 'base_stock' | 'lot_for_lot' | 'period_order_qty';

export interface PlanningInput {
  safety_stock: number;
  min_lot_size: number;
  planning_method: PlanningMethod;
  period_order_qty_days: number;
  review_interval_days: number;
  production_capacity: number;
  outbound_capacity: number;
  max_outstanding_production_batches: number;
}

export interface SimRequest {
  /** Cumulative horizon in days; every run replays deterministically from day 0. */
  horizon_days: number;
  seed: number;
  planning: PlanningInput;
  shocks: Partial<ShockValues>;
  node_shocks: NodeShocks;
}

// ─────────────────────────────────────────────────────────────────────────
// Metadata contract (shape of GET /api/demo/metadata)
// ─────────────────────────────────────────────────────────────────────────

export interface BomTreeRow {
  level: number;
  parent_part: string;
  component_part: string;
  component_desc: string;
  entity_type: EntitySubtype;
  qty_per_assembly: number;
  operation_no: number;
  has_inventory: boolean;
  available_qty: number;
}

export interface StockRow {
  available_qty: number;
  on_hand_qty: number;
  reserved_qty: number;
  in_transit_qty: number;
  location_count: number;
  uom: string;
  total_value: number;
  value_currency: string;
  has_stock: boolean;
}

export interface SupplierIndexEntry {
  supplier_count: number;
  avg_lead_time_days: number | null;
  min_order_qty: number | null;
}

export interface RoutingOperation {
  part_no: string;
  operation_no: number;
  des_model_name: string | null;
  work_center: string;
  work_center_desc: string;
  mach_run_factor: number;
  labor_run_factor: number;
  setup_time: number;
  operation_desc: string;
}

export interface DistributionStat {
  count: number;
  mean: number;
}

export interface DemoMeta {
  product: {
    part_no: string;
    part_desc: string;
    total_components: number;
    sub_assemblies: string[];
    total_bom_relations: number;
  };
  bom_tree: BomTreeRow[];
  stock_by_part: Record<string, StockRow>;
  initial_inventory: Record<string, number>;
  part_safety_stocks: Record<string, number>;
  routing_operations: RoutingOperation[];
  suppliers_count: number;
  supplier_index: Record<string, SupplierIndexEntry>;
  planning_defaults: { safety_stock: number; min_lot_size: number; period_order_qty_days: number };
  shop_order_lead_times: { assembly: Record<string, number>; config: Record<string, number> };
  distribution_stats: Record<string, DistributionStat>;
}

// ─────────────────────────────────────────────────────────────────────────
// Result contract (shape of POST /api/demo/simulate)
// ─────────────────────────────────────────────────────────────────────────

export interface SimKpis {
  product_id: string;
  horizon_days: number;
  demand_mode: string;
  f04_share: number;
  total_demand_qty: number;
  shipped_qty: number;
  service_level: number;
  avg_inventory: number;
  stockout_time_days: number;
  below_safety_stock_time_days: number;
  avg_total_lead_days: number;
  p90_total_lead_days: number;
  avg_production_queue_wait_days: number;
  production_batches_completed: number;
  shipments_completed_allocations: number;
  ending_backlog_qty: number;
  ending_inventory: number;
  cumulative_produced: number;
  cumulative_shipped: number;
  n_assembly_levels: number;
  sub_assembly_ids: string[];
}

export interface TimeseriesRow {
  time_days: number;
  inventory: number;
  backlog_qty: number;
  safety_stock: number;
  stockout_flag: 0 | 1;
  open_replenishment_count: number;
  cumulative_produced: number;
  cumulative_shipped: number;
  cumulative_demand: number;
}

export interface DemandEvent {
  t: number;
  sales_qty: number;
}

export type TriggerReason = 'review_policy' | 'stockout_auto';

export interface ProductionEvent {
  batch_id: number;
  trigger_reason: TriggerReason;
  target_finished_qty: number;
  finished_output_qty: number;
  procurement_days: number;
  inbound_arrival_delay_days: number;
  production_duration_days: number;
  queue_wait_days: number;
  completion_rate: number;
  fill_rate: number;
  under_delivery_qty: number;
  defect_rate: number;
  raw_order_qty: number;
  raw_received_qty: number;
  t_release: number;
  t_output: number;
  expected_receipt_time: number;
  actual_replenishment_lead_days: number;
  n_assembly_levels: number;
}

export interface ShipmentEvent {
  shipment_id: number;
  alloc_qty: number;
  order_time: number;
  dispatch_time: number;
  delivery_time: number;
  waiting_days_to_dispatch: number;
  lead_time_days_total: number;
  ship_delay_days: number;
  delivery_delay_days: number;
  fulfillment_rate: number;
  queue_wait_outbound_days: number;
}

/** Union of the procurement-phase and assembly-phase part rows (the twin emits both shapes). */
export interface LevelPartDetail {
  part_no: string;
  part_desc: string;
  entity_type?: EntitySubtype;
  // procurement phase
  qty_from_stock?: number;
  qty_from_supplier?: number;
  qty_ordered?: number;
  qty_required?: number;
  shortfall?: number;
  qty_received?: number;
  qty_under_delivered?: number;
  qty_excess_to_stock?: number;
  eff_fill_rate?: number;
  eff_defect_rate?: number;
  eff_slt_days?: number;
  eff_arrival_delay_days?: number;
  eff_order_qty_mult?: number;
  // assembly phase
  qty_per_assembly?: number;
  required?: number;
  consumed?: number;
  shortage?: number;
  effective_lead_time_days?: number | null;
  remaining_inv?: number;
}

export interface LevelEvent {
  batch_id: number;
  phase: 'procurement' | 'assembly';
  level: number;
  level_name: string;
  parent_part: string;
  parent_desc: string | null;
  entity_type: EntitySubtype | null;
  t_start: number;
  t_end: number;
  duration_days: number;
  supplier_lead_time_days: number | null;
  arrival_delay_days: number | null;
  input_qty: number;
  output_qty: number;
  fill_rate: number | null;
  defect_rate: number | null;
  parts_count: number;
  from_stock_pct: number | null;
  queue_wait_days: number | null;
  total_shortage: number | null;
  eff_plt_days: number | null;
  eff_completion_rate: number | null;
  blocked_by_shortage: boolean | null;
  blocked_wait_days: number | null;
  blocking_parts: string[] | null;
  parts_detail: LevelPartDetail[];
}

export interface ReplenishmentEvent {
  part_no: string;
  part_desc: string;
  t_order: number;
  t_arrival: number;
  wait_days: number;
  order_qty: number;
  received_qty: number;
  eff_slt_days: number;
  eff_arrival_delay_days: number;
  eff_fill_rate: number;
  eff_defect_rate: number;
}

export interface PartAggregate {
  part_no: string;
  part_desc: string;
  entity_type: EntitySubtype;
  produced_qty: number;
  consumed_qty: number;
  under_delivery_qty: number;
  ending_inventory: number;
  batches: number;
  initial_inventory: number;
  safety_stock: number;
  shipped_qty?: number;
  avg_eff_slt_days?: number | null;
}

export interface LevelSummaryChild {
  part_no: string;
  part_desc: string;
  entity_type: EntitySubtype;
  qty_per_assembly: number;
  operation_no: number;
  ending_inv: number;
}

export interface LevelSummary {
  parent_part: string;
  part_desc: string;
  entity_type: EntitySubtype;
  assembly_depth: number;
  children_count: number;
  children: LevelSummaryChild[];
  ending_inventory: number;
  avg_duration_days?: number;
  avg_queue_wait_days?: number;
  total_batches?: number;
  total_shortage?: number;
}

export interface HierarchySummary {
  assembly_plan_order: string[];
  levels: Record<string, LevelSummary>;
  sub_assembly_ids: string[];
  by_part: Record<string, PartAggregate>;
}

export interface SimResults {
  kpis: SimKpis;
  timeseries: TimeseriesRow[];
  demand_events: DemandEvent[];
  production_events: ProductionEvent[];
  shipment_events: ShipmentEvent[];
  level_events: LevelEvent[];
  replenishment_events: ReplenishmentEvent[];
  hierarchy_summary: HierarchySummary;
  session_id: string | null;
  mode: 'fresh';
}

// ─────────────────────────────────────────────────────────────────────────
// Deterministic helpers
// ─────────────────────────────────────────────────────────────────────────

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

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function gauss(u1: number, u2: number): number {
  const r = Math.sqrt(-2 * Math.log(Math.max(1e-12, u1)));
  return r * Math.cos(2 * Math.PI * u2);
}

function expo(u: number, mean: number): number {
  return -Math.log(1 - Math.min(0.999999, Math.max(1e-9, u))) * mean;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function round(v: number, digits = 2): number {
  const m = 10 ** digits;
  return Math.round(v * m) / m;
}

function mean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

// ─────────────────────────────────────────────────────────────────────────
// BOM model (derived once from the hierarchy dataset)
// ─────────────────────────────────────────────────────────────────────────

export interface StepChild {
  part: string;
  qty: number;
  entityType: EntitySubtype;
  operationNo: number | null;
}

export interface AssemblyStep {
  parent: string;
  depth: number;
  children: StepChild[];
}

export interface BomModel {
  tree: TreeNode;
  nodes: Record<string, TreeNode>;
  parents: Record<string, string[]>;
  ancestors: Record<string, string[]>;
  /** Deepest level first, finished good last (twin `assembly_plan_order`). */
  plan: AssemblyStep[];
  leaves: string[];
  manufactured: string[];
  entityType: Record<string, EntitySubtype>;
  desc: Record<string, string>;
  partType: Record<string, string | null>;
  phantom: Set<string>;
  maxDepth: number;
  bomRelationCount: number;
  /** Units of each part required per ONE finished good (BOM explosion). */
  reqPerFg: Record<string, number>;
}

let cachedModel: BomModel | null = null;

export function getBomModel(): BomModel {
  if (cachedModel) return cachedModel;
  const built = buildTreeData(DEFAULT_HIERARCHY_KEY);
  if (!built) throw new Error('Value chain hierarchy dataset is missing');

  const nodes: Record<string, TreeNode> = {};
  const parents: Record<string, string[]> = {};
  const entityType: Record<string, EntitySubtype> = {};
  const desc: Record<string, string> = {};
  const partType: Record<string, string | null> = {};
  const phantom = new Set<string>();
  let relations = 0;

  const walk = (node: TreeNode, parent: TreeNode | null) => {
    if (!nodes[node.partNo] || node.children.length > 0) nodes[node.partNo] = node;
    entityType[node.partNo] = node.subtype;
    desc[node.partNo] = node.description;
    if (partType[node.partNo] == null) partType[node.partNo] = node.partType;
    if (node.phantom) phantom.add(node.partNo);
    if (parent) {
      relations += 1;
      if (!parents[node.partNo]) parents[node.partNo] = [];
      if (!parents[node.partNo].includes(parent.partNo)) parents[node.partNo].push(parent.partNo);
    }
    for (const child of node.children) walk(child, node);
  };
  walk(built.tree, null);

  const ancestors: Record<string, string[]> = {};
  for (const part of Object.keys(nodes)) {
    const seen = new Set<string>();
    const stack = [...(parents[part] ?? [])];
    const out: string[] = [];
    while (stack.length) {
      const a = stack.pop() as string;
      if (seen.has(a) || a === part) continue;
      seen.add(a);
      out.push(a);
      stack.push(...(parents[a] ?? []));
    }
    ancestors[part] = out;
  }

  const plan: AssemblyStep[] = Object.values(nodes)
    .filter((n) => n.children.length > 0)
    .map((n) => ({
      parent: n.partNo,
      depth: n.level + 1,
      children: n.children.map((c) => ({
        part: c.partNo,
        qty: c.qtyPerAssembly,
        entityType: c.subtype,
        operationNo: c.operationNo,
      })),
    }))
    .sort((a, b) => b.depth - a.depth || a.parent.localeCompare(b.parent));

  const leaves = Object.values(nodes)
    .filter((n) => n.children.length === 0)
    .map((n) => n.partNo)
    .sort();

  // BOM explosion for a single finished good (plan is deepest-first, so walk
  // it backwards: parents are always resolved before their children).
  const reqPerFg: Record<string, number> = { [built.tree.partNo]: 1 };
  for (let i = plan.length - 1; i >= 0; i--) {
    const step = plan[i];
    const parentQty = reqPerFg[step.parent] ?? 0;
    for (const c of step.children) reqPerFg[c.part] = (reqPerFg[c.part] ?? 0) + parentQty * c.qty;
  }

  cachedModel = {
    tree: built.tree,
    nodes,
    parents,
    ancestors,
    plan,
    leaves,
    manufactured: plan.map((s) => s.parent),
    entityType,
    desc,
    partType,
    phantom,
    maxDepth: plan.reduce((m, s) => Math.max(m, s.depth), 1),
    bomRelationCount: relations,
    reqPerFg,
  };
  return cachedModel;
}

// ─────────────────────────────────────────────────────────────────────────
// Synthetic "ERP" parameters per part (deterministic from the part number)
// ─────────────────────────────────────────────────────────────────────────

interface LeafParams {
  slt: number;
  ad: number;
  dr: number;
  moq: number;
  supplierCount: number;
  initialInv: number;
  safetyStock: number;
  uom: string;
  locations: number;
  unitValue: number;
}

interface MadeParams {
  plt: number;
  initialInv: number;
}

const leafParamCache = new Map<string, LeafParams>();
const madeParamCache = new Map<string, MadeParams>();

function leafParamsOf(part: string): LeafParams {
  const cached = leafParamCache.get(part);
  if (cached) return cached;
  const model = getBomModel();
  const pt = (model.partType[part] ?? '').toLowerCase();
  const rng = mulberry32(hashString('vcsim-erp:' + part));
  const u = Array.from({ length: 10 }, () => rng());

  const sltScale = pt.includes('expense') ? 0.6 : pt.includes('raw') ? 1.2 : 1.0;
  let slt = clamp(round(Math.exp(Math.log(16) + 0.75 * gauss(u[0], u[1])) * sltScale, 1), 2, 120);
  const ad = round(0.5 + 2.5 * u[2], 2);
  const dr = round(0.004 + 0.03 * u[3], 4);
  const moqs = [500, 1000, 2000, 5000, 10000, 20000, 50000];
  const moq = moqs[Math.floor(u[4] * moqs.length)];
  const supplierCount = u[5] < 0.5 ? 1 : u[5] < 0.75 ? 2 : u[5] < 0.9 ? 3 : 4;

  // Stock profile. The few critical parts (out of / thin on stock) are given
  // SHORT supplier lead times so a procurement wait is days, not months — the
  // story is "shortage appears, PO lands, flow recovers", not a frozen line.
  // Long-lead parts conversely always carry deep stock.
  let initialInv: number;
  if (u[6] < 0.05) {
    initialInv = 0; // genuinely out of stock at t=0 → visible "No warehouse stock" alert
    slt = clamp(round(2 + 4 * u[7], 1), 2, 6);
  } else if (u[6] < 0.14) {
    initialInv = Math.round(4 + 26 * u[7]); // thin stock — runs dry within the first batches
    slt = Math.min(slt, round(3 + 4 * u[8], 1));
  } else {
    initialInv = Math.round(400 + 90000 * Math.pow(u[7], 2.3));
    if (slt > 30) initialInv = Math.max(initialInv, 20000 + Math.round(60000 * u[8]));
  }
  if (pt.includes('expense')) initialInv = Math.max(initialInv, Math.round(2000 + 20000 * u[7]));

  // Warehouse safety stock (L3 reorder point). Lead-time aware: it covers the
  // expected consumption during supplier lead time + inbound delay with a
  // margin, so a healthy part never silently runs dry mid-horizon — only
  // shocks (longer lead times, under-delivery, demand surges) or the critical
  // parts above create shortages.
  const perDay = DEMAND_RATE_BASE * (model.reqPerFg[part] ?? 1);
  const leadDemand = perDay * (slt + ad);
  let safetyStock: number;
  if (initialInv < 40) {
    safetyStock = Math.max(Math.round(300 + 300 * u[9]), Math.ceil(2 * leadDemand));
  } else {
    const optional = u[8] < 0.35 && initialInv > 100 ? Math.round(initialInv * (0.1 + 0.4 * u[9])) : 0;
    safetyStock = Math.max(optional, Math.ceil(1.5 * leadDemand));
    initialInv = Math.max(initialInv, 2 * safetyStock);
  }
  const params: LeafParams = {
    slt,
    ad,
    dr,
    moq,
    supplierCount,
    initialInv,
    safetyStock,
    uom: 'pcs',
    locations: 1 + Math.floor(u[2] * 9),
    unitValue: round(0.05 + 120 * Math.pow(u[3], 3), 2),
  };
  leafParamCache.set(part, params);
  return params;
}

function madeParamsOf(part: string): MadeParams {
  const cached = madeParamCache.get(part);
  if (cached) return cached;
  const model = getBomModel();
  const rng = mulberry32(hashString('vcsim-plt:' + part));
  const u1 = rng();
  const u2 = rng();
  let params: MadeParams;
  if (part === model.tree.partNo) {
    params = { plt: 1.0, initialInv: 0 };
  } else if (model.phantom.has(part)) {
    params = { plt: round(0.5 + 0.5 * u1, 1), initialInv: 0 };
  } else {
    params = { plt: round(0.5 + 1.2 * u1, 1), initialInv: Math.round(600 + 20000 * u2) };
  }
  madeParamCache.set(part, params);
  return params;
}

// ─────────────────────────────────────────────────────────────────────────
// Metadata (GET /api/demo/metadata replacement)
// ─────────────────────────────────────────────────────────────────────────

const DT = 0.125; // simulation tick (days)
const SNAPSHOT_DT = 0.25; // inventory logger cadence (days), as in the twin
const EPS = 1e-9;
const MIN_PROCESS_DAYS = 0.01;
const DEMAND_INTERARRIVAL_DAYS = 2.8;
const DEMAND_QTY_MEDIAN = 14;
const DEMAND_RATE_BASE = 6.2;
const SHIP_DELAY_BASE = 0.8;

const OPERATION_DESCS = [
  'Customer configuration',
  'Final assembly',
  'Calibration & test',
  'Packing',
  'PCB placement',
  'Soldering',
  'Inspection',
  'Housing assembly',
  'Potting',
  'Radio tuning',
  'Labelling',
  'Kitting',
];

let cachedMeta: DemoMeta | null = null;

export function getMockDemoMeta(): DemoMeta {
  if (cachedMeta) return cachedMeta;
  const model = getBomModel();
  const dataset = getHierarchyDataset(DEFAULT_HIERARCHY_KEY);

  const initialInventory: Record<string, number> = {};
  const stockByPart: Record<string, StockRow> = {};
  const safetyStocks: Record<string, number> = {};
  const supplierIndex: Record<string, SupplierIndexEntry> = {};
  let suppliersCount = 0;

  for (const leaf of model.leaves) {
    const p = leafParamsOf(leaf);
    initialInventory[leaf] = p.initialInv;
    safetyStocks[leaf] = p.safetyStock;
    stockByPart[leaf] = {
      available_qty: p.initialInv,
      on_hand_qty: p.initialInv,
      reserved_qty: 0,
      in_transit_qty: 0,
      location_count: p.initialInv > 0 ? p.locations : 0,
      uom: p.uom,
      total_value: round(p.initialInv * p.unitValue, 2),
      value_currency: 'DKK',
      has_stock: p.initialInv > 0,
    };
    supplierIndex[leaf] = { supplier_count: p.supplierCount, avg_lead_time_days: p.slt, min_order_qty: p.moq };
    suppliersCount += p.supplierCount;
  }

  const assemblyLt: Record<string, number> = {};
  const configLt: Record<string, number> = {};
  for (const made of model.manufactured) {
    const p = madeParamsOf(made);
    initialInventory[made] = p.initialInv;
    safetyStocks[made] = 0;
    if (made === model.tree.partNo) {
      configLt[made] = p.plt;
    } else {
      assemblyLt[made] = p.plt;
      stockByPart[made] = {
        available_qty: p.initialInv,
        on_hand_qty: p.initialInv,
        reserved_qty: 0,
        in_transit_qty: 0,
        location_count: p.initialInv > 0 ? 2 : 0,
        uom: 'pcs',
        total_value: round(p.initialInv * 48.5, 2),
        value_currency: 'DKK',
        has_stock: p.initialInv > 0,
      };
    }
  }

  const bomTree: BomTreeRow[] = [];
  for (const step of [...model.plan].sort((a, b) => a.depth - b.depth)) {
    for (const c of step.children) {
      bomTree.push({
        level: step.depth,
        parent_part: step.parent,
        component_part: c.part,
        component_desc: model.desc[c.part] ?? '',
        entity_type: c.entityType,
        qty_per_assembly: c.qty,
        operation_no: c.operationNo ?? 0,
        has_inventory: c.part in initialInventory,
        available_qty: initialInventory[c.part] ?? 0,
      });
    }
  }

  const routingOperations: RoutingOperation[] = (dataset?.process_mapping ?? []).map((row, i) => {
    const partNo = row.part_no ?? '';
    const u = mulberry32(hashString('vcsim-op:' + partNo + ':' + (row.operation_no ?? i)))();
    return {
      part_no: partNo,
      operation_no: Number(row.operation_no) || 0,
      des_model_name: row.des_model_name,
      work_center: `W${3001 + (i % 6)}`,
      work_center_desc: `Cell ${1 + (i % 6)}`,
      mach_run_factor: round(0.001 + 0.004 * u, 4),
      labor_run_factor: round(0.001 + 0.004 * u, 4),
      setup_time: round(0.05 * Math.floor(u * 4), 2),
      operation_desc: OPERATION_DESCS[i % OPERATION_DESCS.length],
    };
  });

  const leafSlts = model.leaves.map((l) => leafParamsOf(l).slt);
  const leafAds = model.leaves.map((l) => leafParamsOf(l).ad);
  const leafDrs = model.leaves.map((l) => leafParamsOf(l).dr);
  const plts = model.manufactured.map((m) => madeParamsOf(m).plt);

  cachedMeta = {
    product: {
      part_no: model.tree.partNo,
      part_desc: VALUE_CHAIN_PRODUCT_DESC,
      total_components: model.leaves.length,
      sub_assemblies: [...KNOWN_SUB_ASSEMBLIES].sort(),
      total_bom_relations: model.bomRelationCount,
    },
    bom_tree: bomTree,
    stock_by_part: stockByPart,
    initial_inventory: initialInventory,
    part_safety_stocks: safetyStocks,
    routing_operations: routingOperations,
    suppliers_count: suppliersCount,
    supplier_index: supplierIndex,
    planning_defaults: { safety_stock: 30, min_lot_size: 30, period_order_qty_days: 1 },
    shop_order_lead_times: { assembly: assemblyLt, config: configLt },
    distribution_stats: {
      demand_sales_qty: { count: 549, mean: round(DEMAND_QTY_MEDIAN * Math.exp((0.45 * 0.45) / 2), 2) },
      demand_interarrival_days: { count: 154, mean: DEMAND_INTERARRIVAL_DAYS },
      fulfillment_rate: { count: 549, mean: 1 },
      delivery_delay_days: { count: 549, mean: round(SHIP_DELAY_BASE + 0.6, 2) },
      supplier_lead_time_days: { count: leafSlts.length, mean: round(mean(leafSlts), 2) },
      arrival_delay_days: { count: leafAds.length, mean: round(mean(leafAds), 2) },
      fill_rate: { count: leafSlts.length, mean: 1 },
      defect_rate: { count: leafDrs.length, mean: round(mean(leafDrs), 4) },
      production_duration_days: { count: plts.length, mean: round(mean(plts), 2) },
      completion_rate: { count: plts.length, mean: 1 },
      ship_delay_days: { count: 626, mean: SHIP_DELAY_BASE },
    },
  };
  return cachedMeta;
}

// ─────────────────────────────────────────────────────────────────────────
// Simulation engine (POST /api/demo/simulate replacement)
// ─────────────────────────────────────────────────────────────────────────

/** Additive composition: global + every `subtree` ancestor + the part itself (twin ShockComposer). */
export function effectiveShockPct(req: SimRequest, model: BomModel, part: string, metric: ShockKey): number {
  let total = Number(req.shocks[metric] ?? 0) || 0;
  for (const anc of model.ancestors[part] ?? []) {
    const ov = req.node_shocks[anc];
    if (ov && ov.scope === 'subtree') total += Number(ov.values[metric] ?? 0) || 0;
  }
  const own = req.node_shocks[part];
  if (own) total += Number(own.values[metric] ?? 0) || 0;
  return total;
}

interface SupplierTerms {
  sltEff: number;
  adEff: number;
  frEff: number;
  drEff: number;
  oqMult: number;
}

interface PendingStep {
  details: LevelPartDetail[];
  blockedWait: number;
  blocking: string[];
  totalShortage: number;
  pltEff: number;
  parentReq: number;
}

interface Batch {
  id: number;
  trigger: TriggerReason;
  target: number;
  tRelease: number;
  phase: 'procurement' | 'waiting' | 'assembly';
  procEnd: number;
  procurementDays: number;
  inboundDelayDays: number;
  kit: Record<string, number>;
  reqQty: Record<string, number>;
  queueStart: number;
  queueWait: number;
  assemblyStart: number;
  stepIndex: number;
  stepStart: number;
  stepEnd: number;
  outputRatio: number;
  totalShortage: number;
  blockedWait: number;
  rawOrdered: number;
  rawReceived: number;
  underDelivered: number;
  fillRate: number;
  defectRate: number;
  pending: PendingStep | null;
}

interface Shipment {
  id: number;
  dispatch: number;
  delivery: number;
  shipDelay: number;
  allocs: { orderTime: number; qty: number }[];
}

interface DemandOrder {
  t: number;
  qty: number;
  remaining: number;
}

export function runMockSimulation(req: SimRequest, meta: DemoMeta = getMockDemoMeta()): SimResults {
  const model = getBomModel();
  const fgPart = model.tree.partNo;
  const horizon = Math.max(0, Number(req.horizon_days) || 0);
  const planning = req.planning;
  const safetyStock = Math.max(0, Number(planning.safety_stock) || 0);
  const minLot = Math.max(1, Number(planning.min_lot_size) || 1);
  const reviewInterval = Math.max(DT, Number(planning.review_interval_days) || 1);
  const prodCapacity = Math.max(1, Math.floor(Number(planning.production_capacity) || 1));
  const outCapacity = Math.max(1, Math.floor(Number(planning.outbound_capacity) || 1));
  const maxOpen = Math.max(1, Math.floor(Number(planning.max_outstanding_production_batches) || 50));
  const seed = Math.floor(Number(req.seed) || 0);

  const rngDemand = mulberry32((seed * 7919 + 11) >>> 0);
  const rngShip = mulberry32((seed * 104729 + 29) >>> 0);

  const pct = (part: string, metric: ShockKey) => effectiveShockPct(req, model, part, metric);
  const mult = (part: string, metric: ShockKey, floor: number) => Math.max(floor, 1 + pct(part, metric) / 100);

  const iaMult = Math.max(0.05, 1 + (Number(req.shocks.Interarrival_Time_pct ?? 0) || 0) / 100);
  const salesMult = Math.max(0, 1 + (Number(req.shocks.Sales_Qty_pct ?? 0) || 0) / 100);
  const shipMult = Math.max(0, 1 + (Number(req.shocks.Ship_Delay_Days_pct ?? 0) || 0) / 100);
  const nextInterarrival = () => Math.max(0.05, expo(rngDemand(), DEMAND_INTERARRIVAL_DAYS * iaMult));
  const nextQty = () =>
    Math.max(0, Math.round(Math.exp(Math.log(DEMAND_QTY_MEDIAN) + 0.45 * gauss(rngDemand(), rngDemand())) * salesMult));

  // ── State ──
  const componentInv: Record<string, number> = { ...meta.initial_inventory };
  let fgInventory = safetyStock;
  const demandQueue: DemandOrder[] = [];
  let cumDemand = 0;
  let cumProduced = 0;
  let cumShipped = 0;
  let batchSeq = 0;
  let shipmentSeq = 0;
  let prodBusy = 0;
  let outBusy = 0;
  const batches: Batch[] = [];
  const inTransit: Shipment[] = [];
  const openReplenishments: { arrival: number; part: string; qty: number }[] = [];
  const onOrder: Record<string, number> = {};

  const demandEvents: DemandEvent[] = [];
  const productionEvents: ProductionEvent[] = [];
  const shipmentEvents: ShipmentEvent[] = [];
  const levelEvents: LevelEvent[] = [];
  const replenishmentEvents: ReplenishmentEvent[] = [];
  const timeseries: TimeseriesRow[] = [];

  const backlog = () => demandQueue.reduce((s, d) => s + d.remaining, 0);
  const outstandingOutput = () => batches.reduce((s, b) => s + b.target, 0);

  const supplierTerms = (leaf: string): SupplierTerms => {
    const p = leafParamsOf(leaf);
    return {
      sltEff: round(p.slt * mult(leaf, 'Supplier_Lead_Time_pct', 0.05), 3),
      adEff: round(p.ad * mult(leaf, 'Arrival_Delay_Days_pct', 0), 3),
      frEff: round(clamp(1 + pct(leaf, 'Fill_Rate_pct') / 100, 0, 1.5), 4),
      drEff: round(clamp(p.dr * mult(leaf, 'Defect_Rate_pct', 0), 0, 0.95), 4),
      oqMult: round(mult(leaf, 'Order_Quantity_pct', 0.1), 3),
    };
  };

  const placeOrder = (
    leaf: string,
    orderedQty: number,
    t: number,
    toInventory: number,
    lead: number,
    receivedQty: number,
    terms: SupplierTerms,
  ) => {
    openReplenishments.push({ arrival: t + lead, part: leaf, qty: toInventory });
    onOrder[leaf] = (onOrder[leaf] ?? 0) + toInventory;
    replenishmentEvents.push({
      part_no: leaf,
      part_desc: model.desc[leaf] ?? '',
      t_order: round(t, 4),
      t_arrival: round(t + lead, 4),
      wait_days: round(lead, 3),
      order_qty: round(orderedQty, 2),
      received_qty: round(receivedQty, 2),
      eff_slt_days: terms.sltEff,
      eff_arrival_delay_days: terms.adEff,
      eff_fill_rate: terms.frEff,
      eff_defect_rate: terms.drEff,
    });
  };

  const expandRequirements = (fgQty: number): Record<string, number> => {
    const reqQty: Record<string, number> = { [fgPart]: fgQty };
    for (let i = model.plan.length - 1; i >= 0; i--) {
      const step = model.plan[i];
      const parentQty = reqQty[step.parent] ?? 0;
      for (const c of step.children) reqQty[c.part] = (reqQty[c.part] ?? 0) + parentQty * c.qty;
    }
    return reqQty;
  };

  // ── Phase 1: procurement / kitting at batch release ──
  const startBatch = (trigger: TriggerReason, qty: number, t: number) => {
    const id = ++batchSeq;
    const reqQty = expandRequirements(qty);
    const kit: Record<string, number> = {};
    const details: LevelPartDetail[] = [];
    let maxLead = 0;
    let anyShortfall = false;
    let fromStockTotal = 0;
    let requiredTotal = 0;
    let rawOrdered = 0;
    let rawReceived = 0;
    let underTotal = 0;
    let frSum = 0;
    let drSum = 0;
    let frN = 0;
    let sltWeighted = 0;
    let adWeighted = 0;
    let shortTotal = 0;

    for (const leaf of model.leaves) {
      const required = reqQty[leaf] ?? 0;
      if (required <= 0) continue;
      const terms = supplierTerms(leaf);
      const inv = componentInv[leaf] ?? 0;
      const fromStock = Math.min(inv, required);
      const shortfall = Math.max(0, required - fromStock);
      componentInv[leaf] = inv - fromStock;

      let ordered = 0;
      let received = 0;
      let fromSupplier = 0;
      let excess = 0;
      let underDelivered = 0;
      if (shortfall > EPS) {
        anyShortfall = true;
        // The PO carries a scrap allowance for the expected defect share, so a
        // nominal (fill rate 1.0) delivery covers the shortfall exactly; only a
        // negative Fill_Rate shock leaves the kit short.
        ordered = (shortfall / Math.max(0.05, 1 - terms.drEff)) * terms.oqMult;
        received = ordered * terms.frEff * (1 - terms.drEff);
        fromSupplier = Math.min(received, shortfall);
        excess = Math.max(0, received - shortfall);
        underDelivered = Math.max(0, shortfall - received);
        const lead = terms.sltEff + terms.adEff;
        if (lead > maxLead) maxLead = lead;
        sltWeighted += terms.sltEff * shortfall;
        adWeighted += terms.adEff * shortfall;
        shortTotal += shortfall;
        frSum += terms.frEff;
        drSum += terms.drEff;
        frN += 1;
        rawOrdered += ordered;
        placeOrder(leaf, ordered, t, excess, lead, received, terms);
      }
      kit[leaf] = fromStock + fromSupplier;
      rawReceived += fromStock + fromSupplier;
      underTotal += underDelivered;
      fromStockTotal += fromStock;
      requiredTotal += required;
      details.push({
        part_no: leaf,
        part_desc: model.desc[leaf] ?? '',
        qty_from_stock: round(fromStock, 2),
        qty_from_supplier: round(fromSupplier, 2),
        qty_ordered: round(ordered, 2),
        qty_required: round(required, 2),
        shortfall: round(shortfall, 2),
        qty_received: round(fromStock + fromSupplier, 2),
        qty_under_delivered: round(underDelivered, 2),
        qty_excess_to_stock: round(excess, 2),
        eff_fill_rate: terms.frEff,
        eff_defect_rate: terms.drEff,
        eff_slt_days: terms.sltEff,
        eff_arrival_delay_days: terms.adEff,
        eff_order_qty_mult: terms.oqMult,
      });
    }

    const procurementDays = anyShortfall ? Math.max(MIN_PROCESS_DAYS, maxLead) : MIN_PROCESS_DAYS;
    const supplierLtDays = shortTotal > 0 ? sltWeighted / shortTotal : 0;
    const inboundDelayDays = shortTotal > 0 ? adWeighted / shortTotal : 0;
    levelEvents.push({
      batch_id: id,
      phase: 'procurement',
      level: model.maxDepth,
      level_name: `Component Kitting (Level ${model.maxDepth})`,
      parent_part: 'suppliers',
      parent_desc: null,
      entity_type: null,
      t_start: round(t, 4),
      t_end: round(t + procurementDays, 4),
      duration_days: round(procurementDays, 4),
      supplier_lead_time_days: round(supplierLtDays, 3),
      arrival_delay_days: round(inboundDelayDays, 3),
      input_qty: round(qty, 2),
      output_qty: round(qty, 2),
      fill_rate: frN ? round(frSum / frN, 4) : 1,
      defect_rate: frN ? round(drSum / frN, 4) : 0,
      parts_count: details.length,
      from_stock_pct: requiredTotal > 0 ? round((100 * fromStockTotal) / requiredTotal, 2) : 100,
      queue_wait_days: null,
      total_shortage: null,
      eff_plt_days: null,
      eff_completion_rate: null,
      blocked_by_shortage: null,
      blocked_wait_days: null,
      blocking_parts: null,
      parts_detail: details,
    });

    batches.push({
      id,
      trigger,
      target: qty,
      tRelease: t,
      phase: 'procurement',
      procEnd: t + procurementDays,
      procurementDays,
      inboundDelayDays,
      kit,
      reqQty,
      queueStart: t + procurementDays,
      queueWait: 0,
      assemblyStart: 0,
      stepIndex: 0,
      stepStart: 0,
      stepEnd: 0,
      outputRatio: 1,
      totalShortage: 0,
      blockedWait: 0,
      rawOrdered,
      rawReceived,
      underDelivered: underTotal,
      fillRate: frN ? frSum / frN : 1,
      defectRate: frN ? drSum / frN : 0,
      pending: null,
    });
  };

  // ── Phase 2: multi-level assembly, one plan step at a time ──
  const beginStep = (b: Batch, tStart: number) => {
    const step = model.plan[b.stepIndex];
    const parentReq = b.reqQty[step.parent] ?? 0;
    const details: LevelPartDetail[] = [];
    const blocking: string[] = [];
    let blockedWait = 0;
    let totalShortage = 0;
    let ratio = 1;

    for (const c of step.children) {
      const required = parentReq * c.qty;
      const isMade = c.entityType === 'SubAssembly' || c.entityType === 'FinishedGood';
      let consumed: number;
      if (isMade) {
        const avail = componentInv[c.part] ?? 0;
        consumed = Math.min(avail, required);
        componentInv[c.part] = avail - consumed;
      } else {
        const avail = b.kit[c.part] ?? 0;
        consumed = Math.min(avail, required);
        b.kit[c.part] = avail - consumed;
      }
      let shortage = Math.max(0, required - consumed);
      let effLead: number | null = null;

      if (!isMade) {
        const terms = supplierTerms(c.part);
        effLead = terms.sltEff;
        if (shortage > EPS && c.entityType !== 'Expense') {
          // Assembly-phase shortage: an expedite order is placed, the step waits for it.
          const ordered = (shortage / Math.max(0.05, 1 - terms.drEff)) * terms.oqMult;
          const received = ordered * terms.frEff * (1 - terms.drEff);
          const lead = terms.sltEff + terms.adEff;
          const got = Math.min(received, shortage);
          placeOrder(c.part, ordered, tStart, Math.max(0, received - shortage), lead, received, terms);
          blockedWait = Math.max(blockedWait, lead);
          blocking.push(c.part);
          consumed += got;
          shortage -= got;
        }
      } else {
        effLead = madeParamsOf(c.part).plt;
        if (shortage > EPS) blocking.push(c.part);
      }

      if (shortage > EPS && c.entityType !== 'Expense' && required > 0) {
        ratio = Math.min(ratio, consumed / required);
      }
      totalShortage += shortage;
      details.push({
        part_no: c.part,
        part_desc: model.desc[c.part] ?? '',
        entity_type: c.entityType,
        qty_per_assembly: c.qty,
        required: round(required, 2),
        consumed: round(consumed, 2),
        shortage: round(shortage, 2),
        effective_lead_time_days: effLead,
        remaining_inv: round(componentInv[c.part] ?? 0, 2),
      });
    }

    const pltEff = madeParamsOf(step.parent).plt * mult(step.parent, 'Production_Duration_Days_pct', 0.05);
    b.outputRatio = Math.min(b.outputRatio, ratio);
    b.totalShortage += totalShortage;
    b.blockedWait += blockedWait;
    b.stepStart = tStart;
    b.stepEnd = tStart + blockedWait + pltEff;
    b.pending = { details, blockedWait, blocking, totalShortage, pltEff, parentReq };
  };

  const finishStep = (b: Batch): number => {
    const step = model.plan[b.stepIndex];
    const ps = b.pending as PendingStep;
    const isFg = step.parent === fgPart;
    const crEff = isFg ? clamp(1 + pct(step.parent, 'Completion_Rate_pct') / 100, 0.05, 1) : 1;
    const output = ps.parentReq * b.outputRatio * crEff;
    if (!isFg) componentInv[step.parent] = (componentInv[step.parent] ?? 0) + output;
    levelEvents.push({
      batch_id: b.id,
      phase: 'assembly',
      level: step.depth,
      level_name: `Level ${step.depth} Assembly - ${model.desc[step.parent] ?? step.parent}`,
      parent_part: step.parent,
      parent_desc: model.desc[step.parent] ?? null,
      entity_type: model.entityType[step.parent] ?? null,
      t_start: round(b.stepStart, 4),
      t_end: round(b.stepEnd, 4),
      duration_days: round(b.stepEnd - b.stepStart, 4),
      supplier_lead_time_days: null,
      arrival_delay_days: null,
      input_qty: round(ps.parentReq, 2),
      output_qty: round(output, 2),
      fill_rate: null,
      defect_rate: null,
      parts_count: step.children.length,
      from_stock_pct: null,
      queue_wait_days: b.stepIndex === 0 ? round(b.queueWait, 4) : 0,
      total_shortage: round(ps.totalShortage, 2),
      eff_plt_days: round(ps.pltEff, 4),
      eff_completion_rate: round(crEff, 4),
      blocked_by_shortage: ps.blockedWait > 0,
      blocked_wait_days: round(ps.blockedWait, 4),
      blocking_parts: ps.blocking,
      parts_detail: ps.details,
    });
    b.pending = null;
    return output;
  };

  const completeBatch = (b: Batch, output: number) => {
    const tOutput = b.stepEnd;
    fgInventory += output;
    cumProduced += output;
    productionEvents.push({
      batch_id: b.id,
      trigger_reason: b.trigger,
      target_finished_qty: round(b.target, 2),
      finished_output_qty: round(output, 2),
      procurement_days: round(b.procurementDays, 4),
      inbound_arrival_delay_days: round(b.inboundDelayDays, 4),
      production_duration_days: round(tOutput - b.assemblyStart, 4),
      queue_wait_days: round(b.queueWait, 4),
      completion_rate: b.target > 0 ? round(output / b.target, 4) : 1,
      fill_rate: round(b.fillRate, 4),
      under_delivery_qty: round(b.underDelivered, 2),
      defect_rate: round(b.defectRate, 4),
      raw_order_qty: round(b.rawOrdered, 2),
      raw_received_qty: round(b.rawReceived, 2),
      t_release: round(b.tRelease, 4),
      t_output: round(tOutput, 4),
      expected_receipt_time: round(b.procEnd + model.plan.reduce((s, st) => s + madeParamsOf(st.parent).plt, 0), 4),
      actual_replenishment_lead_days: round(tOutput - b.tRelease, 4),
      n_assembly_levels: model.plan.length,
    });
  };

  // ── Planning / stockout triggers ──
  const maybeStockoutTrigger = (t: number) => {
    const short = backlog() - fgInventory - outstandingOutput();
    if (short > EPS && batches.length < maxOpen) startBatch('stockout_auto', Math.max(minLot, Math.ceil(short)), t);
  };

  const reviewPlanning = (t: number) => {
    if (batches.length < maxOpen) {
      const position = fgInventory + outstandingOutput() - backlog();
      let qty = 0;
      switch (planning.planning_method) {
        case 'lot_for_lot': {
          const need = backlog() - fgInventory - outstandingOutput();
          if (need > EPS) qty = Math.max(minLot, Math.ceil(need));
          break;
        }
        case 'period_order_qty': {
          if (position < safetyStock) {
            const rate = t > 1 ? cumDemand / t : DEMAND_RATE_BASE;
            const days = Math.max(1, Number(planning.period_order_qty_days) || 1);
            qty = Math.max(minLot, Math.ceil(rate * days + safetyStock - position));
          }
          break;
        }
        default:
          if (position < safetyStock) qty = Math.max(minLot, Math.ceil(safetyStock - position));
      }
      if (qty > 0) startBatch('review_policy', qty, t);
    }

    // Component safety-stock replenishment (warehouse policy, L3).
    for (const leaf of model.leaves) {
      const p = leafParamsOf(leaf);
      if (p.safetyStock <= 0) continue;
      const inv = componentInv[leaf] ?? 0;
      const pending = onOrder[leaf] ?? 0;
      if (inv + pending >= p.safetyStock) continue;
      const terms = supplierTerms(leaf);
      const ordered = Math.max(p.moq, 2000, p.safetyStock * 1.5 - inv - pending) * terms.oqMult;
      const received = ordered * terms.frEff * (1 - terms.drEff);
      placeOrder(leaf, ordered, t, received, terms.sltEff + terms.adEff, received, terms);
    }
  };

  // ── Dispatch (ship-complete FIFO) ──
  const dispatch = (t: number) => {
    while (outBusy < outCapacity && demandQueue.length > 0 && demandQueue[0].remaining <= fgInventory + EPS) {
      const allocs: { orderTime: number; qty: number }[] = [];
      while (demandQueue.length > 0 && demandQueue[0].remaining <= fgInventory + EPS) {
        const d = demandQueue.shift() as DemandOrder;
        fgInventory -= d.remaining;
        cumShipped += d.remaining;
        allocs.push({ orderTime: d.t, qty: d.remaining });
      }
      const shipDelay = Math.max(0, SHIP_DELAY_BASE * Math.exp(0.35 * gauss(rngShip(), rngShip())) * shipMult);
      inTransit.push({ id: ++shipmentSeq, dispatch: t, delivery: t + shipDelay, shipDelay, allocs });
      outBusy += 1;
    }
  };

  const snapshot = (ts: number) => {
    const bl = backlog();
    timeseries.push({
      time_days: round(ts, 4),
      inventory: round(fgInventory, 2),
      backlog_qty: round(bl, 2),
      safety_stock: safetyStock,
      stockout_flag: fgInventory <= EPS && bl > EPS ? 1 : 0,
      open_replenishment_count: openReplenishments.length,
      cumulative_produced: round(cumProduced, 2),
      cumulative_shipped: round(cumShipped, 2),
      cumulative_demand: round(cumDemand, 2),
    });
  };

  // ── Main loop ──
  let nextArrival = nextInterarrival();
  let nextReview = 0;
  let nextSnapshot = 0;
  const ticks = Math.round(horizon / DT);

  for (let i = 0; i <= ticks; i++) {
    const t = i * DT;

    for (let k = openReplenishments.length - 1; k >= 0; k--) {
      const r = openReplenishments[k];
      if (r.arrival <= t + EPS) {
        componentInv[r.part] = (componentInv[r.part] ?? 0) + r.qty;
        onOrder[r.part] = Math.max(0, (onOrder[r.part] ?? 0) - r.qty);
        openReplenishments.splice(k, 1);
      }
    }

    for (const b of batches) {
      if (b.phase === 'procurement' && b.procEnd <= t + EPS) {
        b.phase = 'waiting';
        b.queueStart = b.procEnd;
      }
    }

    for (let k = batches.length - 1; k >= 0; k--) {
      const b = batches[k];
      if (b.phase !== 'assembly') continue;
      while (b.phase === 'assembly' && b.stepEnd <= t + EPS) {
        const output = finishStep(b);
        if (b.stepIndex >= model.plan.length - 1) {
          completeBatch(b, output);
          prodBusy -= 1;
          batches.splice(k, 1);
          break;
        }
        b.stepIndex += 1;
        beginStep(b, b.stepEnd);
      }
    }

    const waiting = batches
      .filter((b) => b.phase === 'waiting')
      .sort((a, b) => a.queueStart - b.queueStart || a.id - b.id);
    for (const b of waiting) {
      if (prodBusy >= prodCapacity) break;
      prodBusy += 1;
      b.phase = 'assembly';
      b.queueWait = Math.max(0, t - b.queueStart);
      b.assemblyStart = t;
      b.stepIndex = 0;
      beginStep(b, t);
    }

    while (nextArrival <= t + EPS && nextArrival < horizon) {
      const qty = nextQty();
      if (qty > 0) {
        demandQueue.push({ t: nextArrival, qty, remaining: qty });
        cumDemand += qty;
        demandEvents.push({ t: round(nextArrival, 4), sales_qty: qty });
        maybeStockoutTrigger(nextArrival);
      }
      nextArrival += nextInterarrival();
    }

    while (nextReview <= t + EPS && nextReview < horizon) {
      reviewPlanning(nextReview);
      nextReview += reviewInterval;
    }

    dispatch(t);

    for (let k = inTransit.length - 1; k >= 0; k--) {
      const s = inTransit[k];
      if (s.delivery <= t + EPS) {
        for (const a of s.allocs) {
          shipmentEvents.push({
            shipment_id: s.id,
            alloc_qty: round(a.qty, 2),
            order_time: round(a.orderTime, 4),
            dispatch_time: round(s.dispatch, 4),
            delivery_time: round(s.delivery, 4),
            waiting_days_to_dispatch: round(s.dispatch - a.orderTime, 4),
            lead_time_days_total: round(s.delivery - a.orderTime, 4),
            ship_delay_days: round(s.shipDelay, 4),
            delivery_delay_days: round(s.delivery - a.orderTime, 4),
            fulfillment_rate: 1,
            queue_wait_outbound_days: 0,
          });
        }
        outBusy -= 1;
        inTransit.splice(k, 1);
      }
    }

    while (nextSnapshot <= t + EPS && nextSnapshot < horizon) {
      snapshot(nextSnapshot);
      nextSnapshot += SNAPSHOT_DT;
    }
  }

  // ── KPIs ──
  const shippedQty = shipmentEvents.reduce((s, e) => s + e.alloc_qty, 0);
  const leads = shipmentEvents.map((e) => e.lead_time_days_total).sort((a, b) => a - b);
  const p90 = leads.length ? leads[Math.min(leads.length - 1, Math.floor(0.9 * (leads.length - 1)))] : 0;
  const stockoutShare = timeseries.length ? mean(timeseries.map((r) => r.stockout_flag)) : 0;
  const belowSafetyShare = timeseries.length ? mean(timeseries.map((r) => (r.inventory < r.safety_stock ? 1 : 0))) : 0;

  const kpis: SimKpis = {
    product_id: fgPart,
    horizon_days: horizon,
    demand_mode: 'family_scaled',
    f04_share: 0.1,
    total_demand_qty: round(cumDemand, 2),
    shipped_qty: round(shippedQty, 2),
    service_level: cumDemand > 0 ? round(shippedQty / cumDemand, 6) : 1,
    avg_inventory: round(timeseries.length ? mean(timeseries.map((r) => r.inventory)) : fgInventory, 4),
    stockout_time_days: round(stockoutShare * horizon, 4),
    below_safety_stock_time_days: round(belowSafetyShare * horizon, 4),
    avg_total_lead_days: round(mean(leads), 4),
    p90_total_lead_days: round(p90, 4),
    avg_production_queue_wait_days: round(mean(productionEvents.map((e) => e.queue_wait_days)), 4),
    production_batches_completed: productionEvents.length,
    shipments_completed_allocations: shipmentEvents.length,
    ending_backlog_qty: round(backlog(), 2),
    ending_inventory: round(fgInventory, 2),
    cumulative_produced: round(cumProduced, 2),
    cumulative_shipped: round(cumShipped, 2),
    n_assembly_levels: model.plan.length,
    sub_assembly_ids: [...KNOWN_SUB_ASSEMBLIES].sort(),
  };

  // ── Hierarchy summary (per level + per part aggregates) ──
  const levels: Record<string, LevelSummary> = {};
  for (const step of model.plan) {
    levels[step.parent] = {
      parent_part: step.parent,
      part_desc: model.desc[step.parent] ?? step.parent,
      entity_type: model.entityType[step.parent] ?? 'SubAssembly',
      assembly_depth: step.depth,
      children_count: step.children.length,
      children: step.children.map((c) => ({
        part_no: c.part,
        part_desc: model.desc[c.part] ?? '',
        entity_type: c.entityType,
        qty_per_assembly: c.qty,
        operation_no: c.operationNo ?? 0,
        ending_inv: round(componentInv[c.part] ?? 0, 2),
      })),
      ending_inventory: round(step.parent === fgPart ? fgInventory : componentInv[step.parent] ?? 0, 2),
    };
  }

  const byPart: Record<string, PartAggregate> = {};
  const ensure = (part: string): PartAggregate => {
    let e = byPart[part];
    if (!e) {
      e = {
        part_no: part,
        part_desc: model.desc[part] ?? '',
        entity_type: model.entityType[part] ?? 'Component',
        produced_qty: 0,
        consumed_qty: 0,
        under_delivery_qty: 0,
        ending_inventory: 0,
        batches: 0,
        initial_inventory: meta.initial_inventory[part] ?? 0,
        safety_stock: meta.part_safety_stocks[part] ?? 0,
      };
      byPart[part] = e;
    }
    return e;
  };
  const sltSamples: Record<string, number[]> = {};
  const stepAgg: Record<string, { durations: number[]; waits: number[]; shortage: number }> = {};
  for (const ev of levelEvents) {
    if (ev.phase === 'assembly') {
      let agg = stepAgg[ev.parent_part];
      if (!agg) {
        agg = { durations: [], waits: [], shortage: 0 };
        stepAgg[ev.parent_part] = agg;
      }
      agg.durations.push(ev.duration_days);
      agg.waits.push(ev.queue_wait_days ?? 0);
      agg.shortage += ev.total_shortage ?? 0;
      const entry = ensure(ev.parent_part);
      entry.produced_qty += ev.output_qty;
      entry.batches += 1;
      for (const cp of ev.parts_detail) ensure(cp.part_no).consumed_qty += cp.consumed ?? 0;
    } else {
      for (const cp of ev.parts_detail) {
        const entry = ensure(cp.part_no);
        entry.produced_qty += cp.qty_received ?? 0;
        entry.under_delivery_qty += cp.qty_under_delivered ?? 0;
        if (cp.eff_slt_days != null) {
          if (!sltSamples[cp.part_no]) sltSamples[cp.part_no] = [];
          sltSamples[cp.part_no].push(cp.eff_slt_days);
        }
      }
    }
  }
  for (const [parent, agg] of Object.entries(stepAgg)) {
    const lvl = levels[parent];
    if (!lvl) continue;
    lvl.avg_duration_days = round(mean(agg.durations), 4);
    lvl.avg_queue_wait_days = round(mean(agg.waits), 4);
    lvl.total_batches = agg.durations.length;
    lvl.total_shortage = Math.round(agg.shortage);
  }
  for (const part of Object.keys(model.nodes)) {
    const entry = ensure(part);
    entry.ending_inventory = round(part === fgPart ? fgInventory : componentInv[part] ?? 0, 2);
    if (model.entityType[part] === 'Component' || model.entityType[part] === 'Expense') {
      const samples = sltSamples[part];
      entry.avg_eff_slt_days = samples && samples.length ? round(mean(samples), 3) : supplierTerms(part).sltEff;
    }
  }
  const fgEntry = ensure(fgPart);
  fgEntry.produced_qty = round(cumProduced, 2);
  fgEntry.shipped_qty = round(cumShipped, 2);
  for (const entry of Object.values(byPart)) {
    entry.produced_qty = round(entry.produced_qty, 2);
    entry.consumed_qty = round(entry.consumed_qty, 2);
    entry.under_delivery_qty = round(entry.under_delivery_qty, 2);
  }

  return {
    kpis,
    timeseries,
    demand_events: demandEvents,
    production_events: productionEvents,
    shipment_events: shipmentEvents,
    level_events: levelEvents,
    replenishment_events: replenishmentEvents,
    hierarchy_summary: {
      assembly_plan_order: model.plan.map((s) => s.parent),
      levels,
      sub_assembly_ids: kpis.sub_assembly_ids,
      by_part: byPart,
    },
    session_id: null,
    mode: 'fresh',
  };
}
