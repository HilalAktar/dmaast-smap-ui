import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  ControlButton,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Edge,
  type NodeMouseHandler,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Map as MapIcon, X } from 'lucide-react';

import CustomNode, { type HierarchyNode } from './CustomNode';
import DetailPanel from './DetailPanel';
import { getLayoutedElements } from '../utils/layoutUtils';
import { getPalette, type ThemeName } from '../theme';
import { getNodeShockFields } from '../constants/nodeShockFields';
import type { EntitySubtype, TreeNode } from '../../../data/mock/valueChainHierarchy';
import type { NodeShocks, NodeShockScope, ShockKey } from '../../../data/mock/valueChainSimMock';
import type { TraceabilityMap } from '../utils/traceability';

const nodeTypes: NodeTypes = { custom: CustomNode };

const SUBTYPE_COLORS: Record<EntitySubtype, string> = {
  FinishedGood: '#2563eb',
  SubAssembly: '#0891b2',
  Component: '#16a34a',
  Expense: '#d97706',
};

export interface FlowActions {
  expandAll?: () => void;
  collapseAll?: () => void;
  resetView?: () => void;
}

function collectAllParents(tree: TreeNode | null): Set<string> {
  const parents = new Set<string>();
  const walk = (node: TreeNode) => {
    if (node.children?.length) {
      parents.add(node.partNo);
      for (const c of node.children) walk(c);
    }
  };
  if (tree) walk(tree);
  if (tree) parents.delete(tree.partNo);
  return parents;
}

interface HierarchyFlowProps {
  tree: TreeNode;
  theme: ThemeName;
  searchTerm: string;
  traceabilityMap: TraceabilityMap;
  nodeShocks: NodeShocks;
  onNodeShockChange?: (partNo: string, scope: NodeShockScope, key: ShockKey, val: number) => void;
  onNodeShockScopeChange?: (partNo: string, scope: NodeShockScope) => void;
  onClearNodeShock?: (partNo: string) => void;
  onRegisterActions?: (actions: FlowActions) => void;
}

interface CriticalInfo {
  own: boolean;
  descCritical: boolean;
  any: boolean;
}

