/**
 * MOCK DATA — Decision Knowledge Graph (`/knowledge-graph`).
 *
 * Kullanıcı kararı (Asrınalp Şahin, 2026-09-17): "Planned" yer tutucu sayfa,
 * adına uygun MOCK bilgi grafiğiyle dolduruldu. Düğümler (karar, KPI, senaryo,
 * veri kaynağı, aktör, süreç) ve kenarlar sentetiktir; DKG backend çıktısı
 * DEĞİLDİR (TECH-321: DKG ile veri alışverişi standart API üzerinden olacak).
 *
 * Veri kaynağı düğümleri firmanın ERP'sine göre adlandırılır (KAM: IFS,
 * JPB: Clipper tablo adları); KPI/senaryo adları use-case bilgi dosyalarını izler.
 * `x`/`y` yalnızca SVG yerleşimi içindir (0–100 viewBox yüzdesi).
 */
import type { Company } from '../../contexts/CompanyContext';

export const DKG_MOCK_PROVENANCE = {
  kind: 'mock' as const,
  module: 'knowledge-graph',
  note: 'Synthetic decision knowledge graph for UI design — not a DKG backend result.',
  createdAt: '2026-09-17',
};

export type DkgNodeType = 'decision' | 'kpi' | 'scenario' | 'datasource' | 'actor' | 'process';

export interface DkgNode {
  id: string;
  label: string;
  type: DkgNodeType;
  description: string;
  x: number;
  y: number;
}

export type DkgRelation = 'influences' | 'measured_by' | 'impacts' | 'sourced_from' | 'owned_by' | 'runs_in';

export interface DkgEdge {
  from: string;
  to: string;
  relation: DkgRelation;
}

export interface DkgModel {
  company: Company;
  nodes: DkgNode[];
  edges: DkgEdge[];
}

export const DKG_NODE_TYPES: { type: DkgNodeType; label: string }[] = [
  { type: 'decision', label: 'Decision' },
  { type: 'kpi', label: 'KPI' },
  { type: 'scenario', label: 'Scenario' },
  { type: 'process', label: 'Process' },
  { type: 'datasource', label: 'Data source' },
  { type: 'actor', label: 'Actor' },
];

