import { memo } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import {
  Box,
  Cpu,
  Package,
  DollarSign,
  ChevronDown,
  ChevronRight,
  Zap,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Timer,
  Truck,
  Ghost,
  type LucideIcon,
} from 'lucide-react';
import type { EntitySubtype } from '../../../data/mock/valueChainHierarchy';
import type { NodeShockScope } from '../../../data/mock/valueChainSimMock';
import type { Traceability } from '../utils/traceability';

export type CustomNodeData = {
  partNo: string;
  description: string;
  subtype: EntitySubtype;
  level: number;
  partType: string | null;
  operationNo: number | null;
  phantomBom: string | null;
  phantom: boolean;
  qtyPerAssembly: number;
  desModelName: string | null;
  source: string | null;
  childCount: number;
  isExpanded: boolean;
  isSearchMatch: boolean;
  isHighlighted: boolean;
  isDimmed: boolean;
  traceability: Traceability | null;
  onToggle?: (partNo: string) => void;
  hasOwnShock: boolean;
  ownShockScope: NodeShockScope | null;
  ownShockCount: number;
  inheritedShockAncestors: string[];
  shortageSource: boolean;
  supplyBlocked: boolean;
};

export type HierarchyNode = Node<CustomNodeData, 'custom'>;

function fmtQty(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 10000) return (n / 1000).toFixed(1) + 'k';
  if (abs >= 100) return Math.round(n).toString();
  return n.toFixed(abs < 10 ? 1 : 0);
}

function fmtDays(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return n >= 10 ? Math.round(n).toString() : (Math.round(n * 10) / 10).toString();
}

const ICONS: Record<EntitySubtype, LucideIcon> = {
  FinishedGood: Box,
  SubAssembly: Cpu,
  Component: Package,
  Expense: DollarSign,
};

interface StockTag {
  displayInv: number;
  ss: number;
  belowSafety: boolean;
  cls: string;
}

interface LeadTag {
  days: number;
  supplier: boolean;
  changed: boolean;
}

