/**
 * Value Chain Simulation — BOM hierarchy model.
 *
 * Typed port of the Value Chain Digital Twin's
 * `frontend/src/utils/transformData.js`. The structure data (parent/child
 * rows, entity mapping, process mapping, BOM relation nodes) lives in
 * `valueChainHierarchyData.ts`; this module turns it into the product tree
 * that the hierarchy canvas, the detail panel and the mock engine share.
 *
 * Kullanıcı kararı (Asrınalp Şahin, 2026-10-12): Value Chain Simulation
 * sayfası, twin arayüzünün birebir kopyasıyla ve TAMAMEN mock veriyle
 * (backend çağrısı olmadan) partnerlerle paylaşılacak.
 */
import { VALUE_CHAIN_HIERARCHY_DATA } from './valueChainHierarchyData';

export interface HierarchyRow {
  level: string | null;
  parent_part: string | null;
  parent_desc: string | null;
  operation_no: string | null;
  phantom_bom: string | null;
  component_part: string | null;
  component_desc: string | null;
  component_part_type: string | null;
  qty_per_assembly: string | null;
  source: string | null;
  basis_order: string | null;
  evidence_orders: string | null;
}

export interface EntityMappingRow {
  part_no: string | null;
  part_desc: string | null;
  part_type: string | null;
  des_element_type: string | null;
  des_element_subtype: string | null;
  des_model_name: string | null;
  active_in_model: string | null;
}

export interface ProcessMappingRow {
  part_no: string | null;
  part_desc: string | null;
  part_type: string | null;
  operation_no: string | null;
  des_element_type: string | null;
  des_element_subtype: string | null;
  des_model_name: string | null;
  active_in_model: string | null;
}

export interface BomRelationNodeRow {
  parent_part: string | null;
  parent_part_type: string | null;
  operation_no: string | null;
  phantom_bom: string | null;
  source: string | null;
  evidence_orders: string | null;
  des_element_type: string | null;
  des_element_subtype: string | null;
  des_model_name: string | null;
  active_in_model: string | null;
}

export interface HierarchyDataset {
  hierarchy: HierarchyRow[];
  entity_mapping: EntityMappingRow[];
  process_mapping: ProcessMappingRow[];
  bom_relation_nodes: BomRelationNodeRow[];
}

export type EntitySubtype = 'FinishedGood' | 'SubAssembly' | 'Component' | 'Expense';

export interface TreeNode {
  partNo: string;
  description: string;
  subtype: EntitySubtype;
  level: number;
  desModelName: string | null;
  partType: string | null;
  operationNo: number | null;
  phantomBom: string | null;
  /** True when this node IS a phantom sub-assembly (flow-through, never stocked). */
  phantom: boolean;
  qtyPerAssembly: number;
  source: string | null;
  basisOrder: string | null;
  evidenceOrders: number;
  children: TreeNode[];
  /** Second (or later) occurrence of a part that is used under several parents. */
  _shared: boolean;
}

export interface ProductListItem {
  id: string;
  name: string;
  configs: string[];
  keys: Record<string, string>;
  hasConfigs: boolean;
}

export interface TreeResult {
  tree: TreeNode;
  entityMap: Record<string, EntityMappingRow>;
  bomNodeMap: Record<string, BomRelationNodeRow>;
}

export interface NodeCounts {
  total: number;
  byType: Partial<Record<EntitySubtype, number>>;
}

export const DEFAULT_HIERARCHY_KEY = '021XBXXXXXXF04_v4';
export const VALUE_CHAIN_PRODUCT_ID = '021XBXXXXXXF04';
export const VALUE_CHAIN_PRODUCT_DESC = 'FV - MULTICAL® 21 q3 2.5 G3/4x110mm - PL';
export const KNOWN_SUB_ASSEMBLIES = ['5962204', '55501572', '5401021', '55501649'];

function str(v: string | null | undefined): string {
  return v == null ? '' : String(v);
}

function toSubtype(raw: string | null | undefined): EntitySubtype | null {
  switch (raw) {
    case 'FinishedGood':
    case 'SubAssembly':
    case 'Component':
    case 'Expense':
      return raw;
    default:
      return null;
  }
}

export function getHierarchyDataset(key: string = DEFAULT_HIERARCHY_KEY): HierarchyDataset | undefined {
  return VALUE_CHAIN_HIERARCHY_DATA[key];
}

export function getProductList(): ProductListItem[] {
  const products: Record<string, Omit<ProductListItem, 'hasConfigs'>> = {};

  for (const key of Object.keys(VALUE_CHAIN_HIERARCHY_DATA)) {
    const entry = VALUE_CHAIN_HIERARCHY_DATA[key];
    const hier = entry.hierarchy ?? [];
    if (!hier.length) continue;

    const rootPart = str(hier[0].parent_part);
    const rootDesc = hier[0].parent_desc || rootPart;

    if (rootPart.includes('XCXXXXXX')) {
      const configMatch = key.match(/Config(\d+)/);
      const configId = configMatch ? configMatch[1] : null;
      if (!products[rootPart]) {
        products[rootPart] = { id: rootPart, name: rootDesc, configs: [], keys: {} };
      }
      if (configId) {
        products[rootPart].configs.push(configId);
        products[rootPart].keys[configId] = key;
      }
    } else if (!products[rootPart]) {
      products[rootPart] = { id: rootPart, name: rootDesc, configs: [], keys: { _default: key } };
    } else if (!products[rootPart].keys._default) {
      products[rootPart].keys._default = key;
    }
  }

  return Object.values(products).map((p) => ({
    ...p,
    configs: [...p.configs].sort(),
    hasConfigs: p.configs.length > 1,
  }));
}

