import { useState, useMemo } from 'react';
import {
  Package,
  ShoppingCart,
  Truck,
  Factory,
  AlertTriangle,
  BarChart3,
  ArrowDownCircle,
  Layers,
  AlertOctagon,
  type LucideIcon,
} from 'lucide-react';
import type { DemoMeta, SimResults } from '../../../data/mock/valueChainSimMock';

/* ───────────────────────────── helpers ───────────────────────────── */

const fmt = (v: number | null | undefined, d = 2): string => {
  if (v == null || Number.isNaN(v)) return '—';
  return Number(v).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: d,
  });
};

const DEFAULT_PRODUCT_ID = '021XBXXXXXXF04';

/* ═══════════════════════════════════════════════════════════════════ */
/*  Sub-tab 1: Product-Level Metrics                                 */
/* ═══════════════════════════════════════════════════════════════════ */

interface ProductRow {
  partNo: string;
  partDesc: string;
  entityType: string;
  isPurchased: boolean;
  isManufactured: boolean;
  endingInventory: number;
  producedQty: number;
  consumedQty: number;
  shippedQty: number | null;
  underDeliveryQty: number;
  batches: number;
  avgEffSlt: number | null;
}

interface ProductionInfo {
  batches: number;
  totalQty: number;
  avgPlt: number;
  plts: number[];
}

type ProductFilter = 'all' | 'purchased' | 'manufactured';

