import type { PlanningMethod } from '../../data/mock/valueChainSimMock';

/** View tabs of the twin's main content area. */
export type ViewTab = 'main' | 'product-hierarchy' | 'simulation-log' | 'kpis';

/** Left-panel planning knobs (multipliers are applied to `planning_defaults` on run). */
export interface PlanningState {
  safety_stock_mult: number;
  min_lot_mult: number;
  planning_method: PlanningMethod;
  period_order_qty_days: number;
  review_interval_days: number;
  production_capacity: number;
  outbound_capacity: number;
  max_outstanding_production_batches: number;
}

export type PlanningChangeHandler = <K extends keyof PlanningState>(key: K, val: PlanningState[K]) => void;
