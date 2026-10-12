import dagre from '@dagrejs/dagre';
import type { Edge } from '@xyflow/react';
import type { HierarchyNode } from '../hierarchy/CustomNode';

interface Dim {
  width: number;
  height: number;
}

const NODE_DIMENSIONS: Record<string, Dim> = {
  FinishedGood: { width: 320, height: 80 },
  SubAssembly: { width: 300, height: 80 },
  Component: { width: 260, height: 70 },
  Expense: { width: 260, height: 70 },
};

const DEFAULT_DIM: Dim = { width: 260, height: 70 };

export interface LayoutOptions {
  direction?: 'TB' | 'LR';
  nodesep?: number;
  ranksep?: number;
  edgesep?: number;
  marginx?: number;
  marginy?: number;
  /** Engage grid when a parent has > this many leaf-only children. */
  leafGridThreshold?: number;
  /** Max columns in the grid (clamped between 2 and this value). */
  leafGridMaxCols?: number;
  leafNodeGapX?: number;
  leafNodeGapY?: number;
}

interface ClusterSpec {
  childIds: string[];
  cols: number;
  rows: number;
  maxW: number;
  maxH: number;
  gridW: number;
  gridH: number;
}

/*
 * Returns a Dagre-based hierarchical layout with a "smart grid" override:
 * when a parent has many leaf-only children (no grandchildren), those
 * children are arranged in a compact multi-row grid instead of a single
 * very wide horizontal row. This keeps the canvas navigable without needing
 * extreme zoom when a SubAssembly has 10+ component children.
 */
export function getLayoutedElements(
  nodes: HierarchyNode[],
  edges: Edge[],
  options: LayoutOptions = {},
): { nodes: HierarchyNode[]; edges: Edge[] } {
  const {
    direction = 'TB',
    nodesep = 32,
    ranksep = 110,
    edgesep = 20,
    marginx = 60,
    marginy = 60,
    leafGridThreshold = 5,
    leafGridMaxCols = 5,
    leafNodeGapX = 28,
    leafNodeGapY = 22,
  } = options;

  // Parent -> [childId] map derived from edges.
  const childrenMap: Record<string, string[]> = {};
  for (const edge of edges) {
    if (!childrenMap[edge.source]) childrenMap[edge.source] = [];
    childrenMap[edge.source].push(edge.target);
  }
  const hasChildren = new Set(Object.keys(childrenMap));

  // Find leaf clusters: parents whose children are ALL leaves and count > threshold.
  const clusterSpecs: Record<string, ClusterSpec> = {};
  const clusterChildIds = new Set<string>();

  for (const [parentId, childIds] of Object.entries(childrenMap)) {
    const allLeaves = childIds.every((cid) => !hasChildren.has(cid));
    if (!allLeaves || childIds.length <= leafGridThreshold) continue;

    const childDims = childIds.map((cid) => {
      const node = nodes.find((n) => n.id === cid);
      const subtype = node?.data?.subtype || 'Component';
      return NODE_DIMENSIONS[subtype] || DEFAULT_DIM;
    });
    const maxW = Math.max(...childDims.map((d) => d.width));
    const maxH = Math.max(...childDims.map((d) => d.height));
    const n = childIds.length;
    const cols = Math.max(2, Math.min(leafGridMaxCols, Math.ceil(Math.sqrt(n))));
    const rows = Math.ceil(n / cols);
    const gridW = cols * maxW + (cols - 1) * leafNodeGapX;
    const gridH = rows * maxH + (rows - 1) * leafNodeGapY;

    clusterSpecs[parentId] = { childIds, cols, rows, maxW, maxH, gridW, gridH };
    for (const cid of childIds) clusterChildIds.add(cid);
  }

  // Build dagre graph, excluding cluster children — they get placed manually.
  const g = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, nodesep, ranksep, edgesep, marginx, marginy });

  const nodeDimMap: Record<string, Dim> = {};
  for (const node of nodes) {
    const subtype = node.data?.subtype || 'Component';
    const dim = NODE_DIMENSIONS[subtype] || DEFAULT_DIM;
    nodeDimMap[node.id] = dim;
    if (!clusterChildIds.has(node.id)) {
      g.setNode(node.id, { width: dim.width, height: dim.height });
    }
  }

  for (const edge of edges) {
    if (!clusterChildIds.has(edge.target)) {
      g.setEdge(edge.source, edge.target);
    }
  }

  // Placeholder nodes reserve canvas space for each cluster so the parent
  // and its grid children never collide with siblings at the same rank.
  const placeholderId = (parentId: string) => `__grid_ph_${parentId}`;
  for (const [parentId, spec] of Object.entries(clusterSpecs)) {
    const phId = placeholderId(parentId);
    g.setNode(phId, { width: spec.gridW, height: spec.gridH });
    g.setEdge(parentId, phId);
  }

  dagre.layout(g);

  // Collect final (center) positions for every real node.
  const positions: Record<string, { x: number; y: number }> = {};
  for (const node of nodes) {
    if (clusterChildIds.has(node.id)) continue;
    const pos = g.node(node.id);
    if (pos) positions[node.id] = { x: pos.x, y: pos.y };
  }

  // Use each placeholder's center to lay the grid children into rows/cols.
  for (const [parentId, spec] of Object.entries(clusterSpecs)) {
    const ph = g.node(placeholderId(parentId));
    if (!ph) continue;
    const startX = ph.x - spec.gridW / 2 + spec.maxW / 2;
    const startY = ph.y - spec.gridH / 2 + spec.maxH / 2;
    spec.childIds.forEach((cid, i) => {
      const row = Math.floor(i / spec.cols);
      const col = i % spec.cols;
      positions[cid] = {
        x: startX + col * (spec.maxW + leafNodeGapX),
        y: startY + row * (spec.maxH + leafNodeGapY),
      };
    });
  }

  const layoutedNodes: HierarchyNode[] = nodes.map((node) => {
    const dim = nodeDimMap[node.id];
    const pos = positions[node.id] || { x: 0, y: 0 };
    return {
      ...node,
      position: {
        x: pos.x - dim.width / 2,
        y: pos.y - dim.height / 2,
      },
      style: { width: dim.width, height: dim.height },
    };
  });

  return { nodes: layoutedNodes, edges };
}
