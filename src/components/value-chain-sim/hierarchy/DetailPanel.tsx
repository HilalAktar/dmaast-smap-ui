import { useEffect, useState } from 'react';
import {
  X,
  Hash,
  FileText,
  Settings,
  Layers,
  Wrench,
  Package,
  BookOpen,
  ClipboardList,
  ArrowUpRight,
  ArrowDownRight,
  Timer,
  AlertCircle,
  Truck,
  AlertTriangle,
  CheckCircle2,
  Zap,
  RotateCcw,
  ChevronDown,
} from 'lucide-react';
import { getNodeShockFields, getNodeShockScopes, getDefaultNodeShockScope } from '../constants/nodeShockFields';
import type { EntitySubtype, TreeNode } from '../../../data/mock/valueChainHierarchy';
import type { NodeShock, NodeShockScope, ShockKey } from '../../../data/mock/valueChainSimMock';
import type { Traceability } from '../utils/traceability';

const SUBTYPE_LABEL: Record<EntitySubtype, string> = {
  FinishedGood: 'Finished Good',
  SubAssembly: 'Sub-Assembly',
  Component: 'Component',
  Expense: 'Expense',
};

const SUBTYPE_SHORT: Record<EntitySubtype, string> = {
  FinishedGood: 'FG',
  SubAssembly: 'SA',
  Component: 'CP',
  Expense: 'EX',
};

function partTypeClass(pt: string | null | undefined): string {
  if (!pt) return 'unknown';
  const l = pt.toLowerCase();
  if (l.includes('manufactured')) return 'manufactured';
  if (l.includes('purchased') && l.includes('raw')) return 'purchased-raw';
  if (l.includes('purchased')) return 'purchased';
  if (l.includes('expense')) return 'expense';
  return 'unknown';
}