export const DKG_MOCK: Record<Company, DkgModel> = {
  kam: {
    company: 'kam',
    nodes: [
      { id: 'dec-safety-stock', label: 'Safety stock level', type: 'decision', description: 'Base-stock safety level for the F04 variant.', x: 30, y: 18 },
      { id: 'dec-second-source', label: 'Second-source supplier', type: 'decision', description: 'Qualify a second supplier for critical PCB components.', x: 62, y: 14 },
      { id: 'dec-shift-plan', label: 'Assembly shift plan', type: 'decision', description: 'Number of shifts / lines on final assembly.', x: 84, y: 30 },
      { id: 'kpi-service-level', label: 'Service level', type: 'kpi', description: 'Shipped qty / total demand.', x: 42, y: 42 },
      { id: 'kpi-lead-time', label: 'E2E lead time', type: 'kpi', description: 'Order-to-ship lead time (days).', x: 66, y: 44 },
      { id: 'kpi-inventory', label: 'Average inventory', type: 'kpi', description: 'Average on-hand stock (units).', x: 18, y: 46 },
      { id: 'kpi-oee', label: 'OEE', type: 'kpi', description: 'Availability × performance × quality.', x: 88, y: 56 },
      { id: 'sc-demand-surge', label: 'Demand surge', type: 'scenario', description: 'Sustained demand above capacity.', x: 50, y: 6 },
      { id: 'sc-supplier-delay', label: 'Supplier delay', type: 'scenario', description: 'Supplier lead time +50%.', x: 10, y: 20 },
      { id: 'pr-procurement', label: 'Procurement', type: 'process', description: 'Component purchasing and inbound.', x: 12, y: 70 },
      { id: 'pr-assembly', label: 'PCB & meter assembly', type: 'process', description: 'SMT, final assembly, calibration.', x: 50, y: 70 },
      { id: 'pr-delivery', label: 'Delivery', type: 'process', description: 'Outbound shipping to customers.', x: 80, y: 74 },
      { id: 'ds-ifs-shop-orders', label: 'IFS · Shop Orders', type: 'datasource', description: 'Shop-order completions and material status.', x: 40, y: 92 },
      { id: 'ds-ifs-purchase', label: 'IFS · Purchase Orders', type: 'datasource', description: 'Supplier orders, arrival dates, fill rate.', x: 12, y: 92 },
      { id: 'ds-unit-states', label: 'unit_states stream', type: 'datasource', description: 'PackML equipment states (planned Kafka stream).', x: 84, y: 92 },
      { id: 'act-planner', label: 'Supply planner', type: 'actor', description: 'Owns replenishment and safety-stock decisions.', x: 8, y: 4 },
      { id: 'act-prod-manager', label: 'Production manager', type: 'actor', description: 'Owns shift plan and capacity decisions.', x: 94, y: 8 },
    ],
    edges: [
      { from: 'dec-safety-stock', to: 'kpi-inventory', relation: 'influences' },
      { from: 'dec-safety-stock', to: 'kpi-service-level', relation: 'influences' },
      { from: 'dec-second-source', to: 'kpi-lead-time', relation: 'influences' },
      { from: 'dec-second-source', to: 'kpi-service-level', relation: 'influences' },
      { from: 'dec-shift-plan', to: 'kpi-lead-time', relation: 'influences' },
      { from: 'dec-shift-plan', to: 'kpi-oee', relation: 'influences' },
      { from: 'sc-demand-surge', to: 'kpi-service-level', relation: 'impacts' },
      { from: 'sc-demand-surge', to: 'kpi-lead-time', relation: 'impacts' },
      { from: 'sc-supplier-delay', to: 'kpi-inventory', relation: 'impacts' },
      { from: 'sc-supplier-delay', to: 'kpi-service-level', relation: 'impacts' },
      { from: 'kpi-service-level', to: 'ds-ifs-shop-orders', relation: 'sourced_from' },
      { from: 'kpi-inventory', to: 'ds-ifs-purchase', relation: 'sourced_from' },
      { from: 'kpi-lead-time', to: 'ds-ifs-shop-orders', relation: 'sourced_from' },
      { from: 'kpi-oee', to: 'ds-unit-states', relation: 'sourced_from' },
      { from: 'kpi-inventory', to: 'pr-procurement', relation: 'runs_in' },
      { from: 'kpi-oee', to: 'pr-assembly', relation: 'runs_in' },
      { from: 'kpi-service-level', to: 'pr-delivery', relation: 'runs_in' },
      { from: 'dec-safety-stock', to: 'act-planner', relation: 'owned_by' },
      { from: 'dec-second-source', to: 'act-planner', relation: 'owned_by' },
      { from: 'dec-shift-plan', to: 'act-prod-manager', relation: 'owned_by' },
    ],
  },
  jpb: {
    company: 'jpb',
    nodes: [
      { id: 'dec-subcontract', label: 'Subcontract overflow', type: 'decision', description: 'Route part of USI10 machining load to a subcontractor.', x: 30, y: 18 },
      { id: 'dec-second-shift', label: 'Second shift USI10', type: 'decision', description: 'Add a night shift on the machining centre.', x: 62, y: 14 },
      { id: 'dec-quality-gate', label: 'Quality gate at CONTR', type: 'decision', description: 'Move inspection before squaring.', x: 84, y: 30 },
      { id: 'kpi-otd', label: 'OTD', type: 'kpi', description: 'On-time delivery (target ≥ 97%).', x: 42, y: 42 },
      { id: 'kpi-oqd', label: 'OQD', type: 'kpi', description: 'On-quality delivery (target ≥ 97%).', x: 88, y: 56 },
      { id: 'kpi-scrap', label: 'Scrap factor', type: 'kpi', description: 'Damaged parts over produced parts.', x: 66, y: 44 },
      { id: 'kpi-bottleneck', label: 'Bottleneck load', type: 'kpi', description: 'Capacity load of the USI10 work centre.', x: 18, y: 46 },
      { id: 'sc-demand-drop', label: 'Demand drop', type: 'scenario', description: 'Sharp demand collapse (COVID-19 reference).', x: 50, y: 6 },
      { id: 'sc-rework-wave', label: 'Rework wave', type: 'scenario', description: 'Rework and quality holds increase.', x: 10, y: 20 },
      { id: 'pr-machining', label: 'Machining (USI10)', type: 'process', description: 'Turning / threading of lock nuts.', x: 12, y: 70 },
      { id: 'pr-control', label: 'Control & finishing', type: 'process', description: 'CONTR, CARRE, EBAVM phases.', x: 50, y: 70 },
      { id: 'pr-shipping', label: 'Shipping', type: 'process', description: 'Delivery notes and dispatch.', x: 80, y: 74 },
      { id: 'ds-affaire-bl', label: 'Clipper · TBL_AFFAIRE / TBL_BL', type: 'datasource', description: 'Orders, due dates and delivery notes.', x: 40, y: 92 },
      { id: 'ds-gamme', label: 'Clipper · TBL_GAMME', type: 'datasource', description: 'Routing: planned vs actual hours per phase.', x: 12, y: 92 },
      { id: 'ds-point', label: 'Clipper · TBL_POINT', type: 'datasource', description: 'Shop-floor time tracking and damaged parts.', x: 84, y: 92 },
      { id: 'act-planner', label: 'Production planner', type: 'actor', description: 'Owns load balancing and subcontracting.', x: 8, y: 4 },
      { id: 'act-quality', label: 'Quality manager', type: 'actor', description: 'Owns inspection strategy and NC handling.', x: 94, y: 8 },
    ],
    edges: [
      { from: 'dec-subcontract', to: 'kpi-bottleneck', relation: 'influences' },
      { from: 'dec-subcontract', to: 'kpi-otd', relation: 'influences' },
      { from: 'dec-second-shift', to: 'kpi-bottleneck', relation: 'influences' },
      { from: 'dec-second-shift', to: 'kpi-scrap', relation: 'influences' },
      { from: 'dec-quality-gate', to: 'kpi-scrap', relation: 'influences' },
      { from: 'dec-quality-gate', to: 'kpi-oqd', relation: 'influences' },
      { from: 'sc-demand-drop', to: 'kpi-otd', relation: 'impacts' },
      { from: 'sc-demand-drop', to: 'kpi-bottleneck', relation: 'impacts' },
      { from: 'sc-rework-wave', to: 'kpi-scrap', relation: 'impacts' },
      { from: 'sc-rework-wave', to: 'kpi-otd', relation: 'impacts' },
      { from: 'kpi-otd', to: 'ds-affaire-bl', relation: 'sourced_from' },
      { from: 'kpi-bottleneck', to: 'ds-gamme', relation: 'sourced_from' },
      { from: 'kpi-scrap', to: 'ds-point', relation: 'sourced_from' },
      { from: 'kpi-oqd', to: 'ds-point', relation: 'sourced_from' },
      { from: 'kpi-bottleneck', to: 'pr-machining', relation: 'runs_in' },
      { from: 'kpi-scrap', to: 'pr-control', relation: 'runs_in' },
      { from: 'kpi-otd', to: 'pr-shipping', relation: 'runs_in' },
      { from: 'dec-subcontract', to: 'act-planner', relation: 'owned_by' },
      { from: 'dec-second-shift', to: 'act-planner', relation: 'owned_by' },
      { from: 'dec-quality-gate', to: 'act-quality', relation: 'owned_by' },
    ],
  },
};

/** Bir düğüme bağlı kenarlar (her iki yön). */
export function getNeighbours(model: DkgModel, nodeId: string): { edge: DkgEdge; other: DkgNode; direction: 'out' | 'in' }[] {
  const byId = new Map(model.nodes.map((n) => [n.id, n]));
  const out: { edge: DkgEdge; other: DkgNode; direction: 'out' | 'in' }[] = [];
  for (const edge of model.edges) {
    if (edge.from === nodeId) {
      const other = byId.get(edge.to);
      if (other) out.push({ edge, other, direction: 'out' });
    } else if (edge.to === nodeId) {
      const other = byId.get(edge.from);
      if (other) out.push({ edge, other, direction: 'in' });
    }
  }
  return out;
}
