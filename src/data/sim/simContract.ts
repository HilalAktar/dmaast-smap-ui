/**
 * SimulationResultV1 — versioned data contract (single source of truth).
 *
 * TypeScript mirror of `SimulationResultV1.schema.json`. Both the KAM and JPB
 * value-chain digital twins map their `/api/demo/simulate` output onto this
 * shape; the smap UI consumes only this type. Twin/product asymmetry lives in
 * the optional `config` block and in the open (index-signature) row/record
 * shapes — the normalized top level (kpis, timeseries, events, hierarchy) is
 * symmetric across companies.
 *
 * Do NOT bind raw vendor payloads to UI state directly — always go through a
 * SimSource (see ./SimSource.ts), which returns this contract type.
 */

export type Company = 'kam' | 'jpb';

export const SIM_CONTRACT_VERSION = '1.0.0' as const;

/** Provenance of a result: pre-generated static artifact (B) or live API (A). */
export type SimSourceKind = 'pre-generated' | 'live';

export type DemandMode = 'family_proxy' | 'exact_f04' | 'family_scaled';

/** Global shock knobs. Baseline default = all zero. JPB adds the last three. */
export interface ShockConfig {
  Sales_Qty_pct: number;
  Interarrival_Time_pct: number;
  Supplier_Lead_Time_pct: number;
  Fill_Rate_pct: number;
  Defect_Rate_pct: number;
  Order_Quantity_pct: number;
  Arrival_Delay_Days_pct: number;
  Production_Duration_Days_pct: number;
  Completion_Rate_pct: number;
  Ship_Delay_Days_pct: number;
  /** JPB-only event-layer shocks (absent on KAM). */
  Subcontract_Lead_Time_pct?: number;
  Rework_pct?: number;
  Quality_Hold_pct?: number;
}

/** Planning config. Core keys shared; JPB adds the trailing optional keys. */
export interface PlanningConfig {
  safety_stock: number;
  min_lot_size: number;
  planning_method: string;
  period_order_qty_days: number;
  review_interval_days: number;
  max_outstanding_production_batches: number;
  production_capacity: number;
  outbound_capacity: number;
  min_interarrival_days?: number;
  initial_inventory: number | null;
  initial_backlog: number;
  /** JPB-only. */
  max_batch_qty?: number | null;
  ship_complete?: boolean;
  reorder_on_position?: boolean;
  leaf_coverage_factor?: number;
  sa_coverage_factor?: number;
  [key: string]: unknown;
}

/** OPTIONAL resolved run configuration; carries KAM/JPB asymmetry. */
export interface SimConfigV1 {
  product_id?: string;
  /** JPB catalog selector; null for KAM and the JPB pilot default. */
  config_code?: string | null;
  /** true only for JPB (multi-product catalog). */
  supports_configurations?: boolean;
  horizon_days?: number;
  seed?: number;
  demand_mode?: DemandMode;
  f04_share?: number;
  planning?: PlanningConfig;
  shocks?: ShockConfig;
  [key: string]: unknown;
}

/** Scalar summary metrics. Core keys guaranteed; twins may add more. */
export interface SimKpis {
  product_id: string;
  horizon_days: number;
  total_demand_qty: number;
  shipped_qty: number;
  /** shipped_qty / total_demand_qty (1.0 when no demand). */
  service_level: number;
  avg_inventory: number;
  ending_inventory: number;
  cumulative_produced: number;
  cumulative_shipped: number;
  production_batches_completed: number;
  shipments_completed_allocations: number;
  n_assembly_levels: number;
  sub_assembly_ids: string[];
  /** JPB adds `company`; both may add further keys. */
  company?: Company;
  [key: string]: unknown;
}

/** One inventory snapshot tick. Carries dynamic `inv_<subAssemblyId>` columns. */
export interface SimTimeseriesRow {
  time_days: number;
  inventory: number;
  raw_inventory?: number;
  backlog_qty: number;
  safety_stock: number;
  stockout_flag: 0 | 1;
  cumulative_produced?: number;
  cumulative_shipped?: number;
  cumulative_demand?: number;
  /** inv_<subAssemblyId>: number, plus other snapshot fields. */
  [key: string]: unknown;
}

/** Open event-row shape — column set varies by twin/phase. */
export type SimEventRow = Record<string, unknown>;

export interface SimDemandRow extends SimEventRow {
  t: number;
  sales_qty: number;
}

export interface SimLevelRow extends SimEventRow {
  batch_id: number;
  phase: 'procurement' | 'assembly';
  level: number;
  parts_detail?: SimEventRow[];
}

/** Discrete-event logs grouped by kind (maps the twin's *_events arrays). */
export interface SimEvents {
  demand: SimDemandRow[];
  production: SimEventRow[];
  shipment: SimEventRow[];
  level: SimLevelRow[];
  replenishment: SimEventRow[];
}

/** BOM / value-chain tree summary (the twin's hierarchy_summary). */
export interface SimHierarchy {
  assembly_plan_order: string[];
  levels: Record<string, SimEventRow>;
  sub_assembly_ids: string[];
  by_part: Record<string, SimEventRow>;
  [key: string]: unknown;
}

/** The normalized simulation output. Symmetric across twins. */
export interface SimResultPayload {
  kpis: SimKpis;
  timeseries: SimTimeseriesRow[];
  events: SimEvents;
  hierarchy: SimHierarchy;
}

/** Top-level versioned envelope — what a SimSource returns. */
export interface SimulationResultV1 {
  contract_version: typeof SIM_CONTRACT_VERSION;
  schema: 'SimulationResultV1';
  generated_at?: string;
  source: SimSourceKind;
  company: Company;
  config?: SimConfigV1;
  result: SimResultPayload;
}

/** Runtime guard: verifies the envelope is a compatible SimulationResultV1. */
export function isSimulationResultV1(x: unknown): x is SimulationResultV1 {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  if (o.schema !== 'SimulationResultV1') return false;
  if (typeof o.contract_version !== 'string') return false;
  // Major-version compatibility check.
  if (String(o.contract_version).split('.')[0] !== SIM_CONTRACT_VERSION.split('.')[0]) return false;
  if (o.company !== 'kam' && o.company !== 'jpb') return false;
  const r = o.result as Record<string, unknown> | undefined;
  if (!r || typeof r !== 'object') return false;
  return (
    !!r.kpis &&
    Array.isArray(r.timeseries) &&
    !!r.events &&
    !!r.hierarchy
  );
}
