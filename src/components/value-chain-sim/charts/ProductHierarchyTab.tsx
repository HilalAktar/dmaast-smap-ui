import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { Maximize2, Minimize2, ChevronRight } from 'lucide-react';

import HierarchySidebar, { type HierarchyStats } from '../hierarchy/HierarchySidebar';
import HierarchyFlow, { type FlowActions } from '../hierarchy/HierarchyFlow';
import { getProductList, buildTreeData, countNodes, getMaxDepth } from '../../../data/mock/valueChainHierarchy';
import { buildTraceabilityMap } from '../utils/traceability';
import type { ThemeName } from '../theme';
import type { DemoMeta, NodeShocks, NodeShockScope, ShockKey, SimResults } from '../../../data/mock/valueChainSimMock';

interface ProductHierarchyTabProps {
  simResults: SimResults | null;
  demoMeta: DemoMeta | null;
  theme: ThemeName;
  nodeShocks: NodeShocks;
  onNodeShockChange?: (partNo: string, scope: NodeShockScope, key: ShockKey, val: number) => void;
  onNodeShockScopeChange?: (partNo: string, scope: NodeShockScope) => void;
  onClearNodeShock?: (partNo: string) => void;
}

export default function ProductHierarchyTab({
  simResults = null,
  demoMeta = null,
  theme,
  nodeShocks,
  onNodeShockChange,
  onNodeShockScopeChange,
  onClearNodeShock,
}: ProductHierarchyTabProps) {
  const products = useMemo(() => getProductList(), []);

  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [selectedConfig, setSelectedConfig] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [flowKey, setFlowKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sbCollapsed, setSbCollapsed] = useState(false);

  const actionsRef = useRef<FlowActions>({});

  useEffect(() => {
    if (products.length && !selectedProduct) {
      const first = products[0];
      setSelectedProduct(first.id);
      if (first.hasConfigs && first.configs.length) {
        setSelectedConfig(first.configs[0]);
      }
    }
  }, [products, selectedProduct]);

  const productKey = useMemo(() => {
    if (!selectedProduct) return null;
    const prod = products.find((p) => p.id === selectedProduct);
    if (!prod) return null;
    if (prod.hasConfigs) {
      if (!selectedConfig) return null;
      return prod.keys[selectedConfig] || null;
    }
    return prod.keys._default || null;
  }, [selectedProduct, selectedConfig, products]);

  const treeResult = useMemo(() => {
    if (!productKey) return null;
    return buildTreeData(productKey);
  }, [productKey]);

  const stats = useMemo<HierarchyStats | null>(() => {
    if (!treeResult?.tree) return null;
    const c = countNodes(treeResult.tree);
    return { ...c, maxDepth: getMaxDepth(treeResult.tree) };
  }, [treeResult]);

  const traceabilityMap = useMemo(() => {
    if (!treeResult?.tree) return {};
    return buildTraceabilityMap(treeResult.tree, simResults, demoMeta);
  }, [treeResult, simResults, demoMeta]);

  const handleSelectProduct = useCallback(
    (productId: string) => {
      setSelectedProduct(productId);
      setSearchTerm('');
      const prod = products.find((p) => p.id === productId);
      if (prod?.hasConfigs && prod.configs.length) {
        setSelectedConfig(prod.configs[0]);
      } else {
        setSelectedConfig(null);
      }
      setFlowKey((k) => k + 1);
    },
    [products],
  );

  const handleSelectConfig = useCallback((cfg: string) => {
    setSelectedConfig(cfg);
    setSearchTerm('');
    setFlowKey((k) => k + 1);
  }, []);

  const registerActions = useCallback((actions: FlowActions) => {
    actionsRef.current = actions;
  }, []);

  return (
    <div className={`ph-tab ${isFullscreen ? 'ph-tab--fullscreen' : ''}${sbCollapsed ? ' ph-tab--sb-collapsed' : ''}`}>
      <HierarchySidebar
        products={products}
        selectedProduct={selectedProduct}
        selectedConfig={selectedConfig}
        onSelectProduct={handleSelectProduct}
        onSelectConfig={handleSelectConfig}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        stats={stats}
        onExpandAll={() => actionsRef.current.expandAll?.()}
        onCollapseAll={() => actionsRef.current.collapseAll?.()}
        onResetView={() => actionsRef.current.resetView?.()}
      />

      <button
        className="sidebar-toggle"
        onClick={() => setSbCollapsed((c) => !c)}
        title={sbCollapsed ? 'Show product panel' : 'Hide product panel'}
        aria-label="Toggle product panel"
      >
        <ChevronRight size={14} style={{ transform: sbCollapsed ? 'none' : 'rotate(180deg)', transition: 'transform .15s' }} />
      </button>

      <div className="ph-tab__canvas">
        <button
          className="ph-tab__fullscreen-btn"
          onClick={() => setIsFullscreen((v) => !v)}
          title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          <span>{isFullscreen ? 'Shrink' : 'Fullscreen'}</span>
        </button>

        {treeResult?.tree ? (
          <ReactFlowProvider key={flowKey}>
            <HierarchyFlow
              tree={treeResult.tree}
              theme={theme}
              searchTerm={searchTerm}
              traceabilityMap={traceabilityMap}
              nodeShocks={nodeShocks}
              onNodeShockChange={onNodeShockChange}
              onNodeShockScopeChange={onNodeShockScopeChange}
              onClearNodeShock={onClearNodeShock}
              onRegisterActions={registerActions}
            />
          </ReactFlowProvider>
        ) : (
          <div className="ph-tab__empty">
            <p>Select a product and configuration to view the hierarchy tree.</p>
          </div>
        )}
      </div>
    </div>
  );
}
