/**
 * Traceability map — per-part live/static supply-chain facts for the hierarchy
 * canvas and the detail panel. Typed port of the twin's
 * `frontend/src/utils/traceability.js`.
 */
import type { EntitySubtype, TreeNode } from '../../../data/mock/valueChainHierarchy';
import type {
  DemoMeta,
  HierarchySummary,
  LevelEvent,
  LevelPartDetail,
  RoutingOperation,
  SimResults,
  SupplierIndexEntry,
} from '../../../data/mock/valueChainSimMock';

export type AlertLevel = 'critical' | 'warning';
export type TraceStatus = 'ok' | 'warning' | 'critical';

export interface SupplyChainAlert {
  level: AlertLevel;
  code: string;
  text: string;
}

export interface StockDetails {
  available: number | null;
  onHand: number | null;
  reserved: number | null;
  inTransit: number | null;
  locations: number;
  uom: string | null;
  totalValue: number | null;
  currency: string | null;
  source: string;
}

export interface LeadTimeBreakdown {
  leadTimeLabel: string;
  totalLeadTimeDays: number | null;
  supplierLeadTimeDays: number | null;
  productionLeadTimeDays: number | null;
  assemblyLeadTimeDays: number | null;
  configLeadTimeDays: number | null;
  childProcurementDays: number | null;
}

export interface ChildRequirement {
  partNo: string;
  description: string;
  qtyRequired: number | null;
  qtyAvailable: number | null;
  shortage: number | null;
  simShortage: number | null;
  hasStock: boolean;
  uom: string | null;
  partType: string | null;
  subtype: EntitySubtype;
  supplierLeadTimeDays: number | null;
}

export interface ShortageChild {
  partNo: string;
  description: string;
  shortageQty: number | null;
  required: number | null;
  available: number | null;
  uom: string | null;
  supplierLeadTimeDays: number | null;
}

export interface StaticBottleneckInfo {
  score: number | null;
  shortageChildren: ShortageChild[];
  isBottleneck: boolean;
  reason: string | null;
}

export interface Traceability {
  hasStock: boolean;
  inventoryQty: number | null;
  initialInventory: number | null;
  safetyStock: number | null;
  simEndingInventory: number | null;
  simProducedQty: number | null;
  simConsumedQty: number | null;
  simLiveInventory: number | null;
  simUnderDeliveredQty: number | null;
  stockDetails: StockDetails | null;
  hasOrder: boolean;
  basisOrder: string | null;
  evidenceOrders: number;
  leadTimeDays: number | null;
  leadTimeLabel: string;
  leadTimeBreakdown: LeadTimeBreakdown | null;
  childRequirements: ChildRequirement[];
  productionStage: string;
  bottleneckPartNo: string | null;
  isBottleneckNode: boolean;
  bottleneckReason: string | null;
  staticBottleneck: StaticBottleneckInfo | null;
  queueWaitDays: number | null;
  shortageQty: number;
  historicalShortageQty: number;
  supplierCount: number;
  supplierLeadTimeDays: number | null;
  baseSupplierLtDays: number | null;
  simEffectiveSupplierLtDays: number | null;
  minOrderQty: number | null;
  operationCount: number;
  operationNo: number | null;
  operationName: string | null;
  supplyChainAlerts: SupplyChainAlert[];
  status: TraceStatus;
  severity: number;
}

export type TraceabilityMap = Record<string, Traceability>;

interface NormStock {
  available: number;
  onHand: number;
  reserved: number;
  inTransit: number;
  locations: number;
  uom: string | null;
  totalValue: number;
  currency: string | null;
  hasStock: boolean;
}

type ShopOrderLT = DemoMeta['shop_order_lead_times'];