// Node card: identity (icon + part no + short desc), one status line, and a
// compact row of at-a-glance boxes — inventory, produced, consumed, lead time,
// plus shortage/shock flags. The deeper breakdown lives in the Detail panel.
function CustomNode({ data, selected }: NodeProps<HierarchyNode>) {
  const {
    partNo,
    description,
    subtype,
    childCount,
    isExpanded,
    onToggle,
    isHighlighted,
    isDimmed,
    isSearchMatch,
    traceability,
    hasOwnShock,
    ownShockScope,
    ownShockCount,
    inheritedShockAncestors,
    shortageSource,
    supplyBlocked,
    phantom,
  } = data;

  const hasInherited = Array.isArray(inheritedShockAncestors) && inheritedShockAncestors.length > 0;
  const Icon = ICONS[subtype] || Package;
  const hasChildren = childCount > 0;

  // The single most important at-a-glance metric: live (or initial) inventory.
  let stock: StockTag | null = null;
  if (traceability) {
    const ss = traceability.safetyStock || 0;
    const displayInv =
      traceability.simLiveInventory != null ? traceability.simLiveInventory : traceability.initialInventory || 0;
    const belowSafety = ss > 0 && displayInv < ss;
    // A ~0 balance only reads as a problem (red) when this part is an actual
    // shortage source. Flow-through sub-assemblies sit at 0 by design.
    const cls =
      displayInv > 0.001
        ? belowSafety
          ? 'hnode__tag--stock-warning'
          : 'hnode__tag--stock-ok'
        : shortageSource
          ? 'hnode__tag--stock-low'
          : 'hnode__tag--stock-flow';
    stock = { displayInv, ss, belowSafety, cls };
  }

  const flows: { produced: number | null; consumed: number | null; lead: LeadTag | null } = {
    produced: null,
    consumed: null,
    lead: null,
  };
  if (traceability) {
    const p = traceability.simProducedQty;
    if (p != null && p > 0.001) flows.produced = p;
    const c = traceability.simConsumedQty;
    if (c != null && c > 0.001) flows.consumed = c;
    const isManufactured = subtype === 'FinishedGood' || subtype === 'SubAssembly';
    if (isManufactured) {
      const d = traceability.leadTimeDays;
      if (d != null && d > 0) flows.lead = { days: d, supplier: false, changed: false };
    } else {
      const eff = traceability.simEffectiveSupplierLtDays;
      const base = traceability.baseSupplierLtDays;
      const d = eff != null ? eff : base;
      if (d != null && d > 0) {
        flows.lead = { days: d, supplier: true, changed: eff != null && base != null && Math.abs(eff - base) > 0.01 };
      }
    }
  }
  const hasFlows = flows.produced != null || flows.consumed != null || flows.lead != null;

  const showMeta =
    stock || hasOwnShock || (!hasOwnShock && hasInherited) || supplyBlocked || shortageSource || hasFlows || phantom;

  return (
    <div
      className={[
        'hnode',
        `hnode--${(subtype || 'Component').toLowerCase()}`,
        traceability?.status && `hnode--status-${traceability.status}`,
        phantom && 'hnode--phantom',
        shortageSource && 'hnode--shortage',
        supplyBlocked && 'hnode--supply-blocked',
        selected && 'hnode--selected',
        isHighlighted && 'hnode--highlighted',
        isDimmed && 'hnode--dimmed',
        isSearchMatch && 'hnode--search-match',
        hasOwnShock && 'hnode--shocked',
        hasInherited && !hasOwnShock && 'hnode--shocked-inherited',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <Handle type="target" position={Position.Top} className="hnode__handle" />

      <div className="hnode__content">
        <div className="hnode__icon">
          <Icon size={16} />
        </div>
        <div className="hnode__info">
          <div className="hnode__partno">{partNo}</div>
          <div className="hnode__desc" title={description}>
            {description?.length > 32 ? description.slice(0, 32) + '…' : description}
          </div>
          {traceability && (
            <div className="hnode__trace-row">
              <span className={`hnode__status-dot hnode__status-dot--${traceability.status || 'ok'}`} />
              <span className="hnode__trace-label">{traceability.productionStage || 'Planning'}</span>
            </div>
          )}
        </div>
        {hasChildren && (
          <button
            className="hnode__toggle"
            onClick={(e) => {
              e.stopPropagation();
              onToggle?.(partNo);
            }}
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <span className="hnode__child-count">{childCount}</span>
          </button>
        )}
      </div>

      {showMeta && (
        <div className="hnode__meta">
          {phantom && (
            <span
              className="hnode__phantom-badge"
              title="Phantom assembly — produced and consumed flow-through in the line, never stocked in the warehouse."
            >
              <Ghost size={11} />
              Phantom
            </span>
          )}
          {shortageSource && (
            <span
              className="hnode__tag hnode__tag--out-of-stock"
              title="Out of stock — every part above that is built from it is blocked"
            >
              <AlertTriangle size={10} /> Out of stock
            </span>
          )}
          {supplyBlocked && (
            <span
              className="hnode__tag hnode__tag--blocked"
              title="A required sub-part is out of stock — production of this part is blocked"
            >
              <AlertTriangle size={10} /> Production blocked
            </span>
          )}
          {stock && (
            <span
              className={`hnode__tag ${stock.cls}`}
              title={`Inventory: ${stock.displayInv}${stock.ss > 0 ? ` / Safety Stock ${stock.ss}` : ''}`}
            >
              <Package size={10} /> {fmtQty(stock.displayInv)}
            </span>
          )}
          {flows.produced != null && (
            <span className="hnode__tag hnode__tag--produced" title="Produced / received during the run">
              <ArrowUpRight size={10} /> {fmtQty(flows.produced)}
            </span>
          )}
          {flows.consumed != null && (
            <span className="hnode__tag hnode__tag--consumed" title="Consumed into upstream assemblies">
              <ArrowDownRight size={10} /> {fmtQty(flows.consumed)}
            </span>
          )}
          {flows.lead && (
            <span
              className={
                flows.lead.supplier
                  ? `hnode__tag hnode__tag--eff-slt ${flows.lead.changed ? 'hnode__tag--eff-slt-changed' : ''}`
                  : 'hnode__tag hnode__tag--lead'
              }
              title={
                flows.lead.supplier
                  ? flows.lead.changed
                    ? 'Effective supplier lead time (shock-adjusted)'
                    : 'Supplier lead time'
                  : 'Production lead time'
              }
            >
              {flows.lead.supplier ? <Truck size={10} /> : <Timer size={10} />} {fmtDays(flows.lead.days)} d
            </span>
          )}
          {hasOwnShock && (
            <span
              className={`hnode__tag hnode__tag--shock hnode__tag--shock-${ownShockScope || 'node'}`}
              title={`${ownShockCount} shock${ownShockCount > 1 ? 's' : ''} applied at this node (${ownShockScope || 'node'}-scoped)`}
            >
              <Zap size={10} /> {ownShockScope === 'subtree' ? 'Subtree' : 'Node'} ×{ownShockCount}
            </span>
          )}
          {!hasOwnShock && hasInherited && (
            <span
              className="hnode__tag hnode__tag--shock-inherited"
              title={`Inherits subtree shock from: ${inheritedShockAncestors.join(', ')}`}
            >
              <Zap size={10} /> Inherited
            </span>
          )}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="hnode__handle" />
    </div>
  );
}

export default memo(CustomNode);
