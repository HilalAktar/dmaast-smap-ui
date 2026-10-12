import { useMemo } from 'react';
import {
  Search,
  Box,
  Settings,
  ChevronDown,
  ChevronRight,
  Layers,
  Package,
  Cpu,
  DollarSign,
  Expand,
  Shrink,
  RotateCcw,
} from 'lucide-react';
import type { NodeCounts, ProductListItem } from '../../../data/mock/valueChainHierarchy';

export interface HierarchyStats extends NodeCounts {
  maxDepth: number;
}

interface HierarchySidebarProps {
  products: ProductListItem[];
  selectedProduct: string | null;
  selectedConfig: string | null;
  onSelectProduct: (productId: string) => void;
  onSelectConfig: (cfg: string) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  stats: HierarchyStats | null;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onResetView: () => void;
}

export default function HierarchySidebar({
  products,
  selectedProduct,
  selectedConfig,
  onSelectProduct,
  onSelectConfig,
  searchTerm,
  onSearchChange,
  stats,
  onExpandAll,
  onCollapseAll,
  onResetView,
}: HierarchySidebarProps) {
  const activeProduct = useMemo(() => products.find((p) => p.id === selectedProduct), [products, selectedProduct]);

  return (
    <div className="sb">
      <div className="sb__header">
        <h2 className="sb__title">
          <Layers size={18} />
          Product Hierarchy
        </h2>
      </div>

      {/* Product Selection */}
      <div className="sb__section">
        <h3 className="sb__section-title">
          <Box size={14} /> Product Selection
        </h3>
        <div className="sb__product-list">
          {products.map((p) => (
            <button
              key={p.id}
              className={`sb__product-btn ${selectedProduct === p.id ? 'sb__product-btn--active' : ''}`}
              onClick={() => onSelectProduct(p.id)}
            >
              <div className="sb__product-info">
                <span className="sb__product-id">{p.id}</span>
                <span className="sb__product-name">{p.name}</span>
              </div>
              {p.hasConfigs && <span className="sb__config-badge">{p.configs.length} config</span>}
              {selectedProduct === p.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          ))}
        </div>
      </div>

      {/* Config Selection */}
      {activeProduct?.hasConfigs && selectedProduct === activeProduct.id && (
        <div className="sb__section">
          <h3 className="sb__section-title">
            <Settings size={14} /> Configuration
          </h3>
          <div className="sb__config-list">
            {activeProduct.configs.map((cfg) => (
              <button
                key={cfg}
                className={`sb__config-btn ${selectedConfig === cfg ? 'sb__config-btn--active' : ''}`}
                onClick={() => onSelectConfig(cfg)}
              >
                {cfg}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="sb__section">
        <div className="sb__search">
          <Search size={14} className="sb__search-icon" />
          <input
            type="text"
            placeholder="Search part no or description…"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="sb__search-input"
          />
        </div>
      </div>

      {/* Toolbar */}
      <div className="sb__section">
        <div className="sb__toolbar">
          <button className="sb__tool-btn" onClick={onExpandAll} title="Expand all">
            <Expand size={14} /> Expand
          </button>
          <button className="sb__tool-btn" onClick={onCollapseAll} title="Collapse all">
            <Shrink size={14} /> Collapse
          </button>
          <button className="sb__tool-btn" onClick={onResetView} title="Reset view">
            <RotateCcw size={14} /> Reset
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="sb__section sb__stats">
          <h3 className="sb__section-title">Statistics</h3>
          <div className="sb__stat-grid">
            <div className="sb__stat">
              <Package size={13} />
              <span className="sb__stat-val">{stats.total}</span>
              <span className="sb__stat-label">Total</span>
            </div>
            {(stats.byType.FinishedGood ?? 0) > 0 && (
              <div className="sb__stat sb__stat--fg">
                <Box size={13} />
                <span className="sb__stat-val">{stats.byType.FinishedGood}</span>
                <span className="sb__stat-label">Finished</span>
              </div>
            )}
            {(stats.byType.SubAssembly ?? 0) > 0 && (
              <div className="sb__stat sb__stat--sa">
                <Cpu size={13} />
                <span className="sb__stat-val">{stats.byType.SubAssembly}</span>
                <span className="sb__stat-label">Sub-Assembly</span>
              </div>
            )}
            {(stats.byType.Component ?? 0) > 0 && (
              <div className="sb__stat sb__stat--cp">
                <Package size={13} />
                <span className="sb__stat-val">{stats.byType.Component}</span>
                <span className="sb__stat-label">Component</span>
              </div>
            )}
            {(stats.byType.Expense ?? 0) > 0 && (
              <div className="sb__stat sb__stat--ex">
                <DollarSign size={13} />
                <span className="sb__stat-val">{stats.byType.Expense}</span>
                <span className="sb__stat-label">Expense</span>
              </div>
            )}
          </div>
          {stats.maxDepth != null && (
            <div className="sb__depth">
              Max. Depth: <strong>{stats.maxDepth}</strong> levels
            </div>
          )}
        </div>
      )}
    </div>
  );
}
