import { useMemo } from 'react';
import type { DemoMeta, SimResults } from '../../../data/mock/valueChainSimMock';

function fmtNum(v: number | null | undefined, d = 1): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('en-US', { maximumFractionDigits: d });
}

function fmtPct(v: number | null | undefined): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return `${n > 0 ? '+' : ''}${n.toFixed(1)}%`;
}

interface ObjectiveMetrics {
  baselineTotalQty: number;
  currentTotalQty: number;
  inventoryReductionPct: number | null;
  inventoryDelta: number;
  supplierOrderQty: number;
  supplierExcessQty: number;
  baselineLead: number;
  currentLead: number;
  leadReductionPct: number | null;
  targetLeadReductionPct: number;
}

// KPIs tab — hosts the "Simulation Goals" cards (Warehouse Minimization,
// E2E Lead Time Reduction). Self-contained (own metrics + own styles).
export default function KpiTab({ results, demoMeta }: { results: SimResults | null; demoMeta: DemoMeta | null }) {
  const objectiveMetrics = useMemo<ObjectiveMetrics | null>(() => {
    if (!results?.kpis || !demoMeta) return null;

    const kpis = results.kpis;
    const byPart = results.hierarchy_summary?.by_part || {};
    const stockByPart = demoMeta.stock_by_part || {};

    // ── Warehouse Minimization ──
    // Baseline = ERP snapshot (Σ available_qty); Current = sim ending_inventory.
    let baselineTotalQty = 0;
    for (const info of Object.values(stockByPart)) {
      baselineTotalQty += Number(info?.available_qty ?? 0);
    }
    let currentTotalQty = 0;
    for (const info of Object.values(byPart)) {
      currentTotalQty += Number(info?.ending_inventory ?? 0);
    }

    // Cumulative supplier order volume + excess — these respond 1:1 to the
    // Order_Quantity_pct shock.
    let supplierOrderQty = 0;
    let supplierExcessQty = 0;
    for (const ev of results.replenishment_events || []) {
      supplierOrderQty += Number(ev?.order_qty || 0);
    }
    for (const ev of results.level_events || []) {
      if (ev?.phase !== 'procurement') continue;
      for (const p of ev?.parts_detail || []) {
        supplierOrderQty += Number(p?.qty_ordered || 0);
        supplierExcessQty += Number(p?.qty_excess_to_stock || 0);
      }
    }

    const inventoryReductionPct =
      baselineTotalQty > 0 ? ((baselineTotalQty - currentTotalQty) / baselineTotalQty) * 100 : null;
    const inventoryDelta = currentTotalQty - baselineTotalQty;

    // ── E2E Lead Time Reduction ──
    const dist = demoMeta.distribution_stats || {};
    const baselineLead =
      Number(dist?.supplier_lead_time_days?.mean || 0) +
      Number(dist?.arrival_delay_days?.mean || 0) +
      Number(dist?.production_duration_days?.mean || 0) +
      Number(dist?.ship_delay_days?.mean || 0);
    const currentLead = Number(kpis?.avg_total_lead_days ?? 0);
    const leadReductionPct = baselineLead > 0 ? ((baselineLead - currentLead) / baselineLead) * 100 : null;

    return {
      baselineTotalQty,
      currentTotalQty,
      inventoryReductionPct,
      inventoryDelta,
      supplierOrderQty,
      supplierExcessQty,
      baselineLead,
      currentLead,
      leadReductionPct,
      targetLeadReductionPct: 10,
    };
  }, [results, demoMeta]);

  if (!objectiveMetrics) {
    return (
      <div className="kpi-tab kpi-tab--empty">
        <p>Run the simulation to populate the KPIs.</p>
      </div>
    );
  }

  const m = objectiveMetrics;
  return (
    <div className="kpi-tab">
      <h3 className="kpi-tab__heading">Simulation Goals</h3>
      <div className="kpi-goal-grid">
        <div className="kpi-goal-card">
          <div className="kpi-goal-title">Warehouse Minimization (Qty)</div>
          <div className="kpi-goal-main">
            {fmtNum(m.currentTotalQty, 0)} u
            {Number.isFinite(m.inventoryDelta) && (
              <span className={`kpi-goal-delta-inline ${m.inventoryDelta > 0 ? 'kpi-goal-delta--up' : 'kpi-goal-delta--down'}`}>
                {' '}
                ({m.inventoryDelta > 0 ? '+' : ''}
                {fmtNum(m.inventoryDelta, 0)})
              </span>
            )}
          </div>
          <div className="kpi-goal-sub">
            ERP baseline {fmtNum(m.baselineTotalQty, 0)} u → now {fmtNum(m.currentTotalQty, 0)} u{' · '}
            <span className={`kpi-goal-delta ${(m.inventoryReductionPct ?? 0) > 0 ? 'kpi-goal-delta--down' : 'kpi-goal-delta--up'}`}>
              {fmtPct(m.inventoryReductionPct)}
            </span>
          </div>
          {(m.supplierOrderQty > 0 || m.supplierExcessQty > 0) && (
            <div className="kpi-goal-extra">
              <div className="kpi-goal-extra-row">
                <span className="kpi-goal-extra-label">Supplier orders (cumulative)</span>
                <strong>{fmtNum(m.supplierOrderQty, 0)} u</strong>
              </div>
              <div className="kpi-goal-extra-row">
                <span className="kpi-goal-extra-label">Excess from Order Qty shock</span>
                <strong className={m.supplierExcessQty > 0 ? 'kpi-goal-extra--warn' : ''}>{fmtNum(m.supplierExcessQty, 0)} u</strong>
              </div>
            </div>
          )}
        </div>

        <div className="kpi-goal-card">
          <div className="kpi-goal-title">E2E Lead Time Reduction</div>
          <div className="kpi-goal-main">{fmtPct(m.leadReductionPct)}</div>
        </div>
      </div>
    </div>
  );
}