function formatQty(value: number | null | undefined): string {
  if (value == null) return '0';
  const n = Number(value);
  if (!Number.isFinite(n)) return '0';
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

interface DetailPanelProps {
  node: TreeNode | null;
  traceability: Traceability | null;
  parentNodes: TreeNode[];
  childNodes: TreeNode[];
  nodeShock: NodeShock | null;
  inheritedShockAncestors: string[];
  onNodeShockChange?: (partNo: string, scope: NodeShockScope, key: ShockKey, val: number) => void;
  onNodeShockScopeChange?: (partNo: string, scope: NodeShockScope) => void;
  onClearNodeShock?: (partNo: string) => void;
  onClose: () => void;
  onNavigate: (partNo: string) => void;
}

export default function DetailPanel({
  node,
  traceability,
  parentNodes,
  childNodes,
  nodeShock,
  inheritedShockAncestors,
  onNodeShockChange,
  onNodeShockScopeChange,
  onClearNodeShock,
  onClose,
  onNavigate,
}: DetailPanelProps) {
  // Progressive disclosure: secondary fields hidden behind a toggle.
  const [showDetails, setShowDetails] = useState(false);
  // `pendingScope` lets the user pick a scope BEFORE moving any slider.
  const [pendingScope, setPendingScope] = useState<NodeShockScope | null>(null);
  const partNoKey = node?.partNo;
  useEffect(() => {
    setPendingScope(null);
  }, [partNoKey]);

  if (!node) return null;

  const subtypeLabel = SUBTYPE_LABEL[node.subtype] || 'Component';
  const shockFields = getNodeShockFields(node);
  const availableScopes = getNodeShockScopes(node);
  const defaultScope = getDefaultNodeShockScope(node);
  const currentValues = nodeShock?.values || {};
  const hasAnyShock = Object.keys(currentValues).length > 0;
  const inherited = Array.isArray(inheritedShockAncestors) ? inheritedShockAncestors : [];

  const currentScope: NodeShockScope =
    nodeShock?.scope || pendingScope || (availableScopes.includes(defaultScope) ? defaultScope : availableScopes[0]) || 'node';

  const liveInv = traceability?.simLiveInventory;

  return (
    <div className="dpanel">
      {/* Header */}
      <div className="dpanel__header">
        <div className="dpanel__header-left">
          <div className={`dpanel__header-icon dpanel__header-icon--${(node.subtype || 'component').toLowerCase()}`}>
            <Settings size={18} />
          </div>
          <h3 className="dpanel__title">Details</h3>
        </div>
        <button className="dpanel__close" onClick={onClose} title="Close">
          <X size={16} />
        </button>
      </div>

      {/* Body */}
      <div className="dpanel__body">
        {/* Subtype badge */}
        <div className="dpanel__badge-row">
          <span className={`dpanel__type-badge dpanel__type-badge--${(node.subtype || 'component').toLowerCase()}`}>
            {subtypeLabel}
          </span>
          {/* Live on-hand badge — single source of truth = simLiveInventory (ending inventory). */}
          {liveInv != null && (
            <span
              className={`dpanel__type-badge dpanel__type-badge--${liveInv > 0.001 ? 'finishedgood' : 'expense'}`}
              title="Live on-hand inventory — ending inventory, updates after every Step Forward"
              style={{ marginLeft: 'auto' }}
            >
              <Package size={11} style={{ verticalAlign: -2, marginRight: 4 }} />
              {liveInv > 0.001
                ? `On-hand: ${formatQty(liveInv)}${traceability?.stockDetails?.uom ? ` ${traceability.stockDetails.uom}` : ''}`
                : 'Out of stock'}
            </span>
          )}
        </div>

        {/* ─── NODE SHOCKS ─── */}
        {onNodeShockChange && shockFields.length > 0 && (
          <div className={`dpanel__shocks ${hasAnyShock ? 'dpanel__shocks--active' : ''}`}>
            <div className="dpanel__shocks-header">
              <div className="dpanel__shocks-title">
                <Zap size={13} />
                <span>Node Shocks</span>
              </div>
              {hasAnyShock && (
                <button
                  type="button"
                  className="dpanel__shocks-clear"
                  onClick={() => onClearNodeShock?.(node.partNo)}
                  title="Clear all shocks on this node"
                >
                  <RotateCcw size={11} /> Reset
                </button>
              )}
            </div>

            {inherited.length > 0 && (
              <div className="dpanel__shocks-inherited">
                <span>Inherits subtree shock from:</span>
                <span className="dpanel__shocks-inherited-list">{inherited.join(', ')}</span>
              </div>
            )}

            {availableScopes.length > 1 ? (
              <div className="dpanel__shocks-scope">
                <span className="dpanel__shocks-scope-label">Scope:</span>
                {availableScopes.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`dpanel__scope-btn ${currentScope === s ? 'dpanel__scope-btn--active' : ''}`}
                    onClick={() => {
                      if (hasAnyShock) {
                        onNodeShockScopeChange?.(node.partNo, s);
                      } else {
                        setPendingScope(s);
                      }
                    }}
                  >
                    {s === 'subtree' ? 'Subtree (cascades)' : 'This Node Only'}
                  </button>
                ))}
              </div>
            ) : (
              currentScope === 'subtree' && (
                <div className="dpanel__shocks-scope-hint">
                  Cascades through the whole production subtree of this node and stacks additively with the global L4
                  slider (e.g. global +100% + node +100% = 3× duration).
                </div>
              )
            )}

            <div className="dpanel__shocks-sliders">
              {shockFields.map((f) => {
                const v = Number(currentValues[f.key] || 0);
                return (
                  <label key={f.key} className="dpanel__shock-slider">
                    <span className="dpanel__shock-slider-label">{f.label}</span>
                    <input
                      type="range"
                      min={f.min}
                      max={f.max}
                      step={f.step}
                      value={v}
                      onChange={(e) => onNodeShockChange?.(node.partNo, currentScope, f.key, parseFloat(e.target.value))}
                    />
                    <span
                      className="dpanel__shock-slider-val"
                      style={{ color: v > 0 ? 'var(--danger)' : v < 0 ? 'var(--success)' : 'var(--text3)' }}
                    >
                      {v > 0 ? '+' : ''}
                      {v}%
                    </span>
                    {f.hint && <span className="dpanel__shock-slider-hint">{f.hint}</span>}
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* Fields */}
        <div className="dpanel__fields">
          <div className="dpanel__field-item">
            <div className="dpanel__field-icon">
              <Hash size={14} />
            </div>
            <div className="dpanel__field-content">
              <span className="dpanel__field-label">PART NO</span>
              <span className="dpanel__field-value dpanel__field-value--mono">{node.partNo}</span>
            </div>
          </div>

          <div className="dpanel__field-item">
            <div className="dpanel__field-icon">
              <FileText size={14} />
            </div>
            <div className="dpanel__field-content">
              <span className="dpanel__field-label">DESCRIPTION</span>
              <span className="dpanel__field-value">{node.description || '—'}</span>
            </div>
          </div>

          {/* Key summary — most important facts at a glance */}
          {traceability && (
            <div className="dpanel__summary">
              <div className="dpanel__summary-item">
                <span className="dpanel__summary-label">On-hand</span>
                <span className="dpanel__summary-value">
                  {traceability.simLiveInventory != null
                    ? formatQty(traceability.simLiveInventory)
                    : formatQty(traceability.inventoryQty)}
                </span>
              </div>
              <div className="dpanel__summary-item">
                <span className="dpanel__summary-label">Lead Time</span>
                <span className="dpanel__summary-value">
                  {traceability.leadTimeDays != null ? `${traceability.leadTimeDays} d` : '—'}
                </span>
              </div>
              <div className="dpanel__summary-item">
                <span className="dpanel__summary-label">Status</span>
                <span
                  className={`dpanel__summary-value ${
                    traceability.isBottleneckNode || traceability.supplyChainAlerts?.length
                      ? 'dpanel__summary-value--warn'
                      : 'dpanel__summary-value--ok'
                  }`}
                >
                  {traceability.isBottleneckNode
                    ? 'Bottleneck'
                    : traceability.supplyChainAlerts?.length
                      ? `${traceability.supplyChainAlerts.length} alert${traceability.supplyChainAlerts.length > 1 ? 's' : ''}`
                      : 'OK'}
                </span>
              </div>
            </div>
          )}

          <button type="button" className="dpanel__details-toggle" onClick={() => setShowDetails((s) => !s)}>
            {showDetails ? 'Hide details' : 'Show all details'}
            <ChevronDown size={13} style={{ transform: showDetails ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
          </button>

          {showDetails && (
            <>
              <div className="dpanel__field-item">
                <div className="dpanel__field-icon">
                  <Settings size={14} />
                </div>
                <div className="dpanel__field-content">
                  <span className="dpanel__field-label">PART TYPE</span>
                  <span className={`dpanel__field-value dpanel__ptype dpanel__ptype--${partTypeClass(node.partType)}`}>
                    {node.partType || '—'}
                  </span>
                </div>
              </div>

              <div className="dpanel__field-item">
                <div className="dpanel__field-icon">
                  <Layers size={14} />
                </div>
                <div className="dpanel__field-content">
                  <span className="dpanel__field-label">QTY PER ASSEMBLY</span>
                  <span className="dpanel__field-value">
                    {node.qtyPerAssembly != null
                      ? `${formatQty(node.qtyPerAssembly)}${traceability?.stockDetails?.uom ? ' ' + traceability.stockDetails.uom : ''}`
                      : '—'}
                  </span>
                  {node.qtyPerAssembly != null && (
                    <span className="dpanel__field-subvalue">
                      Source: Shop Order Materials ({node.source || 'Assembly / Config'})
                    </span>
                  )}
                </div>
              </div>

              {node.operationNo != null && (
                <div className="dpanel__field-item">
                  <div className="dpanel__field-icon">
                    <Wrench size={14} />
                  </div>
                  <div className="dpanel__field-content">
                    <span className="dpanel__field-label">OPERATION</span>
                    <span className="dpanel__field-value">OP {node.operationNo}</span>
                  </div>
                </div>
              )}

              {node.phantomBom && (
                <div className="dpanel__field-item">
                  <div className="dpanel__field-icon">
                    <Package size={14} />
                  </div>
                  <div className="dpanel__field-content">
                    <span className="dpanel__field-label">PHANTOM BOM</span>
                    <span className="dpanel__field-value dpanel__field-value--mono">{node.phantomBom}</span>
                  </div>
                </div>
              )}

              {node.source && (
                <div className="dpanel__field-item">
                  <div className="dpanel__field-icon">
                    <BookOpen size={14} />
                  </div>
                  <div className="dpanel__field-content">
                    <span className="dpanel__field-label">SOURCE</span>
                    <span className="dpanel__field-value">{node.source}</span>
                  </div>
                </div>
              )}

              {node.desModelName && (
                <div className="dpanel__field-item">
                  <div className="dpanel__field-icon">
                    <ClipboardList size={14} />
                  </div>
                  <div className="dpanel__field-content">
                    <span className="dpanel__field-label">DES MODEL</span>
                    <span className="dpanel__field-value dpanel__field-value--mono">{node.desModelName}</span>
                  </div>
                </div>
              )}

              {node.basisOrder && (
                <div className="dpanel__field-item">
                  <div className="dpanel__field-icon">
                    <ClipboardList size={14} />
                  </div>
                  <div className="dpanel__field-content">
                    <span className="dpanel__field-label">REFERENCE ORDER</span>
                    <span className="dpanel__field-value">
                      {node.basisOrder} ({node.evidenceOrders || 0} evidence)
                    </span>
                  </div>
                </div>
              )}

              {traceability && (
                <>
                  {/* ─── INVENTORY (live, simulation-driven) — ERP figures kept as baseline ─── */}
                  <div className="dpanel__field-item">
                    <div className="dpanel__field-icon">
                      <Package size={14} />
                    </div>
                    <div className="dpanel__field-content">
                      <span className="dpanel__field-label">INVENTORY (LIVE)</span>
                      {(() => {
                        const inv =
                          traceability.simLiveInventory != null ? traceability.simLiveInventory : traceability.inventoryQty;
                        const inStock = (inv || 0) > 0.001;
                        const uom = traceability.stockDetails?.uom || 'pcs';
                        return (
                          <span className={`dpanel__field-value ${inStock ? 'dpanel__stock-ok' : 'dpanel__stock-critical'}`}>
                            {inStock ? `In Stock (${formatQty(inv)} ${uom})` : `Out of Stock (0 ${uom})`}
                          </span>
                        );
                      })()}
                      <div className="dpanel__stock-breakdown">
                        {traceability.simProducedQty != null && (
                          <span className="dpanel__stock-chip">
                            <strong>Produced / Received:</strong> {formatQty(traceability.simProducedQty)}
                          </span>
                        )}
                        {traceability.simConsumedQty != null && traceability.simConsumedQty > 0 && (
                          <span className="dpanel__stock-chip">
                            <strong>Consumed:</strong> {formatQty(traceability.simConsumedQty)}
                          </span>
                        )}
                        {traceability.simUnderDeliveredQty != null && traceability.simUnderDeliveredQty > 0 && (
                          <span className="dpanel__stock-chip">
                            <strong>Under-delivered:</strong> {formatQty(traceability.simUnderDeliveredQty)}
                          </span>
                        )}
                        {traceability.simEffectiveSupplierLtDays != null && (
                          <span
                            className={`dpanel__stock-chip ${
                              traceability.baseSupplierLtDays != null &&
                              Math.abs(traceability.simEffectiveSupplierLtDays - traceability.baseSupplierLtDays) > 0.01
                                ? 'dpanel__stock-chip--changed'
                                : ''
                            }`}
                          >
                            <strong>Eff. Supplier LT:</strong>{' '}
                            {traceability.baseSupplierLtDays != null &&
                            traceability.baseSupplierLtDays !== traceability.simEffectiveSupplierLtDays
                              ? `${traceability.baseSupplierLtDays}d → ${traceability.simEffectiveSupplierLtDays}d`
                              : `${traceability.simEffectiveSupplierLtDays}d`}
                          </span>
                        )}
                      </div>
                      {traceability.stockDetails && (
                        <>
                          <span className="dpanel__field-subvalue" style={{ fontWeight: 600, marginTop: 5.6 }}>
                            ERP baseline
                          </span>
                          <div className="dpanel__stock-breakdown">
                            <span className="dpanel__stock-chip">
                              <strong>Available:</strong> {formatQty(traceability.stockDetails.available)}
                              {traceability.stockDetails.uom ? ` ${traceability.stockDetails.uom}` : ''}
                            </span>
                            <span className="dpanel__stock-chip">
                              <strong>Reserved:</strong> {formatQty(traceability.stockDetails.reserved)}
                            </span>
                            <span className="dpanel__stock-chip">
                              <strong>In Transit:</strong> {formatQty(traceability.stockDetails.inTransit)}
                            </span>
                            {traceability.stockDetails.locations > 0 && (
                              <span className="dpanel__stock-chip">
                                <strong>Locations:</strong> {traceability.stockDetails.locations}
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="dpanel__field-item">
                    <div className="dpanel__field-icon">
                      <ClipboardList size={14} />
                    </div>
                    <div className="dpanel__field-content">
                      <span className="dpanel__field-label">ORDER STATUS</span>
                      <span className="dpanel__field-value">
                        {traceability.hasOrder ? 'Order Placed' : 'No active order'}
                        {traceability.basisOrder ? ` - Ref: ${traceability.basisOrder}` : ''}
                      </span>
                    </div>
                  </div>

                  {/* ─── LEAD TIME ─── */}
                  <div className="dpanel__field-item">
                    <div className="dpanel__field-icon">
                      <Timer size={14} />
                    </div>
                    <div className="dpanel__field-content">
                      <span className="dpanel__field-label">{traceability.leadTimeLabel || 'LEAD TIME'}</span>
                      <span className="dpanel__field-value">
                        {traceability.leadTimeDays != null ? `${traceability.leadTimeDays} days` : '—'}
                      </span>
                      {traceability.leadTimeBreakdown && traceability.leadTimeBreakdown.productionLeadTimeDays != null && (
                        <div className="dpanel__lt-breakdown">
                          <span className="dpanel__lt-chip">
                            <strong>Assembly LT:</strong> {traceability.leadTimeBreakdown.assemblyLeadTimeDays ?? 0} d
                          </span>
                          <span className="dpanel__lt-chip">
                            <strong>Config LT:</strong> {traceability.leadTimeBreakdown.configLeadTimeDays ?? 0} d
                          </span>
                          {traceability.leadTimeBreakdown.childProcurementDays != null && (
                            <span className="dpanel__lt-chip dpanel__lt-chip--warn">
                              <strong>Child Procurement:</strong> +{traceability.leadTimeBreakdown.childProcurementDays} d
                            </span>
                          )}
                        </div>
                      )}
                      {traceability.leadTimeBreakdown && traceability.leadTimeBreakdown.supplierLeadTimeDays != null && (
                        <span className="dpanel__field-subvalue">Source: Supplier for Purchase Part ({node.partNo})</span>
                      )}
                    </div>
                  </div>

                  <div className="dpanel__field-item">
                    <div className="dpanel__field-icon">
                      <Wrench size={14} />
                    </div>
                    <div className="dpanel__field-content">
                      <span className="dpanel__field-label">PRODUCTION STAGE</span>
                      <span className="dpanel__field-value">{traceability.productionStage || '—'}</span>
                    </div>
                  </div>

                  {/* ─── BOTTLENECK ─── */}
                  <div className="dpanel__field-item">
                    <div className="dpanel__field-icon">
                      <AlertCircle size={14} />
                    </div>
                    <div className="dpanel__field-content">
                      <span className="dpanel__field-label">BOTTLENECK</span>
                      <span className={`dpanel__field-value ${traceability.isBottleneckNode ? 'dpanel__stock-critical' : ''}`}>
                        {traceability.isBottleneckNode ? 'This node is a bottleneck' : 'Not a primary bottleneck'}
                        {traceability.bottleneckPartNo ? ` (Critical part: ${traceability.bottleneckPartNo})` : ''}
                      </span>
                      {traceability.bottleneckReason && (
                        <span className="dpanel__field-subvalue">Reason: {traceability.bottleneckReason}</span>
                      )}
                      {traceability.staticBottleneck &&
                        traceability.staticBottleneck.shortageChildren &&
                        traceability.staticBottleneck.shortageChildren.length > 0 && (
                          <div className="dpanel__shortage-list">
                            <span className="dpanel__shortage-title">MISSING CHILD PARTS</span>
                            {traceability.staticBottleneck.shortageChildren.map((sc) => (
                              <div key={sc.partNo} className="dpanel__shortage-item">
                                <span className="dpanel__shortage-part">{sc.partNo}</span>
                                <span className="dpanel__shortage-qty">
                                  Shortage: {formatQty(Math.floor(sc.shortageQty || 0))}
                                  {sc.uom ? ` ${sc.uom}` : ''}
                                  {sc.required != null && sc.available != null && (
                                    <span className="dpanel__shortage-breakdown">
                                      {` (Required ${formatQty(sc.required)} / Available ${formatQty(sc.available)})`}
                                    </span>
                                  )}
                                </span>
                                {sc.supplierLeadTimeDays != null && (
                                  <span className="dpanel__shortage-lt">Procurement: {sc.supplierLeadTimeDays} d</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                    </div>
                  </div>

                  {/* ─── SUPPLY CHAIN ALERTS ─── */}
                  <div className="dpanel__field-item">
                    <div className="dpanel__field-icon">
                      <Truck size={14} />
                    </div>
                    <div className="dpanel__field-content">
                      <span className="dpanel__field-label">SUPPLY CHAIN ALERTS</span>
                      {traceability.supplyChainAlerts && traceability.supplyChainAlerts.length > 0 ? (
                        <div className="dpanel__alerts">
                          {traceability.supplyChainAlerts.map((alert) => (
                            <span key={`${alert.code}-${alert.text}`} className={`dpanel__alert dpanel__alert--${alert.level}`}>
                              {alert.text}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="dpanel__field-value">No critical supply/operation alerts</span>
                      )}
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Parent Navigation */}
        {parentNodes && parentNodes.length > 0 && (
          <div className="dpanel__nav-section">
            <div className="dpanel__nav-title">
              <ArrowUpRight size={14} />
              <span>Parents ({parentNodes.length})</span>
            </div>
            <div className="dpanel__nav-list">
              {parentNodes.map((p) => (
                <button key={p.partNo} className="dpanel__nav-card" onClick={() => onNavigate(p.partNo)}>
                  <span className={`dpanel__nav-badge dpanel__nav-badge--${(p.subtype || 'component').toLowerCase()}`}>
                    {SUBTYPE_SHORT[p.subtype] || 'CP'}
                  </span>
                  <div className="dpanel__nav-info">
                    <span className="dpanel__nav-part">{p.partNo}</span>
                    <span className="dpanel__nav-desc">
                      {p.description ? (p.description.length > 36 ? p.description.slice(0, 36) + '…' : p.description) : ''}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Children Navigation — with requirement quantities and stock status */}
        {childNodes && childNodes.length > 0 && (
          <div className="dpanel__nav-section">
            <div className="dpanel__nav-title">
              <ArrowDownRight size={14} />
              <span>Child Parts ({childNodes.length})</span>
            </div>
            <div className="dpanel__nav-list">
              {childNodes.map((c) => {
                const childReq = traceability?.childRequirements?.find((cr) => cr.partNo === c.partNo);
                return (
                  <button
                    key={c.partNo}
                    className={`dpanel__nav-card ${childReq && !childReq.hasStock ? 'dpanel__nav-card--shortage' : ''}`}
                    onClick={() => onNavigate(c.partNo)}
                  >
                    <span className={`dpanel__nav-badge dpanel__nav-badge--${(c.subtype || 'component').toLowerCase()}`}>
                      {SUBTYPE_SHORT[c.subtype] || 'CP'}
                    </span>
                    <div className="dpanel__nav-info">
                      <span className="dpanel__nav-part">{c.partNo}</span>
                      <span className="dpanel__nav-desc">
                        {c.description ? (c.description.length > 36 ? c.description.slice(0, 36) + '…' : c.description) : ''}
                      </span>
                      {childReq && (
                        <span className="dpanel__nav-req">
                          <span
                            className={`dpanel__nav-stock-indicator ${childReq.hasStock ? 'dpanel__nav-stock-ok' : 'dpanel__nav-stock-warn'}`}
                          >
                            {childReq.hasStock ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />}
                          </span>
                          <span>
                            Required: {formatQty(childReq.qtyRequired)}
                            {childReq.uom ? ` ${childReq.uom}` : ''}
                          </span>
                          <span className="dpanel__nav-req-sep">|</span>
                          <span>
                            Stock: {formatQty(childReq.qtyAvailable)}
                            {childReq.uom ? ` ${childReq.uom}` : ''}
                          </span>
                          {!childReq.hasStock && ((childReq.simShortage ?? 0) > 0 || (childReq.shortage ?? 0) > 0) && (
                            <>
                              <span className="dpanel__nav-req-sep">|</span>
                              <span className="dpanel__nav-shortage-text">
                                Shortage:{' '}
                                {formatQty(
                                  Math.floor(
                                    ((childReq.simShortage ?? 0) > 0 ? childReq.simShortage : childReq.shortage) || 0,
                                  ),
                                )}
                                {childReq.uom ? ` ${childReq.uom}` : ''}
                              </span>
                            </>
                          )}
                          {childReq.supplierLeadTimeDays != null && (
                            <>
                              <span className="dpanel__nav-req-sep">|</span>
                              <span className="dpanel__nav-lead-text">Lead Time: {formatQty(childReq.supplierLeadTimeDays)} d</span>
                            </>
                          )}
                        </span>
                      )}
                    </div>
                    {c.qtyPerAssembly != null && c.qtyPerAssembly !== 1 && (
                      <span className="dpanel__nav-qty">×{c.qtyPerAssembly}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