function ProductMetricsSection({ results, demoMeta }: { results: SimResults; demoMeta: DemoMeta | null }) {
  const horizonDays = results?.kpis?.horizon_days ?? 0;
  const productId = results?.kpis?.product_id || DEFAULT_PRODUCT_ID;

  const rows = useMemo<ProductRow[]>(() => {
    const byPart = results?.hierarchy_summary?.by_part || {};
    const entities = demoMeta?.bom_tree || [];

    // Build an entity-type lookup from metadata bom tree
    const entityTypeMap: Record<string, string> = {};
    entities.forEach((e) => {
      entityTypeMap[e.component_part] = e.entity_type || 'Component';
    });

    const items: ProductRow[] = [];
    for (const [partNo, data] of Object.entries(byPart)) {
      const entityType: string = data.entity_type || entityTypeMap[partNo] || 'Component';
      const isPurchased = entityType === 'Component' || entityType === 'Purchased' || entityType === 'Expense';
      const isManufactured = entityType === 'SubAssembly' || entityType === 'FinishedGood' || partNo === productId;

      items.push({
        partNo,
        partDesc: data.part_desc || '',
        entityType,
        isPurchased,
        isManufactured,
        endingInventory: data.ending_inventory ?? 0,
        producedQty: data.produced_qty ?? 0,
        consumedQty: data.consumed_qty ?? 0,
        shippedQty: data.shipped_qty ?? null,
        underDeliveryQty: data.under_delivery_qty ?? 0,
        batches: data.batches ?? 0,
        avgEffSlt: data.avg_eff_slt_days ?? null,
      });
    }

    // Sort: FG first, then sub-assemblies, then components
    const typePriority: Record<string, number> = { FinishedGood: 0, SubAssembly: 1, Component: 2, Purchased: 2, Expense: 2 };
    items.sort((a, b) => {
      const pa = typePriority[a.entityType] ?? 3;
      const pb = typePriority[b.entityType] ?? 3;
      if (pa !== pb) return pa - pb;
      return a.partNo.localeCompare(b.partNo);
    });

    return items;
  }, [results, demoMeta, productId]);

  // Replenishment events for purchased parts
  const replenishmentCounts = useMemo(() => {
    const levelEvents = results?.level_events || [];
    const counts: Record<string, number> = {};
    levelEvents.forEach((ev) => {
      if (ev.phase === 'procurement' && ev.parts_detail) {
        ev.parts_detail.forEach((p) => {
          if ((p.shortfall ?? 0) > 0) {
            counts[p.part_no] = (counts[p.part_no] || 0) + 1;
          }
        });
      }
    });
    return counts;
  }, [results]);

  // Production batch info for manufactured parts
  const productionInfo = useMemo(() => {
    const pe = results?.production_events || [];
    const info: Record<string, ProductionInfo> = {};
    pe.forEach((ev) => {
      if (!info[productId]) {
        info[productId] = { batches: 0, totalQty: 0, avgPlt: 0, plts: [] };
      }
      info[productId].batches += 1;
      info[productId].totalQty += ev.finished_output_qty || 0;
      info[productId].plts.push(ev.production_duration_days || 0);
    });
    for (const v of Object.values(info)) {
      v.avgPlt = v.plts.length > 0 ? v.plts.reduce((a, b) => a + b, 0) / v.plts.length : 0;
    }
    return info;
  }, [results, productId]);

  const [filter, setFilter] = useState<ProductFilter>('all');

  const filtered = useMemo(() => {
    if (filter === 'purchased') return rows.filter((r) => r.isPurchased);
    if (filter === 'manufactured') return rows.filter((r) => r.isManufactured);
    return rows;
  }, [rows, filter]);

  const filters: { key: ProductFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'purchased', label: 'Purchased' },
    { key: 'manufactured', label: 'Manufactured' },
  ];

  return (
    <div className="sim-log-section">
      <div className="sim-log-section__header">
        <div className="sim-log-section__title">
          <BarChart3 size={16} style={{ verticalAlign: -3, marginRight: 6 }} />
          Per-Product Metrics
          <span className="sim-log-horizon-badge">{horizonDays} days</span>
        </div>
        <div className="sim-log-filter-pills">
          {filters.map((f) => (
            <button
              key={f.key}
              className={`sim-log-pill${filter === f.key ? ' sim-log-pill--active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="sim-log-table-wrap">
        <table className="sim-log-table">
          <thead>
            <tr>
              <th>Part No</th>
              <th>Description</th>
              <th>Type</th>
              <th className="text-right">Inventory</th>
              <th className="text-right">Produced</th>
              <th className="text-right">Consumed</th>
              <th className="text-right">Lead Time (days)</th>
              <th className="text-right">Order Count</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="sim-log-empty">
                  No data found
                </td>
              </tr>
            )}
            {filtered.map((row) => {
              const isRoot = row.partNo === productId;
              const pInfo = productionInfo[row.partNo];
              const replenishCount = replenishmentCounts[row.partNo] || 0;

              let leadTimeDisplay = '—';
              if (row.isPurchased && row.avgEffSlt != null) {
                leadTimeDisplay = `${fmt(row.avgEffSlt, 1)} (SLT)`;
              } else if (row.isManufactured && pInfo) {
                leadTimeDisplay = `${fmt(pInfo.avgPlt, 1)} (PLT)`;
              }

              let orderCountDisplay = '—';
              if (row.isPurchased) {
                orderCountDisplay = `${replenishCount} orders`;
              } else if (row.isManufactured && pInfo) {
                orderCountDisplay = `${pInfo.batches} batch`;
              }

              return (
                <tr key={row.partNo} className={isRoot ? 'sim-log-row--root' : ''}>
                  <td className="sim-log-partno">{row.partNo}</td>
                  <td className="sim-log-desc">{row.partDesc || '—'}</td>
                  <td>
                    <span className={`sim-log-type-badge sim-log-type-badge--${row.entityType?.toLowerCase()}`}>
                      {row.entityType === 'SubAssembly' ? 'Sub-Assembly' : row.entityType === 'FinishedGood' ? 'Finished Good' : 'Component'}
                    </span>
                  </td>
                  <td className="text-right">
                    <span className={`sim-log-inv ${row.endingInventory <= 0 ? 'sim-log-inv--zero' : ''}`}>{fmt(row.endingInventory, 0)}</span>
                  </td>
                  <td className="text-right">{fmt(row.producedQty, 0)}</td>
                  <td className="text-right">{fmt(row.consumedQty, 0)}</td>
                  <td className="text-right">{leadTimeDisplay}</td>
                  <td className="text-right">{orderCountDisplay}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary stats */}
      <div className="sim-log-summary-strip">
        <div className="sim-log-stat">
          <Package size={14} />
          <span>
            Total Parts: <strong>{rows.length}</strong>
          </span>
        </div>
        <div className="sim-log-stat">
          <Factory size={14} />
          <span>
            Manufactured: <strong>{rows.filter((r) => r.isManufactured).length}</strong>
          </span>
        </div>
        <div className="sim-log-stat">
          <ShoppingCart size={14} />
          <span>
            Purchased: <strong>{rows.filter((r) => r.isPurchased).length}</strong>
          </span>
        </div>
        <div className="sim-log-stat">
          <AlertTriangle size={14} />
          <span>
            Inventory = 0: <strong>{rows.filter((r) => r.endingInventory <= 0).length}</strong>
          </span>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Sub-tab 2: Incoming Order (Demand) Log                           */
/* ═══════════════════════════════════════════════════════════════════ */

interface DayGroup {
  day: number;
  orders: { index: number; time: number; qty: number }[];
  totalQty: number;
}

function OrderArrivalLogSection({ results }: { results: SimResults }) {
  const horizonDays = results?.kpis?.horizon_days ?? 0;
  const demandEvents = results.demand_events;

  // Group orders by integer day
  const dayGroups = useMemo<DayGroup[]>(() => {
    const groups: Record<number, DayGroup> = {};
    demandEvents.forEach((ev, idx) => {
      const day = Math.floor(ev.t);
      if (!groups[day]) groups[day] = { day, orders: [], totalQty: 0 };
      groups[day].orders.push({
        index: idx + 1,
        time: ev.t,
        qty: ev.sales_qty,
      });
      groups[day].totalQty += ev.sales_qty;
    });
    return Object.values(groups).sort((a, b) => a.day - b.day);
  }, [demandEvents]);

  const totalOrders = demandEvents.length;
  const totalQty = demandEvents.reduce((s, e) => s + (e.sales_qty || 0), 0);

  return (
    <div className="sim-log-section">
      <div className="sim-log-section__header">
        <div className="sim-log-section__title">
          <ArrowDownCircle size={16} style={{ verticalAlign: -3, marginRight: 6 }} />
          Incoming Order Log
          <span className="sim-log-horizon-badge">{horizonDays} days</span>
        </div>
        <div className="sim-log-kpi-row">
          <span className="sim-log-kpi">
            Total Orders: <strong>{totalOrders}</strong>
          </span>
          <span className="sim-log-kpi">
            Total Quantity: <strong>{fmt(totalQty, 0)}</strong>
          </span>
          <span className="sim-log-kpi">
            Avg/Order: <strong>{fmt(totalOrders > 0 ? totalQty / totalOrders : 0, 1)}</strong>
          </span>
        </div>
      </div>

      <div className="sim-log-table-wrap sim-log-table-wrap--scrollable">
        <table className="sim-log-table">
          <thead>
            <tr>
              <th>Day</th>
              <th className="text-right">Order Count</th>
              <th className="text-right">Total Quantity</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {dayGroups.length === 0 && (
              <tr>
                <td colSpan={4} className="sim-log-empty">
                  No orders yet
                </td>
              </tr>
            )}
            {dayGroups.map((g) => (
              <tr key={g.day}>
                <td>
                  <span className="sim-log-day-badge">Day {g.day}</span>
                </td>
                <td className="text-right">
                  <span className="sim-log-count-badge">{g.orders.length}</span>
                </td>
                <td className="text-right sim-log-qty">{fmt(g.totalQty, 0)}</td>
                <td className="sim-log-detail-cell">
                  {g.orders.map((o, i) => (
                    <span key={i} className="sim-log-order-chip">
                      #{o.index} — {fmt(o.qty, 0)} units (t={fmt(o.time, 2)})
                    </span>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Sub-tab 3: Shipment / Dispatch Log                               */
/* ═══════════════════════════════════════════════════════════════════ */

interface ShipmentGroup {
  shipmentId: number;
  dispatchDay: number;
  deliveryDay: number;
  dispatchTime: number;
  deliveryTime: number;
  shipDelay: number;
  allocations: {
    orderTime: number;
    orderDay: number;
    qty: number;
    waitingDays: number;
    totalLeadDays: number;
    fulfillmentRate: number;
  }[];
  totalQty: number;
}

function ShipmentLogSection({ results }: { results: SimResults }) {
  const horizonDays = results?.kpis?.horizon_days ?? 0;
  const shipmentEvents = results.shipment_events;

  // Group shipments by shipment_id
  const shipments = useMemo<ShipmentGroup[]>(() => {
    const groups: Record<number, ShipmentGroup> = {};
    shipmentEvents.forEach((ev) => {
      const sid = ev.shipment_id;
      if (!groups[sid]) {
        groups[sid] = {
          shipmentId: sid,
          dispatchDay: Math.floor(ev.dispatch_time ?? 0),
          deliveryDay: Math.floor(ev.delivery_time ?? 0),
          dispatchTime: ev.dispatch_time,
          deliveryTime: ev.delivery_time,
          shipDelay: ev.ship_delay_days ?? 0,
          allocations: [],
          totalQty: 0,
        };
      }
      groups[sid].allocations.push({
        orderTime: ev.order_time,
        orderDay: Math.floor(ev.order_time ?? 0),
        qty: ev.alloc_qty ?? 0,
        waitingDays: ev.waiting_days_to_dispatch ?? 0,
        totalLeadDays: ev.lead_time_days_total ?? 0,
        fulfillmentRate: ev.fulfillment_rate ?? 1,
      });
      groups[sid].totalQty += ev.alloc_qty ?? 0;
    });
    return Object.values(groups).sort((a, b) => a.dispatchTime - b.dispatchTime);
  }, [shipmentEvents]);

  const totalShipped = shipmentEvents.reduce((s, e) => s + (e.alloc_qty || 0), 0);
  const avgWaitDays =
    shipmentEvents.length > 0 ? shipmentEvents.reduce((s, e) => s + (e.waiting_days_to_dispatch || 0), 0) / shipmentEvents.length : 0;
  const avgLeadDays =
    shipmentEvents.length > 0 ? shipmentEvents.reduce((s, e) => s + (e.lead_time_days_total || 0), 0) / shipmentEvents.length : 0;

  return (
    <div className="sim-log-section">
      <div className="sim-log-section__header">
        <div className="sim-log-section__title">
          <Truck size={16} style={{ verticalAlign: -3, marginRight: 6 }} />
          Shipment Log
          <span className="sim-log-horizon-badge">{horizonDays} days</span>
        </div>
        <div className="sim-log-kpi-row">
          <span className="sim-log-kpi">
            Shipments: <strong>{shipments.length}</strong>
          </span>
          <span className="sim-log-kpi">
            Total: <strong>{fmt(totalShipped, 0)}</strong> units
          </span>
          <span className="sim-log-kpi">
            Avg Wait: <strong>{fmt(avgWaitDays, 1)}</strong> days
          </span>
          <span className="sim-log-kpi">
            Avg Total LT: <strong>{fmt(avgLeadDays, 1)}</strong> days
          </span>
        </div>
      </div>

      <div className="sim-log-table-wrap sim-log-table-wrap--scrollable">
        <table className="sim-log-table">
          <thead>
            <tr>
              <th>Ship #</th>
              <th>Dispatch Day</th>
              <th>Delivery Day</th>
              <th className="text-right">Total Quantity</th>
              <th className="text-right">Ship Delay (days)</th>
              <th>Fulfilled Orders</th>
            </tr>
          </thead>
          <tbody>
            {shipments.length === 0 && (
              <tr>
                <td colSpan={6} className="sim-log-empty">
                  No shipments yet
                </td>
              </tr>
            )}
            {shipments.map((s) => (
              <tr key={s.shipmentId}>
                <td>
                  <span className="sim-log-shipment-id">#{s.shipmentId}</span>
                </td>
                <td>
                  <span className="sim-log-day-badge sim-log-day-badge--dispatch">Day {s.dispatchDay}</span>
                </td>
                <td>
                  <span className="sim-log-day-badge sim-log-day-badge--delivery">Day {s.deliveryDay}</span>
                </td>
                <td className="text-right sim-log-qty">{fmt(s.totalQty, 0)}</td>
                <td className={`text-right ${s.shipDelay > 1 ? 'sim-log-delay--warn' : ''}`}>{fmt(s.shipDelay, 2)}</td>
                <td className="sim-log-detail-cell">
                  {s.allocations.map((a, i) => (
                    <span key={i} className="sim-log-alloc-chip">
                      Order Day {a.orderDay} → {fmt(a.qty, 0)} units
                      <span className="sim-log-alloc-lead">
                        (wait: {fmt(a.waitingDays, 1)}d, total: {fmt(a.totalLeadDays, 1)}d)
                      </span>
                    </span>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Sub-tab 4: Production Batch Log                                  */
/* ═══════════════════════════════════════════════════════════════════ */

function ProductionLogSection({ results }: { results: SimResults }) {
  const horizonDays = results?.kpis?.horizon_days ?? 0;
  const productionEvents = results?.production_events || [];

  const avgProcurement =
    productionEvents.length > 0 ? productionEvents.reduce((s, e) => s + (e.procurement_days || 0), 0) / productionEvents.length : 0;
  const avgProduction =
    productionEvents.length > 0 ? productionEvents.reduce((s, e) => s + (e.production_duration_days || 0), 0) / productionEvents.length : 0;
  const avgTotal =
    productionEvents.length > 0
      ? productionEvents.reduce((s, e) => s + (e.actual_replenishment_lead_days || 0), 0) / productionEvents.length
      : 0;

  return (
    <div className="sim-log-section">
      <div className="sim-log-section__header">
        <div className="sim-log-section__title">
          <Factory size={16} style={{ verticalAlign: -3, marginRight: 6 }} />
          Production Batch Log
          <span className="sim-log-horizon-badge">{horizonDays} days</span>
        </div>
        <div className="sim-log-kpi-row">
          <span className="sim-log-kpi">
            Batch: <strong>{productionEvents.length}</strong>
          </span>
          <span className="sim-log-kpi">
            Total Production: <strong>{fmt(productionEvents.reduce((s, e) => s + (e.finished_output_qty || 0), 0), 0)}</strong>
          </span>
          <span className="sim-log-kpi">
            Avg Procurement: <strong>{fmt(avgProcurement, 1)}</strong>d
          </span>
          <span className="sim-log-kpi">
            Avg Production: <strong>{fmt(avgProduction, 1)}</strong>d
          </span>
          <span className="sim-log-kpi">
            Avg Total: <strong>{fmt(avgTotal, 1)}</strong>d
          </span>
        </div>
      </div>

      <div className="sim-log-table-wrap sim-log-table-wrap--scrollable">
        <table className="sim-log-table">
          <thead>
            <tr>
              <th>Batch #</th>
              <th>Start</th>
              <th>End</th>
              <th>Trigger</th>
              <th className="text-right">Target Qty</th>
              <th className="text-right">Output Qty</th>
              <th className="text-right">Procurement (days)</th>
              <th className="text-right">Production (days)</th>
              <th className="text-right">Total LT (days)</th>
              <th className="text-right">Completion</th>
            </tr>
          </thead>
          <tbody>
            {productionEvents.length === 0 && (
              <tr>
                <td colSpan={10} className="sim-log-empty">
                  No production yet
                </td>
              </tr>
            )}
            {productionEvents.map((ev) => (
              <tr key={ev.batch_id}>
                <td>
                  <span className="sim-log-shipment-id">#{ev.batch_id}</span>
                </td>
                <td>
                  <span className="sim-log-day-badge">Day {Math.floor(ev.t_release)}</span>
                </td>
                <td>
                  <span className="sim-log-day-badge sim-log-day-badge--delivery">Day {Math.floor(ev.t_output)}</span>
                </td>
                <td>
                  <span className={`sim-log-trigger-badge sim-log-trigger-badge--${ev.trigger_reason}`}>
                    {ev.trigger_reason === 'review_policy' ? 'Planning' : 'Stockout'}
                  </span>
                </td>
                <td className="text-right">{fmt(ev.target_finished_qty, 0)}</td>
                <td className="text-right sim-log-qty">{fmt(ev.finished_output_qty, 0)}</td>
                <td className="text-right">{fmt(ev.procurement_days, 1)}</td>
                <td className="text-right">{fmt(ev.production_duration_days, 1)}</td>
                <td className="text-right sim-log-qty">{fmt(ev.actual_replenishment_lead_days, 1)}</td>
                <td className="text-right">
                  <span className={`sim-log-rate ${(ev.completion_rate ?? 1) < 0.95 ? 'sim-log-rate--warn' : ''}`}>
                    {fmt((ev.completion_rate ?? 1) * 100, 1)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Sub-tab 5: Component Stockout Log                                */
/* ═══════════════════════════════════════════════════════════════════ */

interface StockoutIncident {
  partNo: string;
  partDesc: string;
  day: number;
  time: number;
  batchId: number;
  requiredQty: number;
  fromStock: number;
  shortfall: number;
  fromSupplier: number;
  underDelivered: number;
  effSlt: number;
  effArrivalDelay: number;
  effFillRate: number;
  effDefectRate: number;
  phase: 'procurement' | 'assembly';
  entityType?: string;
}

interface PartSummary {
  partNo: string;
  partDesc: string;
  occurrences: number;
  totalShortfall: number;
  firstDay: number;
  lastDay: number;
  affectedBatches: Set<number>;
  avgSlt: number;
  sltSum: number;
  affectedBatchCount: number;
}

type StockoutView = 'summary' | 'timeline' | 'reorders';

function StockoutLogSection({ results }: { results: SimResults }) {
  const horizonDays = results?.kpis?.horizon_days ?? 0;
  const levelEvents = results.level_events;
  const replenishmentEvents = results.replenishment_events;

  // Extract stockout incidents from procurement-phase level events
  const stockoutIncidents = useMemo<StockoutIncident[]>(() => {
    const incidents: StockoutIncident[] = [];

    levelEvents.forEach((ev) => {
      if (ev.phase !== 'procurement' || !ev.parts_detail) return;
      const batchId = ev.batch_id;
      const tStart = ev.t_start;

      ev.parts_detail.forEach((p) => {
        if ((p.shortfall ?? 0) > 0) {
          incidents.push({
            partNo: p.part_no,
            partDesc: p.part_desc || '',
            day: Math.floor(tStart),
            time: tStart,
            batchId,
            requiredQty: p.qty_required || 0,
            fromStock: p.qty_from_stock || 0,
            shortfall: p.shortfall ?? 0,
            fromSupplier: p.qty_from_supplier || 0,
            underDelivered: p.qty_under_delivered || 0,
            effSlt: p.eff_slt_days || 0,
            effArrivalDelay: p.eff_arrival_delay_days || 0,
            effFillRate: p.eff_fill_rate || 1,
            effDefectRate: p.eff_defect_rate || 0,
            phase: 'procurement',
          });
        }
      });
    });

    // Also check assembly phase for shortages
    levelEvents.forEach((ev) => {
      if (ev.phase !== 'assembly' || !ev.parts_detail) return;
      const batchId = ev.batch_id;
      const tStart = ev.t_start;

      ev.parts_detail.forEach((p) => {
        if ((p.shortage ?? 0) > 0) {
          const alreadyLogged = incidents.some((inc) => inc.partNo === p.part_no && inc.batchId === batchId);
          if (!alreadyLogged) {
            incidents.push({
              partNo: p.part_no,
              partDesc: p.part_desc || '',
              day: Math.floor(tStart),
              time: tStart,
              batchId,
              requiredQty: p.required || 0,
              fromStock: p.consumed || 0,
              shortfall: p.shortage ?? 0,
              fromSupplier: 0,
              underDelivered: p.shortage ?? 0,
              effSlt: 0,
              effArrivalDelay: 0,
              effFillRate: 1,
              effDefectRate: 0,
              phase: 'assembly',
              entityType: p.entity_type || '',
            });
          }
        }
      });
    });

    return incidents.sort((a, b) => a.time - b.time);
  }, [levelEvents]);

  // Per-part summary
  const partSummary = useMemo<PartSummary[]>(() => {
    const map: Record<string, PartSummary> = {};
    stockoutIncidents.forEach((inc) => {
      if (!map[inc.partNo]) {
        map[inc.partNo] = {
          partNo: inc.partNo,
          partDesc: inc.partDesc,
          occurrences: 0,
          totalShortfall: 0,
          firstDay: inc.day,
          lastDay: inc.day,
          affectedBatches: new Set<number>(),
          avgSlt: 0,
          sltSum: 0,
          affectedBatchCount: 0,
        };
      }
      const s = map[inc.partNo];
      s.occurrences += 1;
      s.totalShortfall += inc.shortfall;
      s.firstDay = Math.min(s.firstDay, inc.day);
      s.lastDay = Math.max(s.lastDay, inc.day);
      s.affectedBatches.add(inc.batchId);
      s.sltSum += inc.effSlt;
    });
    const summaries = Object.values(map).map((s) => ({
      ...s,
      avgSlt: s.occurrences > 0 ? s.sltSum / s.occurrences : 0,
      affectedBatchCount: s.affectedBatches.size,
    }));
    summaries.sort((a, b) => b.occurrences - a.occurrences);
    return summaries;
  }, [stockoutIncidents]);

  // Reorder summary per part
  const reorderMap = useMemo(() => {
    const map: Record<string, { count: number; totalOrdered: number; totalReceived: number }> = {};
    replenishmentEvents.forEach((ev) => {
      const pno = ev.part_no;
      if (!map[pno]) map[pno] = { count: 0, totalOrdered: 0, totalReceived: 0 };
      map[pno].count += 1;
      map[pno].totalOrdered += ev.order_qty || 0;
      map[pno].totalReceived += ev.received_qty || 0;
    });
    return map;
  }, [replenishmentEvents]);

  const [viewMode, setViewMode] = useState<StockoutView>('summary');

  const uniqueParts = partSummary.length;
  const totalIncidents = stockoutIncidents.length;
  const totalAffectedBatches = new Set(stockoutIncidents.map((i) => i.batchId)).size;

  const views: { key: StockoutView; label: string }[] = [
    { key: 'summary', label: 'Part Summary' },
    { key: 'timeline', label: 'Timeline' },
    { key: 'reorders', label: 'Reorders' },
  ];

  return (
    <div className="sim-log-section">
      <div className="sim-log-section__header">
        <div className="sim-log-section__title">
          <AlertOctagon size={16} style={{ verticalAlign: -3, marginRight: 6 }} />
          Stockout Log
          <span className="sim-log-horizon-badge">{horizonDays} days</span>
        </div>
        <div className="sim-log-kpi-row">
          <span className="sim-log-kpi">
            Affected Parts: <strong>{uniqueParts}</strong>
          </span>
          <span className="sim-log-kpi">
            Total Incidents: <strong>{totalIncidents}</strong>
          </span>
          <span className="sim-log-kpi">
            Disrupted Batches: <strong>{totalAffectedBatches}</strong>
          </span>
          <span className="sim-log-kpi">
            Reorders: <strong>{replenishmentEvents.length}</strong>
          </span>
        </div>
      </div>

      <div className="sim-log-info-note" style={{ background: 'var(--danger-soft)', borderColor: 'var(--danger-border)', color: 'var(--danger)' }}>
        <AlertOctagon size={13} style={{ verticalAlign: -2, marginRight: 5, flexShrink: 0 }} />
        <span>
          <strong>Stockout events occur in two phases:</strong>
          <br />
          <strong>1. Procurement Phase:</strong> If the material is not in stock, an order is placed. Here the quantity received
          &quot;From Supplier&quot; is shown.
          <br />
          <strong>2. Assembly Phase:</strong> This is when the material is still short once production starts. In this case no new order
          is placed at that moment, so it shows &quot;From Supplier 0&quot;.
        </span>
      </div>

      {/* View mode toggle */}
      <div style={{ padding: '7px 12.6px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 4.2 }}>
        {views.map((m) => (
          <button
            key={m.key}
            className={`sim-log-pill${viewMode === m.key ? ' sim-log-pill--active' : ''}`}
            onClick={() => setViewMode(m.key)}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="sim-log-table-wrap sim-log-table-wrap--scrollable">
        {/* ─── Summary View ─── */}
        {viewMode === 'summary' && (
          <table className="sim-log-table">
            <thead>
              <tr>
                <th>Part No</th>
                <th>Description</th>
                <th className="text-right">Stockout Count</th>
                <th className="text-right">Total Shortfall</th>
                <th className="text-right">First Day</th>
                <th className="text-right">Last Day</th>
                <th className="text-right">Disrupted Batches</th>
                <th className="text-right">Avg SLT (days)</th>
                <th className="text-right">Reorders</th>
              </tr>
            </thead>
            <tbody>
              {partSummary.length === 0 && (
                <tr>
                  <td colSpan={9} className="sim-log-empty">
                    No stockouts occurred ✓
                  </td>
                </tr>
              )}
              {partSummary.map((s) => {
                const reorder = reorderMap[s.partNo];
                return (
                  <tr key={s.partNo}>
                    <td className="sim-log-partno">{s.partNo}</td>
                    <td className="sim-log-desc">{s.partDesc || '—'}</td>
                    <td className="text-right">
                      <span
                        className="sim-log-count-badge"
                        style={{ background: 'var(--danger-soft)', borderColor: 'var(--danger-border)', color: 'var(--danger)' }}
                      >
                        {s.occurrences}
                      </span>
                    </td>
                    <td className="text-right sim-log-inv--zero">{fmt(s.totalShortfall, 0)}</td>
                    <td className="text-right">
                      <span className="sim-log-day-badge">Day {s.firstDay}</span>
                    </td>
                    <td className="text-right">
                      <span className="sim-log-day-badge">Day {s.lastDay}</span>
                    </td>
                    <td className="text-right">{s.affectedBatchCount}</td>
                    <td className="text-right">{fmt(s.avgSlt, 1)}</td>
                    <td className="text-right">
                      {reorder ? (
                        <span className="sim-log-order-chip">
                          {reorder.count}× ({fmt(reorder.totalOrdered, 0)} ord. / {fmt(reorder.totalReceived, 0)} received)
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* ─── Timeline View ─── */}
        {viewMode === 'timeline' && (
          <table className="sim-log-table">
            <thead>
              <tr>
                <th>Day</th>
                <th>Phase</th>
                <th>Part No</th>
                <th>Description</th>
                <th className="text-right">Required</th>
                <th className="text-right">From Stock</th>
                <th className="text-right">Shortfall</th>
                <th className="text-right">From Supplier</th>
                <th className="text-right">SLT (days)</th>
                <th>Disrupted Batch</th>
              </tr>
            </thead>
            <tbody>
              {stockoutIncidents.length === 0 && (
                <tr>
                  <td colSpan={10} className="sim-log-empty">
                    No stockouts occurred ✓
                  </td>
                </tr>
              )}
              {stockoutIncidents.map((inc, idx) => (
                <tr key={idx}>
                  <td>
                    <span
                      className="sim-log-day-badge"
                      style={{ borderColor: 'var(--danger-border)', color: 'var(--danger)', background: 'var(--danger-soft)' }}
                    >
                      Day {inc.day}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`sim-log-type-badge ${inc.phase === 'procurement' ? 'sim-log-type-badge--component' : 'sim-log-type-badge--subassembly'}`}
                    >
                      {inc.phase === 'procurement' ? 'Procurement' : 'Assembly'}
                    </span>
                  </td>
                  <td className="sim-log-partno">{inc.partNo}</td>
                  <td className="sim-log-desc">{inc.partDesc || '—'}</td>
                  <td className="text-right">{fmt(inc.requiredQty, 0)}</td>
                  <td className="text-right">{fmt(inc.fromStock, 0)}</td>
                  <td className="text-right sim-log-inv--zero">{fmt(inc.shortfall, 0)}</td>
                  <td className="text-right">{fmt(inc.fromSupplier, 0)}</td>
                  <td className="text-right">{fmt(inc.effSlt, 1)}</td>
                  <td>
                    <span className="sim-log-shipment-id">Batch #{inc.batchId}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* ─── Reorders View ─── */}
        {viewMode === 'reorders' && (
          <table className="sim-log-table">
            <thead>
              <tr>
                <th>Part No</th>
                <th>Description</th>
                <th>Order Day</th>
                <th>Delivery Day</th>
                <th className="text-right">Wait (days)</th>
                <th className="text-right">Order Qty</th>
                <th className="text-right">Received Qty</th>
                <th className="text-right">SLT (days)</th>
                <th className="text-right">Fill Rate</th>
              </tr>
            </thead>
            <tbody>
              {replenishmentEvents.length === 0 && (
                <tr>
                  <td colSpan={9} className="sim-log-empty">
                    No reorders placed
                  </td>
                </tr>
              )}
              {replenishmentEvents.map((ev, idx) => (
                <tr key={idx}>
                  <td className="sim-log-partno">{ev.part_no}</td>
                  <td className="sim-log-desc">{ev.part_desc || '—'}</td>
                  <td>
                    <span className="sim-log-day-badge">Day {Math.floor(ev.t_order)}</span>
                  </td>
                  <td>
                    <span className="sim-log-day-badge sim-log-day-badge--delivery">Day {Math.floor(ev.t_arrival)}</span>
                  </td>
                  <td className="text-right">{fmt(ev.wait_days, 1)}</td>
                  <td className="text-right">{fmt(ev.order_qty, 0)}</td>
                  <td className="text-right sim-log-qty">{fmt(ev.received_qty, 0)}</td>
                  <td className="text-right">{fmt(ev.eff_slt_days, 1)}</td>
                  <td className="text-right">
                    <span className={`sim-log-rate ${(ev.eff_fill_rate ?? 1) < 0.95 ? 'sim-log-rate--warn' : ''}`}>
                      {fmt((ev.eff_fill_rate ?? 1) * 100, 1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Main Log Tab                                                     */
/* ═══════════════════════════════════════════════════════════════════ */

type SubTabKey = 'products' | 'stockouts' | 'orders' | 'shipments' | 'production';

const SUB_TABS: { key: SubTabKey; label: string; icon: LucideIcon }[] = [
  { key: 'products', label: 'Product Metrics', icon: Package },
  { key: 'stockouts', label: 'Stockouts', icon: AlertOctagon },
  { key: 'orders', label: 'Incoming Orders', icon: ArrowDownCircle },
  { key: 'shipments', label: 'Shipments', icon: Truck },
  { key: 'production', label: 'Production Logs', icon: Factory },
];

export default function SimulationLogTab({ results, demoMeta }: { results: SimResults | null; demoMeta: DemoMeta | null }) {
  const [activeSubTab, setActiveSubTab] = useState<SubTabKey>('products');

  if (!results) {
    return (
      <div className="sim-log-empty-state">
        <Layers size={42} />
        <p>Run and advance the simulation, then view the log data here.</p>
      </div>
    );
  }

  return (
    <div className="sim-log-tab">
      <div className="sim-log-subtabs">
        {SUB_TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              className={`sim-log-subtab${activeSubTab === tab.key ? ' sim-log-subtab--active' : ''}`}
              onClick={() => setActiveSubTab(tab.key)}
            >
              <Icon size={14} style={{ verticalAlign: -2, marginRight: 4 }} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="sim-log-content">
        {activeSubTab === 'products' && <ProductMetricsSection results={results} demoMeta={demoMeta} />}
        {activeSubTab === 'orders' && <OrderArrivalLogSection results={results} />}
        {activeSubTab === 'shipments' && <ShipmentLogSection results={results} />}
        {activeSubTab === 'production' && <ProductionLogSection results={results} />}
        {activeSubTab === 'stockouts' && <StockoutLogSection results={results} />}
      </div>
    </div>
  );
}