export default function HierarchyFlow({
  tree,
  theme,
  searchTerm,
  traceabilityMap,
  nodeShocks,
  onNodeShockChange,
  onNodeShockScopeChange,
  onClearNodeShock,
  onRegisterActions,
}: HierarchyFlowProps) {
  const { fitView, setCenter, getZoom } = useReactFlow<HierarchyNode, Edge>();

  const [nodes, setNodes, onNodesChange] = useNodesState<HierarchyNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(() => collectAllParents(tree));
  const [showMinimap, setShowMinimap] = useState(true);

  // Signature of the currently-laid-out node set. Used to fitView() only when
  // the visible structure changes — NOT when only node data refreshes (e.g.
  // advancing the simulation), so the user's zoom/pan is preserved.
  const layoutSigRef = useRef('');

  // Flat map of partNo -> full node (with children), and parent map.
  const { treeMap, parentMap } = useMemo(() => {
    const map: Record<string, TreeNode> = {};
    const pmap: Record<string, TreeNode[]> = {};
    const walk = (node: TreeNode, parent: TreeNode | null) => {
      if (!map[node.partNo] || (node.children && node.children.length > 0)) {
        map[node.partNo] = node;
      }
      if (parent) {
        if (!pmap[node.partNo]) pmap[node.partNo] = [];
        if (!pmap[node.partNo].find((p) => p.partNo === parent.partNo)) {
          pmap[node.partNo].push(parent);
        }
      }
      for (const child of node.children || []) walk(child, node);
    };
    if (tree) walk(tree, null);
    return { treeMap: map, parentMap: pmap };
  }, [tree]);

  // Get the FULL children list for a partNo (handles shared nodes)
  const getChildren = useCallback((partNo: string): TreeNode[] => treeMap[partNo]?.children || [], [treeMap]);

  const handleToggle = useCallback((partNo: string) => {
    setCollapsedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(partNo)) {
        next.delete(partNo);
      } else {
        next.add(partNo);
      }
      return next;
    });
  }, []);

  // Per part: which ancestor "subtree"-scoped shocks actually affect it —
  // i.e. the shock carries at least one metric applicable to this node's type.
  const subtreeAncestorMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    if (!tree) return map;
    const walk = (node: TreeNode, activeAncestors: { partNo: string; metrics: Set<string> }[]) => {
      const nodeMetrics = new Set(getNodeShockFields(node).map((f) => f.key as string));
      map[node.partNo] = activeAncestors.filter((a) => [...a.metrics].some((m) => nodeMetrics.has(m))).map((a) => a.partNo);

      const own = nodeShocks?.[node.partNo];
      const nextAncestors = [...activeAncestors];
      if (own && own.scope === 'subtree') {
        const metrics = Object.entries(own.values || {})
          .filter(([, v]) => Number(v) !== 0)
          .map(([k]) => k);
        if (metrics.length > 0) nextAncestors.push({ partNo: node.partNo, metrics: new Set(metrics) });
      }
      for (const child of node.children || []) walk(child, nextAncestors);
    };
    walk(tree, []);
    return map;
  }, [tree, nodeShocks]);

  // Shortage propagation: mark the source part, every ancestor that depends on
  // it ("supply blocked"), and the edges along that path.
  const subtreeCriticalMap = useMemo(() => {
    const map: Record<string, CriticalInfo> = {};
    if (!tree) return map;
    const rootPartNo = tree.partNo;
    const isShortageSource = (partNo: string): boolean => {
      const t = traceabilityMap?.[partNo];
      if (!t) return false;
      if (t.status === 'critical') return true;
      if (partNo === rootPartNo) return false;
      const inv = t.simLiveInventory != null ? t.simLiveInventory : (t.inventoryQty ?? 0);
      const consumed = t.simConsumedQty != null ? t.simConsumedQty : 0;
      return inv <= 0.0001 && (consumed > 0.0001 || (t.safetyStock || 0) > 0);
    };
    const walk = (node: TreeNode): boolean => {
      const own = isShortageSource(node.partNo);
      let descCritical = false;
      for (const child of node.children || []) {
        if (walk(child)) descCritical = true;
      }
      map[node.partNo] = { own, descCritical, any: own || descCritical };
      return own || descCritical;
    };
    walk(tree);
    return map;
  }, [tree, traceabilityMap]);

  const buildFlowElements = useCallback((): { flowNodes: HierarchyNode[]; flowEdges: Edge[] } => {
    if (!tree) return { flowNodes: [], flowEdges: [] };

    const flowNodes: HierarchyNode[] = [];
    const flowEdges: Edge[] = [];
    const visitedNodes = new Set<string>();
    const term = searchTerm.toLowerCase();

    const walk = (node: TreeNode, parentPartNo: string | null, branchSeen: Set<string> = new Set()) => {
      if (branchSeen.has(node.partNo)) return;

      const nextBranchSeen = new Set(branchSeen);
      nextBranchSeen.add(node.partNo);

      const nodeId = `n_${node.partNo}`;
      const fullChildren = node._shared ? [] : getChildren(node.partNo);

      if (!visitedNodes.has(node.partNo)) {
        visitedNodes.add(node.partNo);

        const childCount = fullChildren.length;
        const isExpanded = !collapsedNodes.has(node.partNo);

        const isSearchMatch = searchTerm
          ? node.partNo.toLowerCase().includes(term) || (node.description || '').toLowerCase().includes(term)
          : false;

        const ownShock = nodeShocks?.[node.partNo];
        const hasOwnShock = !!(ownShock && Object.keys(ownShock.values || {}).length > 0);
        const inheritedAncestors = subtreeAncestorMap[node.partNo] || [];

        flowNodes.push({
          id: nodeId,
          type: 'custom',
          position: { x: 0, y: 0 },
          data: {
            partNo: node.partNo,
            description: node.description,
            subtype: node.subtype,
            level: node.level,
            partType: node.partType,
            operationNo: node.operationNo,
            phantomBom: node.phantomBom,
            phantom: !!node.phantom,
            qtyPerAssembly: node.qtyPerAssembly,
            desModelName: node.desModelName,
            source: node.source,
            childCount,
            isExpanded,
            isSearchMatch,
            isHighlighted: false,
            isDimmed: searchTerm ? !isSearchMatch : false,
            traceability: traceabilityMap?.[node.partNo] || null,
            onToggle: handleToggle,
            hasOwnShock,
            ownShockScope: ownShock?.scope || null,
            ownShockCount: hasOwnShock && ownShock ? Object.keys(ownShock.values).length : 0,
            inheritedShockAncestors: inheritedAncestors,
            shortageSource: subtreeCriticalMap[node.partNo]?.own || false,
            supplyBlocked: (subtreeCriticalMap[node.partNo]?.descCritical && !subtreeCriticalMap[node.partNo]?.own) || false,
          },
        });
      }

      if (parentPartNo) {
        const edgeId = `e_${parentPartNo}_${node.partNo}`;
        const isSubAssembly = node.subtype === 'SubAssembly';
        const qty = node.qtyPerAssembly;
        const parentChildren = getChildren(parentPartNo) || [];
        const isDenseCluster =
          parentChildren.length > 5 && parentChildren.every((c) => !(getChildren(c.partNo)?.length > 0));
        // Red path: this edge leads down into a subtree that contains a shortage.
        const childCritical = subtreeCriticalMap[node.partNo]?.any || false;

        flowEdges.push({
          id: edgeId,
          source: `n_${parentPartNo}`,
          target: nodeId,
          type: isDenseCluster ? 'smoothstep' : 'default',
          animated: isSubAssembly || childCritical,
          style: {
            stroke: childCritical ? '#dc2626' : isSubAssembly ? '#0891b2' : '#94a3b8',
            strokeWidth: childCritical ? 2.5 : isSubAssembly ? 2.5 : 1.25,
            opacity: childCritical ? 1 : isDenseCluster ? 0.65 : 1,
          },
          label: qty != null && qty !== 1 ? `×${qty}` : undefined,
          labelStyle: { fontSize: 11, fontWeight: 600, fill: '#64748b' },
          labelBgStyle: { fill: '#f8fafc', fillOpacity: 0.9 },
          labelBgPadding: [4, 2],
        });
      }

      if (!collapsedNodes.has(node.partNo)) {
        for (const child of fullChildren) {
          walk(child, node.partNo, nextBranchSeen);
        }
      }
    };

    walk(tree, null);
    return { flowNodes, flowEdges };
  }, [tree, collapsedNodes, searchTerm, getChildren, handleToggle, traceabilityMap, nodeShocks, subtreeAncestorMap, subtreeCriticalMap]);

  useEffect(() => {
    const { flowNodes, flowEdges } = buildFlowElements();
    if (flowNodes.length === 0) {
      setNodes([]);
      setEdges([]);
      layoutSigRef.current = '';
      return;
    }
    const { nodes: layouted, edges: layoutedEdges } = getLayoutedElements(flowNodes, flowEdges);
    setNodes(layouted);
    setEdges(layoutedEdges);
    // Re-fit ONLY when the visible node set changed (structural change).
    const sig = layouted
      .map((n) => n.id)
      .sort()
      .join('|');
    if (sig !== layoutSigRef.current) {
      layoutSigRef.current = sig;
      setTimeout(() => {
        void fitView({ padding: 0.15, duration: 300 });
      }, 50);
    }
  }, [buildFlowElements, setNodes, setEdges, fitView]);

  const isAncestor = useCallback(
    (partNo: string, potentialAncestor: string, seen: Set<string>): boolean => {
      if (seen.has(partNo)) return false;
      seen.add(partNo);
      const parents = parentMap[partNo] || [];
      for (const p of parents) {
        if (p.partNo === potentialAncestor) return true;
        if (isAncestor(p.partNo, potentialAncestor, seen)) return true;
      }
      return false;
    },
    [parentMap],
  );

  const isDescendant = useCallback(
    (partNo: string, potentialDesc: string, seen: Set<string>): boolean => {
      if (seen.has(partNo)) return false;
      seen.add(partNo);
      const node = treeMap[partNo];
      if (!node) return false;
      for (const child of node.children || []) {
        if (child.partNo === potentialDesc) return true;
        if (isDescendant(child.partNo, potentialDesc, seen)) return true;
      }
      return false;
    },
    [treeMap],
  );

  const isInPath = useCallback(
    (selectedPart: string, testPart: string): boolean => {
      if (selectedPart === testPart) return true;
      if (isAncestor(selectedPart, testPart, new Set())) return true;
      if (isDescendant(selectedPart, testPart, new Set())) return true;
      return false;
    },
    [isAncestor, isDescendant],
  );

  const handleNodeClick: NodeMouseHandler<HierarchyNode> = useCallback(
    (_, node) => {
      const partNo = node.data.partNo;
      setSelectedNodeId(partNo);

      const fullChildren = getChildren(partNo);
      if (fullChildren.length > 0 && collapsedNodes.has(partNo)) {
        setCollapsedNodes((prev) => {
          const next = new Set(prev);
          next.delete(partNo);
          return next;
        });
      }

      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          data: {
            ...n.data,
            isHighlighted: isInPath(partNo, n.data.partNo),
            isDimmed: searchTerm ? !n.data.isSearchMatch : !isInPath(partNo, n.data.partNo),
          },
        })),
      );

      setEdges((eds) =>
        eds.map((e) => {
          const sourcePart = e.source.replace('n_', '');
          const targetPart = e.target.replace('n_', '');
          const inPath = isInPath(partNo, sourcePart) && isInPath(partNo, targetPart);
          return {
            ...e,
            style: {
              ...e.style,
              opacity: searchTerm ? (inPath ? 1 : 0.15) : inPath ? 1 : 0.25,
            },
          };
        }),
      );
    },
    [searchTerm, setNodes, setEdges, getChildren, collapsedNodes, isInPath],
  );

  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null);
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: {
          ...n.data,
          isHighlighted: false,
          isDimmed: searchTerm ? !n.data.isSearchMatch : false,
        },
      })),
    );
    setEdges((eds) =>
      eds.map((e) => ({
        ...e,
        style: { ...e.style, opacity: 1 },
      })),
    );
  }, [searchTerm, setNodes, setEdges]);

  // Expand path from root down to target, also uncollapse the target itself
  const expandPathTo = useCallback(
    (partNo: string) => {
      const toExpand = [partNo];
      const findAncestors = (target: string, seen: Set<string>) => {
        if (seen.has(target)) return;
        seen.add(target);
        const parents = parentMap[target] || [];
        for (const p of parents) {
          toExpand.push(p.partNo);
          findAncestors(p.partNo, seen);
        }
      };
      findAncestors(partNo, new Set());

      setCollapsedNodes((prev) => {
        const next = new Set(prev);
        for (const p of toExpand) next.delete(p);
        return next;
      });
    },
    [parentMap],
  );

  const pendingNavigateRef = useRef<string | null>(null);

  // After layout rebuild, check if we need to navigate to a pending node
  useEffect(() => {
    if (!pendingNavigateRef.current) return;
    const partNo = pendingNavigateRef.current;
    const nodeId = `n_${partNo}`;
    const found = nodes.find((n) => n.id === nodeId);
    if (found) {
      pendingNavigateRef.current = null;
      const w = typeof found.style?.width === 'number' ? found.style.width : 280;
      const h = typeof found.style?.height === 'number' ? found.style.height : 80;
      const x = found.position.x + w / 2;
      const y = found.position.y + h / 2;
      setTimeout(() => {
        void setCenter(x, y, { zoom: Math.max(getZoom(), 0.8), duration: 400 });
        setSelectedNodeId(partNo);
      }, 100);
    }
  }, [nodes, setCenter, getZoom]);

  const navigateToNode = useCallback(
    (partNo: string) => {
      const nodeId = `n_${partNo}`;
      const existing = nodes.find((n) => n.id === nodeId);

      if (existing) {
        const w = typeof existing.style?.width === 'number' ? existing.style.width : 280;
        const h = typeof existing.style?.height === 'number' ? existing.style.height : 80;
        const x = existing.position.x + w / 2;
        const y = existing.position.y + h / 2;
        void setCenter(x, y, { zoom: Math.max(getZoom(), 0.8), duration: 400 });
        setSelectedNodeId(partNo);
      } else {
        pendingNavigateRef.current = partNo;
        expandPathTo(partNo);
      }
    },
    [nodes, setCenter, getZoom, expandPathTo],
  );

  const selectedNode = selectedNodeId ? treeMap[selectedNodeId] : null;
  const parentNodes = selectedNodeId ? parentMap[selectedNodeId] || [] : [];
  const childNodes = selectedNode?.children || [];

  useEffect(() => {
    setCollapsedNodes(collectAllParents(tree));
  }, [tree]);

  const expandAll = useCallback(() => setCollapsedNodes(new Set()), []);

  const collapseAll = useCallback(() => {
    setCollapsedNodes(collectAllParents(tree));
  }, [tree]);

  const resetView = useCallback(() => {
    setCollapsedNodes(collectAllParents(tree));
    setSelectedNodeId(null);
    setTimeout(() => {
      void fitView({ padding: 0.15, duration: 300 });
    }, 100);
  }, [tree, fitView]);

  useEffect(() => {
    onRegisterActions?.({ expandAll, collapseAll, resetView });
  }, [expandAll, collapseAll, resetView, onRegisterActions]);

  return (
    <div className="flow-container">
      <div className={`flow-canvas ${selectedNode ? 'flow-canvas--panel-open' : ''}`}>
        <ReactFlow<HierarchyNode, Edge>
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          onPaneClick={handlePaneClick}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.1}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          <Background color={getPalette(theme).border} gap={20} size={1} />
          <Controls position="bottom-left">
            {/* Minimap shrink / show toggle, grouped with the zoom controls. */}
            <ControlButton
              className="minimap-toggle-ctrl"
              onClick={() => setShowMinimap((v) => !v)}
              title={showMinimap ? 'Hide minimap' : 'Show minimap'}
              aria-label={showMinimap ? 'Hide minimap' : 'Show minimap'}
            >
              {showMinimap ? <X size={14} /> : <MapIcon size={14} />}
            </ControlButton>
          </Controls>
          {showMinimap && (
            <MiniMap<HierarchyNode>
              position="bottom-right"
              nodeColor={(n) => SUBTYPE_COLORS[n.data?.subtype] || '#94a3b8'}
              maskColor="rgba(0,0,0,0.08)"
              style={{ border: '1px solid var(--border)', background: 'var(--card)' }}
            />
          )}
        </ReactFlow>
      </div>

      {selectedNode && (
        <DetailPanel
          node={selectedNode}
          traceability={traceabilityMap?.[selectedNode.partNo] || null}
          parentNodes={parentNodes}
          childNodes={childNodes}
          nodeShock={nodeShocks?.[selectedNode.partNo] || null}
          inheritedShockAncestors={subtreeAncestorMap[selectedNode.partNo] || []}
          onNodeShockChange={onNodeShockChange}
          onNodeShockScopeChange={onNodeShockScopeChange}
          onClearNodeShock={onClearNodeShock}
          onClose={() => {
            setSelectedNodeId(null);
            handlePaneClick();
          }}
          onNavigate={navigateToNode}
        />
      )}
    </div>
  );
}
