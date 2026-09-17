import { useLanguage } from '../../contexts/LanguageContext';
import { tEntityType } from '../../i18n/dataLabels';
import type { SimHierarchy } from '../../data/sim/simContract';

/**
 * SimHierarchyTree — role-based product/BOM tree from the contract's
 * `result.hierarchy` (the twin's `hierarchy_summary`). KAM and JPB each render
 * their OWN hierarchy from their loaded artifact.
 *
 * Rendered fields come straight from the contract:
 *   - root = the `levels` entry whose `entity_type === 'FinishedGood'`, else the
 *     last of `assembly_plan_order`, else the product id.
 *   - each `levels[key].children[]` is walked recursively; a child that is
 *     itself a `levels` key expands (sub-assembly), otherwise it is a leaf part.
 *
 * Part numbers and descriptions are DATA (verbatim, source language); only the
 * entity-type label and the field captions are bound to the active language
 * (dataLabels/i18n). No numbers are altered or invented.
 */

type Translate = (key: string) => string;
function tx(t: Translate, key: string, fallback: string): string {
  const out = t(key);
  return out === key ? fallback : out;
}

const asStr = (v: unknown, d = ''): string => (typeof v === 'string' ? v : d);
const asNum = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) ? v : undefined;

const intFmt = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });

const ENTITY_ACCENT: Record<string, string> = {
  FinishedGood: 'bg-primary-100 text-primary-700 border-primary-200',
  SubAssembly: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Component: 'bg-surface-100 text-surface-600 border-surface-200',
};

interface NodeData {
  partNo: string;
  partDesc: string;
  entityType: string;
  qtyPer?: number;
  operationNo?: number;
  endingInv?: number;
}

function childToNode(child: Record<string, unknown>): NodeData {
  return {
    partNo: asStr(child.part_no),
    partDesc: asStr(child.part_desc),
    entityType: asStr(child.entity_type, 'Component'),
    qtyPer: asNum(child.qty_per_assembly),
    operationNo: asNum(child.operation_no),
    endingInv: asNum(child.ending_inv),
  };
}

interface TreeNodeProps {
  node: NodeData;
  levels: Record<string, Record<string, unknown>>;
  depth: number;
  visited: Set<string>;
  t: Translate;
}

function TreeNode({ node, levels, depth, visited, t }: TreeNodeProps) {
  const levelRow = node.partNo && node.partNo in levels ? levels[node.partNo] : undefined;
  const expandable = !!levelRow && !visited.has(node.partNo);

  // Prefer the level row's ending_inventory when this node has its own level entry.
  const endingInv = levelRow ? asNum(levelRow.ending_inventory) ?? node.endingInv : node.endingInv;
  const accent = ENTITY_ACCENT[node.entityType] ?? ENTITY_ACCENT.Component;

  let childNodes: NodeData[] = [];
  if (expandable && Array.isArray(levelRow!.children)) {
    childNodes = (levelRow!.children as Record<string, unknown>[]).map(childToNode);
  }
  const nextVisited = expandable ? new Set(visited).add(node.partNo) : visited;

  return (
    <li className="relative">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 py-1">
        <span className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded border ${accent}`}>
          {tEntityType(t, node.entityType)}
        </span>
        <span className="text-sm font-medium text-surface-900">{node.partDesc || node.partNo}</span>
        {node.partNo && node.partDesc && (
          <span className="font-mono text-xs text-surface-400">{node.partNo}</span>
        )}
        {typeof node.qtyPer === 'number' && (
          <span className="text-xs text-surface-500">
            · {tx(t, 'vcsim.tree.qtyPer', 'Qty/assembly')}: {node.qtyPer}
          </span>
        )}
        {typeof node.operationNo === 'number' && (
          <span className="text-xs text-surface-400">
            · {tx(t, 'vcsim.tree.op', 'Op')} {node.operationNo}
          </span>
        )}
        {typeof endingInv === 'number' && (
          <span className="text-xs text-surface-500">
            · {tx(t, 'vcsim.tree.endingInv', 'Ending inventory')}: {intFmt.format(endingInv)}
          </span>
        )}
      </div>
      {childNodes.length > 0 && (
        <ul className="ml-4 pl-4 border-l border-surface-200 space-y-0">
          {childNodes.map((c, i) => (
            <TreeNode
              key={`${c.partNo || 'leaf'}-${i}`}
              node={c}
              levels={levels}
              depth={depth + 1}
              visited={nextVisited}
              t={t}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export interface SimHierarchyTreeProps {
  hierarchy: SimHierarchy;
  /** Fallback root when no FinishedGood is present (KAM uses the product id). */
  productId?: string;
}

export default function SimHierarchyTree({ hierarchy, productId }: SimHierarchyTreeProps) {
  const { t } = useLanguage();
  const levels = (hierarchy.levels ?? {}) as Record<string, Record<string, unknown>>;

  // Root: explicit FinishedGood → last of assembly_plan_order → productId.
  const finishedGoodKey = Object.keys(levels).find(
    (k) => asStr(levels[k].entity_type) === 'FinishedGood',
  );
  const planOrder = Array.isArray(hierarchy.assembly_plan_order) ? hierarchy.assembly_plan_order : [];
  const rootKey =
    finishedGoodKey ??
    (planOrder.length > 0 ? planOrder[planOrder.length - 1] : undefined) ??
    productId;

  if (!rootKey || !(rootKey in levels)) {
    // Nothing renderable from the contract — stay silent rather than invent a tree.
    return null;
  }

  const rootRow = levels[rootKey];
  const rootNode: NodeData = {
    partNo: rootKey,
    partDesc: asStr(rootRow.part_desc),
    entityType: asStr(rootRow.entity_type, 'FinishedGood'),
    endingInv: asNum(rootRow.ending_inventory),
  };

  return (
    <div className="bg-white rounded-xl shadow-card p-5">
      <h3 className="font-semibold text-surface-900 mb-1">
        {tx(t, 'vcsim.hierarchy.title', 'Product Hierarchy')}
      </h3>
      <p className="text-xs text-surface-500 mb-4">
        {tx(t, 'vcsim.hierarchy.hint', 'BOM / value-chain tree from the simulation result.')}
      </p>
      <ul className="space-y-0">
        <TreeNode node={rootNode} levels={levels} depth={0} visited={new Set()} t={t} />
      </ul>
    </div>
  );
}