export function buildTreeData(productKey: string): TreeResult | null {
  const entry = VALUE_CHAIN_HIERARCHY_DATA[productKey];
  if (!entry) return null;

  const hierarchy = entry.hierarchy ?? [];
  const entityMapping = entry.entity_mapping ?? [];
  const bomRelationNodes = entry.bom_relation_nodes ?? [];
  if (!hierarchy.length) return null;

  const entityMap: Record<string, EntityMappingRow> = {};
  for (const em of entityMapping) entityMap[str(em.part_no)] = em;

  const bomNodeMap: Record<string, BomRelationNodeRow> = {};
  for (const bn of bomRelationNodes) bomNodeMap[`${str(bn.parent_part)}_${str(bn.operation_no)}`] = bn;

  // Re-parent rows whose `phantom_bom` points to a sibling that is itself a
  // real child of the same parent (ERP exports flatten phantom materials under
  // the top-level parent; semantically they belong under the phantom assembly).
  const siblingsByParent: Record<string, Set<string>> = {};
  for (const row of hierarchy) {
    const p = str(row.parent_part);
    if (!siblingsByParent[p]) siblingsByParent[p] = new Set<string>();
    siblingsByParent[p].add(str(row.component_part));
  }

  const phantomSubAssemblyParts = new Set<string>();
  const adjustedHierarchy: HierarchyRow[] = hierarchy.map((row) => {
    const parent = str(row.parent_part);
    const component = str(row.component_part);
    const phantom = row.phantom_bom != null ? String(row.phantom_bom).trim() : '';
    if (phantom && phantom !== component && siblingsByParent[parent]?.has(phantom)) {
      phantomSubAssemblyParts.add(phantom);
      const newLevel = (parseInt(str(row.level), 10) || 0) + 1;
      return {
        ...row,
        parent_part: phantom,
        parent_desc: entityMap[phantom]?.part_desc ?? row.parent_desc,
        level: String(newLevel),
      };
    }
    return row;
  });

  const childrenByParent: Record<string, HierarchyRow[]> = {};
  for (const row of adjustedHierarchy) {
    const pKey = str(row.parent_part);
    if (!childrenByParent[pKey]) childrenByParent[pKey] = [];
    childrenByParent[pKey].push(row);
  }

  const getSubtype = (partNo: string): EntitySubtype => {
    const raw = toSubtype(entityMap[partNo]?.des_element_subtype);
    if (phantomSubAssemblyParts.has(partNo)) return 'SubAssembly';
    if (raw) return raw;
    if (KNOWN_SUB_ASSEMBLIES.includes(partNo)) return 'SubAssembly';
    return 'Component';
  };

  const visited = new Set<string>();

  const buildNode = (partNo: string, partDesc: string | null, level: number, parentRow: HierarchyRow | null): TreeNode => {
    const subtype: EntitySubtype = level === 0 ? 'FinishedGood' : getSubtype(partNo);
    const em = entityMap[partNo];
    const node: TreeNode = {
      partNo,
      description: partDesc || em?.part_desc || partNo,
      subtype,
      level,
      desModelName: em?.des_model_name ?? null,
      partType: parentRow?.component_part_type ?? em?.part_type ?? null,
      operationNo: parentRow ? Number(parentRow.operation_no) || null : null,
      phantomBom: parentRow?.phantom_bom ?? null,
      phantom: phantomSubAssemblyParts.has(partNo),
      qtyPerAssembly: parentRow ? Number(parentRow.qty_per_assembly) || 1 : 1,
      source: parentRow?.source ?? null,
      basisOrder: parentRow?.basis_order ?? null,
      evidenceOrders: parentRow ? Number(parentRow.evidence_orders) || 0 : 0,
      children: [],
      _shared: false,
    };

    if (visited.has(partNo)) {
      node._shared = true;
      return node;
    }
    visited.add(partNo);

    for (const row of childrenByParent[partNo] ?? []) {
      const childPart = str(row.component_part);
      node.children.push(buildNode(childPart, row.component_desc || childPart, level + 1, row));
    }
    return node;
  };

  const rootPart = str(hierarchy[0].parent_part);
  const tree = buildNode(rootPart, hierarchy[0].parent_desc || rootPart, 0, null);
  return { tree, entityMap, bomNodeMap };
}

export function countNodes(tree: TreeNode | null): NodeCounts {
  if (!tree) return { total: 0, byType: {} };
  const byType: Partial<Record<EntitySubtype, number>> = {};
  let total = 0;
  const walk = (node: TreeNode) => {
    total += 1;
    byType[node.subtype] = (byType[node.subtype] ?? 0) + 1;
    for (const child of node.children) walk(child);
  };
  walk(tree);
  return { total, byType };
}

export function getMaxDepth(tree: TreeNode | null): number {
  if (!tree) return 0;
  let max = 0;
  const walk = (node: TreeNode, depth: number) => {
    if (depth > max) max = depth;
    for (const child of node.children) walk(child, depth + 1);
  };
  walk(tree, 0);
  return max;
}