function toNum(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function avg(values: number[]): number {
  if (!values || values.length === 0) return 0;
  return values.reduce((s, v) => s + toNum(v), 0) / values.length;
}

function safeRound(value: unknown, digits = 2): number | null {
  const n = toNum(value, NaN);
  if (!Number.isFinite(n)) return null;
  return Number(n.toFixed(digits));
}

function latestBy<T>(items: T[], key: keyof T): T | null {
  if (!items || items.length === 0) return null;
  return [...items].sort((a, b) => toNum(b[key]) - toNum(a[key]))[0];
}

function buildOperationMap(routingOperations: RoutingOperation[] = []): Record<string, RoutingOperation[]> {
  const map: Record<string, RoutingOperation[]> = {};
  for (const op of routingOperations) {
    const p = String(op?.part_no || '').trim();
    if (!p) continue;
    if (!map[p]) map[p] = [];
    map[p].push(op);
  }
  return map;
}

function buildBomInventoryMap(bomTree: DemoMeta['bom_tree'] = []): Record<string, number> {
  const map: Record<string, number> = {};
  for (const row of bomTree) {
    const p = String(row?.component_part || '').trim();
    if (!p) continue;
    map[p] = Math.max(toNum(map[p], 0), toNum(row?.available_qty, 0));
  }
  return map;
}

function normalizeStockByPart(stockByPart: DemoMeta['stock_by_part'] = {}): Record<string, NormStock> {
  const map: Record<string, NormStock> = {};
  for (const [pno, row] of Object.entries(stockByPart)) {
    if (!pno || !row) continue;
    const available = toNum(row.available_qty, 0);
    map[String(pno).trim()] = {
      available,
      onHand: toNum(row.on_hand_qty, available),
      reserved: toNum(row.reserved_qty, 0),
      inTransit: toNum(row.in_transit_qty, 0),
      locations: toNum(row.location_count, 0),
      uom: row.uom || null,
      totalValue: toNum(row.total_value, 0),
      currency: row.value_currency || null,
      hasStock: Boolean(row.has_stock ?? available > 0),
    };
  }
  return map;
}

function buildLevelEventMap(levelEvents: LevelEvent[] = []): Record<string, LevelEvent[]> {
  const map: Record<string, LevelEvent[]> = {};
  for (const event of levelEvents) {
    const p = String(event?.parent_part || '').trim();
    if (!p) continue;
    if (!map[p]) map[p] = [];
    map[p].push(event);
  }
  return map;
}

function severityRank(level: AlertLevel): number {
  if (level === 'critical') return 3;
  if (level === 'warning') return 2;
  return 1;
}

function statusFromAlerts(alerts: SupplyChainAlert[]): TraceStatus {
  if (alerts.some((a) => a.level === 'critical')) return 'critical';
  if (alerts.some((a) => a.level === 'warning')) return 'warning';
  return 'ok';
}

function isPhantomNode(node: TreeNode | null | undefined): boolean {
  if (!node) return false;
  if (node.phantomBom) return true;
  const pt = String(node.partType || '').toLowerCase();
  const desc = String(node.description || '').toLowerCase();
  return pt.includes('phantom') || desc.includes('phantom');
}

function buildBottleneckIndex(
  hierarchySummary: Partial<HierarchySummary>,
  levelEventMap: Record<string, LevelEvent[]>,
  phantomPartSet: Set<string>,
): { topPartNo: string | null; reason: string | null } {
  const levels = hierarchySummary?.levels || {};
  const scores: { partNo: string; score: number; q: number; shortage: number }[] = [];

  Object.entries(levels).forEach(([partNo, level]) => {
    if (phantomPartSet.has(partNo)) return;
    const q = toNum(level?.avg_queue_wait_days, 0);
    const shortage = toNum(level?.total_shortage, 0);
    const d = toNum(level?.avg_duration_days, 0);
    const score = q * 4 + shortage * 2 + d;
    scores.push({ partNo, score, q, shortage });
  });

  Object.entries(levelEventMap).forEach(([partNo, events]) => {
    if (phantomPartSet.has(partNo)) return;
    if (scores.find((s) => s.partNo === partNo)) return;
    const q = avg(events.map((e) => toNum(e?.queue_wait_days, 0)));
    const shortage = events.reduce((s, e) => s + toNum(e?.total_shortage, 0), 0);
    const d = avg(events.map((e) => toNum(e?.duration_days, 0)));
    const score = q * 4 + shortage * 2 + d;
    scores.push({ partNo, score, q, shortage });
  });

  scores.sort((a, b) => b.score - a.score);
  const top = scores[0];
  if (!top || top.score <= 0.001) return { topPartNo: null, reason: null };

  let reason = 'Operational slowdown';
  if (top.shortage > 0.01) {
    reason = 'Stock shortage / insufficient supply';
  } else if (top.q > 0.5) {
    reason = 'Capacity queue / work-center congestion';
  }

  return { topPartNo: top.partNo, reason };
}

/* ─── Helper: Determine if a part is Manufactured ─── */
function isManufacturedPart(node: TreeNode | null | undefined): boolean {
  const pt = (node?.partType || '').toLowerCase();
  return pt.includes('manufactured');
}

function isPurchasedOrExpensePart(node: TreeNode | null | undefined): boolean {
  const pt = (node?.partType || '').toLowerCase();
  return pt.includes('purchased') || pt.includes('expense');
}

/* ─── Static Lead Time Calculation (pre-simulation) ───
 *   • Purchased / Expense → Supplier Lead Time.
 *   • Manufactured → Production Lead Time = Assembly LT + Config LT, plus the
 *     MAX child procurement time among children that are short on stock
 *     (recursive — so the root config's lead time propagates automatically).
 */
function computeStaticLeadTime(
  partNo: string,
  node: TreeNode,
  shopOrderLT: ShopOrderLT,
  supplierIndex: Record<string, SupplierIndexEntry>,
  stockByPart: Record<string, NormStock>,
  memo: Record<string, LeadTimeBreakdown> = {},
  stack: Set<string> = new Set(),
): LeadTimeBreakdown {
  if (memo[partNo]) return memo[partNo];
  if (stack.has(partNo)) {
    // guard against the (unlikely) case of a cyclic reference in the BOM
    return {
      leadTimeLabel: 'Lead Time',
      totalLeadTimeDays: 0,
      supplierLeadTimeDays: 0,
      productionLeadTimeDays: 0,
      assemblyLeadTimeDays: 0,
      configLeadTimeDays: 0,
      childProcurementDays: null,
    };
  }
  stack.add(partNo);

  // ─── Purchased / Expense → Supplier Lead Time ───
  if (isPurchasedOrExpensePart(node)) {
    const slt = toNum(supplierIndex?.[partNo]?.avg_lead_time_days, 0);
    const result: LeadTimeBreakdown = {
      leadTimeLabel: 'Supplier Lead Time',
      totalLeadTimeDays: safeRound(slt, 2),
      supplierLeadTimeDays: safeRound(slt, 2),
      productionLeadTimeDays: null,
      assemblyLeadTimeDays: null,
      configLeadTimeDays: null,
      childProcurementDays: null,
    };
    memo[partNo] = result;
    stack.delete(partNo);
    return result;
  }

  // ─── Manufactured → Production Lead Time ───
  const assemblyLT = toNum(shopOrderLT?.assembly?.[partNo], 0);
  const configLT = toNum(shopOrderLT?.config?.[partNo], 0);
  const productionLT = assemblyLT + configLT;

  const childNodes = node?.children || [];
  let maxChildProcurementDays = 0;

  for (const child of childNodes) {
    const childPartNo = String(child.partNo || '');
    if (!childPartNo) continue;
    const childStock = stockByPart[childPartNo];
    const childAvail = childStock ? childStock.available : 0;
    const childNeeded = toNum(child.qtyPerAssembly, 1);

    if (childAvail + 1e-9 < childNeeded) {
      // Short → add the child's own lead time (recursive)
      const childLT = computeStaticLeadTime(childPartNo, child, shopOrderLT, supplierIndex, stockByPart, memo, stack);
      const days = toNum(childLT?.totalLeadTimeDays, 0);
      if (days > maxChildProcurementDays) maxChildProcurementDays = days;
    }
  }

  const totalLT = productionLT + maxChildProcurementDays;
  const result: LeadTimeBreakdown = {
    leadTimeLabel: 'Production Lead Time',
    totalLeadTimeDays: safeRound(totalLT, 2),
    supplierLeadTimeDays: null,
    productionLeadTimeDays: safeRound(productionLT, 2),
    assemblyLeadTimeDays: safeRound(assemblyLT, 2),
    configLeadTimeDays: safeRound(configLT, 2),
    childProcurementDays: maxChildProcurementDays > 0 ? safeRound(maxChildProcurementDays, 2) : null,
  };
  memo[partNo] = result;
  stack.delete(partNo);
  return result;
}

/* ─── Static Child Requirements ─── */
function computeChildRequirements(
  childNodes: TreeNode[],
  stockByPart: Record<string, NormStock>,
  supplierIndex: Record<string, SupplierIndexEntry>,
  simPartsByChild: Record<string, LevelPartDetail> = {},
): ChildRequirement[] {
  if (!childNodes || childNodes.length === 0) return [];

  return childNodes.map((child) => {
    const childPartNo = String(child.partNo || '');
    const childStock = stockByPart[childPartNo] || null;
    const available = childStock ? childStock.available : 0;
    const uom = childStock?.uom || null;
    const required = toNum(child.qtyPerAssembly, 1);
    const shortage = Math.max(0, required - available);
    const simPart = simPartsByChild?.[childPartNo] || null;
    const simShortage = toNum(simPart?.shortage, 0);
    const effectiveLeadDays =
      simPart?.effective_lead_time_days != null
        ? safeRound(simPart.effective_lead_time_days, 2)
        : safeRound(supplierIndex?.[childPartNo]?.avg_lead_time_days, 2);

    return {
      partNo: childPartNo,
      description: child.description || childPartNo,
      qtyRequired: safeRound(required, 4),
      qtyAvailable: safeRound(available, 2),
      shortage: safeRound(shortage, 2),
      simShortage: safeRound(simShortage, 2),
      hasStock: simPart ? simShortage <= 0.0001 : available + 1e-9 >= required,
      uom,
      partType: child.partType || null,
      subtype: child.subtype || 'Component',
      supplierLeadTimeDays: effectiveLeadDays,
    };
  });
}

/* ─── Static Bottleneck Detection ───
 * Every Manufactured parent with at least one child short on stock is a
 * bottleneck point; the highest-scoring one is the global "top" bottleneck.
 */
function computeStaticBottleneck(
  tree: TreeNode | null,
  stockByPart: Record<string, NormStock>,
  supplierIndex: Record<string, SupplierIndexEntry>,
): { topPartNo: string | null; reason: string | null; scores: Record<string, StaticBottleneckInfo> } {
  if (!tree) return { topPartNo: null, reason: null, scores: {} };

  const scores: Record<string, StaticBottleneckInfo> = {};

  const walk = (node: TreeNode) => {
    const partNo = String(node.partNo || '');
    const children = node.children || [];

    if (isManufacturedPart(node) && children.length > 0) {
      let shortageScore = 0;
      const shortageChildren: ShortageChild[] = [];

      for (const child of children) {
        const childPartNo = String(child.partNo || '');
        const childStock = stockByPart[childPartNo];
        const availQty = childStock ? childStock.available : 0;
        const needed = toNum(child.qtyPerAssembly, 1);

        if (availQty + 1e-9 < needed) {
          const shortageQty = needed - availQty;
          const ratio = needed > 0 ? shortageQty / needed : 1;
          const childSLT = toNum(supplierIndex?.[childPartNo]?.avg_lead_time_days, 0);
          shortageScore += ratio * 3 + (childSLT > 0 ? childSLT / 10 : 0);
          shortageChildren.push({
            partNo: childPartNo,
            description: child.description || childPartNo,
            shortageQty: safeRound(shortageQty, 2),
            required: safeRound(needed, 4),
            available: safeRound(availQty, 2),
            uom: childStock?.uom || null,
            supplierLeadTimeDays: childSLT > 0 ? safeRound(childSLT, 2) : null,
          });
        }
      }

      const hasShortage = shortageChildren.length > 0;
      scores[partNo] = {
        score: safeRound(shortageScore, 4),
        shortageChildren,
        isBottleneck: hasShortage,
        reason: hasShortage ? `Stock shortage: ${shortageChildren.map((c) => c.partNo).join(', ')}` : null,
      };
    }

    for (const child of children) walk(child);
  };

  walk(tree);

  let topPartNo: string | null = null;
  let topScore = 0;
  for (const [pno, info] of Object.entries(scores)) {
    if ((info.score ?? 0) > topScore) {
      topScore = info.score ?? 0;
      topPartNo = pno;
    }
  }

  return {
    topPartNo,
    reason: topPartNo ? scores[topPartNo]?.reason || null : null,
    scores,
  };
}

export function buildTraceabilityMap(
  tree: TreeNode | null,
  simResults: SimResults | null,
  demoMeta: DemoMeta | null,
): TraceabilityMap {
  if (!tree) return {};

  const hasSimulation = Boolean(
    simResults &&
      ((simResults.level_events && simResults.level_events.length > 0) ||
        (simResults.timeseries && simResults.timeseries.length > 0)),
  );

  const levelEvents = simResults?.level_events || [];
  const hierarchySummary: Partial<HierarchySummary> = simResults?.hierarchy_summary || {};
  const byPart = hierarchySummary?.by_part || {};
  const timeseries = simResults?.timeseries || [];
  const shipmentEvents = simResults?.shipment_events || [];
  const productionEvents = simResults?.production_events || [];

  const bomInventoryMap = buildBomInventoryMap(demoMeta?.bom_tree || []);
  const stockByPart = normalizeStockByPart(demoMeta?.stock_by_part || {});
  const operationMap = buildOperationMap(demoMeta?.routing_operations || []);
  const supplierIndex = demoMeta?.supplier_index || {};
  const shopOrderLT: ShopOrderLT = demoMeta?.shop_order_lead_times || { assembly: {}, config: {} };
  const levelEventMap = buildLevelEventMap(levelEvents);
  const partSafetyStocks = demoMeta?.part_safety_stocks || {};
  const initialInventoryMap = demoMeta?.initial_inventory || {};
  const phantomPartSet = new Set<string>();

  const collectPhantoms = (node: TreeNode | null) => {
    if (!node) return;
    const pn = String(node.partNo || '');
    if (pn && isPhantomNode(node)) phantomPartSet.add(pn);
    for (const c of node.children || []) collectPhantoms(c);
  };
  collectPhantoms(tree);

  // Simulation-based bottleneck (only when sim results exist)
  const simBottleneck = hasSimulation
    ? buildBottleneckIndex(hierarchySummary, levelEventMap, phantomPartSet)
    : { topPartNo: null, reason: null };

  // Static bottleneck (always computed)
  const staticBN = computeStaticBottleneck(tree, stockByPart, supplierIndex);

  const rootPartNo = String(tree.partNo || '');
  const lastTs = latestBy(timeseries, 'time_days');
  const rootSimInventory = toNum(lastTs?.inventory, toNum(hierarchySummary?.levels?.[rootPartNo]?.ending_inventory, 0));
  const deliveryDelayAvg = avg(shipmentEvents.map((s) => toNum(s?.delivery_delay_days, 0)));

  const leadTimeMemo: Record<string, LeadTimeBreakdown> = {};
  const result: TraceabilityMap = {};

  const walk = (node: TreeNode) => {
    const partNo = String(node.partNo || '');
    if (!partNo) return;

    const levelSummary = hierarchySummary?.levels?.[partNo] || null;
    const partEvents = levelEventMap[partNo] || [];
    const latestEvent = latestBy(partEvents, 't_end');
    const childNodes = node.children || [];
    const isPhantom = isPhantomNode(node);

    // Real stock from ERP data
    const realStock = stockByPart[partNo] || null;
    const realAvailable = realStock ? realStock.available : toNum(bomInventoryMap[partNo], 0);

    const simEndingInventory = partNo === rootPartNo ? rootSimInventory : toNum(levelSummary?.ending_inventory, NaN);

    const inventoryQty = realAvailable;
    const hasStock = inventoryQty > 0.001;
    const supplier = supplierIndex[partNo] || null;
    const hasOrder = Boolean(node?.basisOrder) || toNum(node?.evidenceOrders, 0) > 0 || partEvents.length > 0;

    // ─── Lead Time Calculation ───
    let leadTimeDays: number | null;
    let leadTimeLabel: string;
    let leadTimeBreakdown: LeadTimeBreakdown | null;
    if (hasSimulation) {
      const opLead = toNum(levelSummary?.avg_duration_days, avg(partEvents.map((e) => toNum(e?.duration_days, 0))));
      const queueWaitSim = toNum(levelSummary?.avg_queue_wait_days, avg(partEvents.map((e) => toNum(e?.queue_wait_days, 0))));
      const supplyLead = toNum(supplier?.avg_lead_time_days, 0);
      leadTimeDays = safeRound(opLead + queueWaitSim + supplyLead, 2);
      leadTimeLabel = isManufacturedPart(node) ? 'Production Lead Time' : 'Supplier Lead Time';
      leadTimeBreakdown = null;
    } else {
      const staticLT = computeStaticLeadTime(partNo, node, shopOrderLT, supplierIndex, stockByPart, leadTimeMemo);
      leadTimeDays = staticLT.totalLeadTimeDays;
      leadTimeLabel = staticLT.leadTimeLabel;
      leadTimeBreakdown = staticLT;
    }

    // ─── Child Requirements ───
    const latestPartsDetail = Array.isArray(latestEvent?.parts_detail) ? latestEvent.parts_detail : [];
    const simPartsByChild: Record<string, LevelPartDetail> = {};
    for (const part of latestPartsDetail) {
      const cNo = String(part?.part_no || '').trim();
      if (!cNo) continue;
      simPartsByChild[cNo] = part;
    }
    const childRequirements = computeChildRequirements(childNodes, stockByPart, supplierIndex, simPartsByChild);

    // ─── Production Stage ───
    let productionStage = 'Planning / Pending';
    if (latestEvent?.phase === 'procurement') {
      productionStage = 'Procurement / Kitting';
    } else if (latestEvent?.phase === 'assembly') {
      productionStage = 'Assembly';
    } else if (partNo === rootPartNo && productionEvents.length > 0) {
      productionStage = 'Finished good / Ready to ship';
    } else if ((operationMap[partNo] || []).length === 0 && node?.subtype === 'Component') {
      productionStage = 'Purchased part';
    }

    // ─── Bottleneck ───
    const queueWait = hasSimulation
      ? toNum(levelSummary?.avg_queue_wait_days, avg(partEvents.map((e) => toNum(e?.queue_wait_days, 0))))
      : 0;

    const historicalShortageQty = hasSimulation
      ? Math.round(toNum(levelSummary?.total_shortage, partEvents.reduce((s, e) => s + toNum(e?.total_shortage, 0), 0)))
      : 0;
    const activeShortageQty =
      hasSimulation && latestEvent?.phase === 'assembly' && !isPhantom
        ? Math.max(0, Math.round(toNum(latestEvent?.total_shortage, 0)))
        : 0;

    const nodeStaticBN = staticBN.scores[partNo] || null;

    let isBottleneckNode: boolean;
    let effectiveBottleneck: { topPartNo: string | null; reason: string | null };
    if (hasSimulation) {
      effectiveBottleneck = simBottleneck;
      isBottleneckNode = !isPhantom && simBottleneck.topPartNo === partNo;
    } else {
      effectiveBottleneck = staticBN;
      isBottleneckNode = !isPhantom && Boolean(nodeStaticBN?.isBottleneck);
    }

    let bottleneckReason: string | null = null;
    if (hasSimulation) {
      if (activeShortageQty > 0) {
        bottleneckReason = 'Material shortage / insufficient supply';
      } else if (queueWait > 0.5) {
        bottleneckReason = 'Capacity queue / operation delay';
      } else if (isBottleneckNode) {
        bottleneckReason = effectiveBottleneck.reason;
      }
    } else if (nodeStaticBN && nodeStaticBN.shortageChildren.length > 0) {
      bottleneckReason = `Stock shortage: ${nodeStaticBN.shortageChildren.map((c) => c.partNo).join(', ')}`;
    }

    // ─── Alerts ───
    const alerts: SupplyChainAlert[] = [];
    // FG / SubAssembly are PRODUCED, not stocked: an empty warehouse for the
    // finished good is the normal state at t=0 — only purchased / expense
    // leaves should turn critical from NO_STOCK.
    const isProducedNode = node?.subtype === 'FinishedGood' || node?.subtype === 'SubAssembly';
    if (!hasStock && !isProducedNode) {
      alerts.push({ level: 'critical', code: 'NO_STOCK', text: 'No warehouse stock' });
    }
    if (activeShortageQty > 0) {
      alerts.push({ level: 'critical', code: 'SHORTAGE_ACTIVE', text: `Active shortage qty: ${activeShortageQty}` });
    }
    if (
      !isPhantom &&
      latestEvent?.blocked_by_shortage &&
      Array.isArray(latestEvent?.blocking_parts) &&
      latestEvent.blocking_parts.length > 0
    ) {
      alerts.push({
        level: 'warning',
        code: 'SHORTAGE_BLOCKED',
        text: `Flow paused by child shortage: ${latestEvent.blocking_parts.join(', ')}`,
      });
    }
    if (queueWait > 0.5) {
      alerts.push({ level: 'warning', code: 'QUEUE', text: `Production queue wait: ${safeRound(queueWait, 2)} days` });
    }
    if (leadTimeDays != null && leadTimeDays > 10) {
      alerts.push({ level: 'warning', code: 'LEAD', text: `High lead time: ${leadTimeDays} days` });
    }
    if (partNo === rootPartNo && deliveryDelayAvg > 1) {
      alerts.push({ level: 'warning', code: 'SHIP_DELAY', text: `Avg. shipment delay: ${safeRound(deliveryDelayAvg, 2)} days` });
    }

    // Static: add child shortage alerts
    if (!hasSimulation && childRequirements.length > 0) {
      const shortageKids = childRequirements.filter((c) => !c.hasStock);
      if (shortageKids.length > 0) {
        alerts.push({
          level: 'warning',
          code: 'CHILD_SHORTAGE',
          text: `${shortageKids.length} child part(s) short on stock`,
        });
      }
    }

    const stockDetails: StockDetails | null = realStock
      ? {
          available: safeRound(realStock.available, 2),
          onHand: safeRound(realStock.onHand, 2),
          reserved: safeRound(realStock.reserved, 2),
          inTransit: safeRound(realStock.inTransit, 2),
          locations: realStock.locations,
          uom: realStock.uom,
          totalValue: safeRound(realStock.totalValue, 2),
          currency: realStock.currency,
          source: 'erp_inventory',
        }
      : null;

    // Live per-part aggregates from the simulation (hierarchy_summary.by_part).
    const partAgg = byPart[partNo] || null;
    const simProducedQty = partAgg ? safeRound(partAgg.produced_qty, 2) : null;
    const simConsumedQty = partAgg ? safeRound(partAgg.consumed_qty, 2) : null;
    const simLiveInventory = partAgg
      ? safeRound(partAgg.ending_inventory, 2)
      : Number.isFinite(simEndingInventory)
        ? safeRound(simEndingInventory, 2)
        : null;
    const simUnderDeliveredQty = partAgg ? safeRound(partAgg.under_delivery_qty, 2) : null;

    // Effective supplier lead time from simulation (shock-adjusted).
    const baseSupplierLtDays = supplier?.avg_lead_time_days ?? null;
    const simEffSlt = partAgg?.avg_eff_slt_days ?? null;
    const simEffectiveSupplierLtDays = simEffSlt != null ? safeRound(simEffSlt, 2) : null;

    // Safety stock and initial inventory from ERP data / simulation
    const safetyStock = partAgg?.safety_stock ?? toNum(partSafetyStocks[partNo], 0);
    const initialInventory = partAgg?.initial_inventory ?? toNum(initialInventoryMap[partNo], realAvailable);

    result[partNo] = {
      hasStock,
      inventoryQty: safeRound(inventoryQty, 2),
      initialInventory: safeRound(initialInventory, 2),
      safetyStock: safeRound(safetyStock, 2),
      simEndingInventory: Number.isFinite(simEndingInventory) ? safeRound(simEndingInventory, 2) : null,
      simProducedQty,
      simConsumedQty,
      simLiveInventory,
      simUnderDeliveredQty,
      stockDetails,
      hasOrder,
      basisOrder: node?.basisOrder || null,
      evidenceOrders: toNum(node?.evidenceOrders, 0),
      leadTimeDays,
      leadTimeLabel,
      leadTimeBreakdown,
      childRequirements,
      productionStage,
      bottleneckPartNo: effectiveBottleneck.topPartNo,
      isBottleneckNode,
      bottleneckReason,
      staticBottleneck: nodeStaticBN,
      queueWaitDays: safeRound(queueWait, 3),
      shortageQty: activeShortageQty,
      historicalShortageQty,
      supplierCount: toNum(supplier?.supplier_count, 0),
      supplierLeadTimeDays: baseSupplierLtDays,
      baseSupplierLtDays,
      simEffectiveSupplierLtDays,
      minOrderQty: supplier?.min_order_qty ?? null,
      operationCount: (operationMap[partNo] || []).length,
      operationNo: node?.operationNo ?? null,
      operationName: latestEvent?.level_name || null,
      supplyChainAlerts: alerts,
      status: statusFromAlerts(alerts),
      severity: Math.max(1, ...alerts.map((a) => severityRank(a.level))),
    };

    for (const child of node.children || []) walk(child);
  };

  walk(tree);
  return result;
}
